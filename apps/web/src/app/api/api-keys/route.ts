import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "~/server/db";
import { getOrCreateUserWithOrg } from "~/server/auth";
import { generateApiKey } from "~/lib/api-auth";

const CreateKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

// GET - List all API keys for the org
export async function GET() {
  try {
    const session = await getOrCreateUserWithOrg();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { org } = session;

    const keys = await prisma.apiKey.findMany({
      where: { orgId: org.id },
      select: {
        id: true,
        name: true,
        prefix: true,
        createdAt: true,
        lastUsedAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ keys });
  } catch (e: any) {
    console.error("List API keys error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new API key
export async function POST(req: Request) {
  try {
    const session = await getOrCreateUserWithOrg();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { user, org } = session;
    const json = await req.json();
    const body = CreateKeySchema.parse(json);

    // Generate new API key
    const { key, prefix, hash } = generateApiKey();

    // Store in database (only the hash)
    const apiKey = await prisma.apiKey.create({
      data: {
        name: body.name || `API Key ${new Date().toLocaleDateString()}`,
        keyHash: hash,
        prefix,
        userId: user.id,
        orgId: org.id,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        createdAt: true,
      },
    });

    // Return the full key ONLY on creation (never stored)
    return NextResponse.json({
      ...apiKey,
      key, // This is the only time the full key is returned
      message: "Save this key securely. It will not be shown again.",
    });
  } catch (e: any) {
    console.error("Create API key error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Revoke an API key
export async function DELETE(req: Request) {
  try {
    const session = await getOrCreateUserWithOrg();
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { org } = session;
    const { searchParams } = new URL(req.url);
    const keyId = searchParams.get("id");

    if (!keyId) {
      return NextResponse.json({ error: "Key ID required" }, { status: 400 });
    }

    // Verify key belongs to org
    const key = await prisma.apiKey.findFirst({
      where: { id: keyId, orgId: org.id },
    });

    if (!key) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    await prisma.apiKey.delete({ where: { id: keyId } });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Delete API key error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
