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
      platformFeePercentage: 0.03,
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

  // Create platform admin user
  const platformPasswordHash = await hashPassword("Platform123!");
  const platformUser = await prisma.customer.upsert({
    where: {
      studioId_email: {
        studioId: studio.id,
        email: "platform@kilnagent.com",
      },
    },
    update: {
      isPlatformAdmin: true,
    },
    create: {
      studioId: studio.id,
      name: "Platform Admin",
      email: "platform@kilnagent.com",
      passwordHash: platformPasswordHash,
      agreedToTerms: true,
      agreedToSms: false,
      isPlatformAdmin: true,
      roles: {
        create: [{ roleId: adminRole.id }, { roleId: userRole.id }],
      },
    },
  });

  console.log(
    `✓ Created platform admin user: ${platformUser.email} / Platform123!`
  );

  // Create teaching role
  const teachingRole = await prisma.teachingRole.upsert({
    where: {
      studioId_name: {
        studioId: studio.id,
        name: "Instructor",
      },
    },
    update: {},
    create: {
      studioId: studio.id,
      name: "Instructor",
      description: "Basic pottery instructor",
      isActive: true,
    },
  });

  // Link staff user to teaching role (skip if already exists)
  const existingStaffRole = await prisma.staffTeachingRole.findFirst({
    where: {
      customerId: staffUser.id,
      roleId: teachingRole.id,
    },
  });

  if (!existingStaffRole) {
    await prisma.staffTeachingRole.create({
      data: {
        customerId: staffUser.id,
        roleId: teachingRole.id,
      },
    });
  }

  console.log(`✓ Created teaching role and assigned to staff user`);

  // Clear existing resources and classes to allow re-seeding
  await prisma.sessionResourceAllocation.deleteMany({});
  await prisma.classResourceRequirement.deleteMany({});
  await prisma.studioResource.deleteMany({ where: { studioId: studio.id } });
  await prisma.classSession.deleteMany({ where: { studioId: studio.id } });
  await prisma.classSchedulePattern.deleteMany({
    where: { studioId: studio.id },
  });
  await prisma.classSchedule.deleteMany({ where: { studioId: studio.id } });
  await prisma.classStep.deleteMany({ where: { studioId: studio.id } });
  await prisma.class.deleteMany({ where: { studioId: studio.id } });

  // Create Potter's Wheel resource
  const pottersWheel = await prisma.studioResource.create({
    data: {
      studioId: studio.id,
      name: "Potter's Wheel",
      description: "Electric pottery wheels for wheel throwing",
      quantity: 24,
      isActive: true,
    },
  });

  console.log(
    `✓ Created resource: ${pottersWheel.name} (${pottersWheel.quantity} available)`
  );

  // Create sample classes
  const classesCategory = await prisma.productCategory.findFirst({
    where: {
      studioId: studio.id,
      name: "Classes",
    },
  });

  if (classesCategory) {
    // Single Session Class
    const dateNightClass = await prisma.class.create({
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
        resourceRequirements: {
          create: [
            {
              resourceId: pottersWheel.id,
              quantityPerStudent: 1,
            },
          ],
        },
      },
    });

    // Multi-Session Class
    const beginnerWheelClass = await prisma.class.create({
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
        resourceRequirements: {
          create: [
            {
              resourceId: pottersWheel.id,
              quantityPerStudent: 1,
            },
          ],
        },
      },
    });

    // Series Class
    const tuesdayWheelClass = await prisma.class.create({
      data: {
        studioId: studio.id,
        categoryId: classesCategory.id,
        name: "Tuesday Night Open Wheel",
        description:
          "Weekly drop-in wheel throwing sessions every Tuesday evening. Perfect for ongoing practice and skill development.",
        classType: "series",
        isRecurring: true,
        price: 35.0,
        maxStudents: 10,
        teachingRoleId: teachingRole.id,
        skillLevel: "Intermediate",
        isActive: true,
        resourceRequirements: {
          create: [
            {
              resourceId: pottersWheel.id,
              quantityPerStudent: 1,
            },
          ],
        },
      },
    });

    // Multi-Step Class
    const masterPotteryClass = await prisma.class.create({
      data: {
        studioId: studio.id,
        categoryId: classesCategory.id,
        name: "Master Potter Certification",
        description:
          "A comprehensive 3-part certification program covering wheel throwing, glazing, and kiln firing techniques.",
        classType: "multi-step",
        requiresSequence: true,
        price: 450.0,
        maxStudents: 8,
        teachingRoleId: teachingRole.id,
        skillLevel: "Advanced",
        isActive: true,
        resourceRequirements: {
          create: [
            {
              resourceId: pottersWheel.id,
              quantityPerStudent: 1,
            },
          ],
        },
        steps: {
          create: [
            {
              studioId: studio.id,
              stepNumber: 1,
              name: "Advanced Wheel Throwing Techniques",
              description: "Master complex forms and advanced throwing methods",
              durationHours: 12,
              learningObjectives:
                "Throw large vessels, create complex shapes, master centering",
            },
            {
              studioId: studio.id,
              stepNumber: 2,
              name: "Glaze Chemistry & Application",
              description:
                "Deep dive into glaze formulation and application techniques",
              durationHours: 8,
              learningObjectives:
                "Understand glaze chemistry, mix custom glazes, master application methods",
            },
            {
              studioId: studio.id,
              stepNumber: 3,
              name: "Kiln Operation & Firing",
              description:
                "Learn to load, fire, and maintain kilns safely and effectively",
              durationHours: 6,
              learningObjectives:
                "Load kilns properly, understand firing schedules, troubleshoot firing issues",
            },
          ],
        },
      },
    });

    console.log(
      "✓ Created sample classes (Single Session, Multi-Session, Series, Multi-Step)"
    );

    // Create schedules for each class
    const now = new Date();
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
    nextMonday.setHours(18, 0, 0, 0);

    console.log("Creating schedule patterns for each class...");

    // Schedule Pattern for Date Night Pottery (Single Session) - Next Friday evening
    // RRULE: Single occurrence (COUNT=1)
    const nextFriday = new Date(now);
    nextFriday.setDate(now.getDate() + ((5 + 7 - now.getDay()) % 7 || 7)); // Next Friday
    nextFriday.setHours(19, 0, 0, 0);

    await prisma.classSchedulePattern.create({
      data: {
        studioId: studio.id,
        classId: dateNightClass.id,
        recurrenceRule: "FREQ=WEEKLY;BYDAY=FR;COUNT=1", // Single Friday
        startDate: nextFriday,
        endDate: nextFriday,
        startTime: "19:00",
        durationHours: 2.5,
        maxStudents: 16,
        isActive: true,
      },
    });

    // Schedule Pattern for Beginner Wheel Throwing (Multi-Session) - 6 weeks on Mondays
    // RRULE: Every Monday for 6 occurrences
    await prisma.classSchedulePattern.create({
      data: {
        studioId: studio.id,
        classId: beginnerWheelClass.id,
        recurrenceRule: "FREQ=WEEKLY;BYDAY=MO;COUNT=6", // 6 Mondays
        startDate: nextMonday,
        startTime: "18:00",
        durationHours: 2.0,
        maxStudents: 12,
        isActive: true,
      },
    });

    // Schedule Pattern for Tuesday Night Open Wheel (Series) - 8 weeks on Tuesdays
    // RRULE: Every Tuesday for 8 occurrences
    const nextTuesday = new Date(now);
    nextTuesday.setDate(now.getDate() + ((2 + 7 - now.getDay()) % 7 || 7));
    nextTuesday.setHours(19, 0, 0, 0);

    await prisma.classSchedulePattern.create({
      data: {
        studioId: studio.id,
        classId: tuesdayWheelClass.id,
        recurrenceRule: "FREQ=WEEKLY;BYDAY=TU;COUNT=8", // 8 Tuesdays
        startDate: nextTuesday,
        startTime: "19:00",
        durationHours: 2.0,
        maxStudents: 10,
        isActive: true,
      },
    });

    // Schedule Pattern for Master Potter Certification (Multi-Step) - 3 steps on Wednesdays
    // Create one pattern per step
    const nextWednesday = new Date(now);
    nextWednesday.setDate(now.getDate() + ((3 + 7 - now.getDay()) % 7 || 7));
    nextWednesday.setHours(18, 0, 0, 0);

    const steps = await prisma.classStep.findMany({
      where: { classId: masterPotteryClass.id },
      orderBy: { stepNumber: "asc" },
    });

    for (let i = 0; i < steps.length; i++) {
      const stepStartDate = new Date(nextWednesday);
      stepStartDate.setDate(nextWednesday.getDate() + i * 7); // Each step is one week apart

      await prisma.classSchedulePattern.create({
        data: {
          studioId: studio.id,
          classId: masterPotteryClass.id,
          classStepId: steps[i].id,
          recurrenceRule: "FREQ=WEEKLY;BYDAY=WE;COUNT=1", // Single Wednesday per step
          startDate: stepStartDate,
          endDate: stepStartDate,
          startTime: "18:00",
          durationHours: 3.0,
          maxStudents: 8,
          isActive: true,
        },
      });
    }

    console.log("✓ Created schedule patterns for all classes");
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
