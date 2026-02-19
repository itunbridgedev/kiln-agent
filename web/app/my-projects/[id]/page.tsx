"use client";

import Footer from "@/components/home/Footer";
import Header from "@/components/home/Header";
import FiringPurchaseModal from "@/components/projects/FiringPurchaseModal";
import ImageUpload from "@/components/projects/ImageUpload";
import ProjectForm from "@/components/projects/ProjectForm";
import StatusBadge from "@/components/projects/StatusBadge";
import StatusTimeline from "@/components/projects/StatusTimeline";
import { useAuth } from "@/context/AuthContext";
import "@/styles/Home.css";
import { format, parseISO } from "date-fns";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface ProjectImage {
  id: number;
  imageUrl: string;
  s3Key: string;
  stage: string | null;
  caption: string | null;
  sortOrder: number;
}

interface FiringRequest {
  id: number;
  firingType: string;
  paidAt: string | null;
  requestedAt: string;
  completedAt: string | null;
  notes: string | null;
  firingProduct: { name: string; firingType: string; price: string };
}

interface StatusEntry {
  id: number;
  fromStatus: string;
  toStatus: string;
  changedBy: { id: number; name: string } | null;
  note: string | null;
  changedAt: string;
}

interface Project {
  id: number;
  name: string;
  description: string | null;
  tags: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  images: ProjectImage[];
  firings: FiringRequest[];
  statusHistory: StatusEntry[];
  customer: { id: number; name: string; email: string; picture: string | null };
  classSession: { id: number; sessionDate: string; class: { name: string } } | null;
  openStudioBooking: { id: number; startTime: string; endTime: string } | null;
}

export default function ProjectDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = parseInt(params.id as string);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showFiringModal, setShowFiringModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Project not found");
      setProject(await response.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (user) fetchProject();
  }, [user, fetchProject]);

  const handleUpdate = async (data: { name: string; description: string; tags: string[] }) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update project");
      setEditing(false);
      fetchProject();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete project");
      }
      router.push("/my-projects");
    } catch (err: any) {
      setError(err.message);
      setDeleting(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/images/${imageId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete image");
      fetchProject();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const firingEligibleStatuses = ["CREATED", "BISQUE_DONE", "PICKUP_READY", "PICKED_UP"];
  const needsPhoto = ["CREATED", "BISQUE_DONE"].includes(project?.status || "");
  const canRequestFiring =
    firingEligibleStatuses.includes(project?.status || "") &&
    (project?.images?.length ?? 0) > 0;
  const isRefire = project?.status === "PICKUP_READY" || project?.status === "PICKED_UP";
  const isDocking = ["DOCK_BISQUE", "DOCK_GLAZE"].includes(project?.status || "");
  const isInProgress = ["DRYING", "DOCK_BISQUE", "KILN_BISQUE", "DOCK_GLAZE", "KILN_GLAZE"].includes(project?.status || "");

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading project...</div>
        ) : error ? (
          <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>
        ) : !project ? (
          <div className="text-center py-12 text-gray-500">Project not found</div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <button
                  onClick={() => router.push("/my-projects")}
                  className="text-sm text-blue-600 hover:underline mb-2 inline-block"
                >
                  &larr; Back to Projects
                </button>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <StatusBadge status={project.status} />
                  <span className="text-sm text-gray-500">
                    Created {format(parseISO(project.createdAt), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {canRequestFiring && (
                  <button
                    onClick={() => setShowFiringModal(true)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
                  >
                    {isRefire ? "Re-fire" : "Request Firing"}
                  </button>
                )}
                {needsPhoto && project.images.length === 0 && (
                  <span className="text-xs text-gray-500 self-center">
                    Upload a photo to request firing
                  </span>
                )}
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-2 text-gray-700 border rounded-lg hover:bg-gray-50 text-sm"
                >
                  Edit
                </button>
              </div>
            </div>

            {/* Docking / In-Progress Message */}
            {isDocking && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                Please leave your piece in the kiln docking area. Staff will load it into the kiln when ready.
              </div>
            )}
            {isInProgress && !isDocking && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                Your piece is being processed. You&apos;ll see status updates here as it moves through the kiln.
              </div>
            )}

            {/* Linked Session */}
            {project.classSession && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <span className="text-blue-800 font-medium">
                  From class: {project.classSession.class.name}
                </span>
                <span className="text-blue-600 ml-2">
                  ({format(parseISO(project.classSession.sessionDate), "MMM d, yyyy")})
                </span>
              </div>
            )}

            {/* Description & Tags */}
            {(project.description || project.tags.length > 0) && (
              <div className="bg-white rounded-xl border p-4">
                {project.description && (
                  <p className="text-gray-700 text-sm">{project.description}</p>
                )}
                {project.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Status Timeline */}
            <div className="bg-white rounded-xl border p-4">
              <StatusTimeline
                history={project.statusHistory}
                currentStatus={project.status}
              />
            </div>

            {/* Images */}
            <div className="bg-white rounded-xl border p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Photos</h3>
              {project.images.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                  {project.images.map((image) => (
                    <div key={image.id} className="relative aspect-square rounded-lg overflow-hidden group">
                      <img
                        src={image.imageUrl}
                        alt={image.stage || "Project photo"}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setSelectedImage(image.imageUrl)}
                      />
                      {image.stage && (
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                          {image.stage}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteImage(image.id)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 mb-4">No photos yet.</p>
              )}
              <ImageUpload
                projectId={project.id}
                onUploadComplete={fetchProject}
              />
            </div>

            {/* Firing History */}
            {project.firings.length > 0 && (
              <div className="bg-white rounded-xl border p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Firing Requests</h3>
                <div className="space-y-2">
                  {project.firings.map((firing) => (
                    <div
                      key={firing.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                    >
                      <div>
                        <span className="font-medium">{firing.firingProduct.name}</span>
                        <span className="text-gray-500 ml-2">
                          ${parseFloat(firing.firingProduct.price).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {firing.paidAt
                          ? `Paid ${format(parseISO(firing.paidAt), "MMM d, yyyy")}`
                          : "Pending"}
                        {firing.completedAt && (
                          <span className="ml-2 text-green-600">
                            Completed {format(parseISO(firing.completedAt), "MMM d")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Danger Zone */}
            <div className="border border-red-200 rounded-xl p-4">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete this project"}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {editing && project && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Edit Project</h2>
            <ProjectForm
              initialData={{
                name: project.name,
                description: project.description || "",
                tags: project.tags,
              }}
              onSubmit={handleUpdate}
              onCancel={() => setEditing(false)}
              submitting={saving}
            />
          </div>
        </div>
      )}

      {/* Firing Modal */}
      {showFiringModal && project && (
        <FiringPurchaseModal
          projectId={project.id}
          projectStatus={project.status}
          onClose={() => setShowFiringModal(false)}
          onPurchaseComplete={() => {
            setShowFiringModal(false);
            fetchProject();
          }}
        />
      )}

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}

      <Footer />
    </div>
  );
}
