import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "~/server/db";
import { supabaseAdmin } from "~/server/supabase";
import { validateApiKey } from "~/lib/api-auth";

const BodySchema = z.object({
  videoUrl: z.string().url().optional(),
  videoBase64: z.string().optional(),
  fileName: z.string().optional(),
  mimeType: z.string().default("video/mp4"),
  webhookUrl: z.string().url().optional(),
  async: z.boolean().default(false),
  timeoutSeconds: z.number().min(10).max(300).default(120),
}).refine(
  (data) => data.videoUrl || data.videoBase64,
  { message: "Either videoUrl or videoBase64 must be provided" }
);

// Helper to poll for job completion
async function waitForJobCompletion(jobId: string, timeoutMs: number): Promise<{
  status: string;
  results: any;
  error: { code: string | null; message: string | null } | null;
}> {
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds

  while (Date.now() - startTime < timeoutMs) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        status: true,
        resultJsonKey: true,
        errorCode: true,
        errorMessage: true,
      },
    });

    if (!job) {
      throw new Error("Job not found");
    }

    if (job.status === "SUCCEEDED") {
      let results = null;
      if (job.resultJsonKey) {
        const { data } = await supabaseAdmin.storage
          .from("media")
          .download(job.resultJsonKey);
        if (data) {
          const text = await data.text();
          results = JSON.parse(text);
        }
      }
      return { status: "SUCCEEDED", results, error: null };
    }

    if (job.status === "FAILED") {
      return {
        status: "FAILED",
        results: null,
        error: { code: job.errorCode, message: job.errorMessage },
      };
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  // Timeout reached
  return {
    status: "TIMEOUT",
    results: null,
    error: { code: "TIMEOUT", message: `Job did not complete within ${timeoutMs / 1000} seconds` },
  };
}

export async function POST(req: Request) {
  try {
    // Validate API key
    const authHeader = req.headers.get("authorization");
    const auth = await validateApiKey(authHeader);

    if (!auth) {
      return NextResponse.json(
        { error: "Invalid or missing API key" },
        { status: 401 }
      );
    }

    const { user, org } = auth;
    const json = await req.json();
    const body = BodySchema.parse(json);

    // Generate storage key
    const fileId = crypto.randomUUID();
    const ext = body.mimeType.split("/")[1] || "mp4";
    const storageKey = `org/${org.id}/api-uploads/${fileId}.${ext}`;

    let uploadSuccess = false;

    if (body.videoBase64) {
      // Upload base64 video directly to Supabase
      const buffer = Buffer.from(body.videoBase64, "base64");
      const { error } = await supabaseAdmin.storage
        .from("media")
        .upload(storageKey, buffer, {
          contentType: body.mimeType,
          upsert: false,
        });

      if (error) {
        return NextResponse.json(
          { error: "Failed to upload video", details: error.message },
          { status: 500 }
        );
      }
      uploadSuccess = true;
    } else if (body.videoUrl) {
      // Download from URL and upload to Supabase
      try {
        const response = await fetch(body.videoUrl);
        if (!response.ok) {
          return NextResponse.json(
            { error: "Failed to fetch video from URL" },
            { status: 400 }
          );
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        const { error } = await supabaseAdmin.storage
          .from("media")
          .upload(storageKey, buffer, {
            contentType: body.mimeType,
            upsert: false,
          });

        if (error) {
          return NextResponse.json(
            { error: "Failed to upload video", details: error.message },
            { status: 500 }
          );
        }
        uploadSuccess = true;
      } catch (fetchError: any) {
        return NextResponse.json(
          { error: "Failed to fetch video from URL", details: fetchError.message },
          { status: 400 }
        );
      }
    }

    if (!uploadSuccess) {
      return NextResponse.json(
        { error: "Video upload failed" },
        { status: 500 }
      );
    }

    // Create media asset record
    const asset = await prisma.mediaAsset.create({
      data: {
        orgId: org.id,
        userId: user.id,
        storageKey,
        mimeType: body.mimeType,
      },
    });

    // Create job
    const job = await prisma.job.create({
      data: {
        orgId: org.id,
        userId: user.id,
        mediaAssetId: asset.id,
        status: "QUEUED",
        progress: 0,
      },
    });

    // Trigger Modal worker
    const modalUrl = process.env.MODAL_URL;
    const callbackUrl = process.env.CALLBACK_URL || process.env.NEXT_PUBLIC_APP_URL;

    if (modalUrl) {
      // Trigger Modal worker (don't await - fire and forget)
      fetch(`${modalUrl}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          orgId: org.id,
          videoStorageKey: storageKey,
          callbackBaseUrl: callbackUrl,
          webhookUrl: body.webhookUrl,
        }),
      }).catch((err) => {
        console.error("Failed to trigger Modal worker:", err);
      });
    }

    // If async mode, return immediately
    if (body.async) {
      return NextResponse.json({
        success: true,
        jobId: job.id,
        status: job.status,
        message: "Video analysis job created successfully",
        statusUrl: `/api/v1/jobs/${job.id}`,
      });
    }

    // Synchronous mode: wait for job completion
    const timeoutMs = body.timeoutSeconds * 1000;
    const result = await waitForJobCompletion(job.id, timeoutMs);

    if (result.status === "SUCCEEDED") {
      return NextResponse.json({
        success: true,
        jobId: job.id,
        status: "SUCCEEDED",
        results: result.results,
      });
    } else if (result.status === "FAILED") {
      return NextResponse.json({
        success: false,
        jobId: job.id,
        status: "FAILED",
        error: result.error,
      });
    } else {
      // Timeout - return job ID so user can poll manually
      return NextResponse.json({
        success: false,
        jobId: job.id,
        status: "PROCESSING",
        message: `Job is still processing. Check status at /api/v1/jobs/${job.id}`,
        statusUrl: `/api/v1/jobs/${job.id}`,
      });
    }
  } catch (e: any) {
    if (e.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation error", details: e.errors },
        { status: 400 }
      );
    }
    console.error("API v1 analyze error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
