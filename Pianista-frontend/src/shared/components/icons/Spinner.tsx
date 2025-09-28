export default function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ color: "var(--color-accent)" }} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" fill="none"
        strokeDasharray="56" strokeDashoffset="28">
        <animate attributeName="stroke-dashoffset" dur="1s" values="28;0;28" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
}
