export default function M2MLogo({ size = 'md', noLink = false, className = '' }) {
  const sizes = {
    sm: 28,
    md: 34,
    lg: 42,
    xl: 54,
  };
  const s = sizes[size] || sizes.md;

  const textSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={s}
        height={s}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Navy blue border / background */}
        <rect x="2" y="2" width="96" height="96" rx="22" fill="#0f2a4a" />

        {/* Mustard yellow inner fill */}
        <rect x="8" y="8" width="84" height="84" rx="16" fill="#d4a017" />

        {/* Green accent bar */}
        <rect x="22" y="68" width="56" height="4" rx="2" fill="#16a34a" />

        {/* M */}
        <text
          x="22"
          y="54"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="800"
          fontSize="30"
          fill="#0f2a4a"
          textAnchor="middle"
        >
          M
        </text>

        {/* 2 */}
        <text
          x="50"
          y="54"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="800"
          fontSize="24"
          fill="#0f2a4a"
          textAnchor="middle"
          opacity="0.7"
        >
          2
        </text>

        {/* M */}
        <text
          x="78"
          y="54"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="800"
          fontSize="30"
          fill="#0f2a4a"
          textAnchor="middle"
        >
          M
        </text>

        {/* Leaf accent */}
        <path
          d="M80 14 C80 14, 88 18, 86 26 C84 34, 76 32, 76 32"
          stroke="#16a34a"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M78 18 C78 18, 84 22, 82 26"
          stroke="#22c55e"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>

      <span
        className={`font-extrabold tracking-tight ${textSizes[size] || 'text-lg'}`}
        style={{ color: '#0f2a4a' }}
      >
        Mitti2Market
      </span>
    </div>
  );
}
