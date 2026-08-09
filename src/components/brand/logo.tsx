// Vector approximation of the Ownova infinity mark (teal -> purple), since no exported
// logo file exists in the knowledge base yet — only brand-reveal video reels. Swap the
// <svg> below for an <img src="/logo.svg"> once a real exported asset is available.
export function OwnovaMark({ size = 32 }: { size?: number }) {
  const id = "ownova-logo-gradient";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ownova">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <path
        d="M14 16c-4.4 0-8 3.6-8 8s3.6 8 8 8c3 0 5.4-1.5 7-3.7l1-1.3M34 16c4.4 0 8 3.6 8 8s-3.6 8-8 8c-3 0-5.4-1.5-7-3.7l-1-1.3M14 16c3 0 5.4 1.5 7 3.7l6 6.6c1.6 2.2 4 3.7 7 3.7M34 16c-3 0-5.4 1.5-7 3.7l-6 6.6c-1.6 2.2-4 3.7-7 3.7"
        stroke={`url(#${id})`}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function OwnovaWordmark({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <OwnovaMark size={30} />
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "0.02em" }}>OWNOVA</span>
      </div>
    </div>
  );
}
