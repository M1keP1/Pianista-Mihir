import { type CSSProperties, type HTMLAttributes, type ReactNode, type Ref } from "react";

import ModeSlider, { type ModeSliderProps } from "@/components/Inputbox/Controls/ModeSlider";
import Textarea, { type TextareaHandle, type TextareaProps } from "@/components/Inputbox/TextArea";

const panelStyle: CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border-muted)",
  borderRadius: 12,
  padding: 0,
  boxShadow: "0 1.5px 10px var(--color-shadow)",
  overflow: "hidden",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 10px",
  borderBottom: "1px solid var(--color-border-muted)",
  background: "color-mix(in srgb, var(--color-surface) 88%, var(--color-bg))",
};

const headerTitleWrapStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const headerControlsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const bodyStyle: CSSProperties = {
  position: "relative",
  padding: 10,
};

export type EditorPanelProps<TMode extends string> = {
  title: string;
  accentColor: string;
  modeSliderProps: ModeSliderProps<TMode>;
  textareaProps: TextareaProps;
  textareaRef?: Ref<TextareaHandle>;
  hint?: ReactNode;
  sectionProps?: HTMLAttributes<HTMLElement>;
};

export default function EditorPanel<TMode extends string>({
  title,
  accentColor,
  modeSliderProps,
  textareaProps,
  textareaRef,
  hint,
  sectionProps,
}: EditorPanelProps<TMode>) {
  return (
    <section {...sectionProps} style={{ ...panelStyle, ...sectionProps?.style }}>
      <div style={headerStyle}>
        <div style={headerTitleWrapStyle}>
          <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: accentColor }} />
          <strong>{title}</strong>
        </div>

        <div style={headerControlsStyle}>
          <ModeSlider {...modeSliderProps} />
        </div>
      </div>

      <div style={bodyStyle}>
        <Textarea ref={textareaRef} {...textareaProps} />
        {hint ? <div className="field-hint">{hint}</div> : null}
      </div>
    </section>
  );
}
