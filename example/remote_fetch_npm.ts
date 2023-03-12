import * as esbuild from "https://deno.land/x/esbuild@v0.17.11/mod.js";
import denoRemoteImport from "npm:esbuild-plugin-deno-remote-import@0.2";

await esbuild.build({
    plugins: [denoRemoteImport()],
    entryPoints: ["https://esm.sh/navigo@8.11.1"],
    outfile: "./dist/remote_fetch.js",
    bundle: true,
});

esbuild.stop();
