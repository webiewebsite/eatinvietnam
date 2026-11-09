'use client';

import { useImperativeHandle, useMemo, useRef, useState } from 'react';
import { MapPin } from '@/components/map/MapPin';
import type { MapViewProps } from '@/components/map/types';
import type { BBox, LatLng } from '@/lib/geo';
import type { CardData } from '@/lib/cards';

// Pin layer inset inside the canvas (fractions of width/height) so edge pins stay visible.
const INSET = { top: 0.12, right: 0.1, bottom: 0.24, left: 0.1 };

/**
 * Token-less stand-in for Mapbox: stylised street canvas with pins placed by
 * equirectangular projection, drag-to-pan so "Tìm trong khu vực này" works.
 * Used when NEXT_PUBLIC_MAPBOX_TOKEN is not set.
 */
export function FallbackMap({ ref, cards, selected, onSelect, user, onMoved }: MapViewProps) {
  const bounds = useMemo(() => fitBounds(cards, user), [cards, user]);
  const box = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean } | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      getBounds: () => {
        const el = box.current;
        if (!el) return bounds;
        const w = el.clientWidth;
        const h = el.clientHeight;
        const wi = w * (1 - INSET.left - INSET.right);
        const hi = h * (1 - INSET.top - INSET.bottom);
        const x0 = w * INSET.left + offset.x;
        const y0 = h * INSET.top + offset.y;
        const dLng = bounds.maxLng - bounds.minLng;
        const dLat = bounds.maxLat - bounds.minLat;
        return {
          minLng: bounds.minLng + ((0 - x0) / wi) * dLng,
          maxLng: bounds.minLng + ((w - x0) / wi) * dLng,
          maxLat: bounds.maxLat - ((0 - y0) / hi) * dLat,
          minLat: bounds.maxLat - ((h - y0) / hi) * dLat,
        };
      },
    }),
    [bounds, offset],
  );

  const project = (p: LatLng) => ({
    left: `${((p.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100}%`,
    top: `${((bounds.maxLat - p.lat) / (bounds.maxLat - bounds.minLat)) * 100}%`,
  });

  return (
    <div
      ref={box}
      role="application"
      aria-label="Bản đồ quán (bản minh họa, kéo để di chuyển)"
      className="relative h-full w-full touch-none overflow-hidden bg-[#f3eadb] select-none"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y, moved: false };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
        setOffset({ x: d.ox + dx, y: d.oy + dy });
      }}
      onPointerUp={() => {
        if (drag.current?.moved) onMoved();
        drag.current = null;
      }}
    >
      <div className="absolute inset-[-50%]" style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
        <StreetArt />
      </div>
      <div
        className="absolute"
        style={{
          inset: `${INSET.top * 100}% ${INSET.right * 100}% ${INSET.bottom * 100}% ${INSET.left * 100}%`,
          transform: `translate(${offset.x}px, ${offset.y}px)`,
        }}
      >
        {user && (
          <span
            role="img"
            aria-label="Vị trí của bạn"
            className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-surface bg-vitri shadow-card"
            style={project(user)}
          />
        )}
        {cards.map((c) => (
          <div key={c.slug} className="absolute" style={{ ...project(c), zIndex: c.slug === selected ? 30 : 10 }}>
            <MapPin card={c} selected={c.slug === selected} onSelect={onSelect} />
          </div>
        ))}
      </div>
      <p className="absolute top-2 right-2 rounded-tag bg-surface/90 px-1.5 py-0.5 text-[10px] text-muted">
        Bản đồ minh họa
      </p>
    </div>
  );
}

function fitBounds(cards: CardData[], user: LatLng | null): BBox {
  const pts: LatLng[] = [...cards, ...(user ? [user] : [])];
  if (!pts.length) return { minLat: 10.755, maxLat: 10.79, minLng: 106.68, maxLng: 106.712 };
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const pad = 0.001;
  return {
    minLat: Math.min(...lats) - pad,
    maxLat: Math.max(...lats) + pad,
    minLng: Math.min(...lngs) - pad,
    maxLng: Math.max(...lngs) + pad,
  };
}

function StreetArt() {
  return (
    <svg className="h-full w-full" viewBox="0 0 400 400" preserveAspectRatio="none" aria-hidden>
      <path d="M400 230c-60 10-80 40-140 50s-90 40-120 120" stroke="#bcd6e6" strokeWidth="26" fill="none" />
      <g stroke="#ffffff" strokeLinecap="round" fill="none">
        <path strokeWidth="9" d="M0 120h400M0 260h300M140 0v400M260 0v240M0 340l200-120M200 0l200 150" />
        <path strokeWidth="4" d="M0 60h400M0 190h400M60 0v400M200 0v400M330 0v400M0 300l400-60M80 0l120 400" />
      </g>
      <g fill="#e2f0d9">
        <rect x="150" y="135" width="40" height="40" rx="6" />
        <rect x="280" y="70" width="34" height="28" rx="6" />
      </g>
    </svg>
  );
}
