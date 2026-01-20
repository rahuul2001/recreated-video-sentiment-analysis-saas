import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "~/server/db";
import { supabaseAdmin } from "~/server/supabase";
import { getOrCreateUserWithOrg } from "~/server/auth";
import crypto from "crypto";

const BodySchema = z.object({
  mimeType: z.string().min(1),
  filename: z.string().min(1),
});

function safeExtFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/mp4": "m4a",
  };
  return map[mimeType] ?? "bin";
}

export async function POST(req: Request) {
  try {
    const session = await getOrCreateUserWithOrg();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { user, org } = session;
    const json = await req.json();
    const body = BodySchema.parse(json);

    const ext = safeExtFromMime(body.mimeType);
    const id = crypto.randomUUID();

    const storageKey = `org/${org.id}/uploads/${id}.${ext}`;

    const asset = await prisma.mediaAsset.create({
      data: {
        orgId: org.id,
        userId: user.id,
        storageKey,
        mimeType: body.mimeType,
      },
      select: { id: true, storageKey: true },
    });

    const { data, error } = await supabaseAdmin.storage
      .from("media")
      .createSignedUploadUrl(storageKey);

    if (error || !data) {
      await prisma.mediaAsset.delete({ where: { id: asset.id } }).catch(() => {});
      return NextResponse.json({ error: error?.message ?? "upload-url-failed" }, { status: 500 });
    }

    return NextResponse.json({
      mediaAssetId: asset.id,
      storageKey: asset.storageKey,
      signedUrl: data.signedUrl,
      token: data.token,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "bad-request" },
      { status: 400 }
    );
  }
}
