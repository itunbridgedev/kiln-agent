"use client";

import { useCallback, useEffect, useState } from "react";

interface ProjectCard {
  id: number;
  name: string;
  status: string;
  images: { imageUrl: string }[];
  customer: { name: string };
}

interface UnmatchedPhoto {
  file: File;
  url: string;
  id: string;
}

export default function FiringPhotoMatch() {
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [photos, setPhotos] = useState<UnmatchedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matching, setMatching] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      // Get projects currently in kiln or bisque_done stages
      const [bisqueRes, glazeRes] = await Promise.all([
        fetch("/api/admin/projects?status=KILN_BISQUE", { credentials: "include" }),
        fetch("/api/admin/projects?status=KILN_GLAZE", { credentials: "include" }),
      ]);

      const bisque = bisqueRes.ok ? await bisqueRes.json() : [];
      const glaze = glazeRes.ok ? await glazeRes.json() : [];
      setProjects([...bisque, ...glaze]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleFileUpload = (files: FileList) => {
    const newPhotos = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({
        file,
        url: URL.createObjectURL(file),
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }));
    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const handleMatchPhoto = async (photoId: string, projectId: number) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    setMatching(photoId);
    setError(null);

    try {
      // Determine stage based on project status
      const project = projects.find((p) => p.id === projectId);
      const stage = project?.status === "KILN_BISQUE" ? "bisque" : "glazed";

      const formData = new FormData();
      formData.append("images", photo.file);
      formData.append("stage", stage);

      const response = await fetch(`/api/admin/projects/${projectId}/images`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload photo");

      // Advance project status
      const nextStatus = project?.status === "KILN_BISQUE" ? "BISQUE_DONE" : "GLAZE_DONE";
      await fetch(`/api/admin/projects/${projectId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      });

      // Remove matched photo from list
      setPhotos((prev) => {
        const p = prev.find((pp) => pp.id === photoId);
        if (p) URL.revokeObjectURL(p.url);
        return prev.filter((pp) => pp.id !== photoId);
      });

      setSuccess(`Matched to ${project?.name}`);
      setTimeout(() => setSuccess(null), 3000);
      fetchProjects();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setMatching(null);
    }
  };

  const skipPhoto = (photoId: string) => {
    setPhotos((prev) => {
      const p = prev.find((pp) => pp.id === photoId);
      if (p) URL.revokeObjectURL(p.url);
      return prev.filter((pp) => pp.id !== photoId);
    });
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Photo Matching</h3>
      <p className="text-sm text-gray-600">
        Upload photos from a kiln unload, then match them to projects.
      </p>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-bold">&times;</button>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm">{success}</div>
      )}

      {/* Upload area */}
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
        <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 text-sm">
          Upload Fired Photos
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          />
        </label>
        <p className="text-xs text-gray-400 mt-2">
          Upload photos taken after kiln unload
        </p>
      </div>

      {photos.length > 0 && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Unmatched Photos */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Unmatched Photos ({photos.length})
            </h4>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="bg-white border rounded-lg p-3"
                >
                  <img
                    src={photo.url}
                    alt="Fired piece"
                    className="w-full h-40 object-cover rounded-lg mb-2"
                  />
                  <div className="flex gap-2">
                    <select
                      className="flex-1 border rounded-lg px-2 py-1.5 text-sm"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleMatchPhoto(photo.id, parseInt(e.target.value));
                        }
                      }}
                      disabled={matching === photo.id}
                    >
                      <option value="">Match to project...</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.customer.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => skipPhoto(photo.id)}
                      className="px-3 py-1.5 text-gray-500 border rounded-lg hover:bg-gray-50 text-sm"
                    >
                      Skip
                    </button>
                  </div>
                  {matching === photo.id && (
                    <p className="text-xs text-blue-600 mt-1">Matching...</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Projects in Kiln */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Projects in Kiln ({projects.length})
            </h4>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white border rounded-lg p-3 flex items-center gap-3"
                >
                  {project.images[0] ? (
                    <img
                      src={project.images[0].imageUrl}
                      alt=""
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-lg">
                      🏺
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{project.name}</p>
                    <p className="text-xs text-gray-500">{project.customer.name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      project.status === "KILN_BISQUE"
                        ? "bg-red-100 text-red-800"
                        : "bg-pink-100 text-pink-800"
                    }`}>
                      {project.status === "KILN_BISQUE" ? "Bisque" : "Glaze"}
                    </span>
                  </div>
                </div>
              ))}
              {projects.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  No projects currently in kiln.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {photos.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          No unmatched photos. Upload some to get started.
        </p>
      )}
    </div>
  );
}
