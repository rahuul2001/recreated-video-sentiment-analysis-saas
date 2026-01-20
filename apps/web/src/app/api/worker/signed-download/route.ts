import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "~/server/supabase";

const BodySchema = z.object({
  storageKey: z.string().min(1),
});

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";

  if (!process.env.WORKER_SHARED_SECRET || token !== process.env.WORKER_SHARED_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = BodySchema.parse(await req.json());

    // Signed download URL good for 120 seconds
    const { data, error } = await supabaseAdmin.storage
      .from("media")
      .createSignedUrl(body.storageKey, 120, { download: true });

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "signed-url-failed" }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "bad-request" }, { status: 400 });
  }
}
