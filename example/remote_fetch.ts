import { esbuild } from "https://deno.land/x/esbuild@v0.17.11/mod.js";
import { denoRemoteImport } from "https://deno.land/x/esbuild_plugin_deno_remote_import";

await esbuild.build({
    plugins: [denoRemoteImport()],
    entryPoints: ["https://deno.land/std@0.173.0/bytes/mod.ts"],
    outfile: "./dist/bytes.esm.js",
    bundle: true,
});

esbuild.stop();
