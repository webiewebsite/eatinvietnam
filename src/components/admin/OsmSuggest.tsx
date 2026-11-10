'use client';

import { useState } from 'react';
import type { OsmSuggestion } from '@/lib/admin/osm';
import { adminFetch } from './api';
import { Button, Card, Notice, inputClass } from './ui';

export interface OsmPrefill {
  name: string;
  address: string;
  lat: string;
  lng: string;
  phone: string | null;
  source: 'osm';
}

/**
 * "Gợi ý từ OpenStreetMap" (#30). Searches only on submit (Nominatim forbids search-as-you-type),
 * fills name/address/coordinates/phone, and leaves everything else to the editor.
 */
export function OsmSuggest({ apply }: { apply: (p: OsmPrefill) => void }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<OsmSuggestion[] | null>(null);
  const [picked, setPicked] = useState<OsmSuggestion | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card title="Gợi ý từ OpenStreetMap">
      <form
        className="flex gap-2"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          setPicked(null);
          adminFetch<{ items: OsmSuggestion[] }>(`/api/admin/osm?q=${encodeURIComponent(q)}`)
            .then((r) => setItems(r.items))
            .catch((err: Error) => setError(err.message))
            .finally(() => setBusy(false));
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tên quán, có thể thêm tên đường"
          aria-label="Tìm trên OpenStreetMap"
          minLength={2}
          maxLength={120}
          className={inputClass}
        />
        <Button type="submit" disabled={busy || q.trim().length < 2}>
          {busy ? 'Đang tìm…' : 'Tìm'}
        </Button>
      </form>

      {error && (
        <div className="mt-2">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      {items && items.length === 0 && <p className="mt-2 text-[14px] text-muted">OSM không có kết quả. Nhập tay bên dưới.</p>}
      {items && items.length > 0 && (
        <ul className="mt-3 flex flex-col divide-y divide-line rounded-input border border-line">
          {items.map((s) => (
            <li key={s.osmUrl + s.lat} className="flex items-start gap-2 p-2.5">
              <div className="min-w-0 flex-1 text-[14px]">
                <p className="font-semibold">
                  {s.name} <span className="text-[12px] font-normal text-muted">· {s.kind}</span>
                </p>
                <p className="text-[13px] text-muted">{s.address}</p>
                {(s.openingHours || s.cuisine) && (
                  <p className="text-[12px] text-muted">
                    {s.cuisine && `Món: ${s.cuisine}`}
                    {s.cuisine && s.openingHours && ' · '}
                    {s.openingHours && `Giờ trên OSM: ${s.openingHours}`}
                  </p>
                )}
                <a href={s.osmUrl} target="_blank" rel="noreferrer" className="text-[12px] font-semibold text-thanhlong underline">
                  Xem trên OSM ↗
                </a>
              </div>
              <Button
                tone={picked === s ? 'primary' : 'secondary'}
                onClick={() => {
                  setPicked(s);
                  apply({ name: s.name, address: s.address, lat: String(s.lat), lng: String(s.lng), phone: s.phone, source: 'osm' });
                }}
              >
                {picked === s ? 'Đã điền' : 'Dùng'}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {picked && (
        <div className="mt-3">
          <Notice tone="warn">
            Đã điền tên, địa chỉ, tọa độ{picked.phone ? ', số điện thoại' : ''} từ OSM. Kiểm tra lại tại quán trước khi xác minh
            {picked.openingHours ? '; giờ mở trên OSM chỉ để tham khảo, hãy tự nhập ở mục Giờ mở cửa' : ''}.
          </Notice>
        </div>
      )}
      <p className="mt-3 text-[12px] text-muted">
        Dữ liệu gợi ý ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">
          OpenStreetMap contributors
        </a>
        , giấy phép ODbL. Chỉ dùng để gợi ý, không nhập hàng loạt.
      </p>
    </Card>
  );
}
