/** Static SVG "map" for the Home banner. Never a real map: Mapbox only loads on /ban-do. */
export function MapBannerArt() {
  return (
    <svg viewBox="0 0 150 132" className="h-full w-full" aria-hidden="true">
      <rect width="150" height="132" fill="var(--dem)" />
      {/* river */}
      <path d="M150 70c-22 6-30 22-52 26s-36 16-46 36" stroke="#2c2350" strokeWidth="14" fill="none" />
      {/* streets */}
      <g stroke="#3a2f5f" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M0 30h150M0 62h120M20 0v132M64 0v100M110 0v60M0 98l60-40M80 0l70 50" />
      </g>
      {[
        { x: 34, y: 28, label: 'Bún bò' },
        { x: 98, y: 44, label: 'Ốc' },
        { x: 56, y: 76, label: 'Phở' },
      ].map((p, i) => (
        <g key={p.label} transform={`translate(${p.x} ${p.y})`}>
          <rect
            x={-2}
            y={-2}
            width={p.label.length * 6 + 18}
            height={20}
            rx={10}
            fill="var(--ink)"
            transform="translate(2 2)"
          />
          <rect
            x={-2}
            y={-2}
            width={p.label.length * 6 + 18}
            height={20}
            rx={10}
            fill={i === 0 ? 'var(--xoai)' : 'var(--surface)'}
            stroke="var(--ink)"
            strokeWidth="1.5"
          />
          <text x={7} y={12} fontSize="10" fontWeight="700" fill="var(--ink)" fontFamily="var(--ff-sans)">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
