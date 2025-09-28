/** LocalStorage helpers for persisting chat, editor, and planning context. */

/** ------------------------ Types ------------------------ */
export type ChatInputType = "nl" | "mermaid" | "domain" | "pddl" | "unknown";

export type PddlBundle = {
  domain: string;
  problem: string;
  updatedAt: number;
};

export type PlanRecord = {
  jobId: string;
  domain: string;
  problem: string;
  plan?: string;
  createdAt: number;
  completedAt?: number;
  // Optional provenance from chat
  firstInput?: string;
  firstInputType?: ChatInputType;
};

/** ------------------------ Keys ------------------------- */
const LS_PDDL = "pddl_bundle";         // single latest editor snapshot
const LS_CHAT = "chat_trace";          // { firstInput, firstInputType, ts }
const LS_PLAN = "plan_records";        // { [jobId]: PlanRecord }
const LS_LAST_PLAN_ID = "plan_last_id";

/** --------------------- Helpers (LS) -------------------- */
function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota or private mode errors
  }
}

/** ------------------ Chat first input ------------------- */

/** Save the *very first* chat input and its type. Safe to call multiple times; last write wins. */
export function saveChatFirstInput(text: string, type: ChatInputType) {
  const t = text?.trim();
  if (!t) return;
  writeJSON(LS_CHAT, { firstInput: t, firstInputType: type, ts: Date.now() });
}

export function loadChatTrace():
  | { firstInput?: string; firstInputType?: ChatInputType; ts?: number }
  | null {
  return readJSON(LS_CHAT, null as any);
}

export function clearChatTrace() {
  try {
    localStorage.removeItem(LS_CHAT);
  } catch {}
}

/** ------------------- Editor PDDL pair ------------------ */

export function savePddl(input: { domain?: string; problem?: string }) {
  const current = readJSON<PddlBundle | null>(LS_PDDL, null);
  const next: PddlBundle = {
    domain: (input.domain ?? current?.domain ?? "").trim(),
    problem: (input.problem ?? current?.problem ?? "").trim(),
    updatedAt: Date.now(),
  };
  writeJSON(LS_PDDL, next);
}

export function loadPddl(): PddlBundle | null {
  const bundle = readJSON<PddlBundle | null>(LS_PDDL, null);
  return bundle
    ? {
        domain: bundle.domain ?? "",
        problem: bundle.problem ?? "",
        updatedAt: bundle.updatedAt ?? 0,
      }
    : null;
}

export function clearPddl() {
  try {
    localStorage.removeItem(LS_PDDL);
  } catch {}
}

/** ---------------------- Plan jobs ---------------------- */

/**
 * Snapshot editor PDDL at the moment user clicks "Generate".
 * (You can just call savePddl() too — this helper is semantic sugar.)
 */
export function savePddlSnapshot(domain: string, problem: string) {
  savePddl({ domain, problem });
}

/** Persist that a plan job was enqueued. */
export function savePlanJob(
  jobId: string,
  domain: string,
  problem: string,
  meta?: { firstInput?: string; firstInputType?: ChatInputType }
) {
  if (!jobId) return;
  const all = readJSON<Record<string, PlanRecord>>(LS_PLAN, {});

  const rec: PlanRecord = {
    jobId,
    domain: domain?.trim() ?? "",
    problem: problem?.trim() ?? "",
    plan: all[jobId]?.plan, // preserve if already present
    createdAt: all[jobId]?.createdAt ?? Date.now(),
    completedAt: all[jobId]?.completedAt,
    firstInput: meta?.firstInput ?? all[jobId]?.firstInput,
    firstInputType: meta?.firstInputType ?? all[jobId]?.firstInputType,
  };

  all[jobId] = rec;
  writeJSON(LS_PLAN, all);
  setLastPlanId(jobId);
}

/** Update the PDDL associated with a job (if you re-run or adjusted). */
export function updatePlanJobPddl(jobId: string, domain: string, problem: string) {
  if (!jobId) return;
  const all = readJSON<Record<string, PlanRecord>>(LS_PLAN, {});
  const existing = all[jobId] || {
    jobId,
    domain: "",
    problem: "",
    createdAt: Date.now(),
  };
  all[jobId] = {
    ...existing,
    domain: domain?.trim() ?? "",
    problem: problem?.trim() ?? "",
  };
  writeJSON(LS_PLAN, all);
}

/** Persist the final plan text when it arrives. */
export function savePlanResult(jobId: string, plan: string) {
  if (!jobId) return;
  const all = readJSON<Record<string, PlanRecord>>(LS_PLAN, {});
  const existing = all[jobId] || {
    jobId,
    domain: readJSON<PddlBundle | null>(LS_PDDL, null)?.domain ?? "",
    problem: readJSON<PddlBundle | null>(LS_PDDL, null)?.problem ?? "",
    createdAt: Date.now(),
  };
  all[jobId] = {
    ...existing,
    plan: plan?.trim() ?? "",
    completedAt: Date.now(),
  };
  writeJSON(LS_PLAN, all);
  setLastPlanId(jobId);
}

/** Load a specific job record. */
export function loadPlan(jobId: string): PlanRecord | null {
  const all = readJSON<Record<string, PlanRecord>>(LS_PLAN, {});
  return all[jobId] ?? null;
}

/** List all jobs (most recent first). */
export function listPlans(): PlanRecord[] {
  const all = readJSON<Record<string, PlanRecord>>(LS_PLAN, {});
  return Object.values(all).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/** Remember & fetch the "current" job id. */
export function setLastPlanId(jobId: string) {
  try {
    localStorage.setItem(LS_LAST_PLAN_ID, jobId);
  } catch {}
}
export function getLastPlanId(): string | null {
  try {
    return localStorage.getItem(LS_LAST_PLAN_ID);
  } catch {
    return null;
  }
}

/** Convenience: load the last job record (if any). */
export function loadLatestPlan(): PlanRecord | null {
  const id = getLastPlanId();
  return id ? loadPlan(id) : null;
}

/** Clear a single job or everything */
export function clearPlan(jobId: string) {
  const all = readJSON<Record<string, PlanRecord>>(LS_PLAN, {});
  if (all[jobId]) {
    delete all[jobId];
    writeJSON(LS_PLAN, all);
  }
  const last = getLastPlanId();
  if (last === jobId) {
    try { localStorage.removeItem(LS_LAST_PLAN_ID); } catch {}
  }
}
export function clearAllPlans() {
  try {
    localStorage.removeItem(LS_PLAN);
    localStorage.removeItem(LS_LAST_PLAN_ID);
  } catch {}
}

/** Build a back-link that encodes the job in the route. */
export function jobBackLink(jobId?: string) {
  return jobId ? `/pddl-edit?job=${encodeURIComponent(jobId)}` : "/pddl-edit";
}

/* === Plan Adapted (JSON used by Gantt) — additive, safe to append === */
type StorePlanData = { plan: any[]; metrics?: any };

const LS_ADAPTED = "pianista:planAdapted:v1";
const _adaptedListeners = new Map<string, Set<(pd: StorePlanData | null) => void>>();
let _adaptedStorageHooked = false;

function _readAdaptedAll(): Record<string, StorePlanData> {
  try { return JSON.parse(localStorage.getItem(LS_ADAPTED) || "{}"); } catch { return {}; }
}
function _writeAdaptedAll(obj: Record<string, StorePlanData>) {
  try { localStorage.setItem(LS_ADAPTED, JSON.stringify(obj)); } catch {}
}
function _emitAdapted(jobId: string, pd: StorePlanData | null) {
  const set = _adaptedListeners.get(jobId);
  if (!set) return;
  set.forEach(fn => { try { fn(pd); } catch {} });
}
function _hookStorage() {
  if (_adaptedStorageHooked) return;
  try {
    window.addEventListener("storage", (e) => {
      if (e.key !== LS_ADAPTED) return;
      const all = _readAdaptedAll();
      for (const [jobId, set] of _adaptedListeners.entries()) {
        const pd = all[jobId] ?? null;
        set.forEach(fn => { try { fn(pd); } catch {} });
      }
    });
    _adaptedStorageHooked = true;
  } catch {}
}

/** Load adapted plan JSON for a job (or null). */
export function loadPlanAdapted(jobId: string): StorePlanData | null {
  const all = _readAdaptedAll();
  return all[jobId] ?? null;
}

/** Save adapted plan JSON for a job and notify subscribers. */
export function savePlanAdapted(jobId: string, plan: StorePlanData) {
  if (!jobId) return;
  const all = _readAdaptedAll();
  all[jobId] = plan;
  _writeAdaptedAll(all);
  _emitAdapted(jobId, plan);
}

/** Subscribe to adapted plan changes for a job. Returns an unsubscribe. */
export function subscribePlanAdapted(jobId: string, cb: (pd: StorePlanData | null) => void) {
  if (!jobId || typeof cb !== "function") return () => {};
  if (!_adaptedListeners.has(jobId)) _adaptedListeners.set(jobId, new Set());
  _adaptedListeners.get(jobId)!.add(cb);
  _hookStorage();
  // fire immediately with current value
  try { cb(loadPlanAdapted(jobId)); } catch {}
  return () => { _adaptedListeners.get(jobId)!.delete(cb); };
}
