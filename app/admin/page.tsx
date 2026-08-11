"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { restoreAdminSession } from "@/lib/api/auth";

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    restoreAdminSession().then((admin) => {
      router.replace(admin ? "/admin/dashboard" : "/admin/login");
    });
  }, [router]);

  return null;
}
