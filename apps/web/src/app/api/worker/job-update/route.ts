import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "~/server/db";

const BodySchema = z.object({
  jobId: z.string().min(1),
  status: z.enum(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED"]),
  progress: z.number().int().min(0).max(100).optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  resultJsonKey: z.string().optional(),
});

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";

  // Verify the secret
  if (!process.env.WORKER_SHARED_SECRET || token !== process.env.WORKER_SHARED_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const json = await req.json();
    const body = BodySchema.parse(json);

    // Update the job in the database
    const updated = await prisma.job.update({
      where: { id: body.jobId },
      data: {
        status: body.status as any,
        progress: body.progress ?? undefined,
        errorCode: body.errorCode ?? undefined,
        errorMessage: body.errorMessage ?? undefined,
        resultJsonKey: body.resultJsonKey ?? undefined,
      },
    });

    return NextResponse.json({ ok: true, job: updated });
  } catch (e: any) {
    console.error("Job update failed:", e);
    return NextResponse.json({ error: e?.message ?? "bad-request" }, { status: 400 });
  }
}