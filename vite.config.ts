import {resolve} from "path";
import {defineConfig} from "vite";
import {viteStaticCopy} from "vite-plugin-static-copy";
import pkg from "./package.json";

export default defineConfig(({mode}) => {
  const dest = mode === "development" ? "dist" : ".";
  const isMethodBuild = process.env.VDITOR_BUILD === "method";

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
      emptyOutDir: !isMethodBuild,
      target: "es2015",
      lib: {
        entry: resolve(__dirname, isMethodBuild ? "src/method.ts" : "src/index.ts"),
        formats: ["umd"],
        name: "Vditor",
        fileName: () => (isMethodBuild ? "method.min.js" : "index.min.js"),
      },
      rolldownOptions: {
        output: {
          exports: "default",
          assetFileNames: "index.css",
        },
      },
    },
    plugins: [
      ...(mode === "production" && isMethodBuild
        ? []
        : [
            viteStaticCopy({
              targets: [
                {src: "src/css", dest},
                {src: "src/images", dest},
                {src: "src/js", dest},
                {src: "types", dest},
              ],
            }),
          ]),
    ],
  };
});
