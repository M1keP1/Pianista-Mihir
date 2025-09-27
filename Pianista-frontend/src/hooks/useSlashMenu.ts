// src/hooks/useSlashMenu.ts
import { useEffect, useMemo, useState } from "react";

type ShortcutItem = { id: string; name: string; text: string };

export function useSlashMenu(
  textareaRef: React.RefObject<{ textarea: HTMLTextAreaElement | null }>,
  value: string,
  onInsertValue: (nextValue: string) => void,
  shortcuts: ShortcutItem[]
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [start, setStart] = useState<number | null>(null);
  const [selIdx, setSelIdx] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? shortcuts.filter(s => s.name.toLowerCase().startsWith(q)) : shortcuts;
    return list.slice(0, 8);
  }, [query, shortcuts]);

  function detectSlashAtCaret(v: string, caret: number) {
    if (caret === 0) return { active: false as const };
    let wordStart = caret;
    while (wordStart > 0 && /\S/.test(v[wordStart - 1])) wordStart--;
    if (wordStart < v.length && v[wordStart] === "/" && caret > wordStart) {
      const q = v.slice(wordStart + 1, caret);
      return { active: true as const, start: wordStart, query: q };
    }
    return { active: false as const };
  }

  function updateMenuUnderCaret() {
    const el = textareaRef.current?.textarea;
    if (!el) return;

    const caretIndex = el.selectionStart ?? el.value.length;
    const state = detectSlashAtCaret(el.value, caretIndex);
    if (!state.active) {
      setOpen(false); setStart(null); setQuery(""); setPos(null);
      return;
    }

    setOpen(true);
    setStart(state.start);
    setQuery(state.query);

    // Position under caret
    const cs = getComputedStyle(el);
    const mirror = document.createElement("div");
    mirror.style.position = "absolute";
    mirror.style.visibility = "hidden";
    mirror.style.whiteSpace = "pre-wrap";
    (mirror.style as any).wordWrap = "break-word";
    [
      "fontFamily","fontSize","fontWeight","fontStyle","letterSpacing","textTransform",
      "lineHeight","textAlign","paddingTop","paddingRight","paddingBottom","paddingLeft",
      "borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth","boxSizing"
    ].forEach((k) => (mirror.style as any)[k] = (cs as any)[k]);
    mirror.style.width = el.clientWidth + "px";
    mirror.textContent = el.value.slice(0, caretIndex);
    const caretSpan = document.createElement("span");
    caretSpan.textContent = "\u200b";
    mirror.appendChild(caretSpan);
    document.body.appendChild(mirror);

    const mRect = mirror.getBoundingClientRect();
    const cRect = caretSpan.getBoundingClientRect();
    const left = cRect.left - mRect.left - el.scrollLeft;
    const top  = cRect.top  - mRect.top  - el.scrollTop + (parseFloat(cs.lineHeight || "16") || 16) + 6;
    document.body.removeChild(mirror);

    const maxLeft = el.clientWidth - 360 - 12; // 360px menu width budget
    const clampedLeft = Math.max(8, Math.min(left, Math.max(8, maxLeft)));
    setPos({ left: clampedLeft, top });
  }

  function insertSelected(idx = selIdx) {
    const el = textareaRef.current?.textarea;
    if (!el) return;
    const caret = el.selectionStart ?? value.length;
    const s = start ?? caret;
    const before = value.slice(0, s);
    const after  = value.slice(caret);
    const item = filtered[idx];
    if (!item) return;
    const next = before + item.text + after;
    onInsertValue(next);
    requestAnimationFrame(() => {
      const node = textareaRef.current?.textarea; if (!node) return;
      const pos = (before + item.text).length; node.focus(); node.setSelectionRange(pos, pos);
    });
    setOpen(false); setQuery(""); setStart(null); setSelIdx(0);
  }

  useEffect(() => {
    const el = textareaRef.current?.textarea; if (!el) return;
    const onMove = () => updateMenuUnderCaret();
    const onInputDelayed = () => setTimeout(updateMenuUnderCaret, 0);
    onMove();
    el.addEventListener("focus", onMove);
    el.addEventListener("keyup", onMove);
    el.addEventListener("click", onMove);
    el.addEventListener("scroll", onMove);
    el.addEventListener("input", onInputDelayed);
    return () => {
      el.removeEventListener("focus", onMove);
      el.removeEventListener("keyup", onMove);
      el.removeEventListener("click", onMove);
      el.removeEventListener("scroll", onMove);
      el.removeEventListener("input", onInputDelayed);
    };
  }, [value, textareaRef]);

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSelIdx(i => Math.min(filtered.length - 1, i + 1)); return; }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelIdx(i => Math.max(0, i - 1)); return; }
    if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); insertSelected(); return; }
    if (e.key === "Escape")    { e.preventDefault(); setOpen(false); }
  };

  return { open, pos, filtered, selIdx, setSelIdx, onKeyDown, insertSelected };
}