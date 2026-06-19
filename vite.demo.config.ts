import {resolve} from "path";
import {defineConfig} from "vite";
import {viteStaticCopy} from "vite-plugin-static-copy";
import pkg from "./package.json";

export default defineConfig({
  define: {
    VDITOR_VERSION: JSON.stringify(pkg.version),
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/ld246": {
        target: "https://ld246.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ld246/, ""),
      },
    },
  },
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {src: "src/css", dest: "dist"},
        {src: "src/images", dest: "dist"},
        {src: "src/js", dest: "dist"},
        {src: "types", dest: "dist"},
      ],
    }),
  ],
  build: {
    outDir: "demo/dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        render: resolve(__dirname, "demo/render.html"),
        comment: resolve(__dirname, "demo/comment.html"),
      },
    },
  },
});
