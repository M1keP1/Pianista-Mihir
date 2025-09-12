export default function Brain({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} stroke="#3b82f6" strokeWidth="2" fill="none" aria-hidden>
      <path d="M12 5a3 3 0 1 0-6 0 4 4 0 0 0-2.5 5.8A4 4 0 0 0 4 18a4 4 0 1 0 8 0" />
      <path d="M12 5a3 3 0 1 1 6 0 4 4 0 0 1 2.5 5.8A4 4 0 0 1 20 18a4 4 0 1 1-8 0" />
    </svg>
  );
}
