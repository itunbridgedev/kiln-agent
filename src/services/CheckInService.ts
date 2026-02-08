import prisma from '../prisma';
import { ReservationStatus, PassType } from '@prisma/client';

export interface CheckInValidation {
  valid: boolean;
  error?: string;
  errorCode?: string;
}

export interface CheckInWindow {
  canCheckIn: boolean;
  windowStart: Date;
  windowEnd: Date;
  reason?: string;
}

export class CheckInService {
  /**
   * Calculate check-in time window for a session
   * Customer: ±2 hours from session start
   * Staff: Anytime on session day (00:00 - 23:59)
   */
  getCheckInWindow(sessionDate: Date, sessionStartTime: string, isStaff: boolean): CheckInWindow {
    const now = new Date();
    
    // Parse session start time (format: "HH:MM")
    const [hours, minutes] = sessionStartTime.split(':').map(Number);
    const sessionStart = new Date(sessionDate);
    sessionStart.setHours(hours, minutes, 0, 0);

    if (isStaff) {
      // Staff can check in anytime on the session day
      const dayStart = new Date(sessionDate);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(sessionDate);
      dayEnd.setHours(23, 59, 59, 999);

      const canCheckIn = now >= dayStart && now <= dayEnd;

      return {
        canCheckIn,
        windowStart: dayStart,
        windowEnd: dayEnd,
        reason: canCheckIn ? undefined : 'Staff can only check in on the session day'
      };
    } else {
      // Customer can check in ±2 hours from session start
      const windowStart = new Date(sessionStart.getTime() - 2 * 60 * 60 * 1000); // -2 hours
      const windowEnd = new Date(sessionStart.getTime() + 2 * 60 * 60 * 1000); // +2 hours

      const canCheckIn = now >= windowStart && now <= windowEnd;

      return {
        canCheckIn,
        windowStart,
        windowEnd,
        reason: canCheckIn ? undefined : 'Check-in window is 2 hours before to 2 hours after session start'
      };
    }
  }

  /**
   * Validate check-in eligibility
   */
  async validateCheckIn(
    reservationId: number,
    customerId: number,
    isStaff: boolean
  ): Promise<CheckInValidation> {
    const reservation = await prisma.sessionReservation.findUnique({
      where: { id: reservationId },
      include: {
        session: {
          select: {
            sessionDate: true,
            startTime: true
          }
        },
        registration: {
          select: {
            customerId: true
          }
        }
      }
    });

    if (!reservation) {
      return {
        valid: false,
        error: 'Reservation not found',
        errorCode: 'RESERVATION_NOT_FOUND'
      };
    }

    // Check ownership (unless staff)
    if (!isStaff && reservation.registration.customerId !== customerId) {
      return {
        valid: false,
        error: 'You can only check in to your own reservations',
        errorCode: 'UNAUTHORIZED'
      };
    }

    // Check status
    if (reservation.reservationStatus !== ReservationStatus.PENDING) {
      return {
        valid: false,
        error: `Cannot check in. Current status: ${reservation.reservationStatus}`,
        errorCode: 'INVALID_STATUS'
      };
    }

    // Check time window
    const window = this.getCheckInWindow(
      reservation.session.sessionDate,
      reservation.session.startTime,
      isStaff
    );

    if (!window.canCheckIn) {
      return {
        valid: false,
        error: window.reason || 'Check-in not available at this time',
        errorCode: 'OUTSIDE_CHECKIN_WINDOW'
      };
    }

    return { valid: true };
  }

  /**
   * Perform check-in with punch deduction
   */
  async checkIn(
    reservationId: number,
    customerId: number,
    isStaff: boolean,
    staffNotes?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const reservation = await tx.sessionReservation.findUnique({
        where: { id: reservationId },
        include: {
          registration: {
            select: {
              id: true,
              passType: true,
              sessionsRemaining: true,
              sessionsAttended: true
            }
          },
          session: true
        }
      });

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      const now = new Date();
      const method = isStaff ? 'STAFF' : 'SELF';

      // Update reservation
      const updated = await tx.sessionReservation.update({
        where: { id: reservationId },
        data: {
          reservationStatus: ReservationStatus.CHECKED_IN,
          checkedInAt: now,
          checkedInBy: customerId,
          checkedInMethod: method,
          ...(staffNotes && { staffNotes })
        },
        include: {
          session: {
            include: {
              class: true
            }
          },
          registration: true
        }
      });

      // Deduct punch if punch pass and not already deducted
      if (
        reservation.registration.passType === PassType.PUNCH_PASS &&
        !reservation.punchUsed &&
        reservation.registration.sessionsRemaining !== null &&
        reservation.registration.sessionsRemaining > 0
      ) {
        await tx.sessionReservation.update({
          where: { id: reservationId },
          data: {
            punchUsed: true,
            punchDeductedAt: now
          }
        });

        await tx.classRegistration.update({
          where: { id: reservation.registration.id },
          data: {
            sessionsRemaining: {
              decrement: 1
            },
            sessionsAttended: {
              increment: 1
            }
          }
        });
      } else {
        // Just increment attended count for non-punch passes
        await tx.classRegistration.update({
          where: { id: reservation.registration.id },
          data: {
            sessionsAttended: {
              increment: 1
            }
          }
        });
      }

      // Create audit trail
      await tx.reservationHistory.create({
        data: {
          reservationId,
          action: 'CHECKED_IN',
          performedBy: customerId,
          performedByRole: isStaff ? 'STAFF' : 'CUSTOMER',
          previousStatus: ReservationStatus.PENDING,
          newStatus: ReservationStatus.CHECKED_IN,
          metadata: {
            method,
            punchDeducted: reservation.registration.passType === PassType.PUNCH_PASS
          },
          timestamp: now
        }
      });

      return updated;
    });
  }

  /**
   * Mark session as attended (typically after session ends)
   */
  async markAttended(reservationId: number, staffId?: number) {
    return await prisma.$transaction(async (tx) => {
      const reservation = await tx.sessionReservation.findUnique({
        where: { id: reservationId },
        select: { reservationStatus: true }
      });

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      if (reservation.reservationStatus !== ReservationStatus.CHECKED_IN) {
        throw new Error('Can only mark checked-in reservations as attended');
      }

      const now = new Date();

      const updated = await tx.sessionReservation.update({
        where: { id: reservationId },
        data: {
          reservationStatus: ReservationStatus.ATTENDED,
          attendedAt: now
        },
        include: {
          session: true
        }
      });

      // Create audit trail
      await tx.reservationHistory.create({
        data: {
          reservationId,
          action: 'ATTENDED',
          performedBy: staffId || null,
          performedByRole: staffId ? 'STAFF' : 'SYSTEM',
          previousStatus: ReservationStatus.CHECKED_IN,
          newStatus: ReservationStatus.ATTENDED,
          timestamp: now
        }
      });

      return updated;
    });
  }
}

export const checkInService = new CheckInService();
