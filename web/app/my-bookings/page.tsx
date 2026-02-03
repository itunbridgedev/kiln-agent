"use client";

import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import { useAuth } from "@/context/AuthContext";
import "@/styles/Home.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface GuestBooking {
  id: number;
  email: string;
  className: string;
  date: string;
}

export default function MyBookingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [bookings, setBookings] = useState<GuestBooking[]>([]);
  const [showBookings, setShowBookings] = useState(false);
  const [studioName, setStudioName] = useState<string>("");

  useEffect(() => {
    fetchStudioInfo();
    // Load bookings immediately from localStorage
    loadBookings();
  }, []);

  const fetchStudioInfo = async () => {
    try {
      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const response = await fetch(`${API_BASE_URL}/api/studio`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setStudioName(data.name);
      }
    } catch (error) {
      console.error("Error fetching studio info:", error);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const loadBookings = () => {
    const stored = localStorage.getItem("guestBookings");
    if (stored) {
      const allBookings = JSON.parse(stored);
      setBookings(allBookings);
      setShowBookings(true);
    }
  };

  const findBookingsByEmail = () => {
    if (!email.trim()) {
      alert("Please enter an email address");
      return;
    }

    const stored = localStorage.getItem("guestBookings");
    if (stored) {
      const allBookings = JSON.parse(stored) as GuestBooking[];
      const filtered = allBookings.filter(
        (b) => b.email.toLowerCase() === email.toLowerCase()
      );
      setBookings(filtered);
      setShowBookings(true);
    } else {
      setBookings([]);
      setShowBookings(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        user={user}
        studioName={studioName}
        onLogout={handleLogout}
        onNavigateAdmin={() => router.push("/admin")}
        onNavigateLogin={() => router.push("/login")}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            My Guest Bookings
          </h1>
          <p className="text-gray-600">
            Find bookings made without logging in. Enter your email to retrieve
            your bookings.
          </p>
        </div>

        {/* Email Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex gap-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && findBookingsByEmail()}
              placeholder="Enter your email address"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={findBookingsByEmail}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Find Bookings
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Bookings are stored locally in your browser. Use the same browser
            and device where you made the booking.
          </p>
        </div>

        {/* Bookings List */}
        {showBookings && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Your Bookings
              </h2>
            </div>

            {bookings.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 mb-4">
                  No bookings found for this email address.
                </p>
                <Link
                  href="/classes"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Browse Classes →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {bookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/registrations/${booking.id}`}
                    className="block p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {booking.className}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Confirmation #{booking.id}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Booked on{" "}
                          {new Date(booking.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center text-blue-600">
                        <span className="text-sm font-medium mr-2">
                          View Details
                        </span>
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Help Text */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Need Help?</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• Bookings are stored in your browser's local storage</li>
            <li>• Make sure you're using the same browser and device</li>
            <li>
              • If you create an account with the same email, your bookings will
              be linked
            </li>
            <li>• Contact the studio if you can't find your booking</li>
          </ul>
        </div>
      </div>

      <Footer />
    </div>
  );
}
