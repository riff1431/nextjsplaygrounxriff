"use client";

import AuthLanding from "@/components/auth/AuthLanding";
import { useAuth } from "@/app/context/AuthContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const { user, role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      if (role === 'admin') router.push('/admin/dashboard');
      else if (role === 'creator') router.push('/creator/dashboard');
      else router.push('/home');
    }
  }, [user, role, isLoading, router]);

  // Optionally show a loader while checking auth state to prevent flash
  if (isLoading) return <div className="min-h-screen bg-black flex items-center justify-center text-pink-500">Checking session...</div>;

  // If user is logged in, don't show landing (effect will redirect). 
  // But return null to avoid flash.
  if (user) return null;

  return <AuthLanding />;
}
