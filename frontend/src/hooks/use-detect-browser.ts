"use client";

import { useSyncExternalStore } from "react";

function detectBrowser() {
  if (typeof navigator === "undefined") return "Other";

  const ua = navigator.userAgent;
  if (/safari/i.test(ua) && !/chrome|chromium|crios/i.test(ua)) {
    return "Safari";
  }
  if (/firefox|fxios/i.test(ua)) {
    return "Firefox";
  }
  if (/chrome|chromium|crios/i.test(ua)) {
    return "Chrome";
  }
  return "Other";
}

function subscribe() {
  return () => {};
}

export default function useDetectBrowser() {
  return useSyncExternalStore(subscribe, detectBrowser, () => "Other");
}
