import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./db";

export async function getOrCreateUser() {
  const { userId: clerkId } = await auth();
  
  if (!clerkId) {
    return null;
  }

  // First try to find existing user
  let user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      memberships: {
        include: { org: true },
      },
    },
  });

  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const name = clerkUser.firstName
      ? `${clerkUser.firstName} ${clerkUser.lastName ?? ""}`.trim()
      : null;

    // Use upsert to handle race conditions where multiple requests
    // try to create the same user simultaneously
    try {
      user = await prisma.user.upsert({
        where: { clerkId },
        update: {
          email,
          name,
          imageUrl: clerkUser.imageUrl,
        },
        create: {
          clerkId,
          email,
          name,
          imageUrl: clerkUser.imageUrl,
        },
        include: {
          memberships: {
            include: { org: true },
          },
        },
      });
    } catch (e: any) {
      // If upsert fails due to email constraint, the user exists - fetch it
      if (e.code === 'P2002') {
        user = await prisma.user.findUnique({
          where: { clerkId },
          include: {
            memberships: {
              include: { org: true },
            },
          },
        });
      } else {
        throw e;
      }
    }
  }

  return user;
}

export async function getOrCreateUserWithOrg() {
  const user = await getOrCreateUser();
  if (!user) return null;

  let membership = user.memberships[0];

  if (!membership) {
    const org = await prisma.organization.create({
      data: {
        name: `${user.name ?? user.email}'s Organization`,
      },
    });

    membership = await prisma.membership.create({
      data: {
        userId: user.id,
        orgId: org.id,
        role: "OWNER",
      },
      include: { org: true },
    });
  }

  return {
    user,
    org: membership.org,
    role: membership.role,
  };
}
