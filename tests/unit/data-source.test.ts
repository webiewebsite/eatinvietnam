import { describe, expect, it } from 'vitest';
import { dataSourceKind } from '@/lib/data/source';
import { countAll, getCardsBySlugs, listIndex, listSlugs, topForDish } from '@/lib/restaurants';

describe('data source selection (#6)', () => {
  it('reads the database whenever DATABASE_URL is set', () => {
    expect(dataSourceKind({} as NodeJS.ProcessEnv)).toBe('demo');
    expect(dataSourceKind({ DATABASE_URL: 'mysql://u:p@h/db' } as NodeJS.ProcessEnv)).toBe('db');
  });

  it('DATA_SOURCE=demo forces demo data even with a database', () => {
    expect(dataSourceKind({ DATABASE_URL: 'mysql://u:p@h/db', DATA_SOURCE: 'demo' } as NodeJS.ProcessEnv)).toBe('demo');
  });
});

describe('read layer contract (demo source)', () => {
  it('returns cards in the requested order and drops unknown slugs', async () => {
    const cards = await getCardsBySlugs(['che-co-sau', 'khong-co', 'bun-bo-hue-o-xuan']);
    expect(cards.map((c) => c.slug)).toEqual(['che-co-sau', 'bun-bo-hue-o-xuan']);
  });

  it('index agrees with slugs, counts and dish pages', async () => {
    const [index, slugs, total] = await Promise.all([listIndex(), listSlugs(), countAll()]);
    expect(index.map((r) => r.slug)).toEqual(slugs);
    expect(index).toHaveLength(total);
    const bunBo = index.filter((r) => r.dishes.includes('bun-bo')).length;
    expect((await topForDish('bun-bo')).length).toBe(bunBo);
  });
});
