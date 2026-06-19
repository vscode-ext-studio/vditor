import {resolve} from "path";
import {defineConfig} from "vite";
import {viteStaticCopy} from "vite-plugin-static-copy";
import pkg from "./package.json";

export default defineConfig(({mode}) => {
  const dest = mode === "development" ? "dist" : ".";

  return {
    define: {
      VDITOR_VERSION: JSON.stringify(pkg.version),
    },
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
        },
      },
    },
    server: {
      port: 3135,
      host: "127.0.0.1",
    },
    build: {
      outDir: "dist",
      target: "es2015",
      lib: {
        entry: resolve(__dirname, "src/index.ts"),
        formats: ["umd"],
        name: "Vditor",
        fileName: () => "index.min.js",
      },
      rolldownOptions: {
        output: {
          exports: "default",
          assetFileNames: "index.css",
        },
      },
    },
    plugins: [
      viteStaticCopy({
        targets: [
          {src: "src/css", dest},
          {src: "src/images", dest},
          {src: "src/js", dest},
          {src: "types", dest},
        ],
      }),
    ],
  };
});
