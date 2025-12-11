import React, { useEffect, useRef, useState } from 'react';
import { Map, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';

interface ScanHeatmapProps {
  qrId: string;
  height?: string;
}

interface CityData {
  city: string;
  country: string;
  count: number;
  lat?: number;
  lng?: number;
}

// City coordinates cache (major cities)
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // India
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'delhi': { lat: 28.6139, lng: 77.2090 },
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'bengaluru': { lat: 12.9716, lng: 77.5946 },
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'kolkata': { lat: 22.5726, lng: 88.3639 },
  'pune': { lat: 18.5204, lng: 73.8567 },
  'ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'jaipur': { lat: 26.9124, lng: 75.7873 },
  'lucknow': { lat: 26.8467, lng: 80.9462 },
  'kanpur': { lat: 26.4499, lng: 80.3319 },
  'nagpur': { lat: 21.1458, lng: 79.0882 },
  'indore': { lat: 22.7196, lng: 75.8577 },
  'thane': { lat: 19.2183, lng: 72.9781 },
  'bhopal': { lat: 23.2599, lng: 77.4126 },
  'visakhapatnam': { lat: 17.6868, lng: 83.2185 },
  'patna': { lat: 25.5941, lng: 85.1376 },
  'vadodara': { lat: 22.3072, lng: 73.1812 },
  'ghaziabad': { lat: 28.6692, lng: 77.4538 },
  'ludhiana': { lat: 30.9010, lng: 75.8573 },
  'agra': { lat: 27.1767, lng: 78.0081 },
  'nashik': { lat: 19.9975, lng: 73.7898 },
  'faridabad': { lat: 28.4089, lng: 77.3178 },
  'meerut': { lat: 28.9845, lng: 77.7064 },
  'rajkot': { lat: 22.3039, lng: 70.8022 },
  'varanasi': { lat: 25.3176, lng: 82.9739 },
  'srinagar': { lat: 34.0837, lng: 74.7973 },
  'aurangabad': { lat: 19.8762, lng: 75.3433 },
  'dhanbad': { lat: 23.7957, lng: 86.4304 },
  'amritsar': { lat: 31.6340, lng: 74.8723 },
  'noida': { lat: 28.5355, lng: 77.3910 },
  'gurgaon': { lat: 28.4595, lng: 77.0266 },
  'gurugram': { lat: 28.4595, lng: 77.0266 },
  'coimbatore': { lat: 11.0168, lng: 76.9558 },
  'kochi': { lat: 9.9312, lng: 76.2673 },
  'chandigarh': { lat: 30.7333, lng: 76.7794 },
  'guwahati': { lat: 26.1445, lng: 91.7362 },
  'bhubaneswar': { lat: 20.2961, lng: 85.8245 },
  'dehradun': { lat: 30.3165, lng: 78.0322 },
  'raipur': { lat: 21.2514, lng: 81.6296 },
  'ranchi': { lat: 23.3441, lng: 85.3096 },
  // US
  'new york': { lat: 40.7128, lng: -74.0060 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'chicago': { lat: 41.8781, lng: -87.6298 },
  'houston': { lat: 29.7604, lng: -95.3698 },
  'phoenix': { lat: 33.4484, lng: -112.0740 },
  'san francisco': { lat: 37.7749, lng: -122.4194 },
  'seattle': { lat: 47.6062, lng: -122.3321 },
  'miami': { lat: 25.7617, lng: -80.1918 },
  // UK
  'london': { lat: 51.5074, lng: -0.1278 },
  'manchester': { lat: 53.4808, lng: -2.2426 },
  'birmingham': { lat: 52.4862, lng: -1.8904 },
  // Other
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'singapore': { lat: 1.3521, lng: 103.8198 },
  'sydney': { lat: -33.8688, lng: 151.2093 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'berlin': { lat: 52.5200, lng: 13.4050 },
  'toronto': { lat: 43.6532, lng: -79.3832 },
};

// Country center coordinates (fallback)
const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'india': { lat: 20.5937, lng: 78.9629 },
  'in': { lat: 20.5937, lng: 78.9629 },
  'united states': { lat: 37.0902, lng: -95.7129 },
  'us': { lat: 37.0902, lng: -95.7129 },
  'usa': { lat: 37.0902, lng: -95.7129 },
  'united kingdom': { lat: 55.3781, lng: -3.4360 },
  'uk': { lat: 55.3781, lng: -3.4360 },
  'gb': { lat: 55.3781, lng: -3.4360 },
  'canada': { lat: 56.1304, lng: -106.3468 },
  'ca': { lat: 56.1304, lng: -106.3468 },
  'australia': { lat: -25.2744, lng: 133.7751 },
  'au': { lat: -25.2744, lng: 133.7751 },
  'germany': { lat: 51.1657, lng: 10.4515 },
  'de': { lat: 51.1657, lng: 10.4515 },
  'france': { lat: 46.2276, lng: 2.2137 },
  'fr': { lat: 46.2276, lng: 2.2137 },
  'japan': { lat: 36.2048, lng: 138.2529 },
  'jp': { lat: 36.2048, lng: 138.2529 },
  'uae': { lat: 23.4241, lng: 53.8478 },
  'ae': { lat: 23.4241, lng: 53.8478 },
  'singapore': { lat: 1.3521, lng: 103.8198 },
  'sg': { lat: 1.3521, lng: 103.8198 },
};

function getCityCoordinates(city: string, country: string): { lat: number; lng: number } | null {
  // Try city first
  const cityKey = city?.toLowerCase().trim();
  if (cityKey && CITY_COORDINATES[cityKey]) {
    return CITY_COORDINATES[cityKey];
  }

  // Try country as fallback
  const countryKey = country?.toLowerCase().trim();
  if (countryKey && COUNTRY_COORDINATES[countryKey]) {
    return COUNTRY_COORDINATES[countryKey];
  }

  return null;
}

// Declare global L (Leaflet) type
declare global {
  interface Window {
    L: typeof import('leaflet') & {
      heat?: (data: [number, number, number][], options?: object) => L.Layer;
    };
  }
}

export const ScanHeatmap: React.FC<ScanHeatmapProps> = ({ qrId, height = '400px' }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cityData, setCityData] = useState<CityData[]>([]);
  const [totalScans, setTotalScans] = useState(0);
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
      heatScript.onerror = () => setLeafletLoaded(true); // Continue without heatmap
      document.head.appendChild(heatScript);
    };
    script.onerror = () => setError('Failed to load map library');
    document.head.appendChild(script);

    return () => {
      // Cleanup is handled by React's lifecycle
    };
  }, []);

  // Fetch scan data with city information
  const fetchScans = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get supabase client lazily
      const supabase = getSupabaseClient();

      // Safety check for supabase client
      if (!supabase) {
        console.warn('Supabase client not available - showing empty state');
        setCityData([]);
        setTotalScans(0);
        setLoading(false);
        return;
      }

      // Get all scans with city data
      const { data, error: fetchError } = await supabase
        .from('qr_scans')
        .select('city, country')
        .eq('qr_id', qrId)
        .not('city', 'is', null)
        .limit(500);

      if (fetchError) throw fetchError;

      // Aggregate by city
      const cityMap = new Map<string, CityData>();
      let total = 0;

      (data || []).forEach((scan) => {
        if (scan.city) {
          total++;
          const key = `${scan.city}-${scan.country || ''}`.toLowerCase();
          const existing = cityMap.get(key);

          if (existing) {
            existing.count++;
          } else {
            const coords = getCityCoordinates(scan.city, scan.country || '');
            cityMap.set(key, {
              city: scan.city,
              country: scan.country || '',
              count: 1,
              lat: coords?.lat,
              lng: coords?.lng,
            });
          }
        }
      });

      // Convert to array and sort by count
      const cities = Array.from(cityMap.values())
        .filter(c => c.lat && c.lng) // Only include cities with coordinates
        .sort((a, b) => b.count - a.count);

      setCityData(cities);
      setTotalScans(total);
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
    if (cityData.length > 0) {
      const lats = cityData.map(c => c.lat!).filter(Boolean);
      const lngs = cityData.map(c => c.lng!).filter(Boolean);

      if (lats.length > 0 && lngs.length > 0) {
        const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
        center = [avgLat, avgLng];
        zoom = cityData.length === 1 ? 8 : 5;
      }
    }

    // Create map with touch/scroll enabled
    const map = L.map(mapRef.current, {
      scrollWheelZoom: true,       // Enable mouse wheel zoom
      touchZoom: true,             // Enable touch pinch zoom
      dragging: true,              // Enable dragging/panning
      tap: true,                   // Enable tap for mobile
      zoomControl: true,           // Show zoom controls
      doubleClickZoom: true,       // Enable double-click zoom
    }).setView(center, zoom);

    mapInstanceRef.current = map;

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(map);

    // Add markers for each city
    if (cityData.length > 0) {
      const heatData: [number, number, number][] = [];
      const maxCount = Math.max(...cityData.map(c => c.count));

      cityData.forEach((city) => {
        if (city.lat && city.lng) {
          // Calculate intensity based on count
          const intensity = Math.min(1, (city.count / maxCount) * 0.8 + 0.2);
          heatData.push([city.lat, city.lng, intensity]);

          // Calculate marker size based on count (min 8, max 30)
          const radius = Math.max(8, Math.min(30, 8 + (city.count / maxCount) * 22));

          // Add circle marker
          const marker = L.circleMarker([city.lat, city.lng], {
            radius: radius,
            fillColor: '#667eea',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.7,
          });

          // Popup content
          const popupContent = `
            <div style="font-family: -apple-system, sans-serif; font-size: 12px; min-width: 120px;">
              <strong style="font-size: 14px;">${city.city}</strong>
              ${city.country ? `<br/><span style="color: #666;">${city.country}</span>` : ''}
              <hr style="margin: 6px 0; border: none; border-top: 1px solid #eee;"/>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #666;">Scans:</span>
                <strong style="color: #667eea;">${city.count}</strong>
              </div>
            </div>
          `;

          marker.bindPopup(popupContent);
          marker.addTo(map);
        }
      });

      // Add heatmap layer if available
      if (window.L.heat && heatData.length > 0) {
        const heat = window.L.heat(heatData, {
          radius: 35,
          blur: 20,
          maxZoom: 10,
          gradient: {
            0.2: '#667eea',
            0.4: '#764ba2',
            0.6: '#f093fb',
            0.8: '#f5576c',
            1.0: '#ff0000',
          },
        });
        heat.addTo(map);
      }

      // Fit bounds to show all markers
      if (cityData.length > 1) {
        const bounds = L.latLngBounds(
          cityData
            .filter(c => c.lat && c.lng)
            .map(c => [c.lat!, c.lng!] as [number, number])
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }

    // Handle resize
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    // Fix for Leaflet container size issues
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded, cityData, loading]);

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl p-4 flex items-center gap-3">
        <AlertCircle className="text-red-500" size={20} />
        <div className="flex-1">
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <button onClick={fetchScans} className="text-red-600 hover:text-red-700">
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
            {cityData.length} {cityData.length === 1 ? 'city' : 'cities'} • {totalScans} scans
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

        {!loading && cityData.length === 0 && (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
            <div className="text-center px-4">
              <Map size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">No location data available yet</p>
              <p className="text-gray-400 text-xs mt-1">
                Scan locations will appear as users scan this QR code
              </p>
            </div>
          </div>
        )}

        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      </div>

      {cityData.length > 0 && (
        <div className="p-3 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Top cities: {cityData.slice(0, 3).map(c => c.city).join(', ')}</span>
            <span>Pinch/scroll to zoom • Drag to pan</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanHeatmap;
