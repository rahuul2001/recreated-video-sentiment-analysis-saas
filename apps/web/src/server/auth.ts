import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./db";

export async function getOrCreateUser() {
  const { userId: clerkId } = await auth();
  
  if (!clerkId) {
    return null;
  }

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

    user = await prisma.user.create({
      data: {
        clerkId,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        name: clerkUser.firstName
          ? `${clerkUser.firstName} ${clerkUser.lastName ?? ""}`.trim()
          : null,
        imageUrl: clerkUser.imageUrl,
      },
      include: {
        memberships: {
          include: { org: true },
        },
      },
    });
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
