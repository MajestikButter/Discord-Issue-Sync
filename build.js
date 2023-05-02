require("esbuild").build({
  entryPoints: ["./src"],
  outfile: "bin/index.mjs",
  minify: true,
  sourcemap: true,
  target: "ESNext"
});
