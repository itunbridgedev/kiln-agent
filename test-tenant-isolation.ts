import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testTenantIsolation() {
  console.log("\n🧪 Testing Tenant Isolation...\n");

  try {
    // Create second studio
    console.log("1️⃣ Creating 'Pottery Place' studio...");
    const potteryPlace = await prisma.studio.create({
      data: {
        name: "Pottery Place Studio",
        subdomain: "pottery-place",
        isActive: true,
      },
    });
    console.log(`✓ Created studio: ${potteryPlace.name} (id: ${potteryPlace.id}, subdomain: ${potteryPlace.subdomain})`);

    // Create a custom category for Pottery Place (bypassing tenant middleware)
    console.log("\n2️⃣ Creating custom category for Pottery Place...");
    const customCategory = await prisma.productCategory.create({
      data: {
        studioId: potteryPlace.id,
        name: "Custom Pottery Place Category",
        description: "Only for Pottery Place",
        displayOrder: 1,
        isActive: true,
        isSystemCategory: false,
        featureModule: null,
      },
    });
    console.log(`✓ Created category: ${customCategory.name} (studioId: ${customCategory.studioId})`);

    // Create a product for Pottery Place
    console.log("\n3️⃣ Creating product for Pottery Place...");
    const potteryPlaceProduct = await prisma.product.create({
      data: {
        studioId: potteryPlace.id,
        name: "Pottery Place Special Course",
        description: "Exclusive to Pottery Place",
        price: "350.00",
        categoryId: customCategory.id,
        displayOrder: 1,
        isActive: true,
      },
    });
    console.log(`✓ Created product: ${potteryPlaceProduct.name} (studioId: ${potteryPlaceProduct.studioId})`);

    // Verify data isolation - query all studios
    console.log("\n4️⃣ Verifying data isolation...");
    
    const allStudios = await prisma.studio.findMany({
      include: {
        _count: {
          select: {
            categories: true,
            products: true,
            customers: true,
          },
        },
      },
    });

    console.log("\n📊 Studio Summary:");
    for (const studio of allStudios) {
      console.log(`\n  Studio: ${studio.name} (subdomain: ${studio.subdomain})`);
      console.log(`    - Categories: ${studio._count.categories}`);
      console.log(`    - Products: ${studio._count.products}`);
      console.log(`    - Customers: ${studio._count.customers}`);
    }

    // Query products for each studio
    console.log("\n5️⃣ Querying products per studio...");
    for (const studio of allStudios) {
      const products = await prisma.product.findMany({
        where: { studioId: studio.id },
        select: { id: true, name: true, studioId: true },
      });
      console.log(`\n  ${studio.name}:`);
      products.forEach(p => console.log(`    - [${p.id}] ${p.name} (studioId: ${p.studioId})`));
    }

    console.log("\n✅ Tenant isolation test complete!\n");
  } catch (error) {
    console.error("❌ Error during test:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testTenantIsolation();
