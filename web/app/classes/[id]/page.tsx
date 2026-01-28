"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Category {
  id: number;
  name: string;
}

interface TeachingRole {
  id: number;
  name: string;
}

interface ClassSession {
  id: number;
  sessionNumber: number | null;
  sessionDate: string;
  startTime: string;
  endTime: string;
  topic: string | null;
  status: string;
}

interface ClassSchedule {
  id: number;
  startDate: string;
  endDate: string | null;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  enrolledCount: number;
  status: string;
  sessions: ClassSession[];
  _count: {
    enrollments: number;
    waitlistEntries: number;
  };
}

interface ClassStep {
  id: number;
  stepNumber: number;
  name: string;
  description: string;
  durationHours: number;
}

interface Class {
  id: number;
  name: string;
  description: string;
  classType: string;
  durationWeeks: number | null;
  durationHours: number | null;
  maxStudents: number;
  price: number;
  skillLevel: string | null;
  imageUrl: string | null;
  isRecurring: boolean;
  requiresSequence: boolean;
  category: Category;
  teachingRole: TeachingRole | null;
  schedules: ClassSchedule[];
  steps: ClassStep[];
}

export default function ClassDetailPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params?.id as string;

  const [classDetails, setClassDetails] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);

  useEffect(() => {
    if (classId) {
      fetchClassDetails();
    }
  }, [classId]);

  const fetchClassDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/registrations/classes/${classId}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch class details");
      }

      const data = await response.json();
      setClassDetails(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dayOfWeek];
  };

  const handleRegister = (scheduleId: number) => {
    setSelectedScheduleId(scheduleId);
    setShowRegistrationModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !classDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-800">{error || "Class not found"}</p>
          <button
            onClick={() => router.push("/classes")}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            ← Back to Classes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.push("/classes")}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
          >
            <span className="mr-1">←</span> Back to Classes
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Image */}
            <div className="h-96 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
              {classDetails.imageUrl ? (
                <img
                  src={classDetails.imageUrl}
                  alt={classDetails.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <span className="text-white text-9xl">🏺</span>
              )}
            </div>

            {/* Info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded">
                  {classDetails.category.name}
                </span>
                {classDetails.skillLevel && (
                  <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded">
                    {classDetails.skillLevel}
                  </span>
                )}
              </div>

              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {classDetails.name}
              </h1>

              <p className="text-gray-600 mb-6 text-lg">
                {classDetails.description}
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-start">
                  <span className="font-semibold text-gray-900 w-32">Duration:</span>
                  <span className="text-gray-600">
                    {classDetails.classType === "single-session"
                      ? `${classDetails.durationHours} hours`
                      : `${classDetails.durationWeeks} weeks`}
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="font-semibold text-gray-900 w-32">Class Size:</span>
                  <span className="text-gray-600">
                    Up to {classDetails.maxStudents} students
                  </span>
                </div>
                {classDetails.teachingRole && (
                  <div className="flex items-start">
                    <span className="font-semibold text-gray-900 w-32">Instructor:</span>
                    <span className="text-gray-600">
                      {classDetails.teachingRole.name}
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatPrice(classDetails.price)}
                </div>
                <p className="text-gray-600 text-sm">
                  {classDetails.classType === "single-session"
                    ? "Per session"
                    : "Full course"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Step Classes */}
      {classDetails.steps.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Course Structure</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="space-y-4">
              {classDetails.steps.map((step) => (
                <div key={step.id} className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    {step.stepNumber}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{step.name}</h3>
                    <p className="text-gray-600 text-sm mb-1">{step.description}</p>
                    <p className="text-gray-500 text-xs">{step.durationHours} hours</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Available Schedules */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Schedules</h2>

        {classDetails.schedules.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <p className="text-yellow-800">
              No upcoming schedules available. Check back later or contact us for more information.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {classDetails.schedules.map((schedule) => {
              const spotsAvailable = classDetails.maxStudents - schedule._count.enrollments;
              const isFull = spotsAvailable <= 0;

              return (
                <div
                  key={schedule.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {format(new Date(schedule.startDate), "MMMM d, yyyy")}
                          {schedule.endDate &&
                            ` - ${format(new Date(schedule.endDate), "MMMM d, yyyy")}`}
                        </h3>
                        {isFull ? (
                          <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                            FULL
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                            {spotsAvailable} SPOTS LEFT
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-gray-600">
                        {schedule.dayOfWeek !== null && (
                          <p>
                            <span className="font-medium">Day:</span>{" "}
                            {getDayName(schedule.dayOfWeek)}s
                          </p>
                        )}
                        <p>
                          <span className="font-medium">Time:</span> {schedule.startTime} -{" "}
                          {schedule.endTime}
                        </p>
                        <p>
                          <span className="font-medium">Enrolled:</span>{" "}
                          {schedule._count.enrollments} / {classDetails.maxStudents}
                        </p>
                        {schedule._count.waitlistEntries > 0 && (
                          <p className="text-yellow-600">
                            <span className="font-medium">Waitlist:</span>{" "}
                            {schedule._count.waitlistEntries} people waiting
                          </p>
                        )}
                      </div>

                      {/* Sessions Preview */}
                      {schedule.sessions.length > 0 && (
                        <div className="mt-4">
                          <button
                            className="text-sm text-blue-600 hover:text-blue-800"
                            onClick={(e) => {
                              e.stopPropagation();
                              const sessionsList = e.currentTarget.nextElementSibling;
                              if (sessionsList) {
                                sessionsList.classList.toggle("hidden");
                              }
                            }}
                          >
                            View {schedule.sessions.length} session{schedule.sessions.length !== 1 ? "s" : ""} →
                          </button>
                          <div className="hidden mt-3 space-y-1 text-sm text-gray-600">
                            {schedule.sessions.slice(0, 5).map((session) => (
                              <div key={session.id} className="pl-4">
                                • {format(new Date(session.sessionDate), "MMM d")} -{" "}
                                {session.topic || `Session ${session.sessionNumber || ""}`}
                              </div>
                            ))}
                            {schedule.sessions.length > 5 && (
                              <div className="pl-4 text-gray-500">
                                ... and {schedule.sessions.length - 5} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="ml-6">
                      {isFull ? (
                        <button
                          onClick={() => handleRegister(schedule.id)}
                          className="px-6 py-3 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition-colors"
                        >
                          Join Waitlist
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRegister(schedule.id)}
                          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Register Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Registration Modal Placeholder */}
      {showRegistrationModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowRegistrationModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Complete Registration</h2>
            <p className="text-gray-600 mb-6">
              Payment integration coming soon! For now, please contact the studio to complete your registration.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRegistrationModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Contact Studio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
