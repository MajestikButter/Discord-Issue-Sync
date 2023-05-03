import { build } from "esbuild";

build({
  entryPoints: ["./src"],
  outfile: "bin/index.js",
  bundle: true,
  minify: true,
  sourcemap: true,
  target: "esnext",
  platform: "node",
  format: "esm",
  keepNames: true,
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
});
