const BASE = import.meta.env.VITE_PIANISTA_BASE as string;
const KEY  = import.meta.env.VITE_PIANISTA_KEY as string;

if (!BASE || !KEY) {
  // eslint-disable-next-line no-console
  console.warn("[pianista] Missing VITE_PIANISTA_BASE or VITE_PIANISTA_KEY");
}

export type RequestOpts = { signal?: AbortSignal };

export async function pianistaFetch<T>(
  pathAndQuery: string,
  body: unknown,
  opts: RequestOpts = {}
): Promise<T> {
  const res = await fetch(`${BASE}${pathAndQuery}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "Ocp-Apim-Subscription-Key": KEY,
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`[pianista] ${res.status} ${res.statusText} ${msg}`);
  }
  return res.json() as Promise<T>;
}

/** Timeout helper, can be disabled */
export async function withTimeout<T>(
  p: Promise<T>,
  ms = 20000,
  reason = "timeout",
  disable = false
): Promise<T> {
  if (disable) return p;
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(reason)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}
