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
    // THE FIX: This ensures your assets load correctly (fixes the MIME type error)
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
      allowedHosts: true, // Note: In newer Vite versions, this might need to be an array or specific string
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});