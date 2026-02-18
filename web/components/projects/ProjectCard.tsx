"use client";

import Link from "next/link";
import StatusBadge from "./StatusBadge";

interface ProjectCardProps {
  project: {
    id: number;
    name: string;
    status: string;
    tags: string[];
    updatedAt: string;
    images: { id: number; imageUrl: string }[];
    firings?: { firingProduct: { name: string; firingType: string } }[];
  };
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const thumbnail = project.images[0]?.imageUrl;

  return (
    <Link href={`/my-projects/${project.id}`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
        <div className="aspect-square bg-gray-100 relative">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={project.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
              🏺
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-medium text-gray-900 truncate">{project.name}</h3>
          <div className="mt-1">
            <StatusBadge status={project.status} />
          </div>
          {project.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {project.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
