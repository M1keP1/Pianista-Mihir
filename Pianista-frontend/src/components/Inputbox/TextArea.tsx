// src/components/Inputbox/TextArea.tsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import useSubmitShortcut, {
  type SubmitShortcut,
} from "@/components/Inputbox/hooks/useSubmitShortcut";

// Separate icon components (no inline SVG)
import Check from "@/components/icons/Check";
import Cross from "@/components/icons/Cross";
import Spinner from "@/components/icons/Spinner";
import Brain from "@/components/icons/Brain";

type CssSize = number | string;

export type TextareaHandle = {
  focus: () => void;
  blur: () => void;
  select: () => void;
  textarea: HTMLTextAreaElement | null;
};

export type TextAreaStatus =
  | "idle"
  | "verification"
  | "verified"
  | "error"
  | "ai-thinking";

export type GlowState = "verification" | "verified" | "error" | "ai-thinking";

export type TextareaProps = {
  value: string;
  onChange: (v: string) => void;

  placeholder?: string;
  ariaLabel?: string;
  name?: string;
  id?: string;

  minRows?: number;       // default 3
  maxRows?: number;       // default 5

  height?: CssSize;       // fixed height disables auto-resize
  width?: CssSize;        // default "100%" (applied on wrapper)
  maxWidth?: CssSize;
  autoResize?: boolean;   // default true (ignored if height is set)

  /** Called when the user "sends". If provided, Enter→send is enabled by default. */
  onSubmit?: () => void;
  /** Configure the shortcut; default: 'enter'. */
  submitShortcut?: SubmitShortcut;

  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;

  disabled?: boolean;
  readOnly?: boolean;
  spellCheck?: boolean;

  style?: React.CSSProperties;

  /** Manual override for glow; if omitted, glow follows `status` automatically. */
  glowState?: GlowState;

  /** Optional status pill (pure CSS look with theme.css). */
  status?: TextAreaStatus;                           // default "idle"
  showStatusPill?: boolean;                          // default false
  statusPillPlacement?: "top-right" | "top-left";    // default "top-right"

  /** Optional icon overrides; if omitted, sensible defaults are used. */
  statusIcons?: {
    verification?: React.ReactNode;  // e.g. <Spinner className="status-icon spin" />
    verified?: React.ReactNode;      // e.g. <Check className="status-icon" />
    error?: React.ReactNode;         // e.g. <Cross className="status-icon" />
    aiThinking?: React.ReactNode;    // e.g. <Brain className="status-icon" />
  };
};

const toCss = (v?: CssSize) => (typeof v === "number" ? `${v}px` : v);

const Textarea = forwardRef<TextareaHandle, TextareaProps>(function Textarea(
  {
    value,
    onChange,
    placeholder,
    ariaLabel,
    name,
    id,
    minRows = 3,
    maxRows = 5,
    height,
    width = "100%",
    maxWidth,
    autoResize = true,
    onSubmit,
    submitShortcut = "enter",
    onKeyDown,
    disabled,
    readOnly,
    spellCheck = true,
    style,

    // visual props
    glowState,                         // manual override
    status = "idle",
    showStatusPill = false,
    statusPillPlacement = "top-right",
    statusIcons,
  },
  ref
) {
  const elRef = useRef<HTMLTextAreaElement | null>(null);
  const [focused, setFocused] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const shouldAutoResize = autoResize && height == null;

  useImperativeHandle(
    ref,
    () => ({
      focus: () => elRef.current?.focus(),
      blur: () => elRef.current?.blur(),
      select: () => elRef.current?.select(),
      textarea: elRef.current,
    }),
    []
  );

  // Auto-resize (downwards only, clamped to maxRows)
  const measureAndResize = () => {
    const el = elRef.current;
    if (!el || !shouldAutoResize) return;

    const cs = window.getComputedStyle(el);
    const fontSize = parseFloat(cs.fontSize) || 16;
    const lhRaw = cs.lineHeight;
    const linePx =
      lhRaw === "normal" || !/^\d/.test(lhRaw) ? 1.4 * fontSize : parseFloat(lhRaw);
    const padTop = parseFloat(cs.paddingTop) || 0;
    const padBottom = parseFloat(cs.paddingBottom) || 0;
    const bTop = parseFloat(cs.borderTopWidth) || 0;
    const bBottom = parseFloat(cs.borderBottomWidth) || 0;

    const minH = bTop + bBottom + padTop + padBottom + linePx * minRows;
    const maxH = bTop + bBottom + padTop + padBottom + linePx * maxRows;

    el.style.height = "auto";
    const natural = el.scrollHeight;

    const target = Math.max(minH, Math.min(natural, maxH));
    el.style.height = `${target}px`;

    setHasOverflow(natural > maxH);
  };

  useEffect(() => {
    measureAndResize();
    if (!shouldAutoResize) return;

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measureAndResize);
    });
    if (elRef.current) ro.observe(elRef.current);

    const onWinResize = () => requestAnimationFrame(measureAndResize);
    window.addEventListener("resize", onWinResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWinResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoResize]);

  useEffect(() => {
    if (shouldAutoResize) measureAndResize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, minRows, maxRows, shouldAutoResize]);

  // Base textarea styles (width 100%; wrapper controls width/maxWidth)
  const baseStyle: React.CSSProperties = useMemo(
    () => ({
      boxSizing: "border-box",
      width: "100%",
      height: toCss(height),
      padding: ".65rem .8rem",
      fontFamily: "var(--font-sans)",
      fontSize: ".95rem",
      lineHeight: 1.4,
      color: "var(--color-text)",
      background: "var(--color-surface)",
      border: "1px solid var(--color-border-muted)",
      borderRadius: "10px",
      outline: "none",
      caretColor: "var(--color-accent)",
      boxShadow: "0 1px 4px var(--color-shadow) inset",
      transition: "box-shadow 120ms ease, border-color 120ms ease, transform 120ms ease",
      resize: "none" as const,
      overflowY: height ? "auto" : hasOverflow ? "auto" : "hidden",
      overscrollBehavior: "contain",
      overflowWrap: "break-word",
      wordBreak: "break-word",
    }),
    [height, hasOverflow]
  );

  const focusStyle: React.CSSProperties = focused
    ? {
        borderColor:
          "color-mix(in srgb, var(--color-accent) 55%, var(--color-border-muted))",
        boxShadow:
          "0 0 0 2px color-mix(in srgb, var(--color-accent) 30%, transparent), 0 1px 4px var(--color-shadow) inset",
        transform: "translateZ(0) scale(1.005)",
      }
    : {};

  // 🔑 Default Enter→send behavior (Shift+Enter = newline)
  const internalKeyDown =
    onSubmit &&
    useSubmitShortcut(() => {
      if (!disabled) onSubmit();
    }, { shortcut: submitShortcut, disabled });

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    internalKeyDown && internalKeyDown(e);
    onKeyDown && onKeyDown(e);
  };

  // Auto-select icon (overridable via statusIcons)
  const iconNode =
    status === "verification"
      ? (statusIcons?.verification ?? <span className="status-icon spin"><Spinner /></span>)
      : status === "verified"
      ? (statusIcons?.verified ?? <span className="status-icon"><Check /></span>)
      : status === "error"
      ? (statusIcons?.error ?? <span className="status-icon"><Cross /></span>)
      : status === "ai-thinking"
      ? (statusIcons?.aiThinking ?? <span className="status-icon"><Brain /></span>)
      : null;

  // Auto-map glow from status if not manually provided
  const effectiveGlow: GlowState | undefined =
    glowState ?? (status !== "idle" ? (status as GlowState) : undefined);

  // CSS-only pill
  const pill =
    showStatusPill && status !== "idle" ? (
      <div
        className={`status-pill${statusPillPlacement === "top-left" ? " is-left" : ""}`}
        data-state={status}
        aria-hidden
      >
        {iconNode}
      </div>
    ) : null;

  return (
    <div
      style={{
        position: "relative",
        width: toCss(width) ?? "100%",
        maxWidth: toCss(maxWidth),
      }}
    >
      <textarea
        ref={elRef}
        data-p-textarea=""
        id={id}
        name={name}
        aria-label={ariaLabel ?? placeholder ?? "textarea"}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        readOnly={readOnly}
        spellCheck={spellCheck}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
        rows={minRows}
        style={{ ...baseStyle, ...focusStyle, ...style }}
        className={effectiveGlow ? `glow--${effectiveGlow}` : undefined}
      />
      {pill}
    </div>
  );
});

export default Textarea;
