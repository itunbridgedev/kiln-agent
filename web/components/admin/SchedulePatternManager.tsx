"use client";

import { useState } from "react";

interface Class {
  id: number;
  name: string;
  classType: string;
  durationWeeks: number | null;
  durationHours: string | null;
}

interface SchedulePattern {
  id: number;
  classId: number;
  scheduleId: number;
  patternType: string;
  startDate: string;
  endDate: string | null;
  daysOfWeek: number[];
  startTime: string;
  endTime: string | null;
  frequency: string;
  interval: number;
  weekOfMonth: number | null;
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

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(
        "/api/admin/schedule-patterns",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            classId: classData.id,
            patternType,
            startDate,
            endDate: indefinite ? null : endDate,
            daysOfWeek,
            startTime,
            endTime,
            frequency,
            interval,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to create schedule pattern");

      onSuccess();
      setShowForm(false);
    } catch (error) {
      console.error("Error creating pattern:", error);
      alert("Failed to create schedule pattern");
    } finally {
      setLoading(false);
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
                  {patterns.map((pattern) => (
                    <div key={pattern.id} className="pattern-card">
                      {/* Pattern display - to be implemented */}
                    </div>
                  ))}
                </div>
              )}
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
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || daysOfWeek.length === 0}
                >
                  {loading ? "Creating..." : "Create Schedule"}
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
      `}</style>
    </div>
  );
}
