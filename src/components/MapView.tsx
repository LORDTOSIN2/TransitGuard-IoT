import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { BusVehicle } from '../types/fleet';
import { TRANSIT_ROUTES, BASE_STATIONS } from '../data/mockRoutes';
import { soundFx } from '../utils/audio';
import { cartoService } from '../services/cartoService';
import { 
  Radio, 
  AlertTriangle, 
  Navigation, 
  Maximize2,
  Database,
  Map as MapIcon,
  CheckCircle2,
  RefreshCw,
  Layers
} from 'lucide-react';

interface MapViewProps {
  buses: BusVehicle[];
  selectedBusId: string | null;
  onSelectBus: (busId: string) => void;
  isDarkMode: boolean;
  showMeshLines: boolean;
  setShowMeshLines: (show: boolean) => void;
  showDeadzones: boolean;
  setShowDeadzones: (show: boolean) => void;
  showRoutes: boolean;
  setShowRoutes: (show: boolean) => void;
  onOpenCartoModal?: () => void;
}

export const MapView: React.FC<MapViewProps> = ({
  buses,
  selectedBusId,
  onSelectBus,
  isDarkMode,
  showMeshLines,
  setShowMeshLines,
  showDeadzones,
  setShowDeadzones,
  showRoutes,
  setShowRoutes,
  onOpenCartoModal,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const hubMarkersRef = useRef<L.Marker[]>([]);
  const meshLinesGroupRef = useRef<L.LayerGroup | null>(null);
  const deadzonesGroupRef = useRef<L.LayerGroup | null>(null);
  const routesGroupRef = useRef<L.LayerGroup | null>(null);

  // Basemap Tile style state: Default to CARTO Voyager for high-detail streets in light mode or CARTO Dark in dark mode
  const [selectedTileId, setSelectedTileId] = useState<string>(isDarkMode ? 'carto-dark' : 'carto-voyager');
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState<boolean>(false);
  const [isCartoSyncing, setIsCartoSyncing] = useState<boolean>(false);
  const [cartoSyncSuccess, setCartoSyncSuccess] = useState<boolean | null>(null);

  // Synchronize tile layer automatically when Dark/Light mode is toggled
  useEffect(() => {
    const targetStyleId = isDarkMode ? 'carto-dark' : 'carto-voyager';
    setSelectedTileId(targetStyleId);

    if (mapInstanceRef.current && tileLayerRef.current) {
      const styles = cartoService.getTileStyles();
      const style = styles.find(s => s.id === targetStyleId) || styles[0];
      if (style) {
        tileLayerRef.current.setUrl(style.url);
      }
    }
  }, [isDarkMode]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center near Minna & Transit Arterials (approx 9.58, 6.54)
    const map = L.map(mapContainerRef.current, {
      center: [9.582, 6.545],
      zoom: 12,
      zoomControl: false,
      attributionControl: true,
    });

    // Add custom positioned zoom controls
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const availableStyles = cartoService.getTileStyles();
    const initialStyleId = isDarkMode ? 'carto-dark' : 'carto-voyager';
    const initialStyle = availableStyles.find(s => s.id === initialStyleId) || availableStyles[0];

    const tiles = L.tileLayer(initialStyle.url, {
      maxZoom: initialStyle.maxZoom,
      subdomains: initialStyle.subdomains || 'abc',
      attribution: initialStyle.attribution,
    }).addTo(map);

    tileLayerRef.current = tiles;
    mapInstanceRef.current = map;

    // Create Layer Groups
    routesGroupRef.current = L.layerGroup().addTo(map);
    deadzonesGroupRef.current = L.layerGroup().addTo(map);
    meshLinesGroupRef.current = L.layerGroup().addTo(map);

    // FIX 1: Force Leaflet to recalculate container size after React finishes
    // layout. Critical on Android where flex layout settles after first paint.
    const invalidateTimer = setTimeout(() => {
      map.invalidateSize({ animate: false });
    }, 300);

    // FIX 2: Watch for ANY container resize (orientation change, sidebar open/close,
    // Android Chrome toolbar show/hide) and tell Leaflet to recalculate.
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    // Render Base Station Hubs
    BASE_STATIONS.forEach((hub) => {
      const hubIconHtml = `
        <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
          <div class="absolute w-8 h-8 rounded-full bg-cyan-500/20 animate-ping"></div>
          <div class="relative w-7 h-7 rounded-lg bg-slate-900 border-2 border-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <svg class="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 2v20M2 7l10-5 10 5M2 17l10 5 10-5M2 12l10-5 10 5" />
            </svg>
          </div>
        </div>
      `;

      const customHubIcon = L.divIcon({
        html: hubIconHtml,
        className: 'hub-custom-icon',
        iconSize: [28, 28],
      });

      const marker = L.marker([hub.location.lat, hub.location.lng], { icon: customHubIcon })
        .bindPopup(`
          <div class="p-3 bg-slate-900 text-slate-100 rounded-lg border border-cyan-500/40 text-xs font-mono">
            <div class="font-bold text-cyan-400 mb-1 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              ${hub.name}
            </div>
            <div class="text-slate-400 mb-0.5">Type: <span class="text-slate-200">${hub.type}</span></div>
            <div class="text-slate-400">Coordinates: <span class="text-cyan-300 font-mono">${hub.location.lat.toFixed(4)}°N, ${hub.location.lng.toFixed(4)}°E</span></div>
            <div class="mt-2 text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
              Active Relay Node Ready
            </div>
          </div>
        `)
        .addTo(map);

      hubMarkersRef.current.push(marker);
    });

    return () => {
      clearTimeout(invalidateTimer);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update tile theme when user manually selects style
  const handleSelectTileStyle = (styleId: string) => {
    setSelectedTileId(styleId);
    setIsStyleMenuOpen(false);
    soundFx.playClick();

    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const availableStyles = cartoService.getTileStyles();
    const style = availableStyles.find(s => s.id === styleId);
    if (style) {
      tileLayerRef.current.setUrl(style.url);
    }
  };

  // Trigger quick CARTO DW Sync
  const handleQuickCartoSync = async () => {
    setIsCartoSyncing(true);
    soundFx.playClick();
    const res = await cartoService.executeWorkflow();
    setIsCartoSyncing(false);
    setCartoSyncSuccess(res.success);
    if (res.success) {
      soundFx.playSuccess();
    } else {
      soundFx.playCautionAlert();
    }
    setTimeout(() => {
      setCartoSyncSuccess(null);
    }, 4000);
  };

  // Render Routes
  useEffect(() => {
    if (!mapInstanceRef.current || !routesGroupRef.current) return;
    routesGroupRef.current.clearLayers();

    if (showRoutes) {
      TRANSIT_ROUTES.forEach((route) => {
        const latLngs = route.waypoints.map((wp) => [wp.lat, wp.lng] as [number, number]);
        const polyline = L.polyline(latLngs, {
          color: isDarkMode ? route.color : '#0284c7', // Sky Blue in light mode
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 8',
          lineCap: 'round',
        }).bindTooltip(`${route.name} (${route.lengthKm} km)`, {
          sticky: true,
          className: isDarkMode 
            ? 'bg-slate-900 text-cyan-300 text-xs border border-cyan-500/40 rounded px-2 py-1'
            : 'bg-white text-blue-900 font-bold text-xs border border-blue-300 shadow-md rounded px-2 py-1',
        });
        routesGroupRef.current?.addLayer(polyline);
      });
    }
  }, [showRoutes, isDarkMode]);

  // Render Cellular Dead-zones
  useEffect(() => {
    if (!mapInstanceRef.current || !deadzonesGroupRef.current) return;
    deadzonesGroupRef.current.clearLayers();

    if (showDeadzones) {
      TRANSIT_ROUTES.forEach((route) => {
        route.deadzones.forEach((dz) => {
          const circle = L.circle([dz.center.lat, dz.center.lng], {
            radius: dz.radiusMeters,
            color: '#e11d48', // Vibrant Rose
            weight: 2,
            dashArray: '6, 6',
            fillColor: '#e11d48',
            fillOpacity: isDarkMode ? 0.15 : 0.18,
          }).bindTooltip(`
            <div class="text-xs font-mono p-1">
              <strong class="text-rose-600 block font-bold">${dz.name}</strong>
              <span class="${isDarkMode ? 'text-slate-300' : 'text-slate-700'}">GSM Coverage: ${dz.gsmCoveragePercent}% | LoRa Rescue Active</span>
            </div>
          `, { sticky: true });
          deadzonesGroupRef.current?.addLayer(circle);
        });
      });
    }
  }, [showDeadzones, isDarkMode]);

  // Render & Update Bus Markers & LoRa Mesh Lines
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous LoRa mesh lines
    if (meshLinesGroupRef.current) {
      meshLinesGroupRef.current.clearLayers();
    }

    const currentBusIds = new Set(buses.map((b) => b.id));

    // Remove deleted markers
    markersRef.current.forEach((marker, id) => {
      if (!currentBusIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Update or create bus markers
    buses.forEach((bus) => {
      const isSelected = bus.id === selectedBusId;
      const isCritical = bus.status === 'CRITICAL_FATIGUE' || bus.status === 'ALCOHOL_ALERT';
      const isDrowsy = bus.status === 'DROWSY' || bus.status === 'CAUTION';
      const isRescued = bus.telemetry.mode === 'LORA_RESCUE';

      // Status color
      let statusColor = '#10b981'; // Emerald
      let glowClass = 'shadow-emerald-500/50';
      let ringColor = 'border-emerald-500';
      if (isCritical) {
        statusColor = '#f43f5e'; // Rose
        glowClass = 'shadow-rose-500/80 animate-bounce';
        ringColor = 'border-rose-500';
      } else if (isDrowsy) {
        statusColor = '#f59e0b'; // Amber
        glowClass = 'shadow-amber-500/60';
        ringColor = 'border-amber-500';
      } else if (isRescued) {
        statusColor = '#06b6d4'; // Cyan
        glowClass = 'shadow-cyan-500/60';
        ringColor = 'border-cyan-500';
      }

      // Marker HTML with directional heading arrow and status badge
      const iconHtml = `
        <div class="relative group -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-300 ${isSelected ? 'scale-125 z-50' : 'z-20'}">
          ${isCritical ? `<div class="absolute -inset-2 rounded-full bg-rose-500/30 marker-pulse"></div>` : ''}
          ${isRescued && !isCritical ? `<div class="absolute -inset-1.5 rounded-full bg-cyan-500/25 marker-pulse"></div>` : ''}
          
          <div class="relative w-10 h-10 rounded-xl bg-slate-950 border-2 ${ringColor} flex flex-col items-center justify-center shadow-lg ${glowClass} backdrop-blur-sm">
            <!-- Heading pointer -->
            <div class="absolute -top-2 transition-transform duration-300" style="transform: rotate(${bus.heading}deg);">
              <div class="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[7px]" style="border-bottom-color: ${statusColor}"></div>
            </div>
            
            <div class="text-[9px] font-mono font-bold tracking-tighter text-slate-100 leading-none">
              ${bus.id.replace('BUS-', '')}
            </div>
            
            <!-- Connection mode badge -->
            <div class="mt-0.5 text-[7.5px] font-mono font-semibold px-1 rounded-sm leading-tight ${
              isRescued ? 'bg-cyan-950 text-cyan-300' : 'bg-slate-800 text-slate-300'
            }">
              ${isRescued ? `LoRa h=${bus.telemetry.hopCount}` : 'GSM'}
            </div>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'bus-marker-node',
        iconSize: [40, 40],
      });

      let marker = markersRef.current.get(bus.id);
      if (!marker) {
        marker = L.marker([bus.location.lat, bus.location.lng], { icon: customIcon }).addTo(map);
        
        marker.on('click', () => {
          soundFx.playClick();
          onSelectBus(bus.id);
        });

        markersRef.current.set(bus.id, marker);
      } else {
        marker.setLatLng([bus.location.lat, bus.location.lng]);
        marker.setIcon(customIcon);
      }

      // Popup with immediate coordinates & telemetry
      marker.bindPopup(`
        <div class="p-3.5 bg-slate-950 text-slate-100 rounded-lg border border-slate-700 min-w-[210px] font-sans">
          <div class="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <span class="font-bold text-sm text-cyan-400 font-mono">${bus.id} (${bus.plateNumber})</span>
            <span class="px-2 py-0.5 text-[10px] font-mono rounded font-semibold ${
              isCritical ? 'bg-rose-950 text-rose-300 border border-rose-800' : 
              isDrowsy ? 'bg-amber-950 text-amber-300 border border-amber-800' : 
              'bg-emerald-950 text-emerald-300 border border-emerald-800'
            }">
              ${bus.status.replace('_', ' ')}
            </span>
          </div>

          <div class="space-y-1 text-xs font-mono text-slate-300">
            <div class="flex justify-between">
              <span class="text-slate-400">Driver:</span>
              <span class="text-slate-100 font-semibold">${bus.driverName}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Coordinates:</span>
              <span class="text-cyan-300">${bus.location.lat.toFixed(5)}°, ${bus.location.lng.toFixed(5)}°</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Speed / Heading:</span>
              <span>${bus.speed} km/h • ${bus.heading}°</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Mode:</span>
              <span class="${isRescued ? 'text-cyan-400 font-bold' : 'text-emerald-400'}">
                ${bus.telemetry.mode} ${isRescued ? `(Hop ${bus.telemetry.hopCount})` : ''}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">EAR / PERCLOS:</span>
              <span class="${bus.biometrics.perclos > 15 ? 'text-rose-400 font-bold' : 'text-slate-200'}">
                ${bus.biometrics.ear} / ${bus.biometrics.perclos}%
              </span>
            </div>
          </div>

          <button id="inspect-bus-btn-${bus.id}" class="mt-3 w-full py-1.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded transition-colors flex items-center justify-center gap-1.5 shadow-sm">
            <span>Open Telemetry Panel</span>
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      `, { offset: [0, -10] });

      // Draw dynamic LoRa Relay Mesh links if bus is in LoRa rescue
      if (showMeshLines && isRescued && meshLinesGroupRef.current) {
        if (bus.telemetry.relayedViaNodeId) {
          const peer = buses.find((p) => p.id === bus.telemetry.relayedViaNodeId);
          if (peer) {
            const meshLine = L.polyline(
              [
                [bus.location.lat, bus.location.lng],
                [peer.location.lat, peer.location.lng],
              ],
              {
                color: '#06b6d4',
                weight: 2.5,
                dashArray: '5, 5',
                opacity: 0.85,
              }
            ).bindTooltip(`LoRa Relay Hop 1 (${bus.id} ➔ ${peer.id})`, { sticky: true });
            meshLinesGroupRef.current.addLayer(meshLine);
          }
        } else {
          // If in LoRa mode looking for nearby Hub Base Station
          const nearestHub = BASE_STATIONS[0];
          const meshLine = L.polyline(
            [
              [bus.location.lat, bus.location.lng],
              [nearestHub.location.lat, nearestHub.location.lng],
            ],
            {
              color: '#0284c7',
              weight: 2,
              dashArray: '4, 6',
              opacity: 0.7,
            }
          );
          meshLinesGroupRef.current.addLayer(meshLine);
        }
      }
    });
  }, [buses, selectedBusId, showMeshLines, isDarkMode]);

  const handleCenterFleet = () => {
    if (!mapInstanceRef.current || buses.length === 0) return;
    soundFx.playClick();
    const bounds = L.latLngBounds(buses.map((b) => [b.location.lat, b.location.lng]));
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  };

  const availableTileStyles = cartoService.getTileStyles();
  const activeTileStyle = availableTileStyles.find(s => s.id === selectedTileId) || availableTileStyles[0];

  return (
    <div
      id="map-view-container"
      className={`relative w-full overflow-hidden rounded-2xl border transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-[#080A0F] border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]' 
          : 'bg-[#F1F5F9] border-slate-200 shadow-sm'
      }`}
      style={{ height: '100%', minHeight: '460px' }}
    >
      {/* Leaflet map DOM node — absolutely positioned so it always fills container
          regardless of how the parent flex layout resolves on mobile */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Floating Map HUD Controls */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2">
        <div className={`rounded-xl p-2 flex flex-wrap items-center gap-1.5 border transition-all ${
          isDarkMode 
            ? 'glass-panel border-white/15 text-[#E0E6ED]' 
            : 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-900 shadow-md'
        }`}>
          {/* Tile Style Selector Dropdown Trigger */}
          <div className="relative">
            <button
              id="map-style-selector-btn"
              onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)}
              className={`px-2.5 py-1 text-xs rounded-lg font-mono flex items-center gap-1.5 transition-all ${
                isDarkMode 
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30' 
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold shadow-xs'
              }`}
              title="Change Map Style (CARTO Voyager/Dark/OSM/Satellite)"
            >
              <MapIcon className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-semibold">{activeTileStyle.name.split(' ')[0]} {activeTileStyle.name.split(' ')[1]}</span>
            </button>

            {/* Tile Style Dropdown Menu */}
            {isStyleMenuOpen && (
              <div className={`absolute top-full left-0 mt-2 w-64 rounded-xl border shadow-2xl p-2 z-[500] space-y-1 font-mono text-xs ${
                isDarkMode ? 'bg-[#0b1120] border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900 shadow-xl'
              }`}>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider px-2 py-1 font-semibold">
                  Map Basemap Layer
                </div>
                {availableTileStyles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => handleSelectTileStyle(style.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors flex items-center justify-between ${
                      selectedTileId === style.id
                        ? isDarkMode 
                          ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30' 
                          : 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                        : isDarkMode ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: style.previewColor }}></span>
                        <span>{style.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{style.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={`h-4 w-px mx-0.5 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`} />

          {/* Layer toggles */}
          <button
            id="toggle-mesh-lines-btn"
            onClick={() => {
              soundFx.playClick();
              setShowMeshLines(!showMeshLines);
            }}
            className={`px-2.5 py-1 text-xs rounded-lg font-mono flex items-center gap-1.5 transition-all ${
              showMeshLines
                ? isDarkMode
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
                  : 'bg-purple-100 text-purple-800 border border-purple-300 shadow-xs font-bold'
                : isDarkMode
                ? 'bg-white/5 text-slate-400 hover:text-slate-200 border border-white/5 hover:bg-white/10'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-200 font-medium'
            }`}
          >
            <Radio className="w-3 h-3 text-purple-500" />
            <span>LoRa Mesh Links</span>
          </button>

          <button
            id="toggle-deadzones-btn"
            onClick={() => {
              soundFx.playClick();
              setShowDeadzones(!showDeadzones);
            }}
            className={`px-2.5 py-1 text-xs rounded-lg font-mono flex items-center gap-1.5 transition-all ${
              showDeadzones
                ? isDarkMode
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                  : 'bg-rose-100 text-rose-800 border border-rose-300 shadow-xs font-bold'
                : isDarkMode
                ? 'bg-white/5 text-slate-400 hover:text-slate-200 border border-white/5 hover:bg-white/10'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-200 font-medium'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            <span>GSM Deadzones</span>
          </button>

          <button
            id="toggle-routes-btn"
            onClick={() => {
              soundFx.playClick();
              setShowRoutes(!showRoutes);
            }}
            className={`px-2.5 py-1 text-xs rounded-lg font-mono flex items-center gap-1.5 transition-all ${
              showRoutes
                ? isDarkMode
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs font-bold'
                : isDarkMode
                ? 'bg-white/5 text-slate-400 hover:text-slate-200 border border-white/5 hover:bg-white/10'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-200 font-medium'
            }`}
          >
            <Navigation className="w-3 h-3 text-emerald-500" />
            <span>Route Paths</span>
          </button>

          <button
            id="fit-fleet-bounds-btn"
            onClick={handleCenterFleet}
            title="Fit All Buses in View"
            className={`p-1.5 rounded-lg border transition-colors ${
              isDarkMode 
                ? 'bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border-white/10' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Top Right: CARTO BigQuery Hub Trigger */}
      <div className="absolute top-4 right-4 z-[400] flex items-center gap-2">
        <button
          id="quick-carto-sync-btn"
          onClick={handleQuickCartoSync}
          disabled={isCartoSyncing}
          className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-md ${
            cartoSyncSuccess === true
              ? isDarkMode ? 'border-emerald-500/50 text-emerald-300 bg-emerald-950/40' : 'bg-emerald-100 text-emerald-900 border-emerald-300'
              : cartoSyncSuccess === false
              ? isDarkMode ? 'border-rose-500/50 text-rose-300 bg-rose-950/40' : 'bg-rose-100 text-rose-900 border-rose-300'
              : isDarkMode 
              ? 'glass-panel border-cyan-500/30 text-cyan-300 hover:border-cyan-400 bg-cyan-950/20 hover:bg-cyan-950/40' 
              : 'bg-white/95 backdrop-blur-md text-cyan-800 border-cyan-300 hover:bg-cyan-50'
          }`}
          title="Run CARTO DW Workflow Procedure"
        >
          {isCartoSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 text-cyan-500 animate-spin" />
          ) : cartoSyncSuccess === true ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Database className="w-3.5 h-3.5 text-cyan-500" />
          )}
          <span>{isCartoSyncing ? 'Running...' : cartoSyncSuccess === true ? 'CARTO Synced' : 'CARTO Sync'}</span>
        </button>

        {onOpenCartoModal && (
          <button
            id="open-carto-settings-btn"
            onClick={() => {
              soundFx.playClick();
              onOpenCartoModal();
            }}
            className={`p-1.5 rounded-xl border transition-colors shadow-md ${
              isDarkMode 
                ? 'glass-panel border-cyan-500/30 text-cyan-300 hover:text-white hover:bg-cyan-500/20' 
                : 'bg-white/95 backdrop-blur-md border-cyan-300 text-cyan-700 hover:bg-cyan-50 hover:text-cyan-900'
            }`}
            title="Configure CARTO API & Queries"
          >
            <Database className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Floating Mini Legend HUD */}
      <div className="absolute bottom-4 left-4 z-[400] hidden md:block">
        <div className={`rounded-xl p-3 text-[11px] font-mono border transition-all ${
          isDarkMode 
            ? 'glass-panel border-white/15 text-[#E0E6ED]' 
            : 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-800 shadow-md'
        }`}>
          <div className="text-slate-400 font-semibold mb-1.5 uppercase text-[10px] tracking-wider">Fleet Telemetry Status</div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs"></span>
              <span className="font-medium">Normal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs"></span>
              <span className="font-medium">Drowsy/Caution</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-xs"></span>
              <span className="font-medium">Fatigue/Alcohol Alert</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 shadow-xs"></span>
              <span className="font-medium">LoRa Rescued</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
