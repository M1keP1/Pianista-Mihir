const KEY = "pianista.pddl.single";

export type PddlBlob = { domain: string; problem: string; updatedAt: string };

export function loadPddl(): PddlBlob {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { domain: "", problem: "", updatedAt: "" };
    const j = JSON.parse(raw);
    return {
      domain: j?.domain ?? "",
      problem: j?.problem ?? "",
      updatedAt: j?.updatedAt ?? "",
    };
  } catch {
    return { domain: "", problem: "", updatedAt: "" };
  }
}

export function savePddl(partial: Partial<PddlBlob>): PddlBlob {
  const prev = loadPddl();
  const next: PddlBlob = {
    domain: partial.domain ?? prev.domain ?? "",
    problem: partial.problem ?? prev.problem ?? "",
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearPddl() {
  localStorage.removeItem(KEY);
}
