"use client";

import { useEffect, useState } from "react";

interface Class {
  id: number;
  name: string;
  classType: string;
  durationWeeks: number | null;
  durationHours: string | null;
  maxStudents?: number;
}

interface SchedulePattern {
  id: number;
  classId: number;
  patternType?: string;
  daysOfWeek?: number[];
  startTime: string;
  endTime: string | null;
  startDate: string;
  endDate: string | null;
  recurrenceRule: string;
  durationHours: string;
  maxStudents: number;
  isActive: boolean;
}

interface SchedulePatternManagerProps {
  classData: Class;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SchedulePatternManager({
  classData,
  onClose,
  onSuccess,
}: SchedulePatternManagerProps) {
  const [patterns, setPatterns] = useState<SchedulePattern[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewSessions, setPreviewSessions] = useState<any[]>([]);

  // Form state
  const [patternType, setPatternType] = useState<
    "simple" | "series" | "multi-step"
  >("simple");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [indefinite, setIndefinite] = useState(false);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">(
    "weekly"
  );
  const [interval, setInterval] = useState(1);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  useEffect(() => {
    fetchPatterns();
  }, [classData.id]);

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const fetchPatterns = async () => {
    try {
      const response = await fetch(
        `/api/admin/schedule-patterns/class/${classData.id}`,
        {
          credentials: "include",
        }
      );
      if (response.ok) {
        const data = await response.json();
        setPatterns(data);
      }
    } catch (error) {
      console.error("Error fetching patterns:", error);
    }
  };

  const handlePreview = async () => {
    setLoading(true);
    setShowPreview(false);

    try {
      // Calculate preview end date (30 days or until endDate, whichever is sooner)
      const previewEndDate = indefinite
        ? new Date(new Date(startDate).getTime() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0]
        : endDate;

      // Build RRULE string
      const dayMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
      const byDay = daysOfWeek.map((d) => dayMap[d]).join(",");
      
      let rrule = "";
      if (frequency === "weekly") {
        rrule = `FREQ=WEEKLY;BYDAY=${byDay}`;
      } else if (frequency === "daily") {
        rrule = `FREQ=DAILY`;
      } else if (frequency === "monthly") {
        rrule = `FREQ=MONTHLY;BYDAY=${byDay}`;
      }

      // Calculate duration hours
      let durationHours = parseFloat(classData.durationHours || "2");
      
      // For series, calculate duration from start to end time
      if (patternType === "series" && endTime) {
        const [startH, startM] = startTime.split(":").map(Number);
        const [endH, endM] = endTime.split(":").map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        durationHours = (endMinutes - startMinutes) / 60;
      }

      const response = await fetch("/api/admin/schedule-patterns/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          recurrenceRule: rrule,
          startDate,
          endDate: previewEndDate,
          startTime,
          durationHours: durationHours.toString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate preview");
      }

      const data = await response.json();
      setPreviewSessions(data.sessions || []);
      setShowPreview(true);
    } catch (error) {
      console.error("Error generating preview:", error);
      alert("Failed to generate preview");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      // Build RRULE string
      const dayMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
      const byDay = daysOfWeek.map((d) => dayMap[d]).join(",");
      
      let rrule = "";
      if (frequency === "weekly") {
        rrule = `FREQ=WEEKLY;BYDAY=${byDay}`;
      } else if (frequency === "daily") {
        rrule = `FREQ=DAILY`;
      } else if (frequency === "monthly") {
        rrule = `FREQ=MONTHLY;BYDAY=${byDay}`;
      }

      // Calculate duration hours
      let durationHours = parseFloat(classData.durationHours || "2");
      
      // For series, calculate duration from start to end time divided by intervals
      if (patternType === "series" && endTime) {
        const [startH, startM] = startTime.split(":").map(Number);
        const [endH, endM] = endTime.split(":").map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        durationHours = interval; // Each session duration
      }

      const response = await fetch("/api/admin/schedule-patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          classId: classData.id,
          recurrenceRule: rrule,
          startDate,
          endDate: indefinite ? null : endDate,
          startTime,
          durationHours: durationHours.toString(),
          maxStudents: classData.maxStudents || 12,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create schedule pattern");
      }

      const pattern = await response.json();

      // Generate sessions for the next 30 days
      const generateEndDate = new Date(
        new Date(startDate).getTime() + 30 * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split("T")[0];

      await fetch(`/api/admin/schedule-patterns/${pattern.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          endDate: generateEndDate,
        }),
      });

      onSuccess();
      setShowForm(false);
      setShowPreview(false);
      await fetchPatterns();
    } catch (error) {
      console.error("Error creating pattern:", error);
      alert("Failed to create schedule pattern");
    } finally {
      setLoading(false);
    }
  };

  const deletePattern = async (patternId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this schedule pattern? This will also remove all future sessions."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/schedule-patterns/${patternId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) throw new Error("Failed to delete pattern");

      await fetchPatterns();
    } catch (error) {
      console.error("Error deleting pattern:", error);
      alert("Failed to delete schedule pattern");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage Schedule: {classData.name}</h2>
          <button onClick={onClose} className="modal-close">
            ×
          </button>
        </div>

        <div className="modal-body">
          {!showForm ? (
            <div>
              <div className="section-header">
                <h3>Existing Schedules</h3>
                <button
                  onClick={() => setShowForm(true)}
                  className="btn btn-primary"
                >
                  + Add Schedule Series
                </button>
              </div>

              {patterns.length === 0 ? (
                <p className="text-muted">
                  No schedules configured. Click "Add Schedule Series" to get
                  started.
                </p>
              ) : (
                <div className="patterns-list">
                  {patterns.map((pattern) => {
                    const patternLabel = pattern.patternType
                      ? pattern.patternType === "simple"
                        ? "Simple Schedule"
                        : pattern.patternType === "series"
                        ? "Series Schedule"
                        : "Multi-Step Course"
                      : "Schedule Pattern";

                    const daysArray = Array.isArray(pattern.daysOfWeek)
                      ? pattern.daysOfWeek
                      : [];
                    const daysText =
                      daysArray.length > 0
                        ? daysArray.map((d) => dayNames[d]).join(", ")
                        : "See recurrence rule";

                    return (
                      <div key={pattern.id} className="pattern-card">
                        <div className="pattern-header">
                          <div>
                            <h4>{patternLabel}</h4>
                            <p className="pattern-details">
                              {daysText} at {pattern.startTime}
                              {pattern.durationHours && ` (${pattern.durationHours}hrs)`}
                            </p>
                            <p className="pattern-dates">
                              {new Date(pattern.startDate).toLocaleDateString()}
                              {pattern.endDate
                                ? ` - ${new Date(pattern.endDate).toLocaleDateString()}`
                                : " - Ongoing"}
                            </p>
                            {pattern.recurrenceRule && (
                              <p className="pattern-rule">
                                {pattern.recurrenceRule}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => deletePattern(pattern.id)}
                            className="btn-icon btn-danger"
                            title="Delete pattern"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : showPreview ? (
            <div className="preview-container">
              <h3>Preview: Next {previewSessions.length} Sessions</h3>
              <p className="text-muted">
                Showing sessions for the next 30 days. Click "Confirm & Create" to
                save this pattern.
              </p>

              <div className="preview-sessions">
                {previewSessions.slice(0, 20).map((session: any, index: number) => (
                  <div key={index} className="preview-session">
                    <span className="session-date">
                      {new Date(session.startTime).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="session-time">
                      {new Date(session.startTime).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(session.endTime).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
                {previewSessions.length > 20 && (
                  <p className="text-muted">
                    ... and {previewSessions.length - 20} more sessions
                  </p>
                )}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Back to Edit
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Confirm & Create"}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="schedule-form">
              <div className="form-section">
                <h3>Schedule Type</h3>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      value="simple"
                      checked={patternType === "simple"}
                      onChange={(e) =>
                        setPatternType(
                          e.target.value as "simple" | "series" | "multi-step"
                        )
                      }
                    />
                    <span>Simple Schedule</span>
                    <small>Single recurring pattern (e.g., every Tuesday at 6pm)</small>
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="series"
                      checked={patternType === "series"}
                      onChange={(e) =>
                        setPatternType(
                          e.target.value as "simple" | "series" | "multi-step"
                        )
                      }
                    />
                    <span>Series Schedule</span>
                    <small>Multiple sessions throughout the day (e.g., every 2 hours)</small>
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="multi-step"
                      checked={patternType === "multi-step"}
                      onChange={(e) =>
                        setPatternType(
                          e.target.value as "simple" | "series" | "multi-step"
                        )
                      }
                    />
                    <span>Multi-Step Course</span>
                    <small>
                      Different parts on different weeks (e.g., Part 1 week 1, Part 2
                      week 2)
                    </small>
                  </label>
                </div>
              </div>

              <div className="form-section">
                <h3>Date Range</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={indefinite}
                        onChange={(e) => setIndefinite(e.target.checked)}
                      />
                      Indefinite (no end date)
                    </label>
                  </div>
                </div>
                {!indefinite && (
                  <div className="form-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required={!indefinite}
                    />
                  </div>
                )}
              </div>

              <div className="form-section">
                <h3>Days of Week</h3>
                <div className="days-selector">
                  {dayNames.map((day, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`day-btn ${
                        daysOfWeek.includes(index) ? "active" : ""
                      }`}
                      onClick={() => toggleDay(index)}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h3>Time</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                  {patternType === "series" && (
                    <div className="form-group">
                      <label>End Time (of last session)</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>
              </div>

              {patternType === "series" && (
                <div className="form-section">
                  <h3>Repeat Every</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Hours Between Sessions</label>
                      <input
                        type="number"
                        value={interval}
                        onChange={(e) => setInterval(parseInt(e.target.value))}
                        min="1"
                        max="12"
                        required
                      />
                    </div>
                  </div>
                  <p className="text-muted">
                    Example: Interval of 2 means sessions at 10am, 12pm, 2pm, 4pm, etc.
                  </p>
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePreview}
                  className="btn btn-primary"
                  disabled={loading || daysOfWeek.length === 0}
                >
                  {loading ? "Generating..." : "Preview Schedule →"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 2rem;
          cursor: pointer;
          color: #666;
          line-height: 1;
          padding: 0;
          width: 32px;
          height: 32px;
        }

        .modal-body {
          padding: 1.5rem;
          overflow-y: auto;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .schedule-form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .form-section h3 {
          margin: 0 0 1rem 0;
          font-size: 1.1rem;
          color: #333;
        }

        .radio-group {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .radio-group label {
          display: flex;
          align-items: start;
          gap: 0.5rem;
          cursor: pointer;
          padding: 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .radio-group label:hover {
          border-color: #666;
        }

        .radio-group input[type="radio"]:checked + span {
          font-weight: 600;
        }

        .radio-group small {
          display: block;
          color: #666;
          margin-top: 0.25rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 500;
          color: #333;
        }

        .form-group input[type="date"],
        .form-group input[type="time"],
        .form-group input[type="number"] {
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }

        .days-selector {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .day-btn {
          padding: 0.75rem 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 500;
        }

        .day-btn:hover {
          border-color: #666;
        }

        .day-btn.active {
          background: #4a90e2;
          color: white;
          border-color: #4a90e2;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e0e0e0;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #4a90e2;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #357abd;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #f5f5f5;
          color: #333;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #e0e0e0;
        }

        .text-muted {
          color: #666;
          font-size: 0.9rem;
          font-style: italic;
        }

        .patterns-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .pattern-card {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1rem;
          background: #f9f9f9;
        }

        .pattern-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
        }

        .pattern-header h4 {
          margin: 0 0 0.5rem 0;
          font-size: 1.1rem;
          color: #333;
        }

        .pattern-details,
        .pattern-dates {
          margin: 0.25rem 0;
          color: #666;
          font-size: 0.9rem;
        }

        .pattern-rule {
          margin: 0.5rem 0 0 0;
          padding: 0.5rem;
          background: #f0f0f0;
          border-radius: 4px;
          font-size: 0.85rem;
          font-family: monospace;
          color: #555;
        }

        .btn-icon {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          line-height: 1;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .btn-danger {
          color: #dc3545;
        }

        .btn-danger:hover {
          background: #dc3545;
          color: white;
        }

        .preview-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .preview-container h3 {
          margin: 0;
          font-size: 1.2rem;
          color: #333;
        }

        .preview-sessions {
          max-height: 400px;
          overflow-y: auto;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1rem;
        }

        .preview-session {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem;
          border-bottom: 1px solid #f0f0f0;
        }

        .preview-session:last-child {
          border-bottom: none;
        }

        .session-date {
          font-weight: 500;
          color: #333;
        }

        .session-time {
          color: #666;
        }
      `}</style>
    </div>
  );
}
