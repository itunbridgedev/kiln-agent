import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkResources() {
  console.log("\n=== Checking Studio Resources ===\n");

  // Get all studios
  const studios = await prisma.studio.findMany({
    select: { id: true, name: true },
  });

  for (const studio of studios) {
    console.log(`\nStudio: ${studio.name} (ID: ${studio.id})`);

    // Get resources for this studio
    const resources = await prisma.studioResource.findMany({
      where: { studioId: studio.id },
    });

    console.log(`  Resources: ${resources.length} found`);
    for (const resource of resources) {
      console.log(`    - ${resource.name}: ${resource.quantity} available`);
    }

    // Get classes for this studio
    const classes = await prisma.class.findMany({
      where: { studioId: studio.id, isActive: true },
      include: {
        resourceRequirements: {
          include: {
            resource: true,
          },
        },
      },
      take: 5,
    });

    console.log(`\n  Classes with resource requirements:`);
    for (const cls of classes) {
      if (cls.resourceRequirements.length > 0) {
        console.log(`    ${cls.name}:`);
        for (const req of cls.resourceRequirements) {
          console.log(
            `      - Requires ${req.quantityPerStudent} x ${req.resource.name} per student`
          );
        }
      }
    }
  }

  console.log("\n");
  await prisma.$disconnect();
}

checkResources().catch(console.error);
