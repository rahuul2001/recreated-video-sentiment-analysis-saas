import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
// FIX: Import the configured client instead of creating a new raw one
import { prisma } from '../src/server/db'; 

// --- CONFIGURATION ---
const MODAL_URL = process.env.MODAL_URL; 
const CALLBACK_URL = process.env.CALLBACK_URL; 
const VIDEO_PATH = process.argv[2];

if (!MODAL_URL || !CALLBACK_URL || !VIDEO_PATH) {
  console.error("❌ Usage: CALLBACK_URL=... MODAL_URL=... pnpm dlx tsx scripts/run-inference.ts <video_file>");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log(`🚀 Starting Inference Run for: ${VIDEO_PATH}`);

  // 1. SETUP: Get/Create User & Org
  const user = await prisma.user.findFirst();
  const org = await prisma.organization.findFirst();
  
  if (!user || !org) {
    throw new Error("❌ No User or Organization found in DB. Please sign up in the web app first.");
  }
  console.log(`👤 Using User: ${user.email} | Org: ${org.name}`);

  // 2. UPLOAD VIDEO
  const filename = path.basename(VIDEO_PATH);
  const storageKey = `org/${org.id}/uploads/test-${Date.now()}-${filename}`;
  const fileContent = fs.readFileSync(VIDEO_PATH);

  console.log(`uploading to Supabase...`);
  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(storageKey, fileContent, { contentType: "video/mp4", upsert: true });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
  console.log(`✅ Uploaded: ${storageKey}`);

  // 3. CREATE DB RECORDS
  const asset = await prisma.mediaAsset.create({
    data: {
      orgId: org.id,
      userId: user.id,
      storageKey: storageKey,
      mimeType: "video/mp4",
      sizeBytes: fileContent.byteLength,
    },
  });

  const job = await prisma.job.create({
    data: {
      orgId: org.id,
      userId: user.id,
      mediaAssetId: asset.id,
      status: "QUEUED",
      progress: 0,
    },
  });
  console.log(`✅ Job Created: ${job.id}`);

  // 4. TRIGGER MODAL INFERENCE
  console.log(`⚡ Triggering Modal...`);
  const modalPayload = {
    jobId: job.id,
    orgId: org.id,
    videoStorageKey: storageKey,
    callbackBaseUrl: CALLBACK_URL, 
  };

  const response = await fetch(`${MODAL_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(modalPayload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Modal triggering failed: ${response.status} ${text}`);
  }
  console.log(`✅ Modal Worker Started.`);

  // 5. POLL FOR COMPLETION
  console.log(`⏳ Waiting for completion...`);
  let resultKey = null;

  while (true) {
    // We fetch a fresh job record every loop
    const currentJob = await prisma.job.findUnique({ where: { id: job.id } });
    
    if (currentJob?.status === "SUCCEEDED") {
      resultKey = currentJob.resultJsonKey;
      console.log(`\n✅ Job SUCCEEDED!`);
      break;
    } else if (currentJob?.status === "FAILED") {
      throw new Error(`❌ Job FAILED: ${currentJob.errorMessage}`);
    }

    process.stdout.write(`\rStatus: ${currentJob?.status} (${currentJob?.progress}%)`);
    await new Promise((r) => setTimeout(r, 2000)); 
  }

  // 6. DOWNLOAD & DISPLAY RESULTS
  if (resultKey) {
    console.log(`\n📥 Downloading Results...`);
    const { data, error } = await supabase.storage
      .from("media")
      .download(resultKey);

    if (error) throw error;
    
    const resultJson = JSON.parse(await data.text());
    const overall = resultJson.overall;

    console.log("\n" + "=".repeat(60));
    console.log("🎬 INFERENCE SUMMARY");
    console.log("=".repeat(60));
    console.log(`Overall Emotion:   ${overall.dominantEmotion}`);
    console.log(`Overall Sentiment: ${overall.dominantSentiment}`);
    
    console.log("\n📊 EMOTION DISTRIBUTION:");
    Object.entries(overall.emotionDistribution || {}).forEach(([label, score]: [string, any]) => {
        // Simple ascii bar chart
        const bar = "█".repeat(Math.round(score * 20)); 
        console.log(`   ${label.padEnd(12)}: ${bar} ${(score * 100).toFixed(1)}%`);
    });

    console.log("\n📊 SENTIMENT DISTRIBUTION:");
    Object.entries(overall.sentimentDistribution || {}).forEach(([label, score]: [string, any]) => {
        const bar = "█".repeat(Math.round(score * 20));
        console.log(`   ${label.padEnd(12)}: ${bar} ${(score * 100).toFixed(1)}%`);
    });

    console.log("-".repeat(60));
    console.log("\n💬 Sample Utterance:");
    const u = resultJson.utterances[0];
    if (u) {
        console.log(`   "${u.text}" -> ${u.emotion.label} (${(u.emotion.score*100).toFixed(0)}%)`);
    }
    console.log("=".repeat(60));
  }
}

main()
  .catch((e) => {
    console.error("\n" + e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());