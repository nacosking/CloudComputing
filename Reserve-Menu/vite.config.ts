import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "./vite-plugin-meta-images";

// We use an async function here so we can properly 'await' the Replit plugins
export default defineConfig(async () => {
  const plugins = [
    react(),
    runtimeErrorOverlay(),
    tailwindcss(),
    metaImagesPlugin(),
  ];

  // Conditionally load Replit development plugins
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
  ) {
    const cartographer = await import("@replit/vite-plugin-cartographer").then(
      (m) => m.cartographer(),
    );
    const devBanner = await import("@replit/vite-plugin-dev-banner").then((m) =>
      m.devBanner(),
    );
    plugins.push(cartographer, devBanner);
  }

  return {
    plugins: plugins,
    // FIX 1: Ensures assets load correctly using absolute paths
    base: "/",
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    css: {
      postcss: {
        plugins: [],
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      host: "0.0.0.0",
      // Note: allowedHosts should typically be 'true' or an array in newer Vite versions
      allowedHosts: true,

      // FIX 2: HMR Configuration for Replit
      // This tells the browser to connect via HTTPS (port 443) which prevents
      // connection drops that look like random failures.
      hmr: {
        clientPort: 443,
      },

      // FIX 3: Polling (The solution to "Sometimes it works, sometimes it doesn't")
      // Replit's file system sometimes misses save events. This forces Vite to check
      // for file changes every 100ms.
      watch: {
        usePolling: true,
        interval: 100,
      },

      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});