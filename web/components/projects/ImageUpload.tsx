"use client";

import { useCallback, useState } from "react";

interface ImageUploadProps {
  projectId: number;
  onUploadComplete: () => void;
  stage?: string;
}

export default function ImageUpload({ projectId, onUploadComplete, stage }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const newPreviews = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 5)
      .map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPreviews(newPreviews);
    setError(null);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (previews.length === 0) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      previews.forEach(({ file }) => formData.append("images", file));
      if (stage) formData.append("stage", stage);

      const response = await fetch(`/api/projects/${projectId}/images`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      setPreviews([]);
      onUploadComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const removePreview = (index: number) => {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  return (
    <div className="space-y-3">
      <div
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          dragOver
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <p className="text-sm text-gray-500 mb-2">
          Drag & drop images here, or
        </p>
        <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 text-sm">
          Choose Files
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </label>
        <p className="text-xs text-gray-400 mt-2">
          Max 5 images, 10MB each. JPEG, PNG, WebP, HEIC.
        </p>
      </div>

      {previews.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {previews.map((preview, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                <img
                  src={preview.url}
                  alt={`Preview ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removePreview(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {uploading ? "Uploading..." : `Upload ${previews.length} Image${previews.length > 1 ? "s" : ""}`}
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>
      )}
    </div>
  );
}
