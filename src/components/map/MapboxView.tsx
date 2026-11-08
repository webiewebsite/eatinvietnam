'use client';

import { useEffect, useImperativeHandle, useRef } from 'react';
import mapboxgl, { type Map as MapboxMap, type Marker } from 'mapbox-gl';
import type { MapViewProps } from '@/components/map/types';
import { DEFAULT_CENTER } from '@/lib/geo';

/**
 * Mapbox GL view. Loaded only via next/dynamic on /ban-do (never on Home).
 * Pins are DOM markers styled like <MapPin>; selection is synced by class toggles.
 */
/**
 * Mapbox CSS is loaded from Mapbox's CDN (version-matched) instead of being bundled:
 * importing it made Turbopack panic on Hostinger's build machine.
 */
function ensureMapboxCss() {
  const id = 'mapbox-gl-css';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://api.mapbox.com/mapbox-gl-js/v${mapboxgl.version}/mapbox-gl.css`;
  document.head.appendChild(link);
}

export default function MapboxView({ ref, cards, selected, onSelect, user, onMoved }: MapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const markers = useRef(new Map<string, { marker: Marker; el: HTMLButtonElement }>());
  const userMarker = useRef<Marker | null>(null);
  const callbacks = useRef({ onSelect, onMoved });

  useEffect(() => {
    callbacks.current = { onSelect, onMoved };
  });

  useImperativeHandle(ref, () => ({
    getBounds: () => {
      const b = map.current?.getBounds();
      if (!b) return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
      return { minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast() };
    },
  }));

  // Create the map once.
  useEffect(() => {
    if (!container.current) return;
    ensureMapboxCss();
    const m = new mapboxgl.Map({
      container: container.current,
      accessToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
      zoom: 14,
      attributionControl: true,
      cooperativeGestures: false,
      language: 'vi',
    });
    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    m.on('dragend', () => callbacks.current.onMoved());
    m.on('zoomend', (e) => {
      if ((e as { originalEvent?: unknown }).originalEvent) callbacks.current.onMoved();
    });
    map.current = m;
    const store = markers.current;
    return () => {
      store.clear();
      m.remove();
      map.current = null;
    };
  }, []);

  // Sync markers with cards.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const store = markers.current;
    const keep = new Set(cards.map((c) => c.slug));
    for (const [slug, { marker }] of store) {
      if (!keep.has(slug)) {
        marker.remove();
        store.delete(slug);
      }
    }
    for (const c of cards) {
      if (store.has(c.slug)) continue;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'eiv-pin';
      el.textContent = c.dishLabel;
      el.setAttribute('aria-label', `${c.name}, ${c.dishLabel}`);
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        callbacks.current.onSelect(c.slug);
      });
      const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([c.lng, c.lat]).addTo(m);
      store.set(c.slug, { marker, el });
    }
    if (cards.length > 1) {
      const b = new mapboxgl.LngLatBounds();
      cards.forEach((c) => b.extend([c.lng, c.lat]));
      m.fitBounds(b, { padding: { top: 120, bottom: 160, left: 40, right: 40 }, maxZoom: 15, duration: 0 });
    }
  }, [cards]);

  // Selection: enlarge pin, pan to it.
  useEffect(() => {
    for (const [slug, { el }] of markers.current) {
      const on = slug === selected;
      // z-index for the selected pin comes from CSS (.eiv-pin[aria-pressed='true']).
      el.setAttribute('aria-pressed', String(on));
    }
    const card = cards.find((c) => c.slug === selected);
    if (card) map.current?.easeTo({ center: [card.lng, card.lat], duration: 300 });
  }, [selected, cards]);

  // User location dot.
  useEffect(() => {
    const m = map.current;
    if (!m || !user) return;
    userMarker.current?.remove();
    const el = document.createElement('span');
    el.className = 'eiv-user-dot';
    el.setAttribute('aria-label', 'Vị trí của bạn');
    userMarker.current = new mapboxgl.Marker({ element: el }).setLngLat([user.lng, user.lat]).addTo(m);
  }, [user]);

  return <div ref={container} className="h-full w-full" />;
}
