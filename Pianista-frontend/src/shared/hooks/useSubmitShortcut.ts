/**
 * Normalizes textarea submit shortcuts so forms can opt into Enter vs Cmd+Enter
 * behavior without duplicating composition/IME guards.
 */
import { useCallback } from "react";

export type SubmitShortcut = "enter" | "mod+enter" | "none";

/** Returns an onKeyDown handler that triggers onSubmit per the chosen shortcut. */
export default function useSubmitShortcut(
  onSubmit: () => void,
  opts?: { shortcut?: SubmitShortcut; disabled?: boolean }
) {
  const shortcut = opts?.shortcut ?? "enter";
  const disabled = !!opts?.disabled;

  return useCallback<React.KeyboardEventHandler<HTMLTextAreaElement>>(
    (e) => {
      if (disabled || shortcut === "none") return;

      // IME composition safety (Japanese/Chinese, etc.)
      const composing =
        // @ts-expect-error: React synthetic event carries this
        e.isComposing || (e.nativeEvent as any)?.isComposing;
      if (composing) return;

      if (shortcut === "enter") {
        if (e.key !== "Enter") return;
        if (e.shiftKey) return; // Shift+Enter -> newline
        if (!e.altKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          onSubmit();
        }
        return;
      }

      if (shortcut === "mod+enter") {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          onSubmit();
        }
      }
    },
    [onSubmit, shortcut, disabled]
  );
}
