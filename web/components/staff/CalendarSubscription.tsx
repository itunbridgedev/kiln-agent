"use client";

import { useCallback, useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface CalendarFeedInfo {
  exists: boolean;
  feedUrl?: string;
  token?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function CalendarSubscription() {
  const [feedInfo, setFeedInfo] = useState<CalendarFeedInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedInfo = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/staff/calendar-feed`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setFeedInfo(data);
      }
    } catch (err) {
      console.error("Error fetching feed info:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const generateFeed = async () => {
    try {
      setGenerating(true);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/api/staff/calendar-feed/generate`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setFeedInfo({
          exists: true,
          feedUrl: data.feedUrl,
          token: data.token,
          isActive: true,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      } else {
        throw new Error("Failed to generate calendar feed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generating feed");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (feedInfo?.feedUrl) {
      try {
        await navigator.clipboard.writeText(feedInfo.feedUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  useEffect(() => {
    fetchFeedInfo();
  }, [fetchFeedInfo]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            📅 Calendar Subscription
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Subscribe to your teaching schedule in your favorite calendar app
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {!feedInfo?.exists ? (
        <div className="border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600 mb-4">
            Generate a calendar subscription link to sync your schedule with
            Google Calendar, Apple Calendar, Outlook, or any other calendar app.
          </p>
          <button
            onClick={generateFeed}
            disabled={generating}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? "Generating..." : "Generate Calendar Feed"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Subscription URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subscription URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={feedInfo.feedUrl}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
              />
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 transition-colors"
              >
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h4 className="font-medium text-gray-900 mb-2">
              How to subscribe:
            </h4>
            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <strong className="text-gray-900">Google Calendar:</strong>
                <ol className="list-decimal list-inside ml-2 mt-1 space-y-1">
                  <li>Open Google Calendar</li>
                  <li>Click the "+" next to "Other calendars"</li>
                  <li>Select "From URL"</li>
                  <li>Paste the subscription URL and click "Add calendar"</li>
                </ol>
              </div>
              <div>
                <strong className="text-gray-900">Apple Calendar:</strong>
                <ol className="list-decimal list-inside ml-2 mt-1 space-y-1">
                  <li>Open Calendar app</li>
                  <li>File → New Calendar Subscription</li>
                  <li>Paste the subscription URL</li>
                  <li>Click "Subscribe" and choose update frequency</li>
                </ol>
              </div>
              <div>
                <strong className="text-gray-900">Outlook:</strong>
                <ol className="list-decimal list-inside ml-2 mt-1 space-y-1">
                  <li>Open Outlook Calendar</li>
                  <li>Add calendar → Subscribe from web</li>
                  <li>Paste the subscription URL</li>
                  <li>Name it and click "Import"</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Regenerate Token */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-600">
                Last updated:{" "}
                {new Date(feedInfo.updatedAt!).toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Regenerating will invalidate the old URL
              </p>
            </div>
            <button
              onClick={generateFeed}
              disabled={generating}
              className="px-4 py-2 bg-yellow-600 text-white font-medium rounded-md hover:bg-yellow-700 transition-colors disabled:opacity-50"
            >
              {generating ? "Regenerating..." : "Regenerate URL"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
