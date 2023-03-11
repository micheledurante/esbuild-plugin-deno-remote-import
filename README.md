# esbuild-plugin-deno-remote-import

[![main-workflow](https://github.com/micheledurante/esbuild-plugin-deno-remote-import/actions/workflows/check.yml/badge.svg?branch=main)](https://github.com/micheledurante/esbuild-plugin-deno-remote-import/actions/workflows/check.yml)

This is an esbuild plugin to fetch remote imports for Deno. It was designed for cases when Deno is used for development
but the application will run in a browser. It comes with the same caching approach that Deno uses when fetching from
remote URLs, proper handling of stale caches and HTTP redirects.

Take care of setting up the value of `DENO_DIR`
[as recommended](https://github.com/denoland/deno/issues/2630#issuecomment-510100688) to ensure consistency between the
plugin's and Deno's cache locations, if you're interested.

## Usage

## License

`esbuild-plugin-deno-remote-import` is licensed under the GPL3 License, see [LICENSE](./LICENSE) for more information.
