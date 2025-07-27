"use client";

import MainContent from "@/components/MainContent";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (status === "loading") return; // Still loading
    if (!session) router.push("/"); // Not signed in
  }, [session, status, router]);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  // Show loading state
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  // Don't render anything if no session (will redirect)
  if (!session) {
    return null;
  }

  console.log({ session });

  return (
    <div className="min-h-screen bg-gray-50">
      Dashboard
      {/* Header */}
      {/* body */}
      <MainContent />
    </div>
  );
}
