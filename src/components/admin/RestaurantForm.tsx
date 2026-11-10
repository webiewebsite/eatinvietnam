'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { googleMapsLink, inHcmc, parseCoords } from '@/lib/admin/coords';
import { parseMenuPaste } from '@/lib/admin/menu-paste';
import { RestaurantInput, VIBE_DEFS, firstIssue, type RestaurantInputT } from '@/lib/admin/schemas';
import { DISHES } from '@/lib/taxonomy';
import { adminFetch } from './api';
import { Button, Card, Field, Notice, inputClass, textareaClass } from './ui';

const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const VENUE_TYPES = ['Quán vỉa hè', 'Quán gia đình', 'Xe đẩy', 'Nhà hàng', 'Quán cà phê', 'Quán nhậu', 'Tiệm bánh'];

export interface FormPhoto {
  id: number;
  alt: string;
  preview: string | null;
}

export interface AreaOption {
  slug: string;
  name: string;
}

/** Numbers typed progressively ("10.") stay strings until save. */
interface Draft extends Omit<RestaurantInputT, 'lat' | 'lng' | 'ratingAvg'> {
  lat: string;
  lng: string;
  ratingAvg: string;
}

const toDraft = (r: RestaurantInputT): Draft => ({
  ...r,
  lat: Number.isFinite(r.lat) ? String(r.lat) : '',
  lng: Number.isFinite(r.lng) ? String(r.lng) : '',
  ratingAvg: r.ratingAvg == null ? '' : String(r.ratingAvg),
});

const toPayload = (d: Draft) => ({
  ...d,
  lat: d.lat.trim() === '' ? NaN : Number(d.lat.replace(',', '.')),
  lng: d.lng.trim() === '' ? NaN : Number(d.lng.replace(',', '.')),
  ratingAvg: d.ratingAvg.trim() === '' ? null : Number(d.ratingAvg.replace(',', '.')),
});

const lines = (v: string[]) => v.join('\n');
const fromLines = (s: string) =>
  s
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);

const intOrNull = (s: string) => (s.trim() === '' ? null : Math.round(Number(s.replace(/[^\d]/g, ''))));

export function RestaurantForm({
  id,
  initial,
  districts,
  wards,
  photos,
  locked,
  slug,
  aside,
  prefillSlot,
}: {
  id: number | null;
  initial: RestaurantInputT;
  districts: AreaOption[];
  wards: string[];
  photos: FormPhoto[];
  locked: boolean;
  slug: string | null;
  /** Rendered next to the form (status, photos) with the dirty flag. */
  aside?: (dirty: boolean) => React.ReactNode;
  /** Top of a new restaurant (OSM suggestions, #30): receives a setter for prefilled fields. */
  prefillSlot?: (apply: (p: Partial<Pick<Draft, 'name' | 'address' | 'lat' | 'lng' | 'phone' | 'source'>>) => void) => React.ReactNode;
}) {
  const router = useRouter();
  const start = useMemo(() => toDraft(initial), [initial]);
  const [d, setD] = useState<Draft>(start);
  const [saved, setSaved] = useState(JSON.stringify(start));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [paste, setPaste] = useState('');
  const [menuPaste, setMenuPaste] = useState('');
  const dirty = JSON.stringify(d) !== saved;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setOk(null);
    setD((x) => ({ ...x, [k]: v }));
  };

  const coords = (() => {
    const lat = Number(d.lat.replace(',', '.'));
    const lng = Number(d.lng.replace(',', '.'));
    return d.lat && d.lng && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  })();

  async function save() {
    setError(null);
    setOk(null);
    const parsed = RestaurantInput.safeParse(toPayload(d));
    if (!parsed.success) {
      setError(firstIssue(parsed.error));
      return;
    }
    setBusy(true);
    try {
      const res = await adminFetch<{ id: number; slug: string }>(id ? `/api/admin/restaurants/${id}` : '/api/admin/restaurants', {
        method: id ? 'PUT' : 'POST',
        json: parsed.data,
      });
      setSaved(JSON.stringify(d));
      if (!id) {
        router.push(`/admin/quan/${res.id}?moi=1`);
        return;
      }
      setOk('Đã lưu.');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const toggleDish = (slug: string) => {
    const has = d.dishes.includes(slug);
    const dishes = has ? d.dishes.filter((x) => x !== slug) : [...d.dishes, slug];
    setD((x) => ({
      ...x,
      dishes,
      primaryDish: has && x.primaryDish === slug ? (dishes[0] ?? null) : (x.primaryDish ?? (has ? null : slug)),
    }));
  };

  const vibe = (slug: string) => d.vibes.find((v) => v.slug === slug)?.checked ?? [false, false, false];
  const setVibe = (slug: string, i: number, on: boolean) => {
    const checked = [...vibe(slug)];
    checked[i] = on;
    const rest = d.vibes.filter((v) => v.slug !== slug);
    set('vibes', checked.some(Boolean) ? [...rest, { slug: slug as Draft['vibes'][number]['slug'], checked }] : rest);
  };

  const slots = (day: number) => d.hours.map((h, i) => ({ ...h, i })).filter((h) => h.day === day);
  const setSlot = (i: number, k: 'open' | 'close', v: string) => set('hours', d.hours.map((h, j) => (j === i ? { ...h, [k]: v } : h)));
  const addSlot = (day: number) => set('hours', [...d.hours, { day, open: '06:00', close: '21:00' }]);
  const removeSlot = (i: number) => set('hours', d.hours.filter((_, j) => j !== i));
  const copyMonday = () => {
    const mon = d.hours.filter((h) => h.day === 1);
    set('hours', [0, 1, 2, 3, 4, 5, 6].flatMap((day) => mon.map((h) => ({ ...h, day }))));
  };

  const setItem = (i: number, patch: Partial<Draft['menu'][number]>) => set('menu', d.menu.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  const moveItem = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= d.menu.length) return;
    const menu = [...d.menu];
    [menu[i], menu[j]] = [menu[j]!, menu[i]!];
    set('menu', menu);
  };

  const outside = coords && !inHcmc(coords);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="flex flex-col gap-4">
        {prefillSlot?.((p) => setD((x) => ({ ...x, ...Object.fromEntries(Object.entries(p).filter(([, v]) => v != null && v !== '')) })))}

        <Card title="Thông tin" id="thong-tin">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tên quán *" className="sm:col-span-2">
              <input value={d.name} onChange={(e) => set('name', e.target.value)} maxLength={160} className={inputClass} />
            </Field>
            <Field label="Loại quán *">
              <input value={d.venueType} onChange={(e) => set('venueType', e.target.value)} list="venue-types" maxLength={60} className={inputClass} />
              <datalist id="venue-types">
                {VENUE_TYPES.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </Field>
            <Field
              label="Slug (đường dẫn)"
              hint={locked ? 'Đã khóa vì quán từng được xác minh (link đã chia sẻ).' : 'Để trống: tự tạo từ tên quán.'}
            >
              <input
                value={locked ? (slug ?? '') : (d.slug ?? '')}
                onChange={(e) => set('slug', e.target.value.toLowerCase())}
                disabled={locked}
                placeholder="bun-bo-co-ba"
                className={inputClass}
              />
            </Field>
            <Field label="Địa chỉ *" className="sm:col-span-2" hint="Số nhà, đường, phường mới. Ghi đúng như biển quán / Google Maps.">
              <input value={d.address} onChange={(e) => set('address', e.target.value)} maxLength={255} className={inputClass} />
            </Field>
            <Field label="Quận (cũ) *" hint="Người dùng vẫn tìm theo quận cũ.">
              <select value={d.district} onChange={(e) => set('district', e.target.value)} className={inputClass}>
                <option value="">Chọn quận</option>
                {districts.map((a) => (
                  <option key={a.slug} value={a.slug}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Phường (mới)" hint="Theo địa giới từ 01/07/2025.">
              <input value={d.ward ?? ''} onChange={(e) => set('ward', e.target.value)} list="wards" maxLength={120} placeholder="Phường Bến Thành" className={inputClass} />
              <datalist id="wards">
                {wards.map((w) => (
                  <option key={w} value={w} />
                ))}
              </datalist>
            </Field>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Field label="Dán tọa độ hoặc link Google Maps / OpenStreetMap" hint="Ví dụ 10.7769, 106.7009 — hoặc link chia sẻ địa điểm.">
                <div className="flex gap-2">
                  <input value={paste} onChange={(e) => setPaste(e.target.value)} className={inputClass} placeholder="https://maps.app.goo.gl/… hoặc 10.77, 106.70" />
                  <Button
                    onClick={() => {
                      const c = parseCoords(paste);
                      if (!c) {
                        setError('Không đọc được tọa độ. Link rút gọn (maps.app.goo.gl) cần mở ra rồi copy link đầy đủ, hoặc copy cặp số tọa độ.');
                        return;
                      }
                      setError(null);
                      setD((x) => ({ ...x, lat: String(c.lat), lng: String(c.lng) }));
                      setPaste('');
                    }}
                  >
                    Đọc
                  </Button>
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Vĩ độ (lat) *">
                  <input value={d.lat} onChange={(e) => set('lat', e.target.value)} inputMode="decimal" className={inputClass} />
                </Field>
                <Field label="Kinh độ (lng) *">
                  <input value={d.lng} onChange={(e) => set('lng', e.target.value)} inputMode="decimal" className={inputClass} />
                </Field>
              </div>
              {coords && (
                <p className="text-[13px]">
                  <a href={googleMapsLink(coords)} target="_blank" rel="noreferrer" className="font-semibold text-thanhlong underline">
                    Kiểm tra vị trí trên Google Maps ↗
                  </a>
                  {outside && <span className="ml-2 text-danger">Điểm này nằm ngoài TP.HCM — kiểm tra lại.</span>}
                </p>
              )}
            </div>
            <Field label="Giá thấp nhất / người (đ)">
              <input value={d.priceMin ?? ''} onChange={(e) => set('priceMin', intOrNull(e.target.value))} inputMode="numeric" placeholder="35000" className={inputClass} />
            </Field>
            <Field label="Giá cao nhất / người (đ)" hint='Dùng cho bộ lọc "Dưới 50k".'>
              <input value={d.priceMax ?? ''} onChange={(e) => set('priceMax', intOrNull(e.target.value))} inputMode="numeric" placeholder="65000" className={inputClass} />
            </Field>
            <Field label="Số điện thoại">
              <input value={d.phone ?? ''} onChange={(e) => set('phone', e.target.value)} inputMode="tel" maxLength={20} className={inputClass} />
            </Field>
            <Field label="Giờ đông khách" hint="Ví dụ: đông 7–8h30">
              <input value={d.busyHint ?? ''} onChange={(e) => set('busyHint', e.target.value)} maxLength={60} className={inputClass} />
            </Field>
            <Field label="Điểm nổi bật" className="sm:col-span-2" hint="Một câu, hiện trên thẻ quán. Ví dụ: Nước dùng đậm sả, chả cua tự làm">
              <input value={d.highlight} onChange={(e) => set('highlight', e.target.value)} maxLength={160} className={inputClass} />
            </Field>
            <Field label="Mẹo của biên tập" className="sm:col-span-2">
              <textarea value={d.tip ?? ''} onChange={(e) => set('tip', e.target.value)} maxLength={255} className={textareaClass} />
            </Field>
            <Field label="Link GrabFood" hint="https://…">
              <input value={d.grabUrl ?? ''} onChange={(e) => set('grabUrl', e.target.value)} inputMode="url" className={inputClass} />
            </Field>
            <Field label="Link ShopeeFood" hint="https://…">
              <input value={d.shopeeUrl ?? ''} onChange={(e) => set('shopeeUrl', e.target.value)} inputMode="url" className={inputClass} />
            </Field>
            <Field label="Điểm biên tập (0–5)" hint="Thay cho đánh giá người dùng tới giai đoạn 2.">
              <input value={d.ratingAvg} onChange={(e) => set('ratingAvg', e.target.value)} inputMode="decimal" placeholder="4.5" className={inputClass} />
            </Field>
            <Field label="Số lượt tính điểm">
              <input value={d.ratingCount} onChange={(e) => set('ratingCount', intOrNull(e.target.value) ?? 0)} inputMode="numeric" className={inputClass} />
            </Field>
            <label className="flex min-h-11 items-center gap-2 text-[14px] font-semibold sm:col-span-2">
              <input type="checkbox" checked={d.editorPick} onChange={(e) => set('editorPick', e.target.checked)} className="size-5 accent-thanhlong" />
              Biên tập chọn (&quot;Quán ruột&quot;, xếp trước khi chưa có vị trí)
            </label>
          </div>
        </Card>

        <Card title="Món & đặc điểm" id="mon">
          <p className="mb-2 text-[13px] text-muted">Chọn các món quán bán (tối đa 6). Bấm ★ để đặt món chính (hiện trên ghim bản đồ).</p>
          <ul className="flex flex-wrap gap-2">
            {DISHES.map((dish) => {
              const on = d.dishes.includes(dish.slug);
              const primary = d.primaryDish === dish.slug;
              return (
                <li key={dish.slug} className="flex">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDish(dish.slug)}
                    className={`min-h-11 rounded-l-full border px-3 text-[14px] font-semibold ${on ? 'border-ink bg-ink text-bg' : 'border-line bg-surface'} ${on ? '' : 'rounded-r-full'}`}
                  >
                    {dish.label}
                  </button>
                  {on && (
                    <button
                      type="button"
                      aria-label={`Đặt ${dish.label} làm món chính`}
                      aria-pressed={primary}
                      onClick={() => set('primaryDish', dish.slug)}
                      className={`min-h-11 rounded-r-full border border-l-0 border-ink px-2.5 text-[15px] ${primary ? 'bg-xoai text-on-xoai' : 'bg-ink text-bg/60'}`}
                    >
                      ★
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Đặc điểm (mỗi dòng một ý)" hint="Hiện thành chip: Nước dùng đậm, Giá hợp lý…">
              <textarea value={lines(d.features)} onChange={(e) => set('features', fromLines(e.target.value))} className={textareaClass} rows={4} />
            </Field>
            <Field label="Tiện ích (mỗi dòng một ý)" hint="Có máy lạnh, Có chỗ gửi xe máy…">
              <textarea value={lines(d.amenities)} onChange={(e) => set('amenities', fromLines(e.target.value))} className={textareaClass} rows={4} />
            </Field>
          </div>
        </Card>

        <Card title="Tag biên tập" id="tag">
          <p className="mb-3 text-[13px] text-muted">Chỉ gắn tag khi quán đạt đủ cả 3 điều kiện. Tick từng điều kiện bạn đã kiểm tra tại quán.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {VIBE_DEFS.map((v) => {
              const checked = vibe(v.slug);
              const all = checked.every(Boolean);
              return (
                <fieldset key={v.slug} className={`rounded-input border p-3 ${all ? 'border-raurau bg-raurau-soft' : 'border-line'}`}>
                  <legend className="px-1 text-[14px] font-bold">
                    {v.label} {all ? '· đã gắn' : checked.some(Boolean) ? '· chưa đủ điều kiện' : ''}
                  </legend>
                  {v.criteria.map((c, i) => (
                    <label key={c} className="flex min-h-10 items-start gap-2 py-1 text-[13px]">
                      <input type="checkbox" checked={checked[i]} onChange={(e) => setVibe(v.slug, i, e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-raurau" />
                      {c}
                    </label>
                  ))}
                </fieldset>
              );
            })}
          </div>
        </Card>

        <Card
          title="Giờ mở cửa"
          id="gio-mo"
          actions={
            <Button onClick={copyMonday} disabled={!slots(1).length}>
              Chép T2 cho cả tuần
            </Button>
          }
        >
          <p className="mb-2 text-[13px] text-muted">Mỗi ngày tối đa 4 khung. Giờ đóng nhỏ hơn giờ mở nghĩa là mở qua nửa đêm (ví dụ 17:00–02:00).</p>
          <ul className="divide-y divide-line">
            {DAY_ORDER.map((day) => (
              <li key={day} className="flex flex-wrap items-center gap-2 py-2">
                <span className="w-8 text-[14px] font-bold">{DAYS[day]}</span>
                {slots(day).length === 0 && <span className="text-[13px] text-muted">Nghỉ</span>}
                {slots(day).map((s) => (
                  <span key={s.i} className="flex items-center gap-1">
                    <input type="time" value={s.open} onChange={(e) => setSlot(s.i, 'open', e.target.value)} className={`${inputClass} w-[7.2rem]`} aria-label={`${DAYS[day]} mở`} />
                    <span aria-hidden>–</span>
                    <input type="time" value={s.close} onChange={(e) => setSlot(s.i, 'close', e.target.value)} className={`${inputClass} w-[7.2rem]`} aria-label={`${DAYS[day]} đóng`} />
                    <Button tone="ghost" aria-label="Bỏ khung giờ" onClick={() => removeSlot(s.i)} className="px-2">
                      ✕
                    </Button>
                  </span>
                ))}
                {slots(day).length < 4 && (
                  <Button tone="ghost" onClick={() => addSlot(day)} className="px-2 text-thanhlong">
                    + khung
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card title={`Thực đơn (${d.menu.length})`} id="thuc-don">
          <ul className="flex flex-col gap-2">
            {d.menu.map((m, i) => (
              <li key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-input border border-line p-2 sm:grid-cols-[140px_1fr_110px_auto]">
                <input value={m.group} onChange={(e) => setItem(i, { group: e.target.value })} placeholder="Nhóm" aria-label="Nhóm món" className={`${inputClass} col-span-2 sm:col-span-1`} />
                <input value={m.name} onChange={(e) => setItem(i, { name: e.target.value })} placeholder="Tên món" aria-label="Tên món" className={inputClass} />
                <input
                  value={m.price}
                  onChange={(e) => setItem(i, { price: intOrNull(e.target.value) ?? 0 })}
                  inputMode="numeric"
                  aria-label="Giá"
                  className={`${inputClass} col-start-1 sm:col-start-auto`}
                />
                <span className="row-span-1 flex items-center gap-0.5">
                  <Button tone="ghost" className="px-2" aria-label="Lên" onClick={() => moveItem(i, -1)}>
                    ↑
                  </Button>
                  <Button tone="ghost" className="px-2" aria-label="Xuống" onClick={() => moveItem(i, 1)}>
                    ↓
                  </Button>
                  <Button tone="ghost" className="px-2 text-danger" aria-label="Xóa món" onClick={() => set('menu', d.menu.filter((_, j) => j !== i))}>
                    ✕
                  </Button>
                </span>
                <input value={m.desc ?? ''} onChange={(e) => setItem(i, { desc: e.target.value })} placeholder="Mô tả (không bắt buộc)" aria-label="Mô tả" className={`${inputClass} col-span-2 sm:col-span-2`} />
                <label className="flex min-h-11 items-center gap-2 text-[13px]">
                  <input type="checkbox" checked={m.mustTry} onChange={(e) => setItem(i, { mustTry: e.target.checked })} className="size-5 accent-xoai" /> Đáng thử
                </label>
                {photos.length > 0 && (
                  <select
                    value={m.photoId ?? ''}
                    onChange={(e) => setItem(i, { photoId: e.target.value ? Number(e.target.value) : null })}
                    aria-label="Ảnh món"
                    className={`${inputClass} col-span-2 sm:col-span-1`}
                  >
                    <option value="">Không ảnh</option>
                    {photos.map((p) => (
                      <option key={p.id} value={p.id}>
                        Ảnh: {p.alt.slice(0, 40)}
                      </option>
                    ))}
                  </select>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-2">
            <Button
              onClick={() => set('menu', [...d.menu, { group: d.menu[d.menu.length - 1]?.group ?? 'Món chính', name: '', desc: null, price: 0, mustTry: false, photoId: null }])}
              className="self-start"
            >
              + Thêm món
            </Button>
            <details className="rounded-input border border-line p-2">
              <summary className="min-h-10 cursor-pointer py-2 text-[14px] font-semibold">Dán nhiều món từ file mẫu</summary>
              <p className="text-[12px] text-muted">Mỗi dòng một món: Nhóm | Tên món | Giá | Mô tả (copy từ Excel cũng được). Giá có thể ghi 45000 hoặc 45k.</p>
              <textarea value={menuPaste} onChange={(e) => setMenuPaste(e.target.value)} rows={5} className={`${textareaClass} mt-2 font-mono text-[13px]`} />
              <Button
                className="mt-2"
                onClick={() => {
                  const items = parseMenuPaste(menuPaste);
                  if (!items.length) {
                    setError('Không đọc được món nào. Mỗi dòng cần ít nhất tên món và giá.');
                    return;
                  }
                  set('menu', [...d.menu, ...items]);
                  setMenuPaste('');
                  setOk(`Đã thêm ${items.length} món — nhớ bấm Lưu.`);
                }}
              >
                Thêm vào thực đơn
              </Button>
            </details>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-28">
        {/* Mobile: pinned to the bottom of the screen; desktop: top of the side column. */}
        <div className="fixed inset-x-3 bottom-3 z-30 flex flex-col gap-2 rounded-card border border-line bg-surface p-3 shadow-card lg:static lg:inset-auto lg:z-auto">
          {error && <Notice tone="error">{error}</Notice>}
          {ok && !dirty && <Notice tone="ok">{ok}</Notice>}
          <Button tone="primary" onClick={() => void save()} disabled={busy || (!dirty && !!id)}>
            {busy ? 'Đang lưu…' : id ? (dirty ? 'Lưu thay đổi' : 'Đã lưu') : 'Tạo quán (nháp)'}
          </Button>
          {dirty && id && <p className="text-center text-[12px] text-muted">Có thay đổi chưa lưu</p>}
        </div>
        {aside?.(dirty)}
      </div>
    </div>
  );
}
