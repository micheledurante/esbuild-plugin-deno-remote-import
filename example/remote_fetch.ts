import * as esbuild from "https://deno.land/x/esbuild@v0.17.11/mod.js";
import { denoRemoteImport } from "https://deno.land/x/esbuild_plugin_deno_remote_import@0.2.5/mod.js";

await esbuild.build({
    plugins: [denoRemoteImport()],
    bundle: true,
    entryPoints: ["https://esm.sh/navigo@8.11.1"],
    outfile: "./dist/remote_fetch.js",
});

esbuild.stop();
