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
      <img
        src="https://i.postimg.cc/L89VZ3GK/icon.png"
        alt="Mitti2Market logo"
        width={s}
        height={s}
        className="shrink-0 object-contain"
      />

      <span
        className={`font-extrabold tracking-tight ${textSizes[size] || 'text-lg'}`}
        style={{ color: '#0f2a4a' }}
      >
        Mitti2Market
      </span>
    </div>
  );
}
