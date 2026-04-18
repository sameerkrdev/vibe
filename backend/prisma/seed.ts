import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create users
  const passwordHash = await bcrypt.hash("password123", 12);

  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      username: "alice",
      displayName: "Alice Chen",
      passwordHash,
      tokenBalance: 1200,
      transactions: {
        create: {
          type: "SIGNUP_BONUS",
          amount: 500,
          balanceBefore: 0,
          balanceAfter: 500,
          description: "Welcome bonus",
        },
      },
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      username: "bob",
      displayName: "Bob Kumar",
      passwordHash,
      tokenBalance: 800,
      transactions: {
        create: {
          type: "SIGNUP_BONUS",
          amount: 500,
          balanceBefore: 0,
          balanceAfter: 500,
          description: "Welcome bonus",
        },
      },
    },
  });

  const carol = await prisma.user.upsert({
    where: { email: "carol@example.com" },
    update: {},
    create: {
      email: "carol@example.com",
      username: "carol",
      displayName: "Carol Smith",
      passwordHash,
      tokenBalance: 650,
      transactions: {
        create: {
          type: "SIGNUP_BONUS",
          amount: 500,
          balanceBefore: 0,
          balanceAfter: 500,
          description: "Welcome bonus",
        },
      },
    },
  });

  // Create a public recurring bet
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 30);

  await prisma.bet.upsert({
    where: { inviteCode: "DEMO-WORKOUT" },
    update: {},
    create: {
      inviteCode: "DEMO-WORKOUT",
      title: "30-Day Workout Challenge",
      description: "Daily workout accountability group",
      type: "RECURRING",
      status: "DRAFT",
      visibility: "PUBLIC",
      entryTokens: 100,
      proofDescription: "Photo of gym, workout equipment, or outdoor exercise",
      scheduledDays: ["Monday", "Wednesday", "Friday"],
      startDate,
      endDate,
      creatorId: alice.id,
      participants: {
        create: [
          { userId: alice.id, status: "ACTIVE", tokensLocked: 100 },
          { userId: bob.id, status: "ACTIVE", tokensLocked: 100 },
        ],
      },
    },
  });

  // Create a public LMS bet
  await prisma.bet.upsert({
    where: { inviteCode: "DEMO-LMS" },
    update: {},
    create: {
      inviteCode: "DEMO-LMS",
      title: "Morning Run Streak",
      description: "Run every day. Last one standing wins the pot.",
      type: "LAST_MAN_STANDING",
      status: "DRAFT",
      visibility: "PUBLIC",
      entryTokens: 200,
      proofDescription: "Screenshot of running app showing distance 2km+",
      scheduledDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      startDate,
      endDate,
      creatorId: carol.id,
      participants: {
        create: [
          { userId: carol.id, status: "ACTIVE", tokensLocked: 200 },
        ],
      },
    },
  });

  console.log("Seed complete! Users: alice@example.com, bob@example.com, carol@example.com (password: password123)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
