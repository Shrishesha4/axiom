"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const placeholderClientId =
  "000000000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com";

export function GoogleOAuthProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GoogleOAuthProvider clientId={clientId || placeholderClientId}>
      {children}
    </GoogleOAuthProvider>
  );
}

export function isGoogleAuthConfigured() {
  return Boolean(clientId);
}
