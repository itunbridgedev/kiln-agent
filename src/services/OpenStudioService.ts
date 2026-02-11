import prisma from "../prisma";

/**
 * Get upcoming Open Studio sessions for a studio
 */
export async function getUpcomingSessions(studioId: number) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return prisma.classSession.findMany({
    where: {
      studioId,
      isCancelled: false,
      sessionDate: { gte: today },
      class: { classType: "open-studio", isActive: true },
    },
    include: {
      class: { select: { id: true, name: true, classType: true } },
      _count: { select: { openStudioBookings: true } },
    },
    orderBy: { sessionDate: "asc" },
    take: 30,
  });
}

/**
 * Get availability for a specific Open Studio session
 * Returns available resources and time slots, factoring in class resource holds
 * and existing bookings.
 */
export async function getAvailability(sessionId: number) {
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    include: {
      class: {
        include: { resourceRequirements: { include: { resource: true } } },
      },
    },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  // Get all wheel-type resources for this studio
  const resources = await prisma.studioResource.findMany({
    where: { studioId: session.studioId, isActive: true },
  });

  // Get existing open studio bookings for this session
  const existingBookings = await prisma.openStudioBooking.findMany({
    where: {
      sessionId,
      status: { in: ["RESERVED", "CHECKED_IN"] },
    },
  });

  // Find overlapping class sessions that might hold resources
  const overlappingSessions = await prisma.classSession.findMany({
    where: {
      studioId: session.studioId,
      sessionDate: session.sessionDate,
      isCancelled: false,
      id: { not: sessionId },
      class: { classType: { not: "open-studio" } },
      OR: [
        {
          AND: [
            { startTime: { lte: session.startTime } },
            { endTime: { gt: session.startTime } },
          ],
        },
        {
          AND: [
            { startTime: { lt: session.endTime } },
            { endTime: { gte: session.endTime } },
          ],
        },
        {
          AND: [
            { startTime: { gte: session.startTime } },
            { endTime: { lte: session.endTime } },
          ],
        },
      ],
    },
    include: {
      class: {
        include: { resourceRequirements: { include: { resource: true } } },
      },
      resourceAllocations: {
        where: {
          registration: { registrationStatus: "CONFIRMED" },
        },
      },
    },
  });

  // Calculate resource availability per time slot
  const availability = resources.map((resource) => {
    // Calculate how many of this resource are held by overlapping classes
    let heldByClasses = 0;

    for (const overlap of overlappingSessions) {
      const resourceReq = overlap.class.resourceRequirements.find(
        (r) => r.resourceId === resource.id
      );

      if (!resourceReq) continue;

      const now = new Date();
      const sessionDateTime = new Date(overlap.sessionDate);
      const releaseHoursMs = (overlap.resourceReleaseHours || 0) * 60 * 60 * 1000;
      const releaseTime = new Date(sessionDateTime.getTime() - releaseHoursMs);
      const isBeforeCutoff = overlap.resourceReleaseHours
        ? now < releaseTime
        : false;

      if (overlap.reserveFullCapacity && isBeforeCutoff) {
        // Before cutoff: hold resources for max capacity
        const maxHeld =
          (overlap.maxStudents || overlap.class.maxStudents) *
          resourceReq.quantityPerStudent;
        // Actual usage from confirmed registrations
        const actualUsed = overlap.resourceAllocations
          .filter((a) => a.resourceId === resource.id)
          .reduce((sum, a) => sum + a.quantity, 0);
        heldByClasses += Math.max(maxHeld, actualUsed);
      } else {
        // After cutoff or no hold: only count actual allocations
        const actualUsed = overlap.resourceAllocations
          .filter((a) => a.resourceId === resource.id)
          .reduce((sum, a) => sum + a.quantity, 0);
        heldByClasses += actualUsed;
      }
    }

    // Count existing open studio bookings on this resource
    // (across all time slots - for simplicity, count distinct bookings)
    const bookedOnResource = existingBookings.filter(
      (b) => b.resourceId === resource.id
    );

    const totalAvailable = resource.quantity - heldByClasses;
    const currentlyBooked = bookedOnResource.length;

    return {
      resourceId: resource.id,
      resourceName: resource.name,
      totalQuantity: resource.quantity,
      heldByClasses,
      currentlyBooked,
      available: Math.max(0, totalAvailable - currentlyBooked),
      bookings: bookedOnResource.map((b) => ({
        id: b.id,
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status,
      })),
    };
  });

  return {
    session: {
      id: session.id,
      sessionDate: session.sessionDate,
      startTime: session.startTime,
      endTime: session.endTime,
      className: session.class.name,
    },
    resources: availability,
  };
}

/**
 * Create a booking for a time block on a specific resource
 */
export async function createBooking(
  subscriptionId: number,
  sessionId: number,
  resourceId: number,
  startTime: string,
  endTime: string
) {
  // Validate the subscription is active
  const subscription = await prisma.membershipSubscription.findUnique({
    where: { id: subscriptionId },
    include: { membership: true },
  });

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  if (subscription.status !== "ACTIVE") {
    throw new Error("Subscription is not active");
  }

  const benefits = subscription.membership.benefits as any;

  // Check block length doesn't exceed membership benefit
  const maxMinutes = benefits?.openStudio?.maxBlockMinutes || 120;
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const blockMinutes = (endH * 60 + endM) - (startH * 60 + startM);

  if (blockMinutes > maxMinutes) {
    throw new Error(
      `Block length ${blockMinutes} minutes exceeds your maximum of ${maxMinutes} minutes`
    );
  }

  if (blockMinutes <= 0) {
    throw new Error("End time must be after start time");
  }

  // Check bookings per week limit
  const maxPerWeek = benefits?.openStudio?.maxBookingsPerWeek || 3;
  const startOfWeek = getStartOfWeek();
  const bookingsThisWeek = await prisma.openStudioBooking.count({
    where: {
      subscriptionId,
      status: { in: ["RESERVED", "CHECKED_IN", "COMPLETED"] },
      reservedAt: { gte: startOfWeek },
    },
  });

  if (bookingsThisWeek >= maxPerWeek) {
    throw new Error(
      `You have reached your limit of ${maxPerWeek} bookings per week`
    );
  }

  // Check advance booking days
  const advanceDays = benefits?.openStudio?.advanceBookingDays || 1;
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  const now = new Date();
  const sessionDate = new Date(session.sessionDate);
  const daysUntilSession = Math.ceil(
    (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilSession > advanceDays) {
    throw new Error(
      `You can only book up to ${advanceDays} day(s) in advance`
    );
  }

  // Check for conflicts on this resource at this time
  const conflict = await prisma.openStudioBooking.findFirst({
    where: {
      sessionId,
      resourceId,
      status: { in: ["RESERVED", "CHECKED_IN"] },
      OR: [
        { AND: [{ startTime: { lte: startTime } }, { endTime: { gt: startTime } }] },
        { AND: [{ startTime: { lt: endTime } }, { endTime: { gte: endTime } }] },
        { AND: [{ startTime: { gte: startTime } }, { endTime: { lte: endTime } }] },
      ],
    },
  });

  if (conflict) {
    throw new Error("This resource is already booked for the requested time");
  }

  // Check customer isn't suspended
  const activeSuspension = await prisma.customerSuspension.findFirst({
    where: {
      customerId: subscription.customerId,
      studioId: subscription.studioId,
      isActive: true,
      suspendedUntil: { gt: now },
    },
  });

  if (activeSuspension) {
    throw new Error("Your account is currently suspended");
  }

  return prisma.openStudioBooking.create({
    data: {
      studioId: subscription.studioId,
      subscriptionId,
      sessionId,
      resourceId,
      startTime,
      endTime,
      status: "RESERVED",
      isWalkIn: false,
    },
    include: {
      resource: { select: { name: true } },
      session: { select: { sessionDate: true, startTime: true, endTime: true } },
    },
  });
}

/**
 * Walk-in check-in: creates a booking with immediate check-in status
 */
export async function walkInCheckIn(
  subscriptionId: number,
  sessionId: number,
  resourceId: number
) {
  const subscription = await prisma.membershipSubscription.findUnique({
    where: { id: subscriptionId },
    include: { membership: true },
  });

  if (!subscription || subscription.status !== "ACTIVE") {
    throw new Error("Active subscription required for walk-in");
  }

  const benefits = subscription.membership.benefits as any;
  if (!benefits?.openStudio?.walkInAllowed) {
    throw new Error("Walk-in not allowed on your membership tier");
  }

  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  const now = new Date();
  const maxMinutes = benefits?.openStudio?.maxBlockMinutes || 120;

  // For walk-in, start now and end at max block length or session end
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const startTime = `${String(currentHours).padStart(2, "0")}:${String(currentMinutes).padStart(2, "0")}`;

  // Calculate end time as min(current + maxBlock, sessionEnd)
  const endMinutes = Math.min(
    currentHours * 60 + currentMinutes + maxMinutes,
    parseInt(session.endTime.split(":")[0]) * 60 +
      parseInt(session.endTime.split(":")[1])
  );
  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

  return prisma.openStudioBooking.create({
    data: {
      studioId: subscription.studioId,
      subscriptionId,
      sessionId,
      resourceId,
      startTime,
      endTime,
      status: "CHECKED_IN",
      isWalkIn: true,
      checkedInAt: now,
    },
    include: {
      resource: { select: { name: true } },
      session: { select: { sessionDate: true } },
    },
  });
}

/**
 * Cancel a booking
 */
export async function cancelBooking(bookingId: number) {
  const booking = await prisma.openStudioBooking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.status !== "RESERVED") {
    throw new Error("Only reserved bookings can be cancelled");
  }

  return prisma.openStudioBooking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
  });
}

/**
 * Check in to a booking
 */
export async function checkIn(bookingId: number) {
  const booking = await prisma.openStudioBooking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.status !== "RESERVED") {
    throw new Error("Only reserved bookings can be checked in");
  }

  return prisma.openStudioBooking.update({
    where: { id: bookingId },
    data: {
      status: "CHECKED_IN",
      checkedInAt: new Date(),
    },
  });
}

/**
 * Get bookings for a customer (via their subscriptions)
 */
export async function getMyBookings(customerId: number) {
  return prisma.openStudioBooking.findMany({
    where: {
      subscription: { customerId },
      status: { in: ["RESERVED", "CHECKED_IN", "COMPLETED"] },
    },
    include: {
      resource: { select: { name: true } },
      session: {
        select: {
          sessionDate: true,
          startTime: true,
          endTime: true,
          class: { select: { name: true } },
        },
      },
    },
    orderBy: { reservedAt: "desc" },
  });
}

function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}
