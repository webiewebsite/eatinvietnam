import { AppHeader } from '@/components/AppHeader';
import { RestaurantCard } from '@/components/RestaurantCard';
import { SearchBar } from '@/components/SearchBar';
import { CategoryRail } from '@/components/home/CategoryRail';
import { CityMode } from '@/components/home/CityMode';
import { ModeSwitch, type Mode } from '@/components/home/ModeSwitch';
import { PromoCarousel } from '@/components/home/PromoCarousel';
import { TimeSuggest } from '@/components/home/TimeSuggest';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { currentDate } from '@/lib/hours';
import { countOpen, lateNight, nearby, toCard } from '@/lib/restaurants';
import home from '@content/home.json';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function HomePage({ searchParams }: Props) {
  const sp = await searchParams;
  const mode: Mode = sp['che-do'] === 'khap-viet-nam' ? 'city' : 'near';
  const now = currentDate();

  return (
    <>
      <div className="flex flex-col gap-3 pb-1">
        <AppHeader />
        <ModeSwitch mode={mode} />
        <SearchBar mode={mode} variant="home" />
      </div>

      <div id="home-mode-panel" role="tabpanel" className="mt-5">
        {mode === 'near' ? <NearMode now={now} /> : <CityMode cities={home.cities} route={home.foodRoute} regional={home.regional} />}
      </div>
    </>
  );
}

function NearMode({ now }: { now: Date }) {
  const near = nearby(undefined, 8, now).map(toCard);
  const late = lateNight(undefined, 4, now).map(toCard);

  return (
    <div className="flex flex-col gap-6">
      <CategoryRail />
      <PromoCarousel slides={home.promos.slice(0, 3)} openCount={countOpen(now)} />
      <TimeSuggest now={now} />

      <section aria-labelledby="near">
        <SectionHeader id="near" title="Quán ruột gần bạn" href="/tim-kiem?r=2" />
        <ul className="snap-rail -mx-4 mt-2 gap-3 px-4">
          {near.map((c) => (
            <li key={c.slug}>
              <RestaurantCard card={c} variant="rail" />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="late">
        <SectionHeader id="late" title="Ăn khuya quanh đây" href="/ban-do?khuya=1" linkLabel="Trên bản đồ" />
        {late.length ? (
          <ul className="mt-1 divide-y divide-line">
            {late.map((c) => (
              <li key={c.slug}>
                <RestaurantCard card={c} variant="row" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-meta text-muted">Chưa có quán mở khuya gần đây.</p>
        )}
      </section>
    </div>
  );
}
