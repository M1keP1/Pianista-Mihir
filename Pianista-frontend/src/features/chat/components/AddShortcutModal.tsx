import { useState } from "react";
import type { Shortcut } from "@/features/chat/hooks/useShortcuts";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (s: Shortcut) => void;
};

export default function AddShortcutModal({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");

  if (!open) return null;

  const id = name.trim().toLowerCase().replace(/\s+/g, "-");
  const canSave = id.length > 0 && text.trim().length > 0;

  return (
    <div role="dialog" aria-modal="true"
         style={{
           position: "fixed", 
           inset: 0, 
           background: "var(--color-bg)",
           display: "grid", 
           placeItems: "center", 
           zIndex: 9999
         }}
         onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
           style={{
             width: 520, 
             maxWidth: "92vw", 
             borderRadius: 12,
             background: "var(--color-surface)", 
             color: "var(--color-text)",
             border: "1px solid var(--color-border-muted)",
             boxShadow: "0 10px 24px var(--color-shadow)", 
             padding: 16
           }}>
        <h3 style={{ margin: 0, marginBottom: 12 }}>Create a shortcut</h3>
        <label style={{ display: "block", marginBottom: 8, fontSize: 12, opacity: .8 }}>
          Name (shown as /name)
        </label>
        <input 
          value={name} 
          onChange={e => setName(e.target.value)}
          placeholder="e.g. prep-next-meeting"
          style={{
            width: "100%", 
            padding: "8px 10px", 
            borderRadius: 8,
            boxSizing: "border-box",
            border: "1px solid var(--color-border-muted)", 
            background: "var(--color-bg)",
            color: "var(--color-text)", 
            marginBottom: 12
          }} 
        />
        <label style={{ display: "block", marginBottom: 8, fontSize: 12, opacity: .8 }}>
          Text to insert
        </label>
        <textarea 
          value={text} 
          onChange={e => setText(e.target.value)}
          rows={6}
          placeholder="What should be inserted into the textbox?"
          style={{
            width: "100%", 
            padding: "8px 10px", 
            borderRadius: 8,
            boxSizing: "border-box",
            border: "1px solid var(--color-border-muted)", 
            background: "var(--color-bg)",
            color: "var(--color-text)",
            resize: "none"
          }} 
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button onClick={onClose} className="btn btn--surface btn--sm">
            Cancel
          </button>
          <button
            className="btn btn--primary btn--sm"
            disabled={!canSave}
            onClick={() => {
              onCreate({ id, name: id, text });
              setName("");
              setText("");
              onClose();
            }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}