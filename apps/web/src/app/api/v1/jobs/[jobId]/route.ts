import { NextResponse } from "next/server";
import { prisma } from "~/server/db";
import { supabaseAdmin } from "~/server/supabase";
import { validateApiKey } from "~/lib/api-auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    // Validate API key
    const authHeader = req.headers.get("authorization");
    const auth = await validateApiKey(authHeader);

    if (!auth) {
      return NextResponse.json(
        { error: "Invalid or missing API key" },
        { status: 401 }
      );
    }

    const { org } = auth;

    // Find job belonging to this org
    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        orgId: org.id,
      },
      include: {
        mediaAsset: {
          select: {
            id: true,
            storageKey: true,
            mimeType: true,
            createdAt: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // If job succeeded, fetch results
    let results = null;
    if (job.status === "SUCCEEDED" && job.resultJsonKey) {
      const { data } = await supabaseAdmin.storage
        .from("media")
        .download(job.resultJsonKey);

      if (data) {
        const text = await data.text();
        results = JSON.parse(text);
      }
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      error: job.status === "FAILED" ? {
        code: job.errorCode,
        message: job.errorMessage,
      } : null,
      mediaAsset: job.mediaAsset,
      results: results,
    });
  } catch (e: any) {
    console.error("API v1 job status error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
