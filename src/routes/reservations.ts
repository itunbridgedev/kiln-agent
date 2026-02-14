import express, { Request, Response } from 'express';
import { isAuthenticated, AuthenticatedRequest } from '../middleware/auth';
import { reservationService } from '../services/ReservationService';
import { checkInService } from '../services/CheckInService';
import prisma from '../prisma';
import { ReservationStatus } from '@prisma/client';

const router = express.Router();

/**
 * POST /api/reservations
 * Create a new reservation
 */
router.post('/', isAuthenticated, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { registrationId, sessionId, customerNotes } = req.body;
    const customerId = authReq.user?.id;
    
    if (!customerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!registrationId || !sessionId) {
      return res.status(400).json({ 
        error: 'Missing required fields: registrationId, sessionId' 
      });
    }

    // Verify registration belongs to customer
    const registration = await prisma.classRegistration.findUnique({
      where: { id: registrationId },
      select: { customerId: true }
    });

    if (!registration || registration.customerId !== customerId) {
      return res.status(403).json({ 
        error: 'You can only create reservations for your own registrations' 
      });
    }

    // Run all validations
    const validation = await reservationService.validateReservation(
      customerId,
      registrationId,
      sessionId
    );

    if (!validation.valid) {
      return res.status(400).json({ 
        error: validation.error,
        errorCode: validation.errorCode
      });
    }

    // Create reservation
    const reservation = await reservationService.createReservation(
      customerId,
      registrationId,
      sessionId,
      customerNotes
    );

    // Calculate check-in window
    const checkInWindow = checkInService.getCheckInWindow(
      reservation.session.sessionDate,
      reservation.session.startTime,
      false // customer check-in window
    );

    res.status(201).json({
      reservation: {
        id: reservation.id,
        sessionId: reservation.sessionId,
        status: reservation.reservationStatus,
        reservedAt: reservation.reservedAt,
        session: {
          date: reservation.session.sessionDate.toISOString().split('T')[0],
          startTime: reservation.session.startTime,
          endTime: reservation.session.endTime,
          topic: reservation.session.topic,
          className: reservation.session.class.name
        },
        checkInWindow: {
          start: checkInWindow.windowStart,
          end: checkInWindow.windowEnd,
          canCheckIn: checkInWindow.canCheckIn
        }
      }
    });
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ error: 'Failed to create reservation' });
  }
});

/**
 * GET /api/reservations/available
 * List available sessions for reservation
 */
router.get('/available', isAuthenticated, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { registrationId } = req.query;
    const customerId = authReq.user?.id;
    
    if (!customerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!registrationId) {
      return res.status(400).json({ error: 'Missing registrationId parameter' });
    }

    const regId = parseInt(registrationId as string);

    // Verify registration belongs to customer
    const registration = await prisma.classRegistration.findUnique({
      where: { id: regId },
      select: { 
        customerId: true,
        passType: true,
        maxAdvanceReservations: true,
        sessionsRemaining: true
      }
    });

    if (!registration || registration.customerId !== customerId) {
      return res.status(403).json({ 
        error: 'You can only view your own registration details' 
      });
    }

    // Get current reservation count
    const currentReservations = await prisma.sessionReservation.count({
      where: {
        registrationId: regId,
        reservationStatus: {
          in: [ReservationStatus.PENDING, ReservationStatus.CHECKED_IN]
        }
      }
    });

    // Get available sessions
    const sessions = await reservationService.getAvailableSessions(regId);

    // Check which sessions are already reserved (exclude cancelled)
    const reservedSessionIds = await prisma.sessionReservation.findMany({
      where: { 
        registrationId: regId,
        reservationStatus: {
          notIn: ['CANCELLED']
        }
      },
      select: { sessionId: true }
    });
    const reservedIds = new Set(reservedSessionIds.map(r => r.sessionId));

    const availableSessions = sessions.map(session => {
      const currentReservations = session._count.reservations;
      const availableSpots = (session.maxStudents || 0) - currentReservations;
      const isReserved = reservedIds.has(session.id);

      return {
        id: session.id,
        date: session.sessionDate.toISOString().split('T')[0],
        startTime: session.startTime,
        endTime: session.endTime,
        topic: session.topic,
        className: session.class?.name || '',
        maxStudents: session.maxStudents,
        currentReservations,
        availableSpots,
        isAvailable: availableSpots > 0 && !isReserved,
        isReserved
      };
    });

    res.json({
      registration: {
        passType: registration.passType,
        maxAdvanceReservations: registration.maxAdvanceReservations,
        currentReservations,
        canReserveMore: currentReservations < registration.maxAdvanceReservations,
        sessionsRemaining: registration.sessionsRemaining
      },
      sessions: availableSessions
    });
  } catch (error) {
    console.error('Error fetching available sessions:', error);
    res.status(500).json({ error: 'Failed to fetch available sessions' });
  }
});

/**
 * DELETE /api/reservations/:id
 * Cancel a reservation
 */
router.delete('/:id', isAuthenticated, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const reservationId = parseInt(req.params.id);
    const customerId = authReq.user?.id;
    
    if (!customerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { reason } = req.body;

    // Verify reservation belongs to customer
    const reservation = await prisma.sessionReservation.findUnique({
      where: { id: reservationId },
      include: {
        registration: {
          select: { customerId: true }
        }
      }
    });

    if (!reservation || reservation.registration.customerId !== customerId) {
      return res.status(403).json({
        error: 'You can only cancel your own reservations'
      });
    }

    const cancelled = await reservationService.cancelReservation(
      reservationId,
      customerId,
      reason
    );

    res.json({
      message: 'Reservation cancelled successfully',
      reservation: {
        id: cancelled.id,
        status: cancelled.reservationStatus,
        cancelledAt: cancelled.cancelledAt,
        session: {
          date: cancelled.session.sessionDate.toISOString().split('T')[0],
          startTime: cancelled.session.startTime
        }
      }
    });
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    const message = error instanceof Error ? error.message : 'Failed to cancel reservation';
    res.status(400).json({ error: message });
  }
});

/**
 * DELETE /api/reservations/initial/:id
 * Cancel an initial booking (RegistrationSession)
 */
router.delete('/initial/:id', isAuthenticated, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const bookingId = parseInt(req.params.id);
    const customerId = authReq.user?.id;

    if (!customerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify initial booking exists and belongs to customer
    const booking = await prisma.registrationSession.findUnique({
      where: { id: bookingId },
      include: {
        registration: {
          select: { customerId: true }
        },
        session: {
          select: {
            id: true,
            sessionDate: true,
            startTime: true,
            currentEnrollment: true
          }
        }
      }
    });

    if (!booking || booking.registration.customerId !== customerId) {
      return res.status(403).json({
        error: 'You can only cancel your own reservations'
      });
    }

    // Delete the initial booking and decrement enrollment
    await prisma.$transaction(async (tx) => {
      await tx.registrationSession.delete({
        where: { id: bookingId }
      });

      if (booking.session.currentEnrollment > 0) {
        await tx.classSession.update({
          where: { id: booking.session.id },
          data: {
            currentEnrollment: { decrement: 1 }
          }
        });
      }
    });

    res.json({
      message: 'Reservation cancelled successfully',
      reservation: {
        id: bookingId,
        status: 'CANCELLED',
        cancelledAt: new Date(),
        session: {
          date: booking.session.sessionDate.toISOString().split('T')[0],
          startTime: booking.session.startTime
        }
      }
    });
  } catch (error) {
    console.error('Error cancelling initial booking:', error);
    const message = error instanceof Error ? error.message : 'Failed to cancel reservation';
    res.status(400).json({ error: message });
  }
});

/**
 * POST /api/reservations/:id/check-in
 * Check-in (customer self check-in or staff check-in on behalf)
 */
router.post('/:id/check-in', isAuthenticated, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const reservationId = parseInt(req.params.id);
    const userId = authReq.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is staff (has admin or instructor role)
    const userRoles = await prisma.customerRole.findMany({
      where: { customerId: userId },
      include: { role: true }
    });
    const isStaff = userRoles.some(r => ['admin', 'instructor', 'assistant'].includes(r.role.name));

    // Validate check-in
    const validation = await checkInService.validateCheckIn(
      reservationId,
      userId,
      isStaff
    );

    if (!validation.valid) {
      return res.status(400).json({ 
        error: validation.error,
        errorCode: validation.errorCode
      });
    }

    // Perform check-in
    const checkedIn = await checkInService.checkIn(
      reservationId,
      userId,
      isStaff
    );

    res.json({
      message: 'Checked in successfully',
      reservation: {
        id: checkedIn.id,
        status: checkedIn.reservationStatus,
        checkedInAt: checkedIn.checkedInAt,
        punchUsed: checkedIn.punchUsed,
        session: {
          date: checkedIn.session.sessionDate.toISOString().split('T')[0],
          startTime: checkedIn.session.startTime,
          endTime: checkedIn.session.endTime,
          topic: checkedIn.session.topic,
          className: checkedIn.session.class.name
        },
        registration: {
          sessionsAttended: checkedIn.registration.sessionsAttended,
          sessionsRemaining: checkedIn.registration.sessionsRemaining
        }
      }
    });
  } catch (error) {
    console.error('Error checking in:', error);
    const message = error instanceof Error ? error.message : 'Failed to check in';
    res.status(400).json({ error: message });
  }
});

/**
 * POST /api/reservations/:id/undo-check-in
 * Undo check-in (staff only - for correcting mistakes)
 */
router.post('/:id/undo-check-in', isAuthenticated, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const reservationId = parseInt(req.params.id);
    const staffId = authReq.user?.id;
    
    if (!staffId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the reservation
    const reservation = await prisma.sessionReservation.findUnique({
      where: { id: reservationId },
      include: {
        registration: true,
        session: true,
      }
    });

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    if (reservation.reservationStatus !== 'CHECKED_IN') {
      return res.status(400).json({ error: 'Reservation is not checked in' });
    }

    // Undo check-in: revert to PENDING
    const updated = await prisma.sessionReservation.update({
      where: { id: reservationId },
      data: {
        reservationStatus: 'PENDING',
        checkedInAt: null,
        checkedInBy: null,
        checkedInMethod: null,
      },
      include: {
        registration: true,
        session: {
          include: {
            class: true,
          }
        }
      }
    });

    // If a punch was used, restore it
    if (reservation.punchUsed && reservation.punchDeductedAt) {
      await prisma.classRegistration.update({
        where: { id: reservation.registrationId },
        data: {
          sessionsRemaining: { increment: 1 },
          sessionsAttended: { decrement: 1 },
        }
      });
    }

    res.json({
      message: 'Check-in undone successfully',
      reservation: {
        id: updated.id,
        status: updated.reservationStatus,
        session: {
          date: updated.session.sessionDate.toISOString().split('T')[0],
          startTime: updated.session.startTime,
          endTime: updated.session.endTime,
          className: updated.session.class.name
        }
      }
    });
  } catch (error) {
    console.error('Error undoing check-in:', error);
    const message = error instanceof Error ? error.message : 'Failed to undo check-in';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/reservations/my
 * List customer's reservations across all their registrations
 */
router.get('/my', isAuthenticated, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const customerId = authReq.user?.id;
    
    if (!customerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { status, upcoming } = req.query;

    const where: {
      registration: { customerId: number };
      reservationStatus?: { in: ReservationStatus[] };
      session?: { sessionDate: { gte: Date } };
    } = {
      registration: {
        customerId
      }
    };

    if (status && typeof status === 'string') {
      where.reservationStatus = { in: [status as ReservationStatus] };
    }

    if (upcoming === 'true') {
      where.session = {
        sessionDate: {
          gte: new Date()
        }
      };
    }

    const reservations = await prisma.sessionReservation.findMany({
      where,
      include: {
        session: {
          include: {
            class: true
          }
        },
        registration: {
          select: {
            id: true,
            passType: true,
            class: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        session: {
          sessionDate: 'asc'
        }
      }
    });

    const formatted = reservations.map(r => {
      const checkInWindow = checkInService.getCheckInWindow(
        r.session.sessionDate,
        r.session.startTime,
        false
      );

      return {
        id: r.id,
        status: r.reservationStatus,
        reservedAt: r.reservedAt,
        checkedInAt: r.checkedInAt,
        attendedAt: r.attendedAt,
        cancelledAt: r.cancelledAt,
        punchUsed: r.punchUsed,
        session: {
          id: r.session.id,
          date: r.session.sessionDate,
          startTime: r.session.startTime,
          endTime: r.session.endTime,
          topic: r.session.topic,
          className: r.session.class.name
        },
        registration: {
          id: r.registration.id,
          className: r.registration.class.name,
          passType: r.registration.passType
        },
        checkInWindow: r.reservationStatus === ReservationStatus.PENDING ? {
          start: checkInWindow.windowStart,
          end: checkInWindow.windowEnd,
          canCheckIn: checkInWindow.canCheckIn
        } : null
      };
    });

    res.json({ reservations: formatted });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

/**
 * GET /api/reservations/my-reservations
 * Get all reservations across all registrations for the current customer
 * Includes both flexible reservations (SessionReservation) and initial bookings (RegistrationSession)
 */
router.get('/my-reservations', isAuthenticated, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const customerId = authReq.user?.id;
    
    if (!customerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get today's date at midnight in local timezone, then get the UTC date portion
    // This ensures we include sessions from "today" in the local timezone
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Convert to UTC by getting just the date portion and setting to midnight UTC
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    
    // For Open Studio bookings, also include sessions from past 3 days to handle timezone differences
    // e.g., Feb 13 local time = Feb 14 UTC, so we need to show Feb 13 bookings
    const threeDaysAgoUTC = new Date(todayUTC);
    threeDaysAgoUTC.setDate(threeDaysAgoUTC.getDate() - 3);

    console.log('[DEBUG] Current time:', now.toISOString());
    console.log('[DEBUG] Today local midnight as UTC:', todayUTC.toISOString());
    console.log('[DEBUG] Including bookings from:', threeDaysAgoUTC.toISOString());

    // Get all registrations for the customer
    const registrations = await prisma.classRegistration.findMany({
      where: { customerId },
      select: {
        id: true,
        validFrom: true,
        passType: true,
        maxAdvanceReservations: true,
        sessionsRemaining: true,
        class: {
          select: {
            id: true,
            name: true
          }
        },
        // Get flexible reservations (SessionReservation)
        reservations: {
          where: {
            reservationStatus: {
              in: ['PENDING', 'CHECKED_IN']
            },
            session: {
              sessionDate: {
                gte: todayUTC
              }
            }
          },
          include: {
            session: {
              select: {
                id: true,
                sessionDate: true,
                startTime: true,
                endTime: true,
                topic: true,
                class: {
                  select: {
                    name: true
                  }
                }
              }
            }
          },
          orderBy: [
            {
              session: {
                sessionDate: 'asc'
              }
            },
            {
              session: {
                startTime: 'asc'
              }
            }
          ]
        },
        // Get initial bookings (RegistrationSession)
        sessions: {
          where: {
            attended: false,
            session: {
              sessionDate: {
                gte: todayUTC
              }
            }
          },
          include: {
            session: {
              select: {
                id: true,
                sessionDate: true,
                startTime: true,
                endTime: true,
                topic: true,
                class: {
                  select: {
                    name: true
                  }
                }
              }
            }
          },
          orderBy: [
            {
              session: {
                sessionDate: 'asc'
              }
            },
            {
              session: {
                startTime: 'asc'
              }
            }
          ]
        }
      }
    });

    // Fetch Open Studio bookings for this customer
    // Include past 3 days to handle timezone differences (user's Feb 13 = server's Feb 14)
    const openStudioBookings = await prisma.openStudioBooking.findMany({
      where: {
        subscription: {
          customerId
        },
        status: { in: ['RESERVED', 'CHECKED_IN'] },
        session: {
          sessionDate: {
            gte: threeDaysAgoUTC
          }
        }
      },
      include: {
        session: {
          select: {
            id: true,
            sessionDate: true,
            startTime: true,
            endTime: true,
            class: {
              select: {
                name: true
              }
            }
          }
        },
        resource: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { session: { sessionDate: 'asc' } },
        { startTime: 'asc' }
      ]
    });

    // Fetch Open Studio waitlist entries for this customer
    // Include past 3 days to handle timezone differences
    const openStudioWaitlist = await prisma.openStudioWaitlist.findMany({
      where: {
        subscription: {
          customerId
        },
        cancelledAt: null,
        fulfilledAt: null,
        session: {
          sessionDate: {
            gte: threeDaysAgoUTC
          }
        }
      },
      include: {
        session: {
          select: {
            id: true,
            sessionDate: true,
            startTime: true,
            endTime: true,
            class: {
              select: {
                name: true
              }
            }
          }
        },
        resource: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { session: { sessionDate: 'asc' } },
        { startTime: 'asc' }
      ]
    });

    // Count current reservations for each registration
    const registrationsWithCounts = await Promise.all(
      registrations.map(async (reg) => {
        // Count flexible reservations
        const flexibleReservationCount = await prisma.sessionReservation.count({
          where: {
            registrationId: reg.id,
            reservationStatus: {
              in: ['PENDING', 'CHECKED_IN']
            }
          }
        });

        // Count initial bookings
        const initialBookingCount = await prisma.registrationSession.count({
          where: {
            registrationId: reg.id
          }
        });

        const currentReservations = flexibleReservationCount + initialBookingCount;

        console.log(`[DEBUG] Registration ${reg.id}: ${reg.reservations.length} flexible + ${reg.sessions.length} initial bookings`);
        
        // Combine both types of reservations into a unified format
        const allReservations = [
          // Flexible reservations
          ...reg.reservations.map(r => ({
            id: r.id,
            status: r.reservationStatus,
            reservedAt: r.reservedAt,
            session: {
              id: r.session.id,
              date: r.session.sessionDate.toISOString().split('T')[0],
              startTime: r.session.startTime,
              endTime: r.session.endTime,
              topic: r.session.topic,
              className: r.session.class.name
            },
            sessionDate: r.session.sessionDate,
            startTime: r.session.startTime,
            source: 'flexible' as const
          })),
          // Initial bookings
          ...reg.sessions.map(ib => ({
            id: ib.id,
            status: 'PENDING' as const,
            reservedAt: reg.validFrom || new Date(),
            session: {
              id: ib.session.id,
              date: ib.session.sessionDate.toISOString().split('T')[0],
              startTime: ib.session.startTime,
              endTime: ib.session.endTime,
              topic: ib.session.topic,
              className: ib.session.class.name
            },
            sessionDate: ib.session.sessionDate,
            startTime: ib.session.startTime,
            source: 'initial' as const
          }))
        ].sort((a, b) => {
          // Sort by date first, then by start time
          const dateCompare = new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime();
          if (dateCompare !== 0) return dateCompare;
          return a.startTime.localeCompare(b.startTime);
        });

        console.log(`  Total upcoming: ${allReservations.length} reservations`);
        allReservations.forEach(r => {
          console.log(`  - ${r.status} on ${r.session.date} at ${r.session.startTime} (${r.source})`);
        });

        return {
          id: reg.id,
          className: reg.class.name,
          passType: reg.passType,
          currentReservations,
          maxReservations: reg.maxAdvanceReservations,
          sessionsRemaining: reg.sessionsRemaining,
          upcomingReservations: allReservations.map(r => {
            // Calculate check-in window for each reservation
            const checkInWindow = checkInService.getCheckInWindow(
              new Date(r.session.date),
              r.session.startTime,
              false, // customer check-in
              r.session.endTime // pass session end time
            );

            return {
              id: r.id,
              status: r.status,
              reservedAt: r.reservedAt,
              session: r.session,
              checkInWindow: {
                start: checkInWindow.windowStart.toISOString(),
                end: checkInWindow.windowEnd.toISOString(),
                canCheckIn: checkInWindow.canCheckIn
              }
            };
          })
        };
      })
    );

    res.json({ 
      registrations: registrationsWithCounts,
      openStudioBookings: openStudioBookings.map(b => {
        // Check-in window: 2 hours before booking start to 2 hours after session end
        const checkInStart = new Date(b.session.sessionDate);
        const [startH, startM] = b.startTime.split(':').map(Number);
        checkInStart.setUTCHours(startH, startM, 0, 0);
        checkInStart.setUTCHours(checkInStart.getUTCHours() - 2);
        
        const checkInEnd = new Date(b.session.sessionDate);
        const [endH, endM] = b.session.endTime.split(':').map(Number);
        checkInEnd.setUTCHours(endH, endM, 0, 0);
        checkInEnd.setUTCHours(checkInEnd.getUTCHours() + 2);
        
        const now = new Date();
        const canCheckIn = now >= checkInStart && now <= checkInEnd;
        
        return {
          id: b.id,
          className: b.session.class.name,
          resourceName: b.resource.name,
          status: b.status,
          reservedAt: b.reservedAt,
          session: {
            id: b.session.id,
            date: b.session.sessionDate.toISOString().split('T')[0],
            startTime: b.session.startTime,
            endTime: b.session.endTime,
            className: b.session.class.name
          },
          bookingStartTime: b.startTime,
          bookingEndTime: b.endTime,
          checkInWindow: {
            start: checkInStart.toISOString(),
            end: checkInEnd.toISOString(),
            canCheckIn
          }
        };
      }),
      openStudioWaitlist: openStudioWaitlist.map(w => ({
        id: w.id,
        className: w.session.class.name,
        resourceName: w.resource.name,
        position: w.position,
        reservedAt: w.joinedAt,
        session: {
          id: w.session.id,
          date: w.session.sessionDate.toISOString().split('T')[0],
          startTime: w.session.startTime,
          endTime: w.session.endTime,
          className: w.session.class.name
        },
        waitlistStartTime: w.startTime,
        waitlistEndTime: w.endTime
      }))
    });
  } catch (error) {
    console.error('Error fetching my reservations:', error);
    res.status(500).json({ error: 'Failed to fetch reservations' });
  }
});

export default router;
