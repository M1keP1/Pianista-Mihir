import { describe, it } from "node:test";
import assert from "node:assert/strict";

import type { GenerateMermaidResult } from "@/api/pianista/generateMermaid";
import { createMermaidRequestController } from "./useMermaidRequest";
import type { MermaidCache } from "./cache";
import type { MermaidUiMode } from "./types";

type FetchArgs = {
  mode: string;
  domain: string;
  problem: string;
  signal?: AbortSignal;
};

const makeCache = () => {
  const store = new Map<string, string>();
  const key = (mode: MermaidUiMode, d: string, p: string) => `key:${mode}:${d.trim()}:${p.trim()}`;
  const cache: MermaidCache = {
    key,
    read(mode, d, p) {
      return store.get(key(mode, d, p)) ?? "";
    },
    write(mode, d, p, text) {
      store.set(key(mode, d, p), text);
    },
    persistRaw(mode, d, p, text) {
      store.set(key(mode, d, p), text);
    },
  };
  return { cache, store, key };
};

const success = (graph: string): GenerateMermaidResult => ({ result_status: "success", mermaid: graph });

describe("createMermaidRequestController", () => {
  it("uses cached mermaid text when available", async () => {
    const { cache, store, key } = makeCache();
    store.set(key("D+P", "domain", "problem"), "cached graph");

    const fetchCalls: FetchArgs[] = [];
    const controller = createMermaidRequestController("domain", "problem", {
      cache,
      fetchMermaid: async (mode, domain, problem, _plan, signal) => {
        fetchCalls.push({ mode, domain, problem, signal });
        return success("fresh graph");
      },
    });

    await controller.fetch("D+P");

    const state = controller.getState();
    assert.strictEqual(state.status, "verified");
    assert.strictEqual(state.text, "cached graph");
    assert.strictEqual(fetchCalls.length, 0);
  });

  it("fetches when cache is empty and updates status", async () => {
    const { cache, store, key } = makeCache();
    const statuses: string[] = [];
    const controller = createMermaidRequestController("domain", "problem", {
      cache,
      fetchMermaid: async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
        return success("flowchart TD\n  A --> B\n");
      },
    });

    controller.subscribe((state) => {
      statuses.push(state.status);
    });

    await controller.fetch("D+P");

    assert.deepEqual(statuses, ["idle", "ai-thinking", "verified"]);
    const state = controller.getState();
    assert.strictEqual(state.text, "flowchart TD\n  A --> B");
    assert.strictEqual(store.get(key("D+P", "domain", "problem")), "flowchart TD\n  A --> B");
  });

  it("sets error state when the service fails", async () => {
    const { cache } = makeCache();
    const controller = createMermaidRequestController("domain", "problem", {
      cache,
      fetchMermaid: async () => ({ result_status: "failure", message: "nope" }),
    });

    await controller.fetch("D");

    const state = controller.getState();
    assert.strictEqual(state.status, "error");
    assert.match(state.text, /Mermaid conversion failed: nope/);
  });

  it("persists manual edits and bypasses redundant fetches", async () => {
    const { cache, store, key } = makeCache();
    const controller = createMermaidRequestController("domain", "problem", {
      cache,
      fetchMermaid: async () => success("fresh"),
    });

    controller.setManualText("D+P", "  domain  ", "  problem  ", "manual");
    assert.strictEqual(controller.getState().text, "manual");
    assert.strictEqual(store.get(key("D+P", "domain", "problem")), "manual");

    await controller.fetch("D+P");
    assert.strictEqual(controller.getState().text, "manual");
  });

  it("cancels in-flight requests and returns to idle", async () => {
    const { cache } = makeCache();
    let aborted = false;
    const controller = createMermaidRequestController("domain", "problem", {
      cache,
      fetchMermaid: async (_mode, _d, _p, _plan, signal) => {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => resolve(), 10);
          signal?.addEventListener("abort", () => {
            aborted = true;
            clearTimeout(timer);
            const err = new Error("aborted");
            (err as { name: string }).name = "AbortError";
            reject(err);
          });
        });
        return success("graph");
      },
    });

    const fetchPromise = controller.fetch("D");
    controller.cancel();
    await fetchPromise;

    assert.strictEqual(aborted, true);
    assert.strictEqual(controller.getState().status, "idle");
  });
});
