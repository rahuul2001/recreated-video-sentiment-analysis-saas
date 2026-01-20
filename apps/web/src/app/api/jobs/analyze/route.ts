import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "~/server/db";
import { getOrCreateUserWithOrg } from "~/server/auth";

const BodySchema = z.object({
  mediaAssetId: z.string().min(1),
  storageKey: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const session = await getOrCreateUserWithOrg();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { user, org } = session;
    const json = await req.json();
    const body = BodySchema.parse(json);

    // Verify the media asset belongs to this org
    const asset = await prisma.mediaAsset.findFirst({
      where: {
        id: body.mediaAssetId,
        orgId: org.id,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "media-asset-not-found" }, { status: 404 });
    }

    // Create the job
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

    if (!modalUrl) {
      // Update job to failed if Modal URL not configured
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errorCode: "CONFIG_ERROR",
          errorMessage: "Modal worker URL not configured",
        },
      });
      return NextResponse.json({ error: "worker-not-configured" }, { status: 500 });
    }

    // Fire and forget - trigger the Modal worker
    fetch(`${modalUrl}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: job.id,
        orgId: org.id,
        videoStorageKey: body.storageKey,
        callbackBaseUrl: callbackUrl,
      }),
    }).catch((err) => {
      console.error("Failed to trigger Modal worker:", err);
    });

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
    });
  } catch (e: any) {
    console.error("Analyze endpoint error:", e);
    return NextResponse.json(
      { error: e?.message ?? "bad-request" },
      { status: 400 }
    );
  }
}
