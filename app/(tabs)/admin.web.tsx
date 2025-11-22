import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';

const sampleCenter: [number, number] = [28.7041, 77.1025]; // Delhi as example

const policeStations = [
  { id: 1, pos: [28.705, 77.105], label: 'Station A' },
  { id: 2, pos: [28.7035, 77.098], label: 'Station B' },
];

const crowdSpots = [
  { id: 'c1', pos: [28.706, 77.101], intensity: 0.8 },
  { id: 'c2', pos: [28.702, 77.106], intensity: 0.5 },
  { id: 'c3', pos: [28.699, 77.100], intensity: 0.3 },
];

// Note: Leaflet is dynamically imported inside `useEffect` to avoid server-side
// bundling errors. Any Leaflet-specific setup (icons, layers) runs after the
// dynamic import so `window` and `document` exist.

export default function AdminWeb() {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any | null>(null);
  const [showPolice, setShowPolice] = useState(true);
  const [showCrowd, setShowCrowd] = useState(true);

  useEffect(() => {
    document.title = 'Admin Dashboard — WomenSafetyApp';

    // Don't run on server / during bundling. Dynamically import leaflet and inject CSS only on client.
    if (typeof window === 'undefined' || !mapRef.current) return;

    let mounted = true;
    (async () => {
      // inject Leaflet CSS from CDN to avoid bundler trying to resolve local url() imports
      if (!document.querySelector('link[data-leaflet]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.dataset.leaflet = '1';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const mod = await import('leaflet');
      const L = (mod && (mod as any).default) || mod;

      // Fix default icon URLs for webpack environment (CDN-hosted images)
      try {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl:
            'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });
      } catch (e) {
        // ignore icon setup failures
      }

      if (!mounted || !mapRef.current) return;

      // create map
      const map = L.map(mapRef.current, { preferCanvas: true }).setView(sampleCenter as any, 13);
      leafletMapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // create layer groups so we can toggle easily
      const policeLayer = L.layerGroup();
      policeStations.forEach((p) => {
        L.marker(p.pos as any).bindPopup(p.label).addTo(policeLayer);
      });

      const crowdLayer = L.layerGroup();
      crowdSpots.forEach((c) => {
        L.circle(c.pos as any, { radius: 200 * c.intensity, color: c.intensity > 0.6 ? '#e33' : c.intensity > 0.4 ? '#f39' : '#f9c', fillOpacity: 0.25 }).addTo(crowdLayer);
      });

      if (showPolice) policeLayer.addTo(map);
      if (showCrowd) crowdLayer.addTo(map);

      // store layers on map object for toggling later
      (map as any)._internalLayers = { policeLayer, crowdLayer };

    })();

    return () => {
      mounted = false;
      const map = leafletMapRef.current;
      if (map) {
        map.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Toggle layers when flags change
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;
    const { policeLayer, crowdLayer } = (map as any)._internalLayers || {};
    if (policeLayer) {
      showPolice ? policeLayer.addTo(map) : policeLayer.remove();
    }
    if (crowdLayer) {
      showCrowd ? crowdLayer.addTo(map) : crowdLayer.remove();
    }
  }, [showPolice, showCrowd]);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: '#e0404f', color: 'white', padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.12)', borderRadius: 6 }} />
          <h1 style={{ margin: 0, fontSize: 22 }}>Admin Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => router.push('/login')}
            style={{ background: 'rgba(255,255,255,0.18)', border: 'none', padding: '8px 14px', borderRadius: 8, color: 'white', cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      </header>

      <main style={{ padding: 20, flex: 1, overflow: 'auto' }}>
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>
          <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
            <div style={{ width: '100%', height: '65vh' }}>
              <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 16, borderRadius: 12, background: 'white', boxShadow: '0 6px 18px rgba(0,0,0,0.06)' }}>
              <h3 style={{ marginTop: 0 }}>Live Crowd Analytics</h3>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>High Density Areas: <strong>5</strong></li>
                <li>Medium Density Areas: <strong>8</strong></li>
                <li>Police Coverage: <strong>85%</strong></li>
                <li>Last Updated: <strong>Just now</strong></li>
              </ul>
            </div>

            <div style={{ padding: 16, borderRadius: 12, background: 'white', boxShadow: '0 6px 18px rgba(0,0,0,0.06)' }}>
              <h3 style={{ marginTop: 0 }}>Controls</h3>
              <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" checked={showPolice} onChange={() => setShowPolice((s) => !s)} />
                  Show Police Stations
                </label>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" checked={showCrowd} onChange={() => setShowCrowd((s) => !s)} />
                  Show Crowd Density
                </label>

                <button style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8, border: 'none', background: '#e0404f', color: 'white', cursor: 'pointer' }} onClick={() => alert('Manual refresh (placeholder)')}>Refresh Data</button>
              </div>
            </div>

            <div style={{ padding: 16, borderRadius: 12, background: 'white', boxShadow: '0 6px 18px rgba(0,0,0,0.06)' }}>
              <h3 style={{ marginTop: 0 }}>Recent Events</h3>
              <ol style={{ paddingLeft: 18, margin: 0 }}>
                <li>Suspicious activity reported near Station A — <small>10m ago</small></li>
                <li>Large gathering dispersed — <small>42m ago</small></li>
                <li>New camera installed — <small>1d ago</small></li>
              </ol>
            </div>
          </aside>
        </section>

        <section style={{ marginTop: 20 }}>
          <div style={{ padding: 16, borderRadius: 12, background: 'white', boxShadow: '0 6px 18px rgba(0,0,0,0.04)' }}>
            <h3 style={{ marginTop: 0 }}>Map Legend</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 14, height: 14, background: '#e33', borderRadius: 4 }} /> <span>High crowd intensity</span>
              <div style={{ width: 14, height: 14, background: '#f39', borderRadius: 4, marginLeft: 12 }} /> <span>Medium crowd intensity</span>
              <div style={{ width: 14, height: 14, background: '#4aa3ff', borderRadius: 4, marginLeft: 12 }} /> <span>Police station</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
