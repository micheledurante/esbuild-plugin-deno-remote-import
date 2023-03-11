import * as esbuild from "https://deno.land/x/esbuild@v0.17.11/mod.js";
import { denoRemoteImport } from "https://deno.land/x/esbuild_plugin_deno_remote_import@v0.2.2/mod.js";

await esbuild.build({
    plugins: [denoRemoteImport()],
    entryPoints: ["https://esm.sh/navigo@8.11.1"],
    outfile: "./dist/bytes.esm.js",
    bundle: true,
});

esbuild.stop();
