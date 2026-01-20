import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "media";

async function main() {
  const filePath = process.argv[2];
  const orgId = process.argv[3] ?? "dev-org";
  if (!filePath) throw new Error("Usage: tsx scripts/upload_local_video.ts <pathToMp4> <orgId>");

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const ext = path.extname(filePath).replace(".", "") || "mp4";
  const key = `org/${orgId}/uploads/test-${Date.now()}.${ext}`;

  const bytes = fs.readFileSync(filePath);

  const { error } = await sb.storage.from(BUCKET).upload(key, bytes, {
    upsert: true,
    contentType: "video/mp4",
  });

  if (error) throw error;
  console.log(JSON.stringify({ storageKey: key }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
