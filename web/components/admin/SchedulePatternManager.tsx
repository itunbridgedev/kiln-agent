"use client";

import { parseLocalDate } from "@/lib/dates";
import { useEffect, useState } from "react";

interface ClassStep {
  id: number;
  stepNumber: number;
  stepName: string;
  name?: string; // Alias for stepName
}

interface Class {
  id: number;
  name: string;
  classType: string;
  durationWeeks: number | null;
  durationHours: string | null;
  maxStudents?: number;
  steps?: ClassStep[];
  resourceRequirements?: Array<{
    resourceId: number;
    quantityPerStudent: number;
  }>;
}

interface SchedulePattern {
  id: number;
  classId: number;
  patternType?: string;
  daysOfWeek?: number[];
  startTime: string;
  endTime?: string | null;
  startDate: string;
  endDate: string | null;
  recurrenceRule: string;
  durationHours: string;
  maxStudents: number;
  isActive: boolean;
  classStepId?: number | null;
  defaultInstructorId?: number | null;
  defaultAssistantId?: number | null;
}

interface GeneratedSession {
  sessionNumber: number;
  sessionDate: string;
  startTime: string;
  endTime: string;
  dayOfWeek: string;
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
  const [editingPattern, setEditingPattern] = useState<SchedulePattern | null>(
    null
  );
  const [showPreview, setShowPreview] = useState(false);
  const [previewSessions, setPreviewSessions] = useState<any[]>([]);
  const [showSessionsPreview, setShowSessionsPreview] = useState(false);
  const [previewingSessions, setPreviewingSessions] = useState<
    GeneratedSession[]
  >([]);
  const [generatingPatternId, setGeneratingPatternId] = useState<number | null>(
    null
  );

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
  const [durationHours, setDurationHours] = useState(
    parseFloat(classData.durationHours || "2")
  );
  const [weekOfMonth, setWeekOfMonth] = useState(1);
  const [selectedSteps, setSelectedSteps] = useState<number[]>([]);
  const [defaultInstructorId, setDefaultInstructorId] = useState<number | null>(
    null
  );
  const [defaultAssistantId, setDefaultAssistantId] = useState<number | null>(
    null
  );
  const [staff, setStaff] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [resources, setResources] = useState<any[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [selectedResources, setSelectedResources] = useState<
    { resourceId: number; quantityPerStudent: number }[]
  >([]);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Parse RRULE into human-readable format
  const parseRRule = (rrule: string) => {
    const parts: string[] = [];
    const rules = rrule.split(";");

    rules.forEach((rule) => {
      const [key, value] = rule.split("=");

      if (key === "FREQ") {
        parts.push(
          `Repeats: ${value.charAt(0) + value.slice(1).toLowerCase()}`
        );
      } else if (key === "BYDAY") {
        const dayMap: Record<string, string> = {
          MO: "Mon",
          TU: "Tue",
          WE: "Wed",
          TH: "Thu",
          FR: "Fri",
          SA: "Sat",
          SU: "Sun",
        };
        const days = value
          .split(",")
          .map((d) => dayMap[d] || d)
          .join(", ");
        parts.push(`Days: ${days}`);
      } else if (key === "COUNT") {
        parts.push(`Occurrences: ${value}`);
      } else if (key === "INTERVAL") {
        parts.push(`Every ${value} weeks`);
      } else if (key === "UNTIL") {
        const date = new Date(value);
        parts.push(`Until: ${date.toLocaleDateString()}`);
      } else if (key === "BYSETPOS") {
        const weekMap: Record<string, string> = {
          "1": "1st",
          "2": "2nd",
          "3": "3rd",
          "4": "4th",
          "-1": "last",
        };
        parts.push(`Week: ${weekMap[value] || value} of month`);
      } else if (key === "BYSETPOS") {
        const weekMap: Record<string, string> = {
          "1": "1st",
          "2": "2nd",
          "3": "3rd",
          "4": "4th",
          "-1": "last",
        };
        parts.push(`Week: ${weekMap[value] || value} of month`);
      }
    });

    return parts;
  };

  useEffect(() => {
    fetchPatterns();
    fetchStaff();
    fetchResources();
  }, [classData.id]);

  const fetchResources = async () => {
    setLoadingResources(true);
    try {
      const response = await fetch("/api/admin/resources", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setResources(data.filter((r: any) => r.isActive));
      }
    } catch (error) {
      console.error("Error fetching resources:", error);
    } finally {
      setLoadingResources(false);
    }
  };

  const fetchStaff = async () => {
    setLoadingStaff(true);
    try {
      const response = await fetch("/api/admin/calendar/staff", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setStaff(data);
      }
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setLoadingStaff(false);
    }
  };

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
        // Sort by creation date (oldest first)
        const sortedData = data.sort(
          (a: any, b: any) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setPatterns(sortedData);
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

      // Build RRULE string - backend uses: 0=MO, 1=TU, 2=WE, 3=TH, 4=FR, 5=SA, 6=SU
      // Frontend uses: 0=SU, 1=MO, 2=TU, 3=WE, 4=TH, 5=FR, 6=SA
      // Convert: if day is 0 (Sunday), map to 6; otherwise subtract 1
      const backendDays = daysOfWeek.map((d) => (d === 0 ? 6 : d - 1));

      // For multi-step courses, use MONTHLY frequency with BYSETPOS
      let rrule = "";
      if (patternType === "multi-step") {
        rrule = `FREQ=MONTHLY`;
        if (backendDays.length > 0) {
          const dayMap = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
          const byDay = backendDays.map((d) => dayMap[d]).join(",");
          rrule += `;BYDAY=${byDay}`;

          // Calculate BYSETPOS values for all selected days in the target week
          // For week 1 with TU,TH: we want 1st TU and 1st TH = positions 1,2
          // For week 2 with TU,TH: we want 2nd TU and 2nd TH = positions 3,4
          // Pattern: week N gets positions from ((N-1)*numDays + 1) to (N*numDays)
          const startPos = (weekOfMonth - 1) * backendDays.length + 1;
          const positions = backendDays.map((_, idx) => startPos + idx);
          rrule += `;BYSETPOS=${positions.join(",")}`;
        }
      } else {
        rrule = `FREQ=${frequency.toUpperCase()}`;
      }

      // For series schedules, INTERVAL represents hours between sessions on the same day
      // For other patterns, INTERVAL means every N weeks/days
      if (
        interval > 1 &&
        patternType !== "multi-step" &&
        patternType !== "series"
      ) {
        rrule += `;INTERVAL=${interval}`;
      }

      if (
        backendDays.length > 0 &&
        frequency === "weekly" &&
        patternType !== "multi-step"
      ) {
        const dayMap = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
        const byDay = backendDays.map((d) => dayMap[d]).join(",");
        rrule += `;BYDAY=${byDay}`;
      }

      // Add COUNT - rrule library requires either COUNT or UNTIL
      if (indefinite) {
        rrule += `;COUNT=50`;
      } else if (endDate) {
        // Calculate approximate occurrences based on date range
        const start = new Date(startDate);
        const end = new Date(previewEndDate);
        const days = Math.ceil(
          (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
        );
        const count =
          frequency === "weekly"
            ? Math.ceil(days / 7) * backendDays.length
            : days;
        rrule += `;COUNT=${count}`;
      } else {
        // Fallback: use 30 days worth
        rrule += `;COUNT=30`;
      }

      // Calculate duration hours
      let calculatedDuration = durationHours;

      // For series, each session is 'interval' hours long
      if (patternType === "series" && interval) {
        calculatedDuration = interval;
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
          endTime: patternType === "series" && endTime ? endTime : undefined,
          durationHours: calculatedDuration.toString(),
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
      // Build RRULE string - backend uses: 0=MO, 1=TU, 2=WE, 3=TH, 4=FR, 5=SA, 6=SU
      // Frontend uses: 0=SU, 1=MO, 2=TU, 3=WE, 4=TH, 5=FR, 6=SA
      // Convert: if day is 0 (Sunday), map to 6; otherwise subtract 1
      const backendDays = daysOfWeek.map((d) => (d === 0 ? 6 : d - 1));

      // For multi-step courses, use MONTHLY frequency with BYSETPOS
      let rrule = "";
      if (patternType === "multi-step") {
        rrule = `FREQ=MONTHLY`;
        if (backendDays.length > 0) {
          const dayMap = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
          const byDay = backendDays.map((d) => dayMap[d]).join(",");
          rrule += `;BYDAY=${byDay}`;

          // Calculate BYSETPOS values for all selected days in the target week
          // For week 1 with TU,TH: we want 1st TU and 1st TH = positions 1,2
          // For week 2 with TU,TH: we want 2nd TU and 2nd TH = positions 3,4
          // Pattern: week N gets positions from ((N-1)*numDays + 1) to (N*numDays)
          const startPos = (weekOfMonth - 1) * backendDays.length + 1;
          const positions = backendDays.map((_, idx) => startPos + idx);
          rrule += `;BYSETPOS=${positions.join(",")}`;
        }
      } else {
        rrule = `FREQ=${frequency.toUpperCase()}`;
      }

      // For series schedules, INTERVAL represents hours between sessions on the same day
      // For other patterns, INTERVAL means every N weeks/days
      if (
        interval > 1 &&
        patternType !== "multi-step" &&
        patternType !== "series"
      ) {
        rrule += `;INTERVAL=${interval}`;
      }

      if (
        backendDays.length > 0 &&
        frequency === "weekly" &&
        patternType !== "multi-step"
      ) {
        const dayMap = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
        const byDay = backendDays.map((d) => dayMap[d]).join(",");
        rrule += `;BYDAY=${byDay}`;
      }

      // Add COUNT or UNTIL - rrule library requires one of these
      if (indefinite) {
        // For indefinite, use 1 year = ~52 weeks (or 12 months for multi-step)
        rrule += patternType === "multi-step" ? `;COUNT=12` : `;COUNT=52`;
      } else if (endDate) {
        // Calculate COUNT from date range
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.ceil(
          (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
        );
        const count =
          patternType === "multi-step"
            ? Math.ceil(days / 30) // Approximate months
            : frequency === "weekly"
              ? Math.ceil(days / 7) * backendDays.length
              : days;
        rrule += `;COUNT=${count}`;
      } else {
        // Fallback
        rrule += `;COUNT=52`;
      }

      // Calculate duration hours
      let calculatedDuration = durationHours;

      // For series, each session is 'interval' hours long
      if (patternType === "series" && endTime) {
        calculatedDuration = interval; // Each session duration
      }

      // For multi-step, create a pattern for each selected step
      if (patternType === "multi-step" && selectedSteps.length > 0) {
        for (const stepNumber of selectedSteps) {
          const step = classData.steps?.find(
            (s: any) => s.stepNumber === stepNumber
          );
          if (!step) continue;

          const url = editingPattern
            ? `/api/admin/schedule-patterns/${editingPattern.id}`
            : "/api/admin/schedule-patterns";
          const method = editingPattern ? "PUT" : "POST";

          const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              classId: classData.id,
              classStepId: step.id,
              recurrenceRule: rrule,
              startDate,
              endDate: indefinite ? null : endDate,
              startTime,
              endTime: undefined, // Multi-step patterns don't use endTime
              durationHours: calculatedDuration.toString(),
              maxStudents: classData.maxStudents || 12,
              defaultInstructorId,
              defaultAssistantId,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error ||
                `Failed to ${editingPattern ? "update" : "create"} pattern for ${step.name}`
            );
          }

          const pattern = await response.json();

          // Only generate sessions for new patterns
          if (!editingPattern) {
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
          }
        }

        alert(
          `Successfully ${editingPattern ? "updated" : "created"} patterns for ${selectedSteps.length} step(s)`
        );
        onSuccess();
        setShowForm(false);
        setShowPreview(false);
        setEditingPattern(null);
        await fetchPatterns();
      } else {
        // For simple and series patterns
        const url = editingPattern
          ? `/api/admin/schedule-patterns/${editingPattern.id}`
          : "/api/admin/schedule-patterns";
        const method = editingPattern ? "PUT" : "POST";

        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            classId: classData.id,
            recurrenceRule: rrule,
            startDate,
            endDate: indefinite ? null : endDate,
            startTime,
            endTime: patternType === "series" && endTime ? endTime : undefined,
            durationHours: calculatedDuration.toString(),
            maxStudents: classData.maxStudents || 12,
            defaultInstructorId,
            defaultAssistantId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error ||
              `Failed to ${editingPattern ? "update" : "create"} schedule pattern`
          );
        }

        const pattern = await response.json();

        // Only generate sessions for new patterns, not when editing
        if (!editingPattern) {
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
        }

        onSuccess();
        setShowForm(false);
        setShowPreview(false);
        setEditingPattern(null);
        
        // Save class resource requirements if any resources are selected
        if (selectedResources.length > 0) {
          try {
            await fetch(`/api/admin/classes/${classData.id}/resources`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                resources: selectedResources,
              }),
            });
          } catch (error) {
            console.error("Error saving resource requirements:", error);
            // Don't fail the whole operation if resource saving fails
          }
        }
        
        await fetchPatterns();
      }
    } catch (error) {
      console.error(
        `Error ${editingPattern ? "updating" : "creating"} pattern:`,
        error
      );
      alert(
        `Failed to ${editingPattern ? "update" : "create"} schedule pattern`
      );
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

  const editPattern = (pattern: SchedulePattern) => {
    setEditingPattern(pattern);
    setShowForm(true);

    // Populate form with existing pattern data
    // Parse recurrence rule
    const rules = pattern.recurrenceRule.split(";");
    let freq = "weekly";
    let days: number[] = [];
    let weekPos = 1;
    let parsedInterval = 1;

    rules.forEach((rule) => {
      const [key, value] = rule.split("=");
      if (key === "FREQ") {
        freq = value.toLowerCase();
      } else if (key === "BYDAY") {
        // Convert backend days (MO=0, TU=1, etc.) to frontend days (SU=0, MO=1, etc.)
        const dayMap: Record<string, number> = {
          MO: 1,
          TU: 2,
          WE: 3,
          TH: 4,
          FR: 5,
          SA: 6,
          SU: 0,
        };
        days = value.split(",").map((d) => dayMap[d] || 0);
      } else if (key === "BYSETPOS") {
        weekPos = parseInt(value);
      } else if (key === "INTERVAL") {
        parsedInterval = parseInt(value) || 1;
      }
    });

    // Determine pattern type based on frequency and structure
    let type: "simple" | "series" | "multi-step" = "simple";
    if (freq === "monthly") {
      type = "multi-step";
    } else if (pattern.classStepId) {
      type = "multi-step";
    } else if (days.length > 1 || freq === "daily") {
      type = "series";
    }

    setPatternType(type);
    setStartDate(pattern.startDate.split("T")[0]);
    setEndDate(pattern.endDate ? pattern.endDate.split("T")[0] : "");
    setIndefinite(!pattern.endDate);
    setDaysOfWeek(days);
    setStartTime(pattern.startTime);
    setDurationHours(parseFloat(pattern.durationHours));

    // For series schedules, the interval (hours between sessions) is stored in durationHours
    // For other patterns, it's in the RRULE INTERVAL
    if (type === "series") {
      setInterval(parseFloat(pattern.durationHours));
    } else {
      setInterval(parsedInterval);
    }

    setFrequency(freq as "daily" | "weekly" | "monthly");
    setWeekOfMonth(weekPos);
    setDefaultInstructorId(pattern.defaultInstructorId || null);
    setDefaultAssistantId(pattern.defaultAssistantId || null);
    setEndTime(pattern.endTime || "");

    if (pattern.classStepId) {
      // Find the step number for this step ID
      const step = classData.steps?.find((s: any) => s.id === pattern.classStepId);
      if (step) {
        setSelectedSteps([step.stepNumber]);
      }
    }

    // Load existing resource requirements
    if (classData.resourceRequirements && classData.resourceRequirements.length > 0) {
      setSelectedResources(
        classData.resourceRequirements.map((req: any) => ({
          resourceId: req.resourceId,
          quantityPerStudent: req.quantityPerStudent,
        }))
      );
    }
  };

  const previewSessionsForPattern = async (patternId: number) => {
    try {
      const response = await fetch(
        `/api/admin/schedule-patterns/${patternId}/preview-sessions`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) throw new Error("Failed to preview sessions");

      const data = await response.json();
      setPreviewingSessions(data.sessions);
      setGeneratingPatternId(patternId);
      setShowSessionsPreview(true);
    } catch (error) {
      console.error("Error previewing sessions:", error);
      alert("Failed to preview sessions");
    }
  };

  const generateSessionsForPattern = async (patternId: number) => {
    if (
      !confirm(
        `Generate ${previewingSessions.length} sessions from this pattern?`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      console.log("[Generate Sessions] Starting for pattern:", patternId);

      const response = await fetch(
        `/api/admin/schedule-patterns/${patternId}/generate`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      console.log("[Generate Sessions] Response status:", response.status);
      console.log("[Generate Sessions] Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Generate Sessions] Error response:", errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          throw new Error(`Failed to generate sessions: ${errorText}`);
        }
        throw new Error(errorData.error || "Failed to generate sessions");
      }

      const data = await response.json();
      console.log("[Generate Sessions] Success:", data);
      alert(data.message);
      setShowSessionsPreview(false);
      setGeneratingPatternId(null);
      onSuccess();
    } catch (error) {
      console.error("[Generate Sessions] Error:", error);
      alert(
        `Failed to generate sessions: ${error instanceof Error ? error.message : "Unknown error"}`
      );
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
                  onClick={() => {
                    setEditingPattern(null);
                    setShowForm(true);
                    // Reset form to defaults
                    setPatternType("simple");
                    setStartDate("");
                    setEndDate("");
                    setIndefinite(false);
                    setDaysOfWeek([]);
                    setStartTime("10:00");
                    setDurationHours(
                      parseFloat(classData.durationHours || "2")
                    );
                    setDefaultInstructorId(null);
                    setDefaultAssistantId(null);
                    setSelectedResources([]);
                  }}
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

                    const ruleParts = pattern.recurrenceRule
                      ? parseRRule(pattern.recurrenceRule)
                      : [];

                    return (
                      <div key={pattern.id} className="pattern-card">
                        <div className="pattern-header">
                          <div>
                            <h4>{patternLabel}</h4>
                            <div className="pattern-details">
                              <ul className="pattern-rules">
                                {ruleParts.map((part, idx) => (
                                  <li key={idx}>{part}</li>
                                ))}
                                <li>Start Time: {pattern.startTime}</li>
                                <li>Duration: {pattern.durationHours} hours</li>
                                <li>
                                  Max Students: {pattern.maxStudents || "N/A"}
                                </li>
                                {pattern.classStepId && classData.steps && (
                                  <li className="pattern-step-info">
                                    <strong>Part: </strong>
                                    {classData.steps.find(
                                      (s: any) => s.id === pattern.classStepId
                                    )?.name || `Step ${pattern.classStepId}`}
                                  </li>
                                )}
                                {pattern.defaultInstructorId && (
                                  <li>
                                    <strong>Instructor: </strong>
                                    {staff.find(
                                      (s) =>
                                        s.id === pattern.defaultInstructorId
                                    )?.name || "Loading..."}
                                  </li>
                                )}
                                {pattern.defaultAssistantId && (
                                  <li>
                                    <strong>Assistant: </strong>
                                    {staff.find(
                                      (s) => s.id === pattern.defaultAssistantId
                                    )?.name || "Loading..."}
                                  </li>
                                )}
                              </ul>
                            </div>
                            <p className="pattern-dates">
                              {parseLocalDate(pattern.startDate).toLocaleDateString()}
                              {pattern.endDate
                                ? ` - ${parseLocalDate(pattern.endDate).toLocaleDateString()}`
                                : " - Ongoing"}
                            </p>
                          </div>
                          <div className="pattern-actions">
                            <button
                              onClick={() => editPattern(pattern)}
                              className="btn btn-secondary btn-sm"
                              title="Edit pattern"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                previewSessionsForPattern(pattern.id)
                              }
                              className="btn btn-secondary btn-sm"
                              title="Preview sessions"
                            >
                              Preview Sessions
                            </button>
                            <button
                              onClick={() => deletePattern(pattern.id)}
                              className="btn-icon btn-danger"
                              title="Delete pattern"
                            >
                              ×
                            </button>
                          </div>
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
                Showing sessions for the next 30 days. Click "Confirm & Create"
                to save this pattern.
              </p>

              <div className="preview-sessions">
                {previewSessions
                  .slice(0, 20)
                  .map((session: any, index: number) => {
                    // Combine sessionDate with startTime and endTime
                    const sessionDate = parseLocalDate(session.sessionDate);
                    const [startHour, startMin] = session.startTime.split(":");
                    const [endHour, endMin] = session.endTime.split(":");

                    const startDateTime = new Date(sessionDate);
                    startDateTime.setHours(
                      parseInt(startHour),
                      parseInt(startMin),
                      0,
                      0
                    );

                    const endDateTime = new Date(sessionDate);
                    endDateTime.setHours(
                      parseInt(endHour),
                      parseInt(endMin),
                      0,
                      0
                    );

                    return (
                      <div key={index} className="preview-session">
                        <span className="session-date">
                          {startDateTime.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="session-time">
                          {startDateTime.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}{" "}
                          -{" "}
                          {endDateTime.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    );
                  })}
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
                  {loading
                    ? editingPattern
                      ? "Updating..."
                      : "Creating..."
                    : editingPattern
                      ? "Confirm & Update"
                      : "Confirm & Create"}
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
                    <small>
                      Single recurring pattern (e.g., every Tuesday at 6pm)
                    </small>
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
                    <small>
                      Multiple sessions throughout the day (e.g., every 2 hours)
                    </small>
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
                      Different parts on different weeks (e.g., Part 1 week 1,
                      Part 2 week 2)
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
                  {patternType !== "series" && (
                    <div className="form-group">
                      <label>Duration (hours)</label>
                      <input
                        type="number"
                        value={durationHours}
                        onChange={(e) =>
                          setDurationHours(parseFloat(e.target.value))
                        }
                        min="0.5"
                        max="8"
                        step="0.5"
                        required
                        disabled={patternType === "simple"}
                      />
                      {patternType === "simple" && (
                        <small className="text-muted">
                          Duration is set from class settings (
                          {classData.durationHours} hrs)
                        </small>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Studio Resources Section */}
              <div className="form-section">
                <h3>Studio Resources (Optional)</h3>
                <p className="text-muted" style={{ marginBottom: "1rem" }}>
                  Specify which studio resources are required for this class
                  (e.g., pottery wheels, painting stations). This helps track
                  resource availability.
                </p>
                {loadingResources ? (
                  <p>Loading resources...</p>
                ) : resources.length === 0 ? (
                  <p className="text-muted">
                    No studio resources defined.{" "}
                    <a href="/admin" style={{ textDecoration: "underline" }}>
                      Add resources in Studio Resources section.
                    </a>
                  </p>
                ) : (
                  <div className="resources-list">
                    {resources.map((resource) => {
                      const selected = selectedResources.find(
                        (r) => r.resourceId === resource.id
                      );
                      return (
                        <div key={resource.id} className="resource-item">
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={!!selected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedResources([
                                    ...selectedResources,
                                    {
                                      resourceId: resource.id,
                                      quantityPerStudent: 1,
                                    },
                                  ]);
                                } else {
                                  setSelectedResources(
                                    selectedResources.filter(
                                      (r) => r.resourceId !== resource.id
                                    )
                                  );
                                }
                              }}
                            />
                            <span>
                              {resource.name}
                              {resource.description && (
                                <small className="text-muted">
                                  {" "}
                                  - {resource.description}
                                </small>
                              )}
                              <small className="text-muted">
                                {" "}
                                (Available: {resource.quantity})
                              </small>
                            </span>
                          </label>
                          {selected && (
                            <div
                              className="form-group"
                              style={{ marginLeft: "2rem", marginTop: "0.5rem" }}
                            >
                              <label>Quantity per student</label>
                              <input
                                type="number"
                                min="1"
                                value={selected.quantityPerStudent}
                                onChange={(e) => {
                                  setSelectedResources(
                                    selectedResources.map((r) =>
                                      r.resourceId === resource.id
                                        ? {
                                            ...r,
                                            quantityPerStudent: parseInt(
                                              e.target.value
                                            ),
                                          }
                                        : r
                                    )
                                  );
                                }}
                                style={{ width: "100px" }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Staff Assignment Section */}
              <div className="form-section">
                <h3>Staff Assignment (Optional)</h3>
                <p className="text-muted" style={{ marginBottom: "1rem" }}>
                  Assign a default instructor and/or assistant to all sessions
                  created from this pattern.
                </p>
                <div className="form-row">
                  <div className="form-group">
                    <label>Default Instructor</label>
                    <select
                      value={defaultInstructorId || ""}
                      onChange={(e) =>
                        setDefaultInstructorId(
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      disabled={loadingStaff}
                    >
                      <option value="">No instructor assigned</option>
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} - {member.email}
                        </option>
                      ))}
                    </select>
                    {loadingStaff && (
                      <small className="text-muted">Loading staff...</small>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Default Assistant</label>
                    <select
                      value={defaultAssistantId || ""}
                      onChange={(e) =>
                        setDefaultAssistantId(
                          e.target.value ? parseInt(e.target.value) : null
                        )
                      }
                      disabled={loadingStaff}
                    >
                      <option value="">No assistant assigned</option>
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} - {member.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {patternType === "multi-step" && (
                <div className="form-section">
                  <h3>Multi-Step Configuration</h3>
                  <p className="text-muted" style={{ marginBottom: "1rem" }}>
                    Select which steps of the course to schedule, and specify
                    which week of the month they occur.
                  </p>

                  {classData.steps && classData.steps.length > 0 ? (
                    <>
                      <div className="form-group">
                        <label>Select Course Steps</label>
                        <div className="steps-checkboxes">
                          {classData.steps.map((step: any, index: number) => (
                            <label key={step.id} className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={selectedSteps.includes(
                                  step.stepNumber
                                )}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSteps(
                                      [...selectedSteps, step.stepNumber].sort()
                                    );
                                  } else {
                                    setSelectedSteps(
                                      selectedSteps.filter(
                                        (s) => s !== step.stepNumber
                                      )
                                    );
                                  }
                                }}
                              />
                              <span>
                                Part {step.stepNumber}: {step.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Week of Month for Selected Steps</label>
                        <select
                          className="form-select"
                          value={weekOfMonth}
                          onChange={(e) =>
                            setWeekOfMonth(parseInt(e.target.value))
                          }
                        >
                          <option value="1">1st week of month</option>
                          <option value="2">2nd week of month</option>
                          <option value="3">3rd week of month</option>
                          <option value="4">4th week of month</option>
                        </select>
                        <small className="text-muted">
                          All selected steps will run on the specified days
                          during this week of the month.
                        </small>
                      </div>
                    </>
                  ) : (
                    <p className="text-warning">
                      This class doesn't have steps defined. Please edit the
                      class and add course steps first.
                    </p>
                  )}
                </div>
              )}

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
                    Example: Interval of 2 means sessions at 10am, 12pm, 2pm,
                    4pm, etc.
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
        .form-group input[type="number"],
        .form-group select,
        .form-select {
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
          background: white;
        }

        .form-select {
          width: 100%;
        }

        .steps-checkboxes {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1rem;
          background: #f9f9f9;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .checkbox-label:hover {
          background: #f0f0f0;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .checkbox-label span {
          font-size: 0.95rem;
          color: #333;
        }

        .text-warning {
          color: #e67700;
          padding: 1rem;
          background: #fff3e0;
          border-radius: 6px;
          border-left: 4px solid #e67700;
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

        .pattern-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          flex-shrink: 0;
        }

        .pattern-header h4 {
          margin: 0 0 0.5rem 0;
          font-size: 1.1rem;
          color: #333;
        }

        .pattern-details {
          margin: 0.5rem 0;
        }

        .pattern-rules {
          list-style: none;
          padding: 0;
          margin: 0.5rem 0;
        }

        .pattern-rules li {
          padding: 0.25rem 0;
          color: #555;
          font-size: 0.9rem;
        }

        .pattern-rules li:before {
          content: "•";
          color: #4a90e2;
          font-weight: bold;
          display: inline-block;
          width: 1em;
          margin-left: 0;
        }

        .pattern-dates {
          margin: 0.5rem 0 0 0;
          color: #666;
          font-size: 0.9rem;
          font-weight: 500;
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

        .resources-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .resource-item {
          padding: 0.5rem;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          background: #f9f9f9;
        }

        .resource-item .checkbox-label {
          display: flex;
          align-items: start;
          gap: 0.5rem;
        }

        .resource-item .checkbox-label input[type="checkbox"] {
          margin-top: 0.25rem;
          flex-shrink: 0;
        }

        .resource-item .checkbox-label span {
          flex: 1;
        }
      `}</style>

      {/* Sessions Preview Modal */}
      {showSessionsPreview && (
        <div
          className="modal-overlay"
          onClick={() => setShowSessionsPreview(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Preview: Generated Sessions</h2>
              <button
                onClick={() => setShowSessionsPreview(false)}
                className="modal-close"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p className="text-muted">
                This will create {previewingSessions.length} session
                {previewingSessions.length !== 1 ? "s" : ""} from this pattern.
              </p>

              <div className="preview-sessions">
                {previewingSessions.map((session, index) => (
                  <div key={index} className="preview-session">
                    <div>
                      <div className="session-date">
                        Session {session.sessionNumber}: {session.dayOfWeek},{" "}
                        {parseLocalDate(session.sessionDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="session-time">
                      {session.startTime} - {session.endTime}
                    </div>
                  </div>
                ))}
              </div>

              <div className="modal-actions">
                <button
                  onClick={() => setShowSessionsPreview(false)}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    generatingPatternId &&
                    generateSessionsForPattern(generatingPatternId)
                  }
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading
                    ? "Generating..."
                    : `Generate ${previewingSessions.length} Sessions`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
