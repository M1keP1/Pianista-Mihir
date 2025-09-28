import { useEffect, useMemo, useState } from "react";
import defaults from "@/features/chat/data/shortcuts.json";

export type Shortcut = { id: string; name: string; text: string };

const LS_KEY = "customShortcuts";

function readCustom(): Shortcut[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(x => x && x.id && x.name && typeof x.text === "string");
  } catch { return []; }
}

function writeCustom(next: Shortcut[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(next));
}

export default function useShortcuts() {
  const [custom, setCustom] = useState<Shortcut[]>([]);

  useEffect(() => { setCustom(readCustom()); }, []);

  const all = useMemo<Shortcut[]>(() => {
    const map = new Map<string, Shortcut>();
    [...defaults, ...custom].forEach(s => map.set(s.id, s));
    return Array.from(map.values());
  }, [custom]);

  const addShortcut = (s: Shortcut) => {
    setCustom(prev => {
      const next = [...prev.filter(p => p.id !== s.id), s];
      writeCustom(next);
      return next;
    });
  };

  return { all, addShortcut };
}
