"use client";

import { useEffect } from "react";

/**
 * Detects if the page is embedded inside the JARVIS dashboard module iframe
 * and adds `in-module` class to <body> so global CSS makes backgrounds transparent,
 * letting the glassy sidebar show through.
 */
export function ModuleEmbedDetector() {
  useEffect(() => {
    const inIframe = typeof window !== "undefined" && window.self !== window.top;
    if (inIframe) {
      document.body.classList.add("in-module");
    }
    return () => {
      document.body.classList.remove("in-module");
    };
  }, []);
  return null;
}