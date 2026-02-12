"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminMembershipsPage() {
  const router = useRouter();

  useEffect(() => {
    localStorage.setItem("adminActiveTab", "membership-tiers");
    router.replace("/admin");
  }, [router]);

  return null;
}
