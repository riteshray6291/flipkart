import process from "node:process";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const localServerUrl = "http://localhost:8080";
  const configuredServerUrl = (
    env.VITE_SERVER_URL ||
    env.VITE_API ||
    (mode === "production" ? "" : localServerUrl)
  ).trim();
  const serverUrl = configuredServerUrl.replace(/\/+$/, "");

  if (mode === "production" && serverUrl) {
    let apiUrl;
    try {
      apiUrl = new URL(serverUrl);
    } catch {
      throw new Error(
        "VITE_SERVER_URL must be an absolute HTTPS URL in production.",
      );
    }

    const isLocalhost =
      apiUrl.hostname === "localhost" ||
      apiUrl.hostname.startsWith("127.") ||
      apiUrl.hostname === "::1";
    if (apiUrl.protocol !== "https:" || isLocalhost) {
      throw new Error(
        "VITE_SERVER_URL must use HTTPS and cannot point to localhost in production.",
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
