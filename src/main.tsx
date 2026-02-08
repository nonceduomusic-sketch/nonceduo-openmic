import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { Capacitor } from "@capacitor/core";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// In the native app (Capacitor), avoid the PWA service worker.
// It can cache old chunks and cause a "black screen" after an update.
const isNative = (() => {
  try {
    return Capacitor.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
})();

if (!isNative) {
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

