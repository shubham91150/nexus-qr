import React, { useEffect, useState } from 'react';
import { MapPin, Loader2, RefreshCw, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ScanHeatmapProps {
  qrId: string;
  height?: string;
}

interface CityData {
  city: string;
  country: string;
  count: number;
}

export const ScanHeatmap: React.FC<ScanHeatmapProps> = ({ qrId, height = '300px' }) => {
  const [loading, setLoading] = useState(true);
  const [cityData, setCityData] = useState<CityData[]>([]);
  const [totalScans, setTotalScans] = useState(0);

  const fetchScans = async () => {
    setLoading(true);

    try {
      // Get all scans with city data
      const { data, error: fetchError } = await supabase
        .from('qr_scans')
        .select('city, country')
        .eq('qr_id', qrId)
        .not('city', 'is', null)
        .limit(500);

      if (fetchError) {
        console.error('Error fetching scans:', fetchError);
        setCityData([]);
        setTotalScans(0);
        setLoading(false);
        return;
      }

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
            cityMap.set(key, {
              city: scan.city,
              country: scan.country || '',
              count: 1,
            });
          }
        }
      });

      // Convert to array and sort by count
      const cities = Array.from(cityMap.values()).sort((a, b) => b.count - a.count);

      setCityData(cities);
      setTotalScans(total);
    } catch (err) {
      console.error('Error fetching scan data:', err);
      setCityData([]);
      setTotalScans(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScans();
  }, [qrId]);

  // Get color intensity based on scan count
  const getIntensityColor = (count: number, maxCount: number) => {
    const intensity = Math.min(1, count / maxCount);
    if (intensity > 0.7) return 'bg-indigo-600 text-white';
    if (intensity > 0.4) return 'bg-indigo-400 text-white';
    if (intensity > 0.2) return 'bg-indigo-200 text-indigo-800';
    return 'bg-indigo-100 text-indigo-700';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe size={18} className="text-indigo-600" />
          <h3 className="font-medium text-gray-900">Scan Locations</h3>
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

      <div style={{ height, minHeight: '200px' }} className="overflow-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="animate-spin mx-auto text-indigo-600 mb-2" size={24} />
              <p className="text-sm text-gray-500">Loading location data...</p>
            </div>
          </div>
        ) : cityData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center px-4">
              <MapPin size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">No location data available yet</p>
              <p className="text-gray-400 text-xs mt-1">
                Locations will appear as users scan this QR code
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4">
            {/* City cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {cityData.slice(0, 12).map((city, index) => {
                const maxCount = cityData[0]?.count || 1;
                return (
                  <div
                    key={`${city.city}-${city.country}-${index}`}
                    className={`rounded-lg p-3 ${getIntensityColor(city.count, maxCount)}`}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{city.city}</p>
                        {city.country && (
                          <p className="text-xs opacity-75 truncate">{city.country}</p>
                        )}
                        <p className="text-lg font-bold mt-1">{city.count}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show more indicator */}
            {cityData.length > 12 && (
              <p className="text-center text-sm text-gray-500 mt-4">
                +{cityData.length - 12} more locations
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanHeatmap;
