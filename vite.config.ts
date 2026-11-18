import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig(({ command, mode }) => {
  // Vite لا يحمّل المتغيرات التي لا تبدأ بـ VITE_ إلا للمتصفح،
  // فنضيفها هنا إلى process.env لتراها دوال السيرفر
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return {
    server: { port: 3000 },
    resolve: {
      dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-query"],
    },
    build: {
      rollupOptions: {
        output: {
          // Client only; SSR/nitro bundles are unaffected by this split in practice.
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return undefined;
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react-core";
            if (/node_modules\/@tanstack\/(react-router|router-core|history)\//.test(id))
              return "router";
            if (/node_modules\/@tanstack\/(react-query|query-core)\//.test(id)) return "query";
            return undefined;
          },
        },
      },
    },
    plugins: [
      tsConfigPaths(),
      // يوجّه نقطة دخول السيرفر إلى src/server.ts
      tanstackStart({ server: { entry: "server" } }),
      viteReact(),
      tailwindcss(),
      // نيترو مطلوب عند البناء فقط
      ...(command === "build"
        ? [nitro(process.env["CF_BUILD"] === "1" ? { preset: "cloudflare_module" } : {})]
        : []),
    ],
  };
});
