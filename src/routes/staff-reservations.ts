import express, { Request, Response, NextFunction } from 'express';
import { isAuthenticated, AuthenticatedRequest } from '../middleware/auth';
import { checkInService } from '../services/CheckInService';
import prisma from '../prisma';
import { ReservationStatus } from '@prisma/client';

const router = express.Router();

// Middleware to check if user has staff role
const isStaff = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest;
  const userRoles = authReq.user?.roles?.map((r: { role: { name: string } }) => r.role.name) || [];
  
  if (!userRoles.includes('admin') && !userRoles.includes('staff') && !userRoles.includes('instructor')) {
    return res.status(403).json({ error: 'Staff access required' });
  }
  
  next();
};

/**
 * POST /api/staff/reservations/:id/check-in
 * Staff check-in for a reservation
 */
router.post('/reservations/:id/check-in', isAuthenticated, isStaff, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const reservationId = parseInt(req.params.id);
    const staffId = authReq.user?.id;
    
    if (!staffId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { staffNotes } = req.body;

    // Validate check-in (staff has broader time window)
    const validation = await checkInService.validateCheckIn(
      reservationId,
      staffId,
      true // is staff
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
      staffId,
      true, // is staff
      staffNotes
    );

    res.json({
      message: 'Customer checked in by staff',
      reservation: {
        id: checkedIn.id,
        status: checkedIn.reservationStatus,
        checkedInAt: checkedIn.checkedInAt,
        checkedInMethod: checkedIn.checkedInMethod,
        punchUsed: checkedIn.punchUsed,
        session: {
          date: checkedIn.session.sessionDate,
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
    console.error('Error checking in (staff):', error);
    const message = error instanceof Error ? error.message : 'Failed to check in';
    res.status(400).json({ error: message });
  }
});

/**
 * GET /api/staff/sessions/:id/reservations
 * Get all reservations for a session (roster view)
 */
router.get('/sessions/:id/reservations', isAuthenticated, isStaff, async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.id);

    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        class: true
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const reservations = await prisma.sessionReservation.findMany({
      where: { 
        sessionId,
        reservationStatus: {
          notIn: [ReservationStatus.CANCELLED, ReservationStatus.AUTO_CANCELLED]
        }
      },
      include: {
        registration: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          }
        }
      },
      orderBy: [
        { reservationStatus: 'asc' },
        { reservedAt: 'asc' }
      ]
    });

    const roster = reservations.map(r => ({
      id: r.id,
      status: r.reservationStatus,
      reservedAt: r.reservedAt,
      checkedInAt: r.checkedInAt,
      attendedAt: r.attendedAt,
      punchUsed: r.punchUsed,
      customerNotes: r.customerNotes,
      staffNotes: r.staffNotes,
      customer: {
        id: r.registration.customer?.id,
        name: r.registration.customer?.name || r.registration.guestName || 'Guest',
        email: r.registration.customer?.email || r.registration.guestEmail,
        phone: r.registration.customer?.phone || r.registration.guestPhone
      },
      registration: {
        id: r.registration.id,
        passType: r.registration.passType,
        sessionsAttended: r.registration.sessionsAttended,
        sessionsRemaining: r.registration.sessionsRemaining
      }
    }));

    res.json({
      session: {
        id: session.id,
        date: session.sessionDate,
        startTime: session.startTime,
        endTime: session.endTime,
        topic: session.topic,
        maxStudents: session.maxStudents,
        className: session.class.name
      },
      stats: {
        total: roster.length,
        pending: roster.filter(r => r.status === ReservationStatus.PENDING).length,
        checkedIn: roster.filter(r => r.status === ReservationStatus.CHECKED_IN).length,
        attended: roster.filter(r => r.status === ReservationStatus.ATTENDED).length,
        noShow: roster.filter(r => r.status === ReservationStatus.NO_SHOW).length
      },
      roster
    });
  } catch (error) {
    console.error('Error fetching session roster:', error);
    res.status(500).json({ error: 'Failed to fetch session roster' });
  }
});

/**
 * POST /api/staff/reservations/:id/mark-attended
 * Mark a checked-in reservation as attended
 */
router.post('/reservations/:id/mark-attended', isAuthenticated, isStaff, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const reservationId = parseInt(req.params.id);
    const staffId = authReq.user?.id;
    
    if (!staffId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const attended = await checkInService.markAttended(reservationId, staffId);

    res.json({
      message: 'Marked as attended',
      reservation: {
        id: attended.id,
        status: attended.reservationStatus,
        attendedAt: attended.attendedAt,
        session: {
          date: attended.session.sessionDate,
          startTime: attended.session.startTime
        }
      }
    });
  } catch (error) {
    console.error('Error marking attended:', error);
    const message = error instanceof Error ? error.message : 'Failed to mark as attended';
    res.status(400).json({ error: message });
  }
});

/**
 * GET /api/staff/reservations/upcoming
 * Get upcoming reservations for staff dashboard
 */
router.get('/reservations/upcoming', isAuthenticated, isStaff, async (req: Request, res: Response) => {
  try {
    const { days = '7' } = req.query;
    const daysAhead = parseInt(days as string);

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    const reservations = await prisma.sessionReservation.findMany({
      where: {
        reservationStatus: {
          in: [ReservationStatus.PENDING, ReservationStatus.CHECKED_IN]
        },
        session: {
          sessionDate: {
            gte: new Date(),
            lte: endDate
          }
        }
      },
      include: {
        session: {
          include: {
            class: true
          }
        },
        registration: {
          include: {
            customer: {
              select: {
                name: true,
                email: true
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

    const formatted = reservations.map(r => ({
      id: r.id,
      status: r.reservationStatus,
      session: {
        id: r.session.id,
        date: r.session.sessionDate,
        startTime: r.session.startTime,
        endTime: r.session.endTime,
        topic: r.session.topic,
        className: r.session.class.name
      },
      customer: {
        name: r.registration.customer?.name || r.registration.guestName || 'Guest',
        email: r.registration.customer?.email || r.registration.guestEmail
      }
    }));

    res.json({ reservations: formatted });
  } catch (error) {
    console.error('Error fetching upcoming reservations:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming reservations' });
  }
});

export default router;
