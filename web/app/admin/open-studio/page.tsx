"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminOpenStudioPage() {
  const router = useRouter();

  useEffect(() => {
    localStorage.setItem("adminActiveTab", "open-studio");
    router.replace("/admin");
  }, [router]);

  return null;
}
