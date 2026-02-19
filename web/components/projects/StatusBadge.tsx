"use client";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  CREATED: { label: "Created", color: "bg-gray-100 text-gray-800" },
  DOCK_BISQUE: { label: "Dock (Bisque)", color: "bg-orange-100 text-orange-800" },
  DRYING: { label: "Drying", color: "bg-yellow-100 text-yellow-800" },
  KILN_BISQUE: { label: "In Kiln (Bisque)", color: "bg-red-100 text-red-800" },
  BISQUE_DONE: { label: "Bisque Done", color: "bg-blue-100 text-blue-800" },
  DOCK_GLAZE: { label: "Dock (Glaze)", color: "bg-purple-100 text-purple-800" },
  DRYING_GLAZE: { label: "Drying (Glaze)", color: "bg-yellow-100 text-yellow-800" },
  KILN_GLAZE: { label: "In Kiln (Glaze)", color: "bg-pink-100 text-pink-800" },
  GLAZE_DONE: { label: "Glaze Done", color: "bg-teal-100 text-teal-800" },
  PICKUP_READY: { label: "Ready for Pickup", color: "bg-green-100 text-green-800" },
  PICKED_UP: { label: "Picked Up", color: "bg-emerald-100 text-emerald-800" },
  DAMAGED: { label: "Damaged", color: "bg-red-200 text-red-900" },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { label: status, color: "bg-gray-100 text-gray-800" };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

export { STATUS_CONFIG };
