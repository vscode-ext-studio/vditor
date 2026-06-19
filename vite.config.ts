import {resolve} from "path";
import {defineConfig} from "vite";
import {viteStaticCopy} from "vite-plugin-static-copy";
import pkg from "./package.json";

const isMethodBuild = process.env.VDITOR_BUILD === "method";

export default defineConfig({
  define: {
    VDITOR_VERSION: JSON.stringify(pkg.version),
  },
  build: {
    outDir: "dist",
    emptyOutDir: !isMethodBuild,
    minify: "terser",
    target: "es2015",
    lib: {
      entry: resolve(__dirname, isMethodBuild ? "src/method.ts" : "src/index.ts"),
      formats: ["umd"],
      name: "Vditor",
      fileName: () => (isMethodBuild ? "method.min.js" : "index.min.js"),
    },
    rollupOptions: {
      output: {
        exports: "default",
        assetFileNames: "index.css",
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
  plugins: isMethodBuild ? [] : [
    viteStaticCopy({
      targets: [
        {src: "src/css", dest: "."},
        {src: "src/images", dest: "."},
        {src: "src/js", dest: "."},
        {src: "types", dest: "."},
      ],
    }),
  ],
});
