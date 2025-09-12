import { pianistaFetch, withTimeout } from "./client";
import type { ConvertResponse } from "./types";

/**
 * Natural language → PDDL (Domain + Problem).
 * Always sets generate_both=true.
 */
export function convertNaturalBoth(
  text: string,
  attempts = 1,
  signal?: AbortSignal,
  disableTimeout = false
) {
  const path = `/convert/natural_language/domain?generate_both=true&attempts=${attempts}`;
  return withTimeout(
    pianistaFetch<ConvertResponse>(path, { text }, { signal }),
    20000,
    "timeout",
    disableTimeout
  );
}
