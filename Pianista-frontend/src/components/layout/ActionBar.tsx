import type { CSSProperties, PropsWithChildren } from "react";

export type ActionBarProps = PropsWithChildren<{
  className?: string;
  style?: CSSProperties;
  laneClassName?: string;
  laneStyle?: CSSProperties;
}>;

function cx(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(" ");
}

export default function ActionBar({
  children,
  className,
  style,
  laneClassName,
  laneStyle,
}: ActionBarProps) {
  return (
    <div className={cx("action-bar", className)} style={style}>
      <div className={cx("action-bar__lane", laneClassName)} style={laneStyle}>
        {children}
      </div>
    </div>
  );
}
