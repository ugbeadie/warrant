import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

const main = async () => {
  const roles = [
    { name: "viewer", rank: 1 },
    { name: "editor", rank: 2 },
    { name: "admin", rank: 3 },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  console.log("Roles seeded");

  const adminEmail = "admin@warrant.dev";
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin12345", 10);

    await prisma.user.create({
      data: {
        username: "admin",
        email: adminEmail,
        password: hashedPassword,
        platformRole: "ADMIN",
      },
    });

    console.log("Seed admin created: admin@warrant.dev / admin12345");
  } else {
    console.log("Seed admin already exists, skipping");
  }
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
