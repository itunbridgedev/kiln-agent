/**
 * Data migration to fix production categories
 * - Remove old/duplicate categories
 * - Mark correct categories as system categories
 * - Clean up category data
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting production category fix...");

  // Get demo studio
  const studio = await prisma.studio.findUnique({
    where: { subdomain: "demo" },
  });

  if (!studio) {
    console.error("Demo studio not found!");
    return;
  }

  console.log(`Found studio: ${studio.name} (ID: ${studio.id})`);

  // Get all categories for this studio
  const categories = await prisma.productCategory.findMany({
    where: { studioId: studio.id },
    orderBy: { id: "asc" },
  });

  console.log(`\nFound ${categories.length} categories:`);
  categories.forEach((cat) => {
    console.log(
      `  - ID ${cat.id}: "${cat.name}" (isSystem: ${cat.isSystemCategory}, parentId: ${cat.parentCategoryId})`
    );
  });

  // Define the 4 system categories we want
  const systemCategoryNames = ["Classes", "Firings", "Memberships", "Retail"];

  // Step 1: Delete all non-system categories that aren't in our list
  const categoriesToDelete = categories.filter(
    (cat) => !systemCategoryNames.includes(cat.name)
  );

  if (categoriesToDelete.length > 0) {
    console.log(
      `\nDeleting ${categoriesToDelete.length} non-system categories...`
    );
    for (const cat of categoriesToDelete) {
      console.log(`  - Deleting: ${cat.name} (ID: ${cat.id})`);
      // First, delete any products in this category
      await prisma.product.deleteMany({
        where: { categoryId: cat.id },
      });
      // Then delete the category
      await prisma.productCategory.delete({
        where: { id: cat.id },
      });
    }
  }

  // Step 2: For each system category name, ensure exactly one exists and is marked as system
  console.log("\nEnsuring system categories are properly configured...");

  const systemCategoryData = [
    {
      name: "Classes",
      description: "Pottery classes and workshops for all skill levels",
      displayOrder: 1,
      featureModule: "class-management",
    },
    {
      name: "Firings",
      description: "Firing services for your pottery pieces",
      displayOrder: 2,
      featureModule: "firing-workflow",
    },
    {
      name: "Memberships",
      description: "Studio membership plans",
      displayOrder: 3,
      featureModule: "membership-billing",
    },
    {
      name: "Retail",
      description: "Retail products - clay, tools, glazes",
      displayOrder: 4,
      featureModule: null,
    },
  ];

  for (const categoryData of systemCategoryData) {
    // Find all categories with this name
    const existingCategories = await prisma.productCategory.findMany({
      where: {
        studioId: studio.id,
        name: categoryData.name,
      },
      orderBy: { id: "asc" },
    });

    if (existingCategories.length === 0) {
      // Create new system category
      console.log(`  - Creating missing category: ${categoryData.name}`);
      await prisma.productCategory.create({
        data: {
          studioId: studio.id,
          name: categoryData.name,
          description: categoryData.description,
          displayOrder: categoryData.displayOrder,
          isSystemCategory: true,
          featureModule: categoryData.featureModule,
          isActive: true,
        },
      });
    } else if (existingCategories.length === 1) {
      // Update the single category to ensure it's marked as system
      const cat = existingCategories[0];
      console.log(`  - Updating category: ${cat.name} (ID: ${cat.id})`);
      await prisma.productCategory.update({
        where: { id: cat.id },
        data: {
          isSystemCategory: true,
          featureModule: categoryData.featureModule,
          description: categoryData.description,
          displayOrder: categoryData.displayOrder,
          parentCategoryId: null, // System categories are always top-level
        },
      });
    } else {
      // Multiple categories with same name - keep the first, delete the rest
      console.log(
        `  - Found ${existingCategories.length} duplicates of "${categoryData.name}"`
      );
      const keepCategory = existingCategories[0];
      const deleteCategories = existingCategories.slice(1);

      // Update the one we're keeping
      await prisma.productCategory.update({
        where: { id: keepCategory.id },
        data: {
          isSystemCategory: true,
          featureModule: categoryData.featureModule,
          description: categoryData.description,
          displayOrder: categoryData.displayOrder,
          parentCategoryId: null,
        },
      });
      console.log(`    - Keeping: ${keepCategory.name} (ID: ${keepCategory.id})`);

      // Move products from duplicates to the kept category
      for (const dupCat of deleteCategories) {
        const productCount = await prisma.product.count({
          where: { categoryId: dupCat.id },
        });
        if (productCount > 0) {
          console.log(
            `    - Moving ${productCount} products from duplicate ID ${dupCat.id} to ${keepCategory.id}`
          );
          await prisma.product.updateMany({
            where: { categoryId: dupCat.id },
            data: { categoryId: keepCategory.id },
          });
        }
        console.log(`    - Deleting duplicate: ID ${dupCat.id}`);
        await prisma.productCategory.delete({
          where: { id: dupCat.id },
        });
      }
    }
  }

  // Final verification
  const finalCategories = await prisma.productCategory.findMany({
    where: { studioId: studio.id },
    orderBy: { displayOrder: "asc" },
  });

  console.log(`\n✅ Category fix complete!`);
  console.log(`\nFinal categories (${finalCategories.length}):`);
  finalCategories.forEach((cat) => {
    console.log(
      `  - ${cat.name}: System=${cat.isSystemCategory}, Order=${cat.displayOrder}, Module=${cat.featureModule}`
    );
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
