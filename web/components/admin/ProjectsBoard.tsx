"use client";

import StatusBadge, { STATUS_CONFIG } from "@/components/projects/StatusBadge";
import { useCallback, useEffect, useState } from "react";

interface ProjectCard {
  id: number;
  name: string;
  status: string;
  images: { imageUrl: string }[];
  customer: { id: number; name: string; picture: string | null };
}

interface ProjectDetail {
  id: number;
  name: string;
  description: string | null;
  tags: string[];
  status: string;
  createdAt: string;
  images: { id: number; imageUrl: string; stage: string | null }[];
  customer: { id: number; name: string; email: string; picture: string | null };
  firings: { id: number; firingType: string; firingProduct: { name: string }; paidAt: string | null }[];
  statusHistory: { id: number; fromStatus: string; toStatus: string; changedAt: string; changedBy: { name: string } | null }[];
}

const BOARD_COLUMNS = [
  "DRYING",
  "DOCK_BISQUE",
  "KILN_BISQUE",
  "BISQUE_DONE",
  "DOCK_GLAZE",
  "KILN_GLAZE",
  "GLAZE_DONE",
  "PICKUP_READY",
];

const NEXT_STATUS: Record<string, string> = {
  DRYING: "DOCK_BISQUE",
  DOCK_BISQUE: "KILN_BISQUE",
  KILN_BISQUE: "BISQUE_DONE",
  BISQUE_DONE: "DOCK_GLAZE",
  DOCK_GLAZE: "KILN_GLAZE",
  KILN_GLAZE: "GLAZE_DONE",
  GLAZE_DONE: "PICKUP_READY",
  PICKUP_READY: "PICKED_UP",
};

export default function ProjectsBoard() {
  const [board, setBoard] = useState<Record<string, ProjectCard[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchStatus, setBatchStatus] = useState("");
  const [batchUpdating, setBatchUpdating] = useState(false);
  const [detailProject, setDetailProject] = useState<ProjectDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dragProjectId, setDragProjectId] = useState<number | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  const fetchBoard = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/projects/board", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load board");
      setBoard(await response.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const updateStatus = async (projectId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/projects/${projectId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      fetchBoard();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBatchUpdate = async () => {
    if (selectedIds.size === 0 || !batchStatus) return;
    setBatchUpdating(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/projects/batch-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          projectIds: Array.from(selectedIds),
          status: batchStatus,
        }),
      });
      if (!response.ok) throw new Error("Batch update failed");
      setSelectedIds(new Set());
      setBatchStatus("");
      fetchBoard();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBatchUpdating(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openDetail = async (projectId: number) => {
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/admin/projects/${projectId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load project");
      setDetailProject(await response.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, projectId: number) => {
    setDragProjectId(projectId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (dragProjectId) {
      updateStatus(dragProjectId, targetStatus);
      setDragProjectId(null);
    }
  };

  const filterProject = (project: ProjectCard) => {
    if (!searchFilter) return true;
    const search = searchFilter.toLowerCase();
    return (
      project.name.toLowerCase().includes(search) ||
      project.customer.name.toLowerCase().includes(search)
    );
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading board...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-bold">&times;</button>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Search by name or customer..."
          className="border rounded-lg px-3 py-2 text-sm flex-1"
        />
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {selectedIds.size} selected
            </span>
            <select
              value={batchStatus}
              onChange={(e) => setBatchStatus(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-sm"
            >
              <option value="">Move to...</option>
              {BOARD_COLUMNS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_CONFIG[s]?.label || s}
                </option>
              ))}
              <option value="PICKED_UP">Picked Up</option>
              <option value="DAMAGED">Damaged</option>
            </select>
            <button
              onClick={handleBatchUpdate}
              disabled={!batchStatus || batchUpdating}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {batchUpdating ? "Moving..." : "Move"}
            </button>
          </div>
        )}
      </div>

      {/* Board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {BOARD_COLUMNS.map((status) => {
          const projects = (board[status] || []).filter(filterProject);
          const config = STATUS_CONFIG[status];

          return (
            <div
              key={status}
              className="flex-shrink-0 w-56 bg-gray-100 rounded-xl p-3"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-600 uppercase">
                  {config?.label || status}
                </h3>
                <span className="text-xs text-gray-400">{projects.length}</span>
              </div>

              <div className="space-y-2 min-h-[100px]">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-white rounded-lg shadow-sm p-2 cursor-pointer hover:shadow-md transition-shadow"
                    draggable
                    onDragStart={(e) => handleDragStart(e, project.id)}
                    onClick={() => openDetail(project.id)}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(project.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelect(project.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        {project.images[0] && (
                          <img
                            src={project.images[0].imageUrl}
                            alt=""
                            className="w-full h-20 object-cover rounded mb-1.5"
                          />
                        )}
                        <p className="text-sm font-medium truncate">
                          {project.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {project.customer.name}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {(detailProject || detailLoading) && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setDetailProject(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {detailLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : detailProject ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{detailProject.name}</h2>
                    <p className="text-sm text-gray-500">
                      {detailProject.customer.name} — {detailProject.customer.email}
                    </p>
                  </div>
                  <button
                    onClick={() => setDetailProject(null)}
                    className="text-gray-400 hover:text-gray-600 text-xl"
                  >
                    &times;
                  </button>
                </div>

                <StatusBadge status={detailProject.status} />

                {detailProject.description && (
                  <p className="text-sm text-gray-700">{detailProject.description}</p>
                )}

                {detailProject.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {detailProject.images.map((img) => (
                      <img
                        key={img.id}
                        src={img.imageUrl}
                        alt=""
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}

                {detailProject.firings.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Firings</h4>
                    {detailProject.firings.map((f) => (
                      <div key={f.id} className="text-sm text-gray-600">
                        {f.firingProduct.name} — {f.paidAt ? "Paid" : "Pending"}
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick status change */}
                {NEXT_STATUS[detailProject.status] && (
                  <button
                    onClick={() => {
                      updateStatus(detailProject.id, NEXT_STATUS[detailProject.status]);
                      setDetailProject(null);
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Move to {STATUS_CONFIG[NEXT_STATUS[detailProject.status]]?.label}
                  </button>
                )}

                <button
                  onClick={() => {
                    updateStatus(detailProject.id, "DAMAGED");
                    setDetailProject(null);
                  }}
                  className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm"
                >
                  Mark as Damaged
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
