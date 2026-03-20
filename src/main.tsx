import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { Capacitor } from "@capacitor/core";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// In the native app (Capacitor), avoid the PWA service worker.
// It can cache old chunks and cause a "black screen" after an update.
const isLocalHostname = (() => {
  try {
    const hostname = window.location.hostname.toLowerCase();

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".local")
    ) {
      return true;
    }

    if (/^10\./.test(hostname) || /^192\.168\./.test(hostname)) {
      return true;
    }

    const match = hostname.match(/^172\.(\d{1,3})\./);
    if (match) {
      const secondOctet = Number(match[1]);
      return secondOctet >= 16 && secondOctet <= 31;
    }

    return false;
  } catch {
    return false;
  }
})();

const isNative = (() => {
  try {
    return Capacitor.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
})();

if (!isNative && !isLocalHostname) {
  registerSW({ immediate: true });
} else if ("serviceWorker" in navigator) {
  // Best-effort cleanup if a SW was previously registered.
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
    .catch(() => undefined);
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);

