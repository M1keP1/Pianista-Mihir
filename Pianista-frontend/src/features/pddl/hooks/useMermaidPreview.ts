import { useCallback, useEffect, useMemo, useState } from "react";

import { useMermaidRequest } from "./mermaidPreview/useMermaidRequest";
import type { MermaidUiMode } from "./mermaidPreview/types";

export type { MermaidUiMode } from "./mermaidPreview/types";

/**
 * Glue between the PDDL editor and the Mermaid preview modal. Tracks whether
 * the preview is open, decides if conversion is possible, and fans out to the
 * shared request controller to fetch/cancel Mermaid diagrams.
 */
export function useMermaidPreview({
  domain,
  problem,
}: {
  domain: string;
  problem: string;
}) {
  const [isMermaidOpen, setIsMermaidOpen] = useState(false);
  const [mermaidUiMode, setMermaidUiMode] = useState<MermaidUiMode>("D+P");

  const trimmedDomain = useMemo(() => domain.trim(), [domain]);
  const trimmedProblem = useMemo(() => problem.trim(), [problem]);

  const { status: mermaidStatus, text: mermaidText, fetch: requestMermaid, cancel, setManualText } =
    useMermaidRequest({ domain, problem });

  const canConvertMermaid = useMemo(() => {
    const dOk = !!trimmedDomain;
    const pOk = !!trimmedProblem;
    if (mermaidUiMode === "D") return dOk;
    if (mermaidUiMode === "P") return pOk;
    return dOk && pOk;
  }, [trimmedDomain, trimmedProblem, mermaidUiMode]);

  const fetchMermaid = useCallback(
    (force = false) => requestMermaid(mermaidUiMode, { force }),
    [requestMermaid, mermaidUiMode]
  );

  useEffect(() => {
    if (!isMermaidOpen) return;
    if (!canConvertMermaid) return;

    const handle = window.setTimeout(() => {
      requestMermaid(mermaidUiMode, { force: true });
    }, 300);

    return () => clearTimeout(handle);
  }, [isMermaidOpen, canConvertMermaid, requestMermaid, mermaidUiMode, trimmedDomain, trimmedProblem]);

  useEffect(() => {
    if (!isMermaidOpen) return;
    requestMermaid(mermaidUiMode);
  }, [isMermaidOpen, mermaidUiMode, requestMermaid]);

  const openMermaid = useCallback(() => {
    if (!canConvertMermaid) return;
    setIsMermaidOpen(true);
  }, [canConvertMermaid]);

  const closeMermaid = useCallback(() => {
    setIsMermaidOpen(false);
    cancel();
  }, [cancel]);

  const onMermaidTextChange = useCallback(
    (next: string) => {
      setManualText(mermaidUiMode, domain, problem, next);
    },
    [setManualText, mermaidUiMode, domain, problem]
  );

  return {
    isMermaidOpen,
    openMermaid,
    closeMermaid,
    mermaidText,
    mermaidStatus,
    mermaidUiMode,
    setMermaidUiMode,
    canConvertMermaid,
    onMermaidTextChange,
    fetchMermaid,
  };
}
