export default function Cross({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} stroke="#ef4444" strokeWidth="2" fill="none" aria-hidden>
      <path d="M6 6l12 12M6 18L18 6" />
    </svg>
  );
}
