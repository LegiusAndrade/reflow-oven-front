import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Forward the browser console to this terminal during `next dev`, so client-side logs/errors
  // (our logger.*, React errors, unhandled rejections) show up next to the server request logs
  // instead of only in the browser DevTools. Levels: "warn" = warnings + errors (default here),
  // "error" = errors only, true = everything incl. info/log (noisy), false = off.
  // NOTE: next.config changes require a dev-server restart to take effect.
  logging: {
    browserToTerminal: true,
  },
};

export default nextConfig;
