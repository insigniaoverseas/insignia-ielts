import { beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";

import { audioCacheKey } from "../../src/lib/audio-cache-key.ts";
import { downloadAudio, dropAudio, purgeAllAudio, readAudio } from "../../src/lib/audio-cache.ts";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const TEST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BYTES = new Uint8Array(1000).fill(7);

/** A minimal stand-in for the browser's CacheStorage, keyed like the real one (absolute URLs). */
function installFakeCaches() {
  const stores = new Map();
  const url = (k) => new URL(typeof k === "string" ? k : k.url, "https://ielts.test").href;
  globalThis.caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async put(k, res) { store.set(url(k), await res.arrayBuffer()); },
        async match(k) { const b = store.get(url(k)); return b ? new Response(b) : undefined; },
        async delete(k) { return store.delete(url(k)); },
        async keys() { return [...store.keys()].map((u) => new Request(u)); },
      };
    },
    async delete(name) { return stores.delete(name); },
  };
  return stores;
}

let fetches = 0;
beforeEach(async () => {
  installFakeCaches();
  await purgeAllAudio();
  fetches = 0;
  globalThis.fetch = async () => {
    fetches += 1;
    return new Response(BYTES, { headers: { "content-length": String(BYTES.length), "content-type": "audio/mpeg" } });
  };
});

describe("audio cache (M2-06)", () => {
  test("downloads the whole file once, reporting progress to 100%", async () => {
    const key = audioCacheKey(A, TEST, 1);
    const seen = [];
    const blob = await downloadAudio(A, key, "/x", (f) => seen.push(f));
    assert.equal(blob.size, BYTES.length);
    assert.equal(seen.at(-1), 1);
    await downloadAudio(A, key, "/x");
    assert.equal(fetches, 1, "a cached file is never fetched again");
    assert.equal((await readAudio(A, key))?.size, BYTES.length);
  });

  test("student B can never read student A's copy, and reading as B deletes it", async () => {
    const keyOfA = audioCacheKey(A, TEST, 1);
    await downloadAudio(A, keyOfA, "/x");
    assert.equal(await readAudio(B, keyOfA), null);
    assert.equal(await readAudio(A, keyOfA), null, "B's read purged A's copy from the disk");
  });

  test("refuses to store under someone else's key", async () => {
    await assert.rejects(downloadAudio(B, audioCacheKey(A, TEST, 1), "/x"));
    assert.equal(fetches, 0);
  });

  test("a short download is refused, not cached", async () => {
    globalThis.fetch = async () =>
      new Response(BYTES.slice(0, 10), { headers: { "content-length": String(BYTES.length) } });
    const key = audioCacheKey(A, TEST, 1);
    await assert.rejects(downloadAudio(A, key, "/x"));
    assert.equal(await readAudio(A, key), null);
  });

  test("dropping after submit and signing out both remove it", async () => {
    const key = audioCacheKey(A, TEST, 1);
    await downloadAudio(A, key, "/x");
    await dropAudio(key);
    assert.equal(await readAudio(A, key), null);
    await downloadAudio(A, key, "/x");
    await purgeAllAudio();
    assert.equal(await readAudio(A, key), null);
  });

  test("falls back to memory when the Cache API is missing", async () => {
    delete globalThis.caches;
    const key = audioCacheKey(A, TEST, 2);
    await downloadAudio(A, key, "/x");
    assert.equal((await readAudio(A, key))?.size, BYTES.length);
    assert.equal(await readAudio(B, key), null);
  });
});
