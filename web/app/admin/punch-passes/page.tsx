"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminPunchPassesPage() {
  const router = useRouter();

  useEffect(() => {
    localStorage.setItem("adminActiveTab", "punch-passes");
    router.replace("/admin");
  }, [router]);

  return null;
}
