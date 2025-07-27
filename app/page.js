"use client";

import { Button } from "@/components/ui/button";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  // If user is already signed in, redirect to dashboard
  if (session) {
    router.push("/dashboard");
    return null;
  }

  // Show loading state
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-6 p-8 bg-white rounded-lg shadow-lg">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Mail Reader App
          </h1>
          <p className="text-gray-600">
            Connect your Gmail to analyze bank emails
          </p>
        </div>

        <div className="space-y-4">
          <Button onClick={handleGoogleSignIn} size="lg" className="w-full">
            Sign in with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
