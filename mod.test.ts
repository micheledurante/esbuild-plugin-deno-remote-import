import { assertEquals } from "./deps.ts";
import { isCacheStale } from "./mod.js";

// isCacheStale tests

Deno.test("isCacheStale - cache is stale when no Cache-Control header is present", () => {
    const response = new Response("");
    response.headers.append("Date", new Date().toUTCString());

    const result = isCacheStale(response.headers);
    assertEquals(result, true);
});

Deno.test("isCacheStale - cache is stale when no Date header is present", () => {
    const response = new Response("");
    response.headers.append("Cache-Control", 'max-age=86400"');

    const result = isCacheStale(response.headers);
    assertEquals(result, true);
});

Deno.test("isCacheStale - cache is stale when max-age is zero", () => {
    const response = new Response("", {
        headers: {
            "Cache-Control": "max-age=0",
            "Date": new Date().toUTCString(),
        },
    });

    const result = isCacheStale(response.headers);
    assertEquals(result, true);
});

Deno.test("isCacheStale - cache is fresh when max-age is positive and cache time is within max-age", () => {
    const cache_time = new Date();
    cache_time.setSeconds(cache_time.getSeconds() - 5);
    const response = new Response("");
    response.headers.append("Cache-Control", "max-age=10");
    response.headers.append("Date", cache_time.toUTCString());

    const result = isCacheStale(response.headers);
    assertEquals(result, false);
});

Deno.test("isCacheStale - cache is fresh when response is immutable", () => {
    const cache_time = new Date();
    cache_time.setSeconds(cache_time.getSeconds() - 5);
    const response = new Response("");
    response.headers.append("Cache-Control", "max-age=10, immutable");
    response.headers.append("Date", cache_time.toUTCString());

    const result = isCacheStale(response.headers);
    assertEquals(result, false);
});

Deno.test("isCacheStale - cache is stale when max-age is positive and cache time is past max-age", () => {
    const cache_time = new Date();
    cache_time.setSeconds(cache_time.getSeconds() - 15);
    const response = new Response("");
    response.headers.append("Cache-Control", "max-age=10");
    response.headers.append("Date", cache_time.toUTCString());

    const result = isCacheStale(response.headers);
    assertEquals(result, true);
});

Deno.test("isCacheStale - cache is stale with max-stale directive applied and time beyond max-age and max-stale", () => {
    const cache_time = new Date();
    cache_time.setSeconds(cache_time.getSeconds() - 35);
    const response = new Response("");
    response.headers.append("Cache-Control", "max-age=10, max-stale=20");
    response.headers.append("Date", cache_time.toUTCString());

    const result = isCacheStale(response.headers);
    assertEquals(result, true);
});
