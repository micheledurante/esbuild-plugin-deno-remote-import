import { assertEquals } from "https://deno.land/std@0.154.0/testing/asserts.ts";
import { default as mod } from "./mod.js";

Deno.test("cache is stale when no Cache-Control header is present", async () => {
    const response = await new Response("", {
        headers: { "Date": new Date().toUTCString() },
    });
    const result = mod.isCacheStale(response);
    assertEquals(result, true);
});

Deno.test("cache is stale when max-age is zero", async () => {
    const response = await new Response("", {
        headers: { "Cache-Control": "max-age=0", "Date": new Date().toUTCString() },
    });
    const result = mod.isCacheStale(response);
    assertEquals(result, true);
});

Deno.test("cache is fresh when max-age is positive and cache time is within max-age", async () => {
    const cache_time = new Date();
    cache_time.setSeconds(cache_time.getSeconds() - 5);
    const response = await new Response("", {
        headers: { "Cache-Control": "max-age=10", "Date": cache_time.toUTCString() },
    });
    const result = mod.isCacheStale(response);
    assertEquals(result, false);
});

Deno.test("cache is fresh when response is immutable", async () => {
    const cache_time = new Date();
    cache_time.setSeconds(cache_time.getSeconds() - 5);
    const response = await new Response("", {
        headers: { "Cache-Control": "max-age=10, immutable", "Date": cache_time.toUTCString() },
    });
    const result = mod.isCacheStale(response);
    assertEquals(result, false);
});

Deno.test("cache is stale when max-age is positive and cache time is past max-age", async () => {
    const cache_time = new Date();
    cache_time.setSeconds(cache_time.getSeconds() - 15);
    const response = await new Response("", {
        headers: { "Cache-Control": "max-age=10", "Date": cache_time.toUTCString() },
    });
    const result = mod.isCacheStale(response);
    assertEquals(result, true);
});

Deno.test("cache is fresh with max-stale directive applied", async () => {
    const cache_time = new Date();
    cache_time.setSeconds(cache_time.getSeconds() - 15);
    const response = await new Response("", {
        headers: { "Cache-Control": "max-age=10, max-stale=20", "Date": cache_time.toUTCString() },
    });
    const result = mod.isCacheStale(response, { max_stale: true });
    assertEquals(result, false);
});

Deno.test("cache is stale with max-stale directive applied and time beyond max-age and max-stale", async () => {
    const cache_time = new Date();
    cache_time.setSeconds(cache_time.getSeconds() - 35);
    const response = await new Response("", {
        headers: { "Cache-Control": "max-age=10, max-stale=20", "Date": cache_time.toUTCString() },
    });
    const result = mod.isCacheStale(response, { max_stale: true });
    assertEquals(result, true);
});

Deno.test("cache is fresh with max-fresh directive applied", async () => {
    const cache_time = new Date();
    cache_time.setSeconds(cache_time.getSeconds() - 5);
    const response = await new Response("", {
        headers: { "Cache-Control": "max-age=10", "Date": cache_time.toUTCString() },
    });
    const result = mod.isCacheStale(response, { max_fresh: true });
    assertEquals(result, true);
});
