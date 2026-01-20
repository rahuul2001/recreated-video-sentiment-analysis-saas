import { prisma } from "~/server/db";
import crypto from "crypto";

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const prefix = "vi_" + crypto.randomBytes(4).toString("hex");
  const secret = crypto.randomBytes(24).toString("hex");
  const key = `${prefix}_${secret}`;
  const hash = hashApiKey(key);
  return { key, prefix, hash };
}

export async function validateApiKey(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const key = authHeader.replace("Bearer ", "");
  const hash = hashApiKey(key);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: hash },
    include: {
      user: true,
      org: true,
    },
  });

  if (!apiKey) {
    return null;
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    apiKey,
    user: apiKey.user,
    org: apiKey.org,
  };
}
