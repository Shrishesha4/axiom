"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { AuthCard } from "@/components/auth/AuthCard";

export default function SignupPage() {
  const { signup, loginWithGoogle } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async ({
    name,
    email,
    password,
  }: {
    email: string;
    password: string;
    name?: string;
  }) => {
    setError("");
    if (!name) {
      setError("Name is required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await signup(name, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
      setLoading(false);
    }
  };

  const handleGoogleCode = async (code: string, redirectUri: string) => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle(code, redirectUri);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="flex h-dvh items-center justify-center overflow-y-auto bg-muted/30 p-6">
      <AuthCard
        mode="signup"
        error={error}
        loading={loading}
        onEmailSubmit={handleEmailSubmit}
        onGoogleCode={handleGoogleCode}
      />
    </div>
  );
}
