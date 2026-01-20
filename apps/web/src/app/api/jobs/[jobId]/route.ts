import { NextResponse } from "next/server";
import { prisma } from "~/server/db";
import { getOrCreateUserWithOrg } from "~/server/auth";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { jobId } = await params;
    const session = await getOrCreateUserWithOrg();
    
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { org } = session;

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
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "job-not-found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "bad-request" },
      { status: 400 }
    );
  }
}
