/**
 * 14 dish icons for CategoryRail (custom SVG, no emoji). 32×32 grid, ink stroke 1.8,
 * fills from tokens so they follow the theme.
 */
const S = { stroke: 'var(--ink)', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const CREAM = 'var(--surface)';
const PINK = 'var(--thanhlong)';
const MANGO = 'var(--xoai)';
const HERB = 'var(--raurau)';

const Bowl = ({ fill = CREAM }: { fill?: string }) => (
  <>
    <path d="M5 16h22c0 6-4.7 10-11 10S5 22 5 16Z" fill={fill} {...S} />
    <path d="M12 26.5h8" {...S} />
  </>
);
const Steam = () => <path d="M12 12c0-1.6 1.6-1.9 1.6-3.5M17 12c0-1.6 1.6-1.9 1.6-3.5" fill="none" {...S} />;

const ICONS: Record<string, React.ReactNode> = {
  pho: (
    <>
      <path d="M17 15 26 5M19.5 15.5 28 8" {...S} />
      <Bowl />
      <path d="M9 19.5c2 1.2 4 1.2 6 0s4-1.2 6 0" fill="none" {...S} />
      <circle cx="21.5" cy="18.5" r="1.4" fill={HERB} stroke="none" />
    </>
  ),
  'bun-bo': (
    <>
      <Steam />
      <Bowl fill={MANGO} />
      <path d="M9 19.5h14" {...S} />
      <path d="M20 17.5c1.5-1.8 3.2-1.6 4 0" fill={PINK} {...S} />
    </>
  ),
  'hu-tieu': (
    <>
      <Steam />
      <Bowl />
      <path d="M10 19c1.5-2.4 4.5-2.6 6-.6-1.2.6-2.6 1.6-3.2 3" fill={PINK} {...S} />
      <path d="M18 19.5h4" {...S} />
    </>
  ),
  'banh-canh': (
    <>
      <Steam />
      <Bowl />
      <path d="M8.5 19.5c3 1.4 12 1.4 15 0" fill="none" {...S} strokeWidth={3} stroke={MANGO} />
      <path d="M8.5 19.5c3 1.4 12 1.4 15 0" fill="none" {...S} />
    </>
  ),
  chao: (
    <>
      <path d="M20 16 27 7" {...S} />
      <ellipse cx="27.5" cy="6.5" rx="2" ry="1.4" fill={CREAM} {...S} />
      <Bowl />
      <circle cx="11" cy="19.5" r="1" fill={HERB} stroke="none" />
      <circle cx="14.5" cy="20.5" r="1" fill={HERB} stroke="none" />
    </>
  ),
  'com-tam': (
    <>
      <ellipse cx="16" cy="19" rx="12" ry="6.5" fill={CREAM} {...S} />
      <path d="M9 18.5c1-3 5-3.6 7-1.6" fill={CREAM} {...S} />
      <rect x="16" y="14" width="9" height="5" rx="2" fill={MANGO} {...S} transform="rotate(-12 20 16)" />
      <circle cx="12" cy="21.5" r="1.3" fill={HERB} stroke="none" />
    </>
  ),
  oc: (
    <>
      <path d="M6 22c0-7 5-12 11-12 5 0 9 3.6 9 8.4 0 3.8-3 6.6-6.8 6.6-3.2 0-5.6-2.3-5.6-5.2 0-2.4 1.9-4.2 4.2-4.2 1.9 0 3.3 1.4 3.3 3.1" fill={MANGO} {...S} />
      <path d="M4 25h24" {...S} />
    </>
  ),
  'banh-mi': (
    <>
      <path d="M5 20.5C5 15 13 9 21 9c4 0 6.5 1.8 6.5 4.5 0 5-8.5 11-16.5 11C7.5 24.5 5 23 5 20.5Z" fill={MANGO} {...S} />
      <path d="M11 17l2.5-2.2M15 15l2.5-2.2M19 13l2.5-2.2" {...S} />
      <path d="M8 22c5 .5 13-3.5 17-8" fill="none" {...S} stroke={HERB} />
    </>
  ),
  lau: (
    <>
      <Steam />
      <path d="M6 15h20v6c0 3-2.5 5-5.5 5h-9C8.5 26 6 24 6 21v-6Z" fill={PINK} {...S} />
      <path d="M3 17h3M26 17h3M5 15h22" {...S} />
    </>
  ),
  'banh-xeo': (
    <>
      <path d="M4 21a12 12 0 0 1 24 0Z" fill={MANGO} {...S} />
      <path d="M10 17.5c1.5-1 3-1 4.5 0M17.5 15c1.5-1 3-1 4.5 0" fill="none" {...S} stroke={HERB} />
      <path d="M4 21h24" {...S} />
    </>
  ),
  che: (
    <>
      <path d="M9 9h14l-2 17h-10Z" fill={CREAM} {...S} />
      <path d="M10.1 16h11.8l-.5 4.5h-10.8Z" fill={PINK} stroke="none" />
      <path d="M10.7 21h10.6l-.5 4.2h-9.6Z" fill={HERB} stroke="none" />
      <path d="M9 9h14l-2 17h-10Z" fill="none" {...S} />
      <path d="M19 9l2-5" {...S} />
    </>
  ),
  'ca-phe': (
    <>
      <path d="M10 8h12M11 8v4h10V8" fill={CREAM} {...S} />
      <path d="M9 13h14l-1.8 13h-10.4Z" fill="var(--ink)" {...S} />
      <path d="M9.7 18h12.6" stroke={CREAM} strokeWidth={1.8} />
    </>
  ),
  'mon-chay': (
    <>
      <path d="M7 25C7 14 14 7 26 6c0 12-6 19-17 19Z" fill={HERB} {...S} />
      <path d="M7 25 18 14" {...S} stroke={CREAM} />
    </>
  ),
  'an-vat': (
    <>
      <path d="M7 27 25 5" {...S} />
      <circle cx="13" cy="19.6" r="3.4" fill={MANGO} {...S} />
      <circle cx="18" cy="13.6" r="3.4" fill={PINK} {...S} />
      <circle cx="23" cy="7.6" r="2.6" fill={HERB} {...S} />
    </>
  ),
};

export function FoodIcon({ slug, size = 32 }: { slug: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" fill="none">
      {ICONS[slug] ?? ICONS.pho}
    </svg>
  );
}
