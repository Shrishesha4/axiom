"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { AuthCard } from "@/components/auth/AuthCard";
import { RetroDitherLayout } from "@/components/canvasui/RetroDitherLayout";

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
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
    <RetroDitherLayout className="h-dvh" backgroundClassName="bg-muted">
      <div className="pointer-events-auto flex h-full items-center justify-center overflow-y-auto p-6">
        <AuthCard
          mode="login"
          error={error}
          loading={loading}
          onEmailSubmit={handleEmailSubmit}
          onGoogleCode={handleGoogleCode}
        />
      </div>
    </RetroDitherLayout>
  );
}
