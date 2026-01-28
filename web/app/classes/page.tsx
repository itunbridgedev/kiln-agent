"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Category {
  id: number;
  name: string;
}

interface TeachingRole {
  id: number;
  name: string;
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
  category: Category;
  teachingRole: TeachingRole | null;
  schedules: ClassSchedule[];
}

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<string>("");
  const [selectedClassType, setSelectedClassType] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchClasses();
  }, [selectedCategory, selectedSkillLevel, selectedClassType]);

  const fetchClasses = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append("categoryId", selectedCategory);
      if (selectedSkillLevel) params.append("skillLevel", selectedSkillLevel);
      if (selectedClassType) params.append("classType", selectedClassType);

      const response = await fetch(
        `${API_BASE_URL}/api/registrations/classes?${params}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch classes");
      }

      const data = await response.json();
      setClasses(data);

      // Extract unique categories
      const uniqueCategories = Array.from(
        new Map(data.map((c: Class) => [c.category.id, c.category])).values()
      ) as Category[];
      setCategories(uniqueCategories);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getClassTypeLabel = (type: string) => {
    switch (type) {
      case "single-session":
        return "Single Session";
      case "multi-session":
        return "Multi-Session Course";
      case "series":
        return "Ongoing Series";
      case "multi-step":
        return "Multi-Step Program";
      default:
        return type;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const getAvailabilityStatus = (classItem: Class) => {
    if (classItem.schedules.length === 0) {
      return { text: "No upcoming sessions", color: "text-gray-500" };
    }

    const hasOpenSchedules = classItem.schedules.some(
      (s) => s.status === "open"
    );
    const hasFullSchedules = classItem.schedules.some(
      (s) => s.status === "full"
    );

    if (hasOpenSchedules) {
      return { text: "Available", color: "text-green-600" };
    } else if (hasFullSchedules) {
      return { text: "Waitlist Available", color: "text-yellow-600" };
    } else {
      return { text: "No upcoming sessions", color: "text-gray-500" };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Browse Classes</h1>
          <p className="mt-2 text-gray-600">
            Explore our pottery classes and workshops
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Skill Level Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Skill Level
              </label>
              <select
                value={selectedSkillLevel}
                onChange={(e) => setSelectedSkillLevel(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="All Levels">All Levels</option>
              </select>
            </div>

            {/* Class Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class Type
              </label>
              <select
                value={selectedClassType}
                onChange={(e) => setSelectedClassType(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="single-session">Single Session</option>
                <option value="multi-session">Multi-Session Course</option>
                <option value="series">Ongoing Series</option>
                <option value="multi-step">Multi-Step Program</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedCategory("");
                  setSelectedSkillLevel("");
                  setSelectedClassType("");
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No classes found matching your criteria
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((classItem) => {
              const availability = getAvailabilityStatus(classItem);
              return (
                <Link
                  key={classItem.id}
                  href={`/classes/${classItem.id}`}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Image */}
                  <div className="h-48 bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                    {classItem.imageUrl ? (
                      <img
                        src={classItem.imageUrl}
                        alt={classItem.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-6xl">🏺</span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {/* Category & Type */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {classItem.category.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {getClassTypeLabel(classItem.classType)}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {classItem.name}
                    </h3>

                    {/* Description */}
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {classItem.description}
                    </p>

                    {/* Details */}
                    <div className="space-y-2 mb-4">
                      {classItem.skillLevel && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-medium mr-2">Level:</span>
                          <span>{classItem.skillLevel}</span>
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium mr-2">Duration:</span>
                        <span>
                          {classItem.classType === "single-session"
                            ? `${classItem.durationHours} hours`
                            : `${classItem.durationWeeks} weeks`}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium mr-2">Class Size:</span>
                        <span>Up to {classItem.maxStudents} students</span>
                      </div>
                    </div>

                    {/* Availability & Price */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <span
                        className={`text-sm font-medium ${availability.color}`}
                      >
                        {availability.text}
                      </span>
                      <span className="text-2xl font-bold text-gray-900">
                        {formatPrice(classItem.price)}
                      </span>
                    </div>

                    {/* Instructor */}
                    {classItem.teachingRole && (
                      <div className="mt-3 text-xs text-gray-500">
                        Taught by {classItem.teachingRole.name}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
