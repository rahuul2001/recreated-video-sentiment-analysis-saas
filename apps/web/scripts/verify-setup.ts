// verify-setup.ts
import 'dotenv/config'; // Loads .env file
import { prisma } from '../src/server/db';
import { supabaseAdmin } from '../src/server/supabase';
import crypto from 'crypto';

async function main() {
  console.log("🚀 Starting System Verification...\n");

  // 1. Test Database: Create User
  console.log("1️⃣  Testing Database (User Creation)...");
  const email = `test-user-${Date.now()}@example.com`;
  const user = await prisma.user.create({
    data: {
      email,
      name: "Test User",
      clerkId: `test_clerk_${Date.now()}`,
    },
  });
  console.log(`   ✅ User Created: ${user.id} (${user.email})`);
  console.log(`   ✅ Timestamps verify: Created ${user.createdAt.toISOString()}`);

  // 2. Test Database: Create Organization
  console.log("\n2️⃣  Testing Database (Organization Creation)...");
  const org = await prisma.organization.create({
    data: {
      name: "Test Corp Inc.",
    },
  });
  console.log(`   ✅ Organization Created: ${org.id}`);

  // 3. Test Relationships: Create Membership
  console.log("\n3️⃣  Testing Relationships (Membership)...");
  const membership = await prisma.membership.create({
    data: {
      userId: user.id,
      orgId: org.id,
      role: 'OWNER',
    },
  });
  console.log(`   ✅ Membership Linked! User ${user.id} is OWNER of ${org.id}`);

  // 4. Test Storage & Media Asset Logic
  console.log("\n4️⃣  Testing Supabase Storage Connection...");
  const fileId = crypto.randomUUID();
  const storageKey = `org/${org.id}/verification-test/${fileId}.txt`;

  // 4a. Create DB Record for Asset
  const asset = await prisma.mediaAsset.create({
    data: {
      orgId: org.id,
      userId: user.id,
      storageKey: storageKey,
      mimeType: "text/plain",
      sizeBytes: 1024,
    },
  });
  console.log(`   ✅ MediaAsset DB Record Created: ${asset.id}`);

  // 4b. Generate Signed URL (Tests Supabase connection)
  const { data, error } = await supabaseAdmin.storage
    .from("media") // Make sure this bucket exists!
    .createSignedUploadUrl(storageKey);

  if (error || !data) {
    console.error(`   ❌ Storage Error: ${error?.message}`);
    console.error("      (Hint: Did you create the 'media' bucket in Supabase?)");
    process.exit(1);
  }

  console.log(`   ✅ Signed URL Generated Successfully!`);
  console.log(`      Token: ${data.token.substring(0, 15)}...`);

  console.log("\n🎉 SUCCESS: Database, Relationships, and Storage are all working correctly.");
}

main()
  .catch((e) => {
    console.error("\n❌ Setup Verification Failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });