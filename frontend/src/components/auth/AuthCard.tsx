"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AuthProviderName,
  getLastAuthProvider,
  subscribeLastAuthProvider,
} from "@/lib/last-auth";
import { isGoogleAuthConfigured } from "@/components/providers/GoogleOAuthProviderWrapper";

function useLastAuthProvider(provider: AuthProviderName) {
  return useSyncExternalStore(
    subscribeLastAuthProvider,
    () => getLastAuthProvider() === provider,
    () => false,
  );
}

function LastUsedBadge() {
  return (
    <Badge
      variant="secondary"
      className="absolute -top-2.5 right-3 z-10 text-[10px] font-medium tracking-wide uppercase"
    >
      Last used
    </Badge>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

interface GoogleSignInButtonProps {
  disabled?: boolean;
  onCode: (code: string, redirectUri: string) => Promise<void>;
}

function GoogleSignInButton({ disabled, onCode }: GoogleSignInButtonProps) {
  if (!isGoogleAuthConfigured()) {
    return null;
  }

  return <GoogleSignInButtonInner disabled={disabled} onCode={onCode} />;
}

function GoogleSignInButtonInner({ disabled, onCode }: GoogleSignInButtonProps) {
  const showLastUsed = useLastAuthProvider("google");
  const [busy, setBusy] = useState(false);

  const googleLogin = useGoogleLogin({
    flow: "auth-code",
    onSuccess: async (response) => {
      setBusy(true);
      try {
        await onCode(response.code, window.location.origin);
      } finally {
        setBusy(false);
      }
    },
    onError: () => {
      setBusy(false);
    },
  });

  return (
    <div className="relative">
      {showLastUsed ? <LastUsedBadge /> : null}
      <Button
        type="button"
        variant="outline"
        disabled={disabled || busy}
        onClick={() => googleLogin()}
        className="h-11 w-full"
      >
        <GoogleIcon />
        {busy ? "Signing in..." : "Continue with Google"}
      </Button>
    </div>
  );
}

interface AuthCardProps {
  mode: "login" | "signup";
  error?: string;
  loading?: boolean;
  onEmailSubmit: (values: {
    email: string;
    password: string;
    name?: string;
  }) => Promise<void>;
  onGoogleCode: (code: string, redirectUri: string) => Promise<void>;
}

export function AuthCard({
  mode,
  error,
  loading = false,
  onEmailSubmit,
  onGoogleCode,
}: AuthCardProps) {
  const isLogin = mode === "login";
  const showEmailLastUsed = useLastAuthProvider("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const googleConfigured = isGoogleAuthConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onEmailSubmit({
      email,
      password,
      ...(isLogin ? {} : { name }),
    });
  };

  return (
    <Card className="w-full max-w-md shadow-sm">
      <CardHeader className="text-center">
        <p className="mb-2 text-4xl font-semibold tracking-[0.1em] text-primary">axiom</p>
        <CardTitle className="text-2xl">
          {isLogin ? "Welcome" : "Create your account"}
        </CardTitle>
        <CardDescription>
          {isLogin ? "Sign in to your account" : "Start investigating live data"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {!isLogin ? (
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Full name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Chen"
                required
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isLogin ? undefined : 8}
            />
            {!isLogin ? (
              <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
            ) : null}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="relative">
            {showEmailLastUsed ? <LastUsedBadge /> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? isLogin
                  ? "Signing in..."
                  : "Creating account..."
                : isLogin
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </div>
        </form>

        {googleConfigured ? (
          <>
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">Or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <GoogleSignInButton disabled={loading} onCode={onGoogleCode} />
          </>
        ) : null}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isLogin ? (
            <>
              No account?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Create one
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
