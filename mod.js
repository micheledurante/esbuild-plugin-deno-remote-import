import { crypto } from "./deps.ts";
import { toHashString } from "./deps.ts";
import { join } from "./deps.ts";

const DENO_HOME_DIR = ".deno";
const CACHE_DEPS = "deps";

// Write the content to the given filename
export const writeFile = async (filename, content) => {
    try {
        await Deno.writeTextFile(
            filename,
            content,
            {
                create: true,
            },
        );
    } catch (e) {
        console.error(" " + e.toString());
        Deno.exit(1);
    }
};

// Turn the URL into a path for the cache file, as Deno creates them.
// Ex: $DENO_DIR/deps/https/deno.land/
export const urlToFilename = async (url) => {
    const out = [];

    if (url.protocol.slice(0, -1) === "http") { // protocol retains the ":"
        console.debug(`DEBUG --- Downloading over a plain HTTP connection`);
    }

    out.push(url.protocol.slice(0, -1));
    out.push(`${url.hostname}`);

    if (url.port) {
        console.debug(`DEBUG --- Explicit PORT on URL found for ${url.host}`);
        out.push(`_PORT${url.port}`);
    }

    if (url.search) {
        console.debug(`DEBUG --- Query parameters found: ${url.search}`);
        out.push("?");
        out.push(url.search);
    }

    out.push(toHashString(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url.pathname))));

    return out;
};

// Return the full path to this remote import dir inclusive of DENO_DIR path
export const getCacheFilename = (url_filename) => {
    // The actual deno installation directory is tricky to get right, easiest is to set your own "DENO_DIR" env.
    // @see https://github.com/denoland/deno/issues/2630
    let cache_root;

    if (Deno.env.get("DENO_DIR")) {
        cache_root = Deno.env.get("DENO_DIR");
    } else if (Deno.env.get("HOME")) {
        cache_root = join(Deno.env.get("HOME"), DENO_HOME_DIR);
    } else if (Deno.env.get("USERPROFILE")) {
        cache_root = join(Deno.env.get("HOME"), DENO_HOME_DIR);
    } else {
        cache_root = join(Deno.cwd(), DENO_HOME_DIR);
    }

    console.debug(`DEBUG --- Deno cache set to ${cache_root}`);

    return join(cache_root, CACHE_DEPS, join(...url_filename));
};

// Compares date of retrieval with cache control directives.
export function isCacheStale(headers) {
    if (!headers.has("cache-control")) {
        // No Cache-Control header found; assume cache is stale.
        return true;
    }
    const directives = headers.get("cache-control").split(",").map((d) => d.trim());
    const max_age_directive = directives.find((d) => d.startsWith("max-age="));

    if (!max_age_directive) {
        // No max-age directive found; assume cache is stale.
        return true;
    }

    const max_age = parseInt(max_age_directive.substring(8));
    const immutable_directive = directives.includes("immutable");

    if (immutable_directive) {
        // Response is immutable; cache is always fresh.
        return false;
    }

    const cache_time = new Date(headers.get("date")).getTime();
    const now = new Date().getTime();
    const max_age_ms = max_age * 1000;
    const max_stale_directive = directives.find((d) => d.startsWith("max-stale="));

    if (headers.has("max-stale") && max_stale_directive) {
        const max_stale = parseInt(max_stale_directive.substring(10));
        const max_stale_ms = max_stale * 1000;
        if (cache_time + max_age_ms + max_stale_ms >= now) {
            // Cache is fresh with max-stale applied.
            return false;
        }
    }

    if (headers.has("max-fresh") && cache_time + max_age_ms >= now) {
        const max_fresh = parseInt(headers.get("max-fresh"));
        const max_fresh_ms = max_fresh * 1000;
        if (cache_time + max_fresh_ms >= now) {
            // Cache is fresh with max-fresh applied.
            return false;
        }
    }

    return cache_time + max_age_ms < now;
}

/**
 * A Deno-specific plugin to handle HTTP(S) remote imports in JS and TS files for esbuild.
 *
 * First draft loosely based on https://esbuild.github.io/plugins/#http-plugin
 * and also inspired by https://denolib.gitbook.io/guide/advanced/deno_dir-code-fetch-and-cache#deps
 *
 * ```
 * Thus, the resolution logic goes as follows:
 *
 * If module_name starts with a remote url scheme:
 *   - If --reload flag is present, force download the file and use it. ()
 *   - Otherwise
 *     - If the local cached file is present, use it.
 *     - Otherwise, download the file to $DENO_DIR/deps and use it.
 *   - If module_name represents a local source, use the local file.
 * ```
 */
export const denoRemoteImport = () => {
    return {
        name: "deno-remote-import",

        setup(build) {
            // Tag `http` and `https` import paths with the "deno-remote-import" namespace to be handled by this plugin.
            //
            // interface OnResolveArgs {
            //   path: string;
            //   importer: string;
            //   namespace: string;
            //   resolveDir: string;
            //   kind: ResolveKind;
            //   pluginData: any;
            // }
            build.onResolve({ filter: /^(https?|http):\/\// }, (args) => ({
                path: args.path,
                namespace: "deno-remote-import",
            }));

            // Intercept all import paths inside downloaded files and resolve them against the original URL.
            // Keep them in the same namespace to resolve them recursively.
            build.onResolve({ filter: /.*/, namespace: "deno-remote-import" }, (args) => ({
                path: new URL(args.path, args.importer).href,
                namespace: "deno-remote-import",
            }));

            // Handle download of the resources.
            //
            // interface OnLoadArgs {
            //   path: string;
            //   namespace: string;
            //   suffix: string;
            //   pluginData: any;
            // }
            build.onLoad({ filter: /.*/, namespace: "deno-remote-import" }, async (args) => {
                const url = new URL(args.path);

                console.debug(`DEBUG --- Remote import ${args.path}`);

                // @see https://github.com/denoland/deno/blob/v1.31.1/cli/cache/http_cache.rs
                const url_filename = await urlToFilename(url);
                const cache_filename = getCacheFilename(url_filename);
                const cache_filename_metadata = `${cache_filename}.metadata.json`;

                // try caches

                try {
                    const contents = await Deno.readTextFile(`${cache_filename}`);
                    const metadata = JSON.parse(await Deno.readTextFile(`${cache_filename_metadata}`));

                    if (isCacheStale(metadata.headers)) {
                        await Deno.remove(cache_filename);
                        await Deno.remove(cache_filename_metadata);
                        throw new Error(`Stale cache ${cache_filename}`);
                    }

                    console.info(`Cache HIT ${cache_filename}`);
                    return { contents };
                } catch (e) {
                    console.debug(e.message);
                    console.info(`Cache MISS ${cache_filename}`);
                }

                async function httpGet(url) {
                    console.info(`Downloading: ${url}`);
                    let headers;

                    return await fetch(url).then((res) => {
                        if ([301, 302, 307].includes(res.status)) {
                            httpGet(new URL(res.headers.get("location"), url).toString());
                            res.stop();
                        }

                        if (!res.ok) {
                            throw new Error(res.status);
                        }

                        headers = res.headers;
                        return res.text();
                    }).then((contents) => {
                        return [contents, headers];
                    }).catch((err) => {
                        new Error(`GET ${url} failed: status ${err}`);
                    });
                }

                const [contents, headers] = await httpGet(url);

                writeFile(cache_filename, contents).then();
                writeFile(
                    cache_filename_metadata,
                    JSON.stringify({ headers: Object.fromEntries(headers), url: url.toString() }, null, 2),
                ).then();

                console.info(`Written out cache file: ${cache_filename}`);
                console.info(`Written out cache file: ${cache_filename_metadata}`);

                return { contents };
            });
        },
    };
};
