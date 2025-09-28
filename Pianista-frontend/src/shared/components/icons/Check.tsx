export default function Check({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} stroke="#22c55e" strokeWidth="2" fill="none" aria-hidden>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
