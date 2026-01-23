import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/auth";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting multi-tenant seed...");

  // Create default studio
  const studio = await prisma.studio.upsert({
    where: { subdomain: "demo" },
    update: {},
    create: {
      name: "Demo Pottery Studio",
      subdomain: "demo",
      isActive: true,
    },
  });

  console.log(`✓ Created studio: ${studio.name} (${studio.subdomain})`);

  // Create system categories for the studio
  const systemCategories = [
    {
      name: "Classes",
      description: "Pottery classes and workshops",
      displayOrder: 1,
      isSystemCategory: true,
      featureModule: "class-management",
    },
    {
      name: "Firings",
      description: "Firing services for your pottery",
      displayOrder: 2,
      isSystemCategory: true,
      featureModule: "firing-workflow",
    },
    {
      name: "Memberships",
      description: "Studio membership plans",
      displayOrder: 3,
      isSystemCategory: true,
      featureModule: "membership-billing",
    },
    {
      name: "Retail",
      description: "Retail products - clay, tools, glazes",
      displayOrder: 4,
      isSystemCategory: true,
      featureModule: null,
    },
  ];

  for (const categoryData of systemCategories) {
    const category = await prisma.productCategory.upsert({
      where: {
        studioId_name: {
          studioId: studio.id,
          name: categoryData.name,
        },
      },
      update: {},
      create: {
        studioId: studio.id,
        ...categoryData,
      },
    });
    console.log(`✓ Created system category: ${category.name}`);
  }

  // Create system roles
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: { name: "admin" },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: "manager" },
    update: {},
    create: { name: "manager" },
  });

  const staffRole = await prisma.role.upsert({
    where: { name: "staff" },
    update: {},
    create: { name: "staff" },
  });

  const userRole = await prisma.role.upsert({
    where: { name: "user" },
    update: {},
    create: { name: "user" },
  });

  console.log("✓ Created roles");

  // Create admin user
  const adminPasswordHash = await hashPassword("Admin123!");
  const adminUser = await prisma.customer.upsert({
    where: {
      studioId_email: {
        studioId: studio.id,
        email: "admin@kilnagent.com",
      },
    },
    update: {},
    create: {
      studioId: studio.id,
      name: "Admin User",
      email: "admin@kilnagent.com",
      passwordHash: adminPasswordHash,
      agreedToTerms: true,
      agreedToSms: false,
      roles: {
        create: [{ roleId: adminRole.id }, { roleId: userRole.id }],
      },
    },
  });

  console.log(`✓ Created admin user: ${adminUser.email} / Admin123!`);

  // Create manager user
  const managerPasswordHash = await hashPassword("Manager123!");
  const managerUser = await prisma.customer.upsert({
    where: {
      studioId_email: {
        studioId: studio.id,
        email: "manager@kilnagent.com",
      },
    },
    update: {},
    create: {
      studioId: studio.id,
      name: "Manager User",
      email: "manager@kilnagent.com",
      passwordHash: managerPasswordHash,
      agreedToTerms: true,
      agreedToSms: false,
      roles: {
        create: [{ roleId: managerRole.id }, { roleId: userRole.id }],
      },
    },
  });

  console.log(`✓ Created manager user: ${managerUser.email} / Manager123!`);

  // Create staff user
  const staffPasswordHash = await hashPassword("Staff123!");
  const staffUser = await prisma.customer.upsert({
    where: {
      studioId_email: {
        studioId: studio.id,
        email: "staff@kilnagent.com",
      },
    },
    update: {},
    create: {
      studioId: studio.id,
      name: "Staff User",
      email: "staff@kilnagent.com",
      passwordHash: staffPasswordHash,
      agreedToTerms: true,
      agreedToSms: false,
      roles: {
        create: [{ roleId: staffRole.id }, { roleId: userRole.id }],
      },
    },
  });

  console.log(`✓ Created staff user: ${staffUser.email} / Staff123!`);

  // Create customer user
  const customerPasswordHash = await hashPassword("Customer123!");
  const customerUser = await prisma.customer.upsert({
    where: {
      studioId_email: {
        studioId: studio.id,
        email: "customer@kilnagent.com",
      },
    },
    update: {},
    create: {
      studioId: studio.id,
      name: "Customer User",
      email: "customer@kilnagent.com",
      passwordHash: customerPasswordHash,
      agreedToTerms: true,
      agreedToSms: false,
      roles: {
        create: [{ roleId: userRole.id }],
      },
    },
  });

  console.log(`✓ Created customer user: ${customerUser.email} / Customer123!`);

  // Create teaching role
  const teachingRole = await prisma.teachingRole.create({
    data: {
      studioId: studio.id,
      name: "Instructor",
      description: "Basic pottery instructor",
      isActive: true,
    },
  });

  // Link staff user to teaching role
  await prisma.staffTeachingRole.create({
    data: {
      customerId: staffUser.id,
      roleId: teachingRole.id,
    },
  });

  console.log(`✓ Created teaching role and assigned to staff user`);

  // Create sample classes
  const classesCategory = await prisma.productCategory.findFirst({
    where: {
      studioId: studio.id,
      name: "Classes",
    },
  });

  if (classesCategory) {
    await prisma.class.create({
      data: {
        studioId: studio.id,
        categoryId: classesCategory.id,
        name: "Beginner Wheel Throwing",
        description:
          "Learn the basics of wheel throwing in this 6-week course. Perfect for students with little to no experience.",
        classType: "multi-session",
        durationWeeks: 6,
        price: 250.0,
        maxStudents: 12,
        teachingRoleId: teachingRole.id,
        skillLevel: "Beginner",
        isActive: true,
      },
    });

    await prisma.class.create({
      data: {
        studioId: studio.id,
        categoryId: classesCategory.id,
        name: "Advanced Handbuilding",
        description:
          "Take your handbuilding skills to the next level with advanced techniques including coiling, slab building, and sculptural forms.",
        classType: "multi-session",
        durationWeeks: 8,
        price: 300.0,
        maxStudents: 10,
        teachingRoleId: teachingRole.id,
        skillLevel: "Advanced",
        isActive: true,
      },
    });

    await prisma.class.create({
      data: {
        studioId: studio.id,
        categoryId: classesCategory.id,
        name: "Date Night Pottery",
        description:
          "A fun evening workshop perfect for couples or friends. Create your own pottery pieces in a relaxed, social atmosphere.",
        classType: "single-session",
        durationHours: 2.5,
        price: 75.0,
        maxStudents: 16,
        teachingRoleId: teachingRole.id,
        skillLevel: "All Levels",
        isActive: true,
      },
    });

    console.log("✓ Created sample classes");
  }

  console.log("\n✅ Multi-tenant seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
