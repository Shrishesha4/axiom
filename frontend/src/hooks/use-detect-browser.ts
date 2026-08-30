"use client";

import { useEffect, useState } from "react";

export default function useDetectBrowser() {
  const [browser, setBrowser] = useState("Other");

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/safari/i.test(ua) && !/chrome|chromium|crios/i.test(ua)) {
      setBrowser("Safari");
    } else if (/firefox|fxios/i.test(ua)) {
      setBrowser("Firefox");
    } else if (/chrome|chromium|crios/i.test(ua)) {
      setBrowser("Chrome");
    }
  }, []);

  return browser;
}
