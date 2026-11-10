/**
 * Dish icons (ops doc item 9): solid glyphs on a 24 px grid, coloured per dish from
 * content/taxonomy.json. Colours are passed as CSS variables so the light/dark switch
 * happens in CSS (.dish-tone in globals.css), never with hex in components.
 */
import { clsx } from 'clsx';
import { dishColor } from '@/lib/taxonomy';
import { FALLBACK_GLYPH, GLYPHS } from './glyphs';

const FG = 'var(--dish-fg, currentColor)';
const BG = 'var(--dish-bg, var(--surface))';

/** The bare glyph. Inside a .dish-tone element it takes the dish colours; elsewhere currentColor. */
export function FoodIcon({ slug, size = 30 }: { slug: string; size?: number }) {
  const parts = GLYPHS[slug] ?? FALLBACK_GLYPH;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      {parts.map((p, i) => {
        if ('fill' in p) return <path key={i} d={p.fill} fill={FG} />;
        if ('dot' in p) {
          const [cx, cy, r] = p.dot;
          return <circle key={i} cx={cx} cy={cy} r={r} fill={p.tone === 'bg' ? BG : FG} />;
        }
        const isCut = 'cut' in p;
        return (
          <path
            key={i}
            d={isCut ? p.cut : p.line}
            fill="none"
            stroke={isCut ? BG : FG}
            strokeWidth={p.w ?? (isCut ? 1.3 : 1.5)}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}

/** CSS variables for one dish, consumed by the .dish-tone class (light + dark). */
export function dishToneStyle(slug: string): React.CSSProperties {
  const c = dishColor(slug);
  if (!c) return {};
  return {
    '--dish-bg-l': c.bg,
    '--dish-fg-l': c.fg,
    '--dish-bg-d': c.bgDark,
    '--dish-fg-d': c.fgDark,
  } as React.CSSProperties;
}

/** Round badge: dish background + glyph at ~58% of the badge (52 → 30 px, the size the icons are drawn for). */
export function DishBadge({ slug, size = 52, className }: { slug: string; size?: number; className?: string }) {
  return (
    <span
      className={clsx('dish-tone grid shrink-0 place-items-center rounded-full', className)}
      style={{ ...dishToneStyle(slug), width: size, height: size }}
    >
      <FoodIcon slug={slug} size={Math.round(size * 0.58)} />
    </span>
  );
}
