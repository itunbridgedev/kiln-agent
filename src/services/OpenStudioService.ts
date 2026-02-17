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

  // Helper: check if a booking overlaps with a time range
  const timeOverlaps = (bookStart: string, bookEnd: string, slotStart: string, slotEnd: string): boolean => {
    return bookStart < slotEnd && bookEnd > slotStart;
  };

  // Calculate resource availability per time slot
  const availability = resources.map((resource) => {
    // Calculate how many of this resource are held by overlapping classes
    let heldByClasses = 0;
    const heldSlots: { startTime: string; endTime: string }[] = [];

    for (const overlap of overlappingSessions) {
      const resourceReq = overlap.class.resourceRequirements.find(
        (r) => r.resourceId === resource.id
      );

      if (!resourceReq) continue;

      const now = new Date();
      // Use the session's actual start time (not midnight) for release calculation
      const sessionDateTime = new Date(overlap.sessionDate);
      const [startH, startM] = overlap.startTime.split(":").map(Number);
      sessionDateTime.setUTCHours(startH, startM, 0, 0);
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
        heldSlots.push({ startTime: overlap.startTime, endTime: overlap.endTime });
      } else {
        // After cutoff or no hold: only count actual allocations
        const actualUsed = overlap.resourceAllocations
          .filter((a) => a.resourceId === resource.id)
          .reduce((sum, a) => sum + a.quantity, 0);
        if (actualUsed > 0) {
          heldSlots.push({ startTime: overlap.startTime, endTime: overlap.endTime });
        }
        heldByClasses += actualUsed;
      }
    }

    // Get existing open studio bookings on this resource
    const bookedOnResource = existingBookings.filter(
      (b) => b.resourceId === resource.id
    );

    // For each hour in the session, check if slot is fully booked
    // If so, add to heldSlots so users can see the waitlist option
    const startHour = parseInt(session.startTime.split(":")[0]);
    const endHour = parseInt(session.endTime.split(":")[0]);
    for (let h = startHour; h < endHour; h++) {
      const slotStart = `${String(h).padStart(2, "0")}:00`;
      const slotEnd = `${String(h + 1).padStart(2, "0")}:00`;

      // Check if this hour slot is already in heldSlots (from overlapping classes)
      const alreadyHeld = heldSlots.some(
        (hs) => hs.startTime <= slotStart && hs.endTime > slotStart
      );

      if (!alreadyHeld) {
        // Count bookings that overlap with this hourly slot
        const bookingsInSlot = bookedOnResource.filter((b) =>
          timeOverlaps(b.startTime, b.endTime, slotStart, slotEnd)
        );

        // If all units are booked for this slot, mark it as held
        if (bookingsInSlot.length >= resource.quantity) {
          heldSlots.push({ startTime: slotStart, endTime: slotEnd });
        }
      }
    }

    const totalAvailable = resource.quantity - heldByClasses;
    const currentlyBooked = bookedOnResource.length;

    return {
      resourceId: resource.id,
      resourceName: resource.name,
      totalQuantity: resource.quantity,
      heldByClasses,
      heldSlots,
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

  // Fetch waitlist counts grouped by (resourceId, startTime)
  const waitlistCounts = await prisma.openStudioWaitlist.groupBy({
    by: ["resourceId", "startTime"],
    where: {
      sessionId,
      cancelledAt: null,
      fulfilledAt: null,
    },
    _count: true,
  });

  // Fetch user's own waitlist entries for this session (keyed by subscription)
  const myWaitlistEntries = await prisma.openStudioWaitlist.findMany({
    where: {
      sessionId,
      cancelledAt: null,
      fulfilledAt: null,
    },
    select: {
      id: true,
      resourceId: true,
      startTime: true,
      endTime: true,
      position: true,
      subscriptionId: true,
    },
  });

  // Map waitlist counts onto resources
  const resourcesWithWaitlist = availability.map((r) => {
    const counts: Record<string, number> = {};
    for (const wc of waitlistCounts) {
      if (wc.resourceId === r.resourceId) {
        counts[wc.startTime] = wc._count;
      }
    }
    const entries = myWaitlistEntries.filter((e) => e.resourceId === r.resourceId);
    return {
      ...r,
      waitlistCounts: counts,
      waitlistEntries: entries,
    };
  });

  // Opportunistic trigger: if any slot has availability AND waitlist entries, process
  for (const wc of waitlistCounts) {
    const resource = availability.find((r) => r.resourceId === wc.resourceId);
    if (resource && resource.available > 0) {
      // Fire and forget — don't block the response
      processWaitlist(sessionId, wc.resourceId, wc.startTime).catch((err) =>
        console.error("Opportunistic waitlist processing error:", err)
      );
    }
  }

  return {
    session: {
      id: session.id,
      sessionDate: session.sessionDate,
      startTime: session.startTime,
      endTime: session.endTime,
      className: session.class.name,
    },
    resources: resourcesWithWaitlist,
  };
}

/**
 * Create a booking for a time block on a specific resource
 */
export async function createBooking(
  subscriptionId: number | undefined,
  customerPunchPassId: number | undefined,
  sessionId: number,
  resourceId: number,
  startTime: string,
  endTime: string
) {
  const now = new Date();
  let studioId: number = 0;
  let customerId: number = 0;

  // Validate that we have either subscription or punch pass
  if (!subscriptionId && !customerPunchPassId) {
    throw new Error("Either subscription or punch pass is required");
  }

  // Handle subscription-based booking
  if (subscriptionId) {
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

    studioId = subscription.studioId;
    customerId = subscription.customerId;
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

    const sessionDate = new Date(session.sessionDate);
    const daysUntilSession = Math.ceil(
      (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilSession > advanceDays) {
      throw new Error(
        `You can only book up to ${advanceDays} day(s) in advance`
      );
    }
  } 
  // Handle punch pass-based booking
  else if (customerPunchPassId) {
    const customerPunchPass = await prisma.customerPunchPass.findUnique({
      where: { id: customerPunchPassId },
      include: { punchPass: true },
    });

    if (!customerPunchPass) {
      throw new Error("Punch pass not found");
    }

    // Check punch pass is not expired
    if (customerPunchPass.expiresAt < now) {
      throw new Error("Punch pass has expired");
    }

    // Check punch pass has remaining punches
    if (customerPunchPass.punchesRemaining <= 0) {
      throw new Error("No punches remaining on this pass");
    }

    studioId = customerPunchPass.studioId;
    customerId = customerPunchPass.customerId;

    // For punch passes, allow flexible duration (no specific max)
    // Just validate time is positive
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const blockMinutes = (endH * 60 + endM) - (startH * 60 + startM);

    if (blockMinutes <= 0) {
      throw new Error("End time must be after start time");
    }
  }

  // Common validation for both booking types
  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new Error("Session not found");
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
      customerId,
      studioId,
      isActive: true,
      suspendedUntil: { gt: now },
    },
  });

  if (activeSuspension) {
    throw new Error("Your account is currently suspended");
  }

  return prisma.openStudioBooking.create({
    data: {
      studioId,
      subscriptionId: subscriptionId || undefined,
      customerPunchPassId: customerPunchPassId || undefined,
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
 * Cancel a booking, then trigger waitlist processing for the freed slot
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

  const result = await prisma.openStudioBooking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
  });

  // Trigger waitlist processing for the freed slot
  try {
    await processWaitlist(booking.sessionId, booking.resourceId, booking.startTime);
  } catch (err) {
    console.error("Error processing waitlist after cancellation:", err);
  }

  return result;
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

/**
 * Join the waitlist for a held/unavailable time slot
 */
export async function joinWaitlist(
  subscriptionId: number,
  sessionId: number,
  resourceId: number,
  startTime: string,
  endTime: string
) {
  const subscription = await prisma.membershipSubscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    throw new Error("Subscription not found");
  }

  if (subscription.status !== "ACTIVE") {
    throw new Error("Subscription is not active");
  }

  // Verify the slot is actually unavailable — if open, user should book directly
  const availability = await getAvailability(sessionId);
  const resource = availability.resources.find((r) => r.resourceId === resourceId);
  if (!resource) {
    throw new Error("Resource not found for this session");
  }

  const slotIsHeld = (resource.heldSlots || []).some(
    (s) => s.startTime <= startTime && s.endTime > startTime
  );
  const slotIsBooked = resource.bookings.some(
    (b) => b.startTime <= startTime && b.endTime > startTime
  );

  if (!slotIsHeld && !slotIsBooked) {
    throw new Error("This slot is currently available — book it directly instead");
  }

  // Calculate position as max + 1 for this (session, resource, startTime)
  const maxPosition = await prisma.openStudioWaitlist.aggregate({
    where: {
      sessionId,
      resourceId,
      startTime,
      cancelledAt: null,
      fulfilledAt: null,
    },
    _max: { position: true },
  });

  const position = (maxPosition._max.position ?? 0) + 1;

  return prisma.openStudioWaitlist.create({
    data: {
      studioId: subscription.studioId,
      subscriptionId,
      sessionId,
      resourceId,
      startTime,
      endTime,
      position,
    },
    include: {
      resource: { select: { name: true } },
      session: { select: { sessionDate: true, startTime: true, endTime: true } },
    },
  });
}

/**
 * Leave the waitlist
 */
export async function leaveWaitlist(waitlistId: number, subscriptionId: number) {
  const entry = await prisma.openStudioWaitlist.findUnique({
    where: { id: waitlistId },
  });

  if (!entry) {
    throw new Error("Waitlist entry not found");
  }

  if (entry.subscriptionId !== subscriptionId) {
    throw new Error("Not authorized to cancel this waitlist entry");
  }

  if (entry.cancelledAt || entry.fulfilledAt) {
    throw new Error("Waitlist entry is already resolved");
  }

  return prisma.openStudioWaitlist.update({
    where: { id: waitlistId },
    data: { cancelledAt: new Date() },
  });
}

/**
 * Get a customer's active waitlist entries
 */
export async function getMyWaitlistEntries(customerId: number) {
  return prisma.openStudioWaitlist.findMany({
    where: {
      subscription: { customerId },
      cancelledAt: null,
      fulfilledAt: null,
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
    orderBy: { joinedAt: "desc" },
  });
}

/**
 * Process the waitlist for a specific slot: auto-book for the next eligible member
 */
export async function processWaitlist(
  sessionId: number,
  resourceId: number,
  startTime: string
) {
  const entries = await prisma.openStudioWaitlist.findMany({
    where: {
      sessionId,
      resourceId,
      startTime,
      cancelledAt: null,
      fulfilledAt: null,
    },
    orderBy: { position: "asc" },
  });

  for (const entry of entries) {
    try {
      const booking = await createBooking(
        entry.subscriptionId,
        undefined, // customerPunchPassId
        entry.sessionId,
        entry.resourceId,
        entry.startTime,
        entry.endTime
      );

      await prisma.openStudioWaitlist.update({
        where: { id: entry.id },
        data: { fulfilledAt: new Date(), bookingId: booking.id },
      });

      return booking; // Slot filled, stop processing
    } catch (err) {
      // Member not eligible (expired, limit reached, etc.) — skip them
      await prisma.openStudioWaitlist.update({
        where: { id: entry.id },
        data: { cancelledAt: new Date() },
      });
    }
  }

  return null; // No one could be booked
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
