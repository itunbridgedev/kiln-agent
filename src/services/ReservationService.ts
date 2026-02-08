import prisma from '../prisma';
import { ReservationStatus, PassType } from '@prisma/client';

export interface ReservationValidation {
  valid: boolean;
  error?: string;
  errorCode?: string;
}

export class ReservationService {
  /**
   * Check if customer is currently suspended
   */
  async checkSuspension(customerId: number): Promise<ReservationValidation> {
    const suspension = await prisma.customerSuspension.findFirst({
      where: {
        customerId,
        isActive: true,
        suspendedUntil: {
          gt: new Date()
        }
      }
    });

    if (suspension) {
      return {
        valid: false,
        error: `Account is suspended until ${suspension.suspendedUntil.toISOString()}. Reason: ${suspension.reason}`,
        errorCode: 'CUSTOMER_SUSPENDED'
      };
    }

    return { valid: true };
  }

  /**
   * Check if customer has remaining sessions (for punch passes)
   */
  async checkRemainingPunches(registrationId: number): Promise<ReservationValidation> {
    const registration = await prisma.classRegistration.findUnique({
      where: { id: registrationId },
      select: { 
        passType: true, 
        sessionsIncluded: true, 
        sessionsRemaining: true 
      }
    });

    if (!registration) {
      return {
        valid: false,
        error: 'Registration not found',
        errorCode: 'REGISTRATION_NOT_FOUND'
      };
    }

    // Only check for punch passes
    if (registration.passType === PassType.PUNCH_PASS) {
      if (!registration.sessionsRemaining || registration.sessionsRemaining <= 0) {
        return {
          valid: false,
          error: 'No remaining sessions on your pass',
          errorCode: 'NO_PUNCHES_REMAINING'
        };
      }
    }

    return { valid: true };
  }

  /**
   * Check if customer has reached their advance reservation limit
   */
  async checkAdvanceReservationLimit(registrationId: number): Promise<ReservationValidation> {
    const registration = await prisma.classRegistration.findUnique({
      where: { id: registrationId },
      select: { 
        maxAdvanceReservations: true,
        customerId: true,
        classId: true,
        class: {
          select: {
            classType: true
          }
        }
      }
    });

    if (!registration) {
      return {
        valid: false,
        error: 'Registration not found',
        errorCode: 'REGISTRATION_NOT_FOUND'
      };
    }

    // For multi-step classes, use the number of steps as the limit
    let maxReservations = registration.maxAdvanceReservations;
    if (registration.class.classType === 'multi-step') {
      const stepCount = await prisma.classStep.count({
        where: { classId: registration.classId, isActive: true }
      });
      maxReservations = stepCount;
    }

    // Count current pending and checked-in reservations
    const currentReservations = await prisma.sessionReservation.count({
      where: {
        registrationId,
        reservationStatus: {
          in: [ReservationStatus.PENDING, ReservationStatus.CHECKED_IN]
        }
      }
    });

    if (currentReservations >= maxReservations) {
      return {
        valid: false,
        error: `Maximum advance reservations (${maxReservations}) reached. Cancel or attend a session before booking more.`,
        errorCode: 'RESERVATION_LIMIT_REACHED'
      };
    }

    return { valid: true };
  }

  /**
   * Check if pass is within validity dates
   */
  async checkPassValidity(registrationId: number): Promise<ReservationValidation> {
    const registration = await prisma.classRegistration.findUnique({
      where: { id: registrationId },
      select: { validFrom: true, validUntil: true }
    });

    if (!registration) {
      return {
        valid: false,
        error: 'Registration not found',
        errorCode: 'REGISTRATION_NOT_FOUND'
      };
    }

    const now = new Date();

    if (registration.validFrom && now < registration.validFrom) {
      return {
        valid: false,
        error: `Pass is not valid until ${registration.validFrom.toISOString()}`,
        errorCode: 'PASS_NOT_YET_VALID'
      };
    }

    if (registration.validUntil && now > registration.validUntil) {
      return {
        valid: false,
        error: `Pass expired on ${registration.validUntil.toISOString()}`,
        errorCode: 'PASS_EXPIRED'
      };
    }

    return { valid: true };
  }

  /**
   * Check if session has available capacity
   */
  async checkSessionAvailability(sessionId: number): Promise<ReservationValidation> {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      select: { 
        maxStudents: true,
        _count: {
          select: {
            reservations: {
              where: {
                reservationStatus: {
                  in: [ReservationStatus.PENDING, ReservationStatus.CHECKED_IN, ReservationStatus.ATTENDED]
                }
              }
            }
          }
        }
      }
    });

    if (!session) {
      return {
        valid: false,
        error: 'Session not found',
        errorCode: 'SESSION_NOT_FOUND'
      };
    }

    const currentReservations = session._count.reservations;
    
    if (currentReservations >= (session.maxStudents || 0)) {
      return {
        valid: false,
        error: 'Session is at full capacity',
        errorCode: 'SESSION_FULL'
      };
    }

    return { valid: true };
  }

  /**
   * Check if customer has already reserved this session
   */
  async checkDuplicateReservation(registrationId: number, sessionId: number): Promise<ReservationValidation> {
    const existing = await prisma.sessionReservation.findFirst({
      where: {
        registrationId,
        sessionId,
        reservationStatus: {
          notIn: ['CANCELLED']
        }
      }
    });

    if (existing) {
      return {
        valid: false,
        error: 'You have already reserved this session',
        errorCode: 'DUPLICATE_RESERVATION'
      };
    }

    return { valid: true };
  }

  /**
   * Check if sequential attendance is required and enforced
   */
  async checkSequentialAttendance(_registrationId: number, _sessionId: number): Promise<ReservationValidation> {
    // TODO: Implement once ClassStep model is fully integrated with ClassSession
    // For now, skip sequence validation
    return { valid: true };
  }

  /**
   * Check if session has sufficient resources available
   */
  async checkResourceAvailability(registrationId: number, sessionId: number): Promise<ReservationValidation> {
    // Get registration with guestCount and class resource requirements
    const registration = await prisma.classRegistration.findUnique({
      where: { id: registrationId },
      select: {
        guestCount: true,
        class: {
          include: {
            resourceRequirements: {
              include: {
                resource: true
              }
            }
          }
        }
      }
    });

    if (!registration) {
      return {
        valid: false,
        error: 'Registration not found',
        errorCode: 'REGISTRATION_NOT_FOUND'
      };
    }

    // Get the session to find overlapping sessions
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      select: {
        sessionDate: true,
        startTime: true,
        endTime: true
      }
    });

    if (!session) {
      return {
        valid: false,
        error: 'Session not found',
        errorCode: 'SESSION_NOT_FOUND'
      };
    }

    // Find overlapping sessions
    const overlappingSessions = await prisma.classSession.findMany({
      where: {
        sessionDate: session.sessionDate,
        isCancelled: false,
        OR: [
          {
            AND: [
              { startTime: { lte: session.startTime } },
              { endTime: { gt: session.startTime } }
            ]
          },
          {
            AND: [
              { startTime: { lt: session.endTime } },
              { endTime: { gte: session.endTime } }
            ]
          },
          {
            AND: [
              { startTime: { gte: session.startTime } },
              { endTime: { lte: session.endTime } }
            ]
          }
        ]
      },
      select: { id: true }
    });

    const sessionIds = overlappingSessions.map(s => s.id);

    // Check each resource requirement
    for (const requirement of registration.class.resourceRequirements) {
      const allocations = await prisma.sessionResourceAllocation.findMany({
        where: {
          resourceId: requirement.resourceId,
          sessionId: { in: sessionIds },
          registration: {
            registrationStatus: 'CONFIRMED'
          }
        },
        select: { quantity: true }
      });

      const totalAllocated = allocations.reduce((sum, a) => sum + a.quantity, 0);
      const available = requirement.resource.quantity - totalAllocated;
      const needed = registration.guestCount * requirement.quantityPerStudent;

      if (needed > available) {
        return {
          valid: false,
          error: `Insufficient ${requirement.resource.name}. Need ${needed}, only ${available} available.`,
          errorCode: 'INSUFFICIENT_RESOURCES'
        };
      }
    }

    return { valid: true };
  }

  /**
   * Run all validations for creating a reservation
   */
  async validateReservation(
    customerId: number,
    registrationId: number,
    sessionId: number
  ): Promise<ReservationValidation> {
    // Run all validations
    const checks = [
      await this.checkSuspension(customerId),
      await this.checkRemainingPunches(registrationId),
      await this.checkAdvanceReservationLimit(registrationId),
      await this.checkPassValidity(registrationId),
      await this.checkSessionAvailability(sessionId),
      await this.checkResourceAvailability(registrationId, sessionId),
      await this.checkDuplicateReservation(registrationId, sessionId),
      await this.checkSequentialAttendance(registrationId, sessionId)
    ];

    // Return first validation error
    for (const check of checks) {
      if (!check.valid) {
        return check;
      }
    }

    return { valid: true };
  }

  /**
   * Create a reservation with audit trail
   */
  async createReservation(
    customerId: number,
    registrationId: number,
    sessionId: number,
    customerNotes?: string
  ) {
    // Get registration with class resource requirements and guestCount
    const registration = await prisma.classRegistration.findUnique({
      where: { id: registrationId },
      select: { 
        studioId: true,
        guestCount: true,
        class: {
          include: {
            resourceRequirements: {
              include: {
                resource: true
              }
            }
          }
        }
      }
    });

    if (!registration) {
      throw new Error('Registration not found');
    }

    // Check if there's a cancelled reservation we can reactivate
    const cancelledReservation = await prisma.sessionReservation.findFirst({
      where: {
        registrationId,
        sessionId,
        reservationStatus: 'CANCELLED'
      }
    });

    if (cancelledReservation) {
      // Reactivate the cancelled reservation
      return await prisma.$transaction(async (tx) => {
        const reservation = await tx.sessionReservation.update({
          where: { id: cancelledReservation.id },
          data: {
            reservationStatus: ReservationStatus.PENDING,
            cancelledAt: null,
            cancellationReason: null,
            customerNotes: customerNotes || cancelledReservation.customerNotes
          },
          include: {
            session: {
              include: {
                class: true
              }
            },
            registration: {
              select: {
                passType: true,
                maxAdvanceReservations: true
              }
            }
          }
        });

        // Create audit trail
        await tx.reservationHistory.create({
          data: {
            reservationId: reservation.id,
            action: 'REACTIVATED',
            performedBy: customerId,
            performedByRole: 'CUSTOMER',
            newStatus: ReservationStatus.PENDING,
            timestamp: new Date()
          }
        });

        // Allocate resources for this reservation
        for (const requirement of registration.class.resourceRequirements) {
          await tx.sessionResourceAllocation.create({
            data: {
              sessionId,
              resourceId: requirement.resourceId,
              registrationId,
              quantity: registration.guestCount * requirement.quantityPerStudent
            }
          });
        }

        return reservation;
      });
    }

    // Create new reservation
    return await prisma.$transaction(async (tx) => {
      // Create reservation
      const reservation = await tx.sessionReservation.create({
        data: {
          studioId: registration.studioId,
          registrationId,
          sessionId,
          reservedBy: customerId,
          customerNotes,
          reservationStatus: ReservationStatus.PENDING
        },
        include: {
          session: {
            include: {
              class: true
            }
          },
          registration: {
            select: {
              passType: true,
              maxAdvanceReservations: true
            }
          }
        }
      });

      // Create audit trail
      await tx.reservationHistory.create({
        data: {
          reservationId: reservation.id,
          action: 'CREATED',
          performedBy: customerId,
          performedByRole: 'CUSTOMER',
          newStatus: ReservationStatus.PENDING,
          timestamp: new Date()
        }
      });

      // Allocate resources for this reservation
      for (const requirement of registration.class.resourceRequirements) {
        await tx.sessionResourceAllocation.create({
          data: {
            sessionId,
            resourceId: requirement.resourceId,
            registrationId,
            quantity: registration.guestCount * requirement.quantityPerStudent
          }
        });
      }

      return reservation;
    });
  }

  /**
   * Cancel a reservation with audit trail
   */
  async cancelReservation(
    reservationId: number,
    customerId: number,
    reason?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const reservation = await tx.sessionReservation.findUnique({
        where: { id: reservationId },
        select: { 
          reservationStatus: true,
          registrationId: true,
          punchUsed: true
        }
      });

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      if (reservation.reservationStatus !== ReservationStatus.PENDING) {
        throw new Error('Can only cancel pending reservations');
      }

      // Update reservation
      const updated = await tx.sessionReservation.update({
        where: { id: reservationId },
        data: {
          reservationStatus: ReservationStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledBy: customerId,
          cancellationReason: reason
        },
        include: {
          session: true
        }
      });

      // Create audit trail
      await tx.reservationHistory.create({
        data: {
          reservationId,
          action: 'CANCELLED',
          performedBy: customerId,
          performedByRole: 'CUSTOMER',
          previousStatus: ReservationStatus.PENDING,
          newStatus: ReservationStatus.CANCELLED,
          reason,
          timestamp: new Date()
        }
      });

      // Delete resource allocations for this reservation
      await tx.sessionResourceAllocation.deleteMany({
        where: {
          registrationId: reservation.registrationId,
          sessionId: updated.session.id
        }
      });

      return updated;
    });
  }

  /**
   * Get available sessions for a registration
   */
  async getAvailableSessions(registrationId: number, limit?: number) {
    const registration = await prisma.classRegistration.findUnique({
      where: { id: registrationId },
      select: {
        classId: true,
        scheduleId: true,
        passType: true,
        validFrom: true,
        validUntil: true,
        class: {
          select: {
            classType: true,
            requiresSequence: true
          }
        }
      }
    });

    if (!registration) {
      throw new Error('Registration not found');
    }

    const now = new Date();
    now.setUTCHours(0, 0, 0, 0); // Start of today in UTC (to match sessionDate which is stored in UTC)
    
    // For multi-step classes that require sequence, only show step 1 sessions
    const whereClause: any = {
      classId: registration.classId,
      scheduleId: registration.scheduleId || undefined,
      sessionDate: {
        gte: registration.validFrom || now,
        ...(registration.validUntil && { lte: registration.validUntil })
      }
    };

    // If this is a multi-step class that requires sequential completion,
    // show sessions from the next step they need to complete
    if (registration.class.classType === 'multi-step' && registration.class.requiresSequence) {
      console.log('[ReservationService] Multi-step class detected, finding next step to show');
      
      // Find all reservations and initial bookings for this registration
      const [flexibleReservations, initialBookings] = await Promise.all([
        prisma.sessionReservation.findMany({
          where: {
            registrationId,
            reservationStatus: {
              in: ['PENDING', 'CHECKED_IN', 'ATTENDED']
            }
          },
          include: {
            session: {
              include: {
                classStep: {
                  select: {
                    stepNumber: true
                  }
                }
              }
            }
          }
        }),
        prisma.registrationSession.findMany({
          where: {
            registrationId
          },
          include: {
            session: {
              include: {
                classStep: {
                  select: {
                    stepNumber: true
                  }
                }
              }
            }
          }
        })
      ]);

      // Combine and find the highest step number they've reserved and the latest date
      const allReservedSessions = [
        ...flexibleReservations.map(r => ({
          stepNumber: r.session.classStep?.stepNumber || 0,
          sessionDate: new Date(r.session.sessionDate)
        })),
        ...initialBookings.map(ib => ({
          stepNumber: ib.session.classStep?.stepNumber || 0,
          sessionDate: new Date(ib.session.sessionDate)
        }))
      ];

      const highestStepReserved = Math.max(0, ...allReservedSessions.map(s => s.stepNumber));
      const nextStepNumber = highestStepReserved + 1;

      // Find the latest session date from the highest step reserved
      const highestStepSessions = allReservedSessions.filter(s => s.stepNumber === highestStepReserved);
      const latestSessionDate = highestStepSessions.length > 0
        ? new Date(Math.max(...highestStepSessions.map(s => s.sessionDate.getTime())))
        : new Date();

      console.log('[ReservationService] Highest step reserved:', highestStepReserved);
      console.log('[ReservationService] Latest session date for step', highestStepReserved, ':', latestSessionDate);
      console.log('[ReservationService] Showing step:', nextStepNumber);

      // Get the next step
      const nextStep = await prisma.classStep.findFirst({
        where: {
          classId: registration.classId,
          stepNumber: nextStepNumber
        },
        select: {
          id: true
        }
      });

      if (nextStep) {
        console.log('[ReservationService] Found step', nextStepNumber, 'with ID:', nextStep.id);
        whereClause.classStepId = nextStep.id;
        // Only show sessions AFTER the latest session from the previous step
        whereClause.sessionDate = {
          ...whereClause.sessionDate,
          gte: latestSessionDate
        };
      } else {
        console.log('[ReservationService] No step', nextStepNumber, 'found - course may be complete');
        // If no next step exists, return empty (they've completed all steps)
        whereClause.classStepId = -1; // This will return no results
      }
    }
    
    console.log('[ReservationService] Final where clause:', JSON.stringify(whereClause, null, 2));
    
    return await prisma.classSession.findMany({
      where: whereClause,
      include: {
        class: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            reservations: {
              where: {
                reservationStatus: {
                  in: [ReservationStatus.PENDING, ReservationStatus.CHECKED_IN, ReservationStatus.ATTENDED]
                }
              }
            }
          }
        }
      },
      orderBy: {
        sessionDate: 'asc'
      },
      ...(limit && { take: limit })
    });
  }
}

export const reservationService = new ReservationService();
