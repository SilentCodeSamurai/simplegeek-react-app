import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig, PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tsconfigPaths(), visualizer({
        emitFile: true,
        filename: "stats.html",
    }) as PluginOption, sentryVitePlugin({
        org: "silentcodeops",
        project: "simplegeek-client"
    })],

    optimizeDeps: {
		include: ["@emotion/styled"],
	},

    define: {
		"import.meta.env.SHOP_API_URL": JSON.stringify(process.env.SHOP_API_URL || "http://127.0.0.1/api"),
		"import.meta.env.AUTH_API_URL": JSON.stringify(process.env.AUTH_API_URL || "http://127.0.0.1/auth"),
	},

    build: {
        sourcemap: true
    }
});