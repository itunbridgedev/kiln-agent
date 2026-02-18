"use client";

import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import ProjectCard from "@/components/projects/ProjectCard";
import ProjectForm from "@/components/projects/ProjectForm";
import { useAuth } from "@/context/AuthContext";
import "@/styles/Home.css";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

interface Project {
  id: number;
  name: string;
  status: string;
  tags: string[];
  updatedAt: string;
  images: { id: number; imageUrl: string }[];
  firings: { firingProduct: { name: string; firingType: string } }[];
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "CREATED", label: "Created" },
  { value: "DRYING", label: "Drying" },
  { value: "DOCK_BISQUE", label: "Dock (Bisque)" },
  { value: "KILN_BISQUE", label: "In Kiln (Bisque)" },
  { value: "BISQUE_DONE", label: "Bisque Done" },
  { value: "DOCK_GLAZE", label: "Dock (Glaze)" },
  { value: "KILN_GLAZE", label: "In Kiln (Glaze)" },
  { value: "GLAZE_DONE", label: "Glaze Done" },
  { value: "PICKUP_READY", label: "Ready for Pickup" },
  { value: "PICKED_UP", label: "Picked Up" },
];

export default function MyProjectsPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-gray-500">Loading...</div></div>}>
      <MyProjectsPage />
    </Suspense>
  );
}

function MyProjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [linkedBookingId, setLinkedBookingId] = useState<number | null>(null);
  const [defaultProjectName, setDefaultProjectName] = useState("");

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Auto-open form if coming from a booking
  useEffect(() => {
    const bookingId = searchParams.get("newFromBooking");
    const sessionName = searchParams.get("sessionName");
    if (bookingId) {
      setLinkedBookingId(parseInt(bookingId));
      setDefaultProjectName(sessionName ? `Piece from ${sessionName}` : "");
      setShowForm(true);
    }
  }, [searchParams]);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      params.set("page", page.toString());

      const response = await fetch(`/api/projects?${params}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load projects");

      const data = await response.json();
      setProjects(data.projects);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    if (user) fetchProjects();
  }, [user, fetchProjects]);

  const handleCreate = async (data: { name: string; description: string; tags: string[] }) => {
    setCreating(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          ...(linkedBookingId ? { openStudioBookingId: linkedBookingId } : {}),
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to create project");
      }

      const project = await response.json();
      setShowForm(false);
      router.push(`/my-projects/${project.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + New Project
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search projects..."
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm mb-4">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🏺</div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No projects yet</h3>
            <p className="text-gray-500 text-sm mb-4">
              Create your first project to start tracking your pottery pieces.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Create Project
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1 rounded text-sm ${
                      p === page
                        ? "bg-blue-600 text-white"
                        : "bg-white text-gray-700 border hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            <div className="text-center text-xs text-gray-400 mt-2">
              {total} project{total !== 1 ? "s" : ""}
            </div>
          </>
        )}
      </main>

      {/* Create Project Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">New Project</h2>
            {linkedBookingId && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800 mb-3">
                Linking to your open studio session
              </div>
            )}
            <ProjectForm
              onSubmit={handleCreate}
              onCancel={() => {
                setShowForm(false);
                setLinkedBookingId(null);
                setDefaultProjectName("");
              }}
              initialData={defaultProjectName ? { name: defaultProjectName, description: "", tags: [] } : undefined}
              submitting={creating}
            />
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
