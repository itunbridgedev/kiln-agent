"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PaymentsSettings() {
  const router = useRouter();

  useEffect(() => {
    localStorage.setItem("adminActiveTab", "stripe-connect");
    router.replace("/admin");
  }, [router]);

  return null;
}
