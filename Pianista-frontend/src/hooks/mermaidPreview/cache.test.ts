import { beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import { mermaidCache } from "./cache";
import type { MermaidUiMode } from "./types";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

const keyFor = (mode: MermaidUiMode, d: string, p: string) => mermaidCache.key(mode, d.trim(), p.trim());

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
});

describe("mermaidCache", () => {
  it("returns empty string when the cache is cold", () => {
    const result = mermaidCache.read("D+P", "domain", "problem");
    assert.strictEqual(result, "");
  });

  it("persists and reads trimmed values", () => {
    const key = keyFor("D", "domain", "problem");
    mermaidCache.write("D", "  domain  ", "  problem  ", "graph");
    assert.strictEqual(globalThis.localStorage.getItem(key), "graph");

    const read = mermaidCache.read("D", "  domain  ", "  problem  ");
    assert.strictEqual(read, "graph");
  });

  it("persistRaw stores without additional normalization", () => {
    const key = keyFor("P", "d", "p");
    mermaidCache.persistRaw("P", "d", "p", "graph");
    assert.strictEqual(globalThis.localStorage.getItem(key), "graph");
  });
});
