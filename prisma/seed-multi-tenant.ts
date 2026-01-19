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

  // Create admin role
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: { name: "admin" },
  });

  const userRole = await prisma.role.upsert({
    where: { name: "user" },
    update: {},
    create: { name: "user" },
  });

  console.log("✓ Created roles");

  // Create admin user
  const passwordHash = await hashPassword("Admin123!");
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
      passwordHash,
      agreedToTerms: true,
      agreedToSms: false,
      roles: {
        create: [{ roleId: adminRole.id }, { roleId: userRole.id }],
      },
    },
  });

  console.log(`✓ Created admin user: ${adminUser.email}`);

  // Create sample products
  const classesCategory = await prisma.productCategory.findFirst({
    where: {
      studioId: studio.id,
      name: "Classes",
    },
  });

  if (classesCategory) {
    await prisma.product.create({
      data: {
        studioId: studio.id,
        categoryId: classesCategory.id,
        name: "Beginner Wheel Throwing",
        description: "Learn the basics of wheel throwing in this 6-week course",
        price: 250.0,
        isActive: true,
        displayOrder: 1,
      },
    });

    await prisma.product.create({
      data: {
        studioId: studio.id,
        categoryId: classesCategory.id,
        name: "Advanced Handbuilding",
        description: "Take your handbuilding skills to the next level",
        price: 300.0,
        isActive: true,
        displayOrder: 2,
      },
    });

    console.log("✓ Created sample products");
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
