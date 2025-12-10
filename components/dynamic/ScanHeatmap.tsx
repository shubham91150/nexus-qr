import React, { useEffect, useRef, useState } from 'react';
import { Map, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase, QRScan } from '../../lib/supabase';

interface ScanHeatmapProps {
  qrId: string;
  height?: string;
}

// Declare global L (Leaflet) type
declare global {
  interface Window {
    L: typeof import('leaflet');
  }
}

export const ScanHeatmap: React.FC<ScanHeatmapProps> = ({ qrId, height = '400px' }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scans, setScans] = useState<QRScan[]>([]);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Load Leaflet CSS and JS dynamically
  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    // Load CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    cssLink.crossOrigin = '';
    document.head.appendChild(cssLink);

    // Load JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.async = true;
    script.onload = () => {
      // Load heatmap plugin
      const heatScript = document.createElement('script');
      heatScript.src = 'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js';
      heatScript.async = true;
      heatScript.onload = () => setLeafletLoaded(true);
      heatScript.onerror = () => setError('Failed to load heatmap library');
      document.head.appendChild(heatScript);
    };
    script.onerror = () => setError('Failed to load map library');
    document.head.appendChild(script);

    return () => {
      // Cleanup is handled by React's lifecycle
    };
  }, []);

  // Fetch scan data with GPS coordinates
  const fetchScans = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('qr_scans')
        .select('*')
        .eq('qr_id', qrId)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('scanned_at', { ascending: false })
        .limit(1000);

      if (fetchError) throw fetchError;

      setScans(data || []);
    } catch (err) {
      console.error('Error fetching scan data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch scan data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScans();
  }, [qrId]);

  // Initialize map when Leaflet is loaded and we have data
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || loading) return;

    const L = window.L;
    if (!L) return;

    // Clean up existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Default center (India)
    let center: [number, number] = [20.5937, 78.9629];
    let zoom = 4;

    // Calculate center from data if available
    if (scans.length > 0) {
      const lats = scans.map(s => s.latitude!).filter(Boolean);
      const lngs = scans.map(s => s.longitude!).filter(Boolean);

      if (lats.length > 0 && lngs.length > 0) {
        const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
        center = [avgLat, avgLng];
        zoom = 10;
      }
    }

    // Create map
    const map = L.map(mapRef.current).setView(center, zoom);
    mapInstanceRef.current = map;

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add markers and heatmap data
    if (scans.length > 0) {
      const heatData: [number, number, number][] = [];
      const markers = L.layerGroup();

      scans.forEach((scan) => {
        if (scan.latitude && scan.longitude) {
          // Add to heatmap data (lat, lng, intensity)
          heatData.push([scan.latitude, scan.longitude, 0.5]);

          // Add marker with popup
          const marker = L.circleMarker([scan.latitude, scan.longitude], {
            radius: 6,
            fillColor: '#667eea',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          });

          const popupContent = `
            <div style="font-family: -apple-system, sans-serif; font-size: 12px;">
              <strong>Scan Details</strong><br/>
              <span style="color: #666;">Time:</span> ${new Date(scan.scanned_at).toLocaleString()}<br/>
              ${scan.city ? `<span style="color: #666;">City:</span> ${scan.city}<br/>` : ''}
              ${scan.country ? `<span style="color: #666;">Country:</span> ${scan.country}<br/>` : ''}
              ${scan.device_type ? `<span style="color: #666;">Device:</span> ${scan.device_type}<br/>` : ''}
              ${scan.accuracy ? `<span style="color: #666;">Accuracy:</span> ${Math.round(scan.accuracy)}m<br/>` : ''}
            </div>
          `;

          marker.bindPopup(popupContent);
          markers.addLayer(marker);
        }
      });

      markers.addTo(map);

      // Add heatmap layer if plugin loaded
      if ((L as unknown as { heat: (data: [number, number, number][]) => L.Layer }).heat) {
        const heat = (L as unknown as { heat: (data: [number, number, number][], options?: object) => L.Layer }).heat(heatData, {
          radius: 25,
          blur: 15,
          maxZoom: 17,
          gradient: {
            0.4: '#667eea',
            0.6: '#764ba2',
            0.8: '#f093fb',
            1.0: '#f5576c',
          },
        });
        heat.addTo(map);
      }

      // Fit bounds to show all markers
      if (heatData.length > 1) {
        const bounds = L.latLngBounds(heatData.map(d => [d[0], d[1]] as [number, number]));
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }

    // Handle resize
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded, scans, loading]);

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl p-4 flex items-center gap-3">
        <AlertCircle className="text-red-500" size={20} />
        <div className="flex-1">
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <button
          onClick={fetchScans}
          className="text-red-600 hover:text-red-700"
        >
          <RefreshCw size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Map size={18} className="text-indigo-600" />
          <h3 className="font-medium text-gray-900">Scan Location Heatmap</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {scans.length} location{scans.length !== 1 ? 's' : ''} tracked
          </span>
          <button
            onClick={fetchScans}
            disabled={loading}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div style={{ height }} className="relative">
        {loading && (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
            <div className="text-center">
              <Loader2 className="animate-spin mx-auto text-indigo-600 mb-2" size={24} />
              <p className="text-sm text-gray-500">Loading map data...</p>
            </div>
          </div>
        )}

        {!loading && scans.length === 0 && (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
            <div className="text-center px-4">
              <Map size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">No GPS data available yet</p>
              <p className="text-gray-400 text-xs mt-1">
                Enable GPS tracking and wait for scans
              </p>
            </div>
          </div>
        )}

        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      </div>

      {scans.length > 0 && (
        <div className="p-3 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Showing last {scans.length} tracked scans</span>
            <span>Click markers for details</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanHeatmap;
