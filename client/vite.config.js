import process from "node:process";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const configuredServerUrl = (env.VITE_SERVER_URL || env.VITE_API || "http://localhost:8080").trim();
  const serverUrl = configuredServerUrl.replace(/\/+$/, "");

  if (mode === "production") {
    const hostname = new URL(serverUrl).hostname;
    const isLocalhost = hostname === "localhost" || hostname.startsWith("127.") || hostname === "::1";

    if (isLocalhost) {
      console.warn(
        "[vite] Using localhost for the API in this local build. For deployment, set VITE_SERVER_URL to your live backend URL.",
      );
    }
  }

  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_SERVER_URL": JSON.stringify(serverUrl),
    },
  };
});
