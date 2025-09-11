import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";

type CssSize = number | string;

export type TextareaHandle = {
  focus: () => void;
  blur: () => void;
  select: () => void;
  /** Direct DOM node if you need it */
  textarea: HTMLTextAreaElement | null;
};

export type TextareaProps = {
  /** Controlled value */
  value: string;
  /** Change handler */
  onChange: (v: string) => void;

  placeholder?: string;
  ariaLabel?: string;
  name?: string;
  id?: string;

  /** Visual minimum rows (auto-resize grows from here). Default: 3 */
  minRows?: number;
  /** Max visible rows before scroll appears. Default: 5 */
  maxRows?: number;

  /** If set, uses a fixed height and disables auto-resize (px, %, rem, etc.) */
  height?: CssSize;

  /** Width control (px, %, vw, etc.). Default: "100%" */
  width?: CssSize;
  /** Optional max-width constraint (e.g., 900, "900px", "92vw") */
  maxWidth?: CssSize;

  /** Enable auto-resize. Ignored if `height` is provided. Default: true */
  autoResize?: boolean;

  /** Optional keydown handler (called after internal handling) */
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;

  /** Disabled / readOnly / spellCheck passthroughs */
  disabled?: boolean;
  readOnly?: boolean;
  spellCheck?: boolean;

  /** Extra inline styles to merge in (keeps inline-only styling) */
  style?: React.CSSProperties;
};

/** Convert numeric sizes to px, pass strings as-is */
const toCss = (v?: CssSize) =>
  typeof v === "number" ? `${v}px` : v;

/**
 * Theme-aware, auto-resizing textarea:
 * - Uses --color-* tokens from theme.css and the global font (--font-sans)
 * - Grows downward until `maxRows`, then scrolls
 * - No scrollbar-gutter (avoids caret shift when overflow appears)
 * - Inline styles only (placeholder/scrollbar colors come from theme.css)
 */
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
    onKeyDown,
    disabled,
    readOnly,
    spellCheck = true,
    style,
  },
  ref
) {
  const elRef = useRef<HTMLTextAreaElement | null>(null);
  const [focused, setFocused] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const shouldAutoResize = autoResize && height == null;

  // Expose imperative API
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

  // Measure & resize height to content (clamped to min/max rows)
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
    const natural = el.scrollHeight; // includes padding

    const target = Math.max(minH, Math.min(natural, maxH));
    el.style.height = `${target}px`;

    setHasOverflow(natural > maxH);
  };

  // Initial + responsive resize
  useEffect(() => {
    measureAndResize();
    if (!shouldAutoResize) return;

    // Observe content-box size changes (e.g., width changes)
    const ro = new ResizeObserver(() => {
      // schedule on next frame to avoid layout thrash
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

  // Re-measure when content or row caps change
  useEffect(() => {
    if (shouldAutoResize) measureAndResize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, minRows, maxRows, shouldAutoResize]);

  const baseStyle: React.CSSProperties = useMemo(
    () => ({
      boxSizing: "border-box",
      width: toCss(width) ?? "100%",
      maxWidth: toCss(maxWidth),
      height: toCss(height), // when set, auto-resize is bypassed
      padding: ".65rem .8rem",
      fontFamily: "var(--font-sans)",   // global font
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
    [width, maxWidth, height, hasOverflow]
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

  return (
    <textarea
      ref={elRef}
      data-p-textarea=""                         // hook for placeholder/scrollbar CSS in theme.css
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
      onKeyDown={onKeyDown}
      rows={minRows}                            // visual fallback; height is managed by JS unless `height` is set
      style={{ ...baseStyle, ...focusStyle, ...style }}
    />
  );
});

export default Textarea;
