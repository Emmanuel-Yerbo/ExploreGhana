// ExploreGhana — Frontend Application Logic (V1.2 Multi-Scale Spatial Hierarchy & Ashanti Expansion)

// Application State
const state = {
  currentTier: 'national', // 'national' | 'regional' | 'site'
  selectedRegionId: null,  // 'central' | 'ashanti'
  selectedSiteId: null,    // 'kakum-national-park'
  siteData: null,          // Micro-spatial dataset for active site
  microMarkers: {},        // Map markers for micro-POIs
  activePopup: null,       // Currently opened maplibre Popup instance
  siteSubMode: 'story',    // 'story' | 'explorer'
  currentStoryChapterIndex: 0,
  soundscapeActive: false,
  regions: [],             // All 16 regions loaded from /api/regions
  districts: [],           // Districts for active region
  allAttractions: [],      // All 45 attractions loaded from /api/attractions
  attractions: [],         // Active region attractions
  filtered: [],            // Filtered attractions for active region
  selectedId: null,
  activeCategory: 'all',
  searchQuery: '',
  userLocation: null,
  markers: {},
  regionBadges: {},
  userMarker: null,
  showBoundary: true,
  currentBasemap: 'streets'
};

// National View Configuration
const NATIONAL_VIEW = {
  center: [-1.02, 7.94], // Geographical center of Ghana
  zoom: 6.3,
  bearing: 0,
  pitch: 0
};

// MapLibre Basemap Tile Styles
const BASEMAP_STYLES = {
  streets: {
    version: 8,
    sources: {
      'osm-tiles': {
        type: 'raster',
        tiles: [
          'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
        ],
        tileSize: 256,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
    },
    layers: [
      {
        id: 'osm-tiles-layer',
        type: 'raster',
        source: 'osm-tiles',
        minzoom: 0,
        maxzoom: 19
      }
    ]
  },
  satellite: {
    version: 8,
    sources: {
      'satellite-tiles': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        attribution: 'Tiles &copy; Esri, DigitalGlobe, GeoEye, Earthstar Geographics'
      }
    },
    layers: [
      {
        id: 'satellite-tiles-layer',
        type: 'raster',
        source: 'satellite-tiles',
        minzoom: 0,
        maxzoom: 19
      }
    ]
  }
};

// Category metadata
const CATEGORY_META = {
  'Heritage & Castles': { pinClass: 'pin-heritage', icon: '🏰', label: 'Castles & Forts' },
  'Nature & Wildlife': { pinClass: 'pin-nature', icon: '🌿', label: 'Rainforest & Eco' },
  'Beaches & Coastal': { pinClass: 'pin-beach', icon: '🏖️', label: 'Beaches & Coves' },
  'Culture & Shrines': { pinClass: 'pin-culture', icon: '🥁', label: 'Culture & Shrines' },
  'Landmarks & Architecture': { pinClass: 'pin-landmark', icon: '🏛️', label: 'Landmarks' },
  'Crafts & Artisan Villages': { pinClass: 'pin-culture', icon: '🧵', label: 'Crafts & Artisan' },
  'Parks & Recreation': { pinClass: 'pin-nature', icon: '🌳', label: 'Parks & Recreation' },
  'Accommodation & Luxury': { pinClass: 'pin-default', icon: '🏨', label: 'Resorts & Stays' }
};

// Micro-POI metadata for Tier-4 Site Level
const MICRO_POI_META = {
  parking: { pinClass: 'micro-pin-parking', icon: '🅿️', label: 'Parking & Arrival' },
  reception: { pinClass: 'micro-pin-reception', icon: 'ℹ️', label: 'Visitor Services Hub' },
  amenity: { pinClass: 'micro-pin-amenity', icon: '🍽️', label: 'Service Amenity' },
  trailhead: { pinClass: 'micro-pin-trailhead', icon: '🌉', label: 'Trail Launch Platform' },
  trail: { pinClass: 'micro-pin-trailhead', icon: '🥾', label: 'Walking Concourse' },
  safety_exit: { pinClass: 'micro-pin-safety', icon: '🚨', label: 'Emergency Bailout Exit' },
  camping: { pinClass: 'micro-pin-camping', icon: '⛺', label: 'Rainforest Campsite' },
  nature: { pinClass: 'micro-pin-nature', icon: '🌳', label: 'Emergent Giant' }
};


// Initialize MapLibre GL Map with 3D terrain and pitch capabilities (Doc 09)
const map = new maplibregl.Map({
  container: 'map',
  style: BASEMAP_STYLES.streets,
  center: NATIONAL_VIEW.center,
  zoom: NATIONAL_VIEW.zoom,
  minZoom: 5.5,
  maxZoom: 20,
  maxPitch: 85
});

// Add Navigation and Scale controls
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

// Map Load Event Handler
map.on('load', async () => {
  initTerrainAndSky();
  await loadRegionsData();
  await fetchAttractions();
  setupEventListeners();
  handleHashChange(); // Initialize view state from URL hash
  lucide.createIcons();
});

// Listen to URL hash routing for SPA deep-linking and browser back/forward buttons
window.addEventListener('hashchange', handleHashChange);

// ---------------------------------------------------------------------------
// 1. Data Ingestion & Map Layer Management
// ---------------------------------------------------------------------------

// Initialize 3D Terrain, Warm Hillshade, and Atmosphere (Doc 09 §5.3)
function initTerrainAndSky() {
  try {
    // 1. AWS Open Data Terrarium elevation tiles (Free global terrain, no key)
    if (!map.getSource('terrain-dem')) {
      map.addSource('terrain-dem', {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 15
      });
    }

    // 2. Separate raster-dem instance for warm hillshade (best-practice render quality)
    if (!map.getSource('hillshade-dem')) {
      map.addSource('hillshade-dem', {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 15
      });
    }

    // 3. Warm rainforest hillshade layer
    if (!map.getLayer('kakum-hillshade')) {
      map.addLayer({
        id: 'kakum-hillshade',
        type: 'hillshade',
        source: 'hillshade-dem',
        paint: {
          'hillshade-shadow-color': '#1a2e1a',
          'hillshade-highlight-color': '#ffffff',
          'hillshade-accent-color': '#2e4d2e',
          'hillshade-exaggeration': 0.6
        }
      });
    }

    // 4. Set 3D Terrain — exaggeration strictly 1.0 (Rule 5.3: honesty over drama)
    map.setTerrain({ source: 'terrain-dem', exaggeration: 1.0 });

    // 5. Terrain Control toggle
    map.addControl(new maplibregl.TerrainControl({ source: 'terrain-dem', exaggeration: 1.0 }), 'bottom-right');

    // 6. Sky atmosphere
    if (map.setSky) {
      map.setSky({
        'sky-color': '#87ceeb',
        'sky-horizon-blend': 0.5,
        'horizon-color': '#e0f2fe',
        'horizon-fog-blend': 0.8,
        'fog-color': '#f0fdf4',
        'fog-ground-blend': 0.7
      });
    }
  } catch (err) {
    console.warn('Terrain or atmosphere setup notice:', err);
  }
}

// Load all 16 Ghana Regions
async function loadRegionsData() {
  try {
    const res = await fetch('/api/regions');
    const geojsonData = await res.json();
    state.regions = geojsonData.features || [];

    if (!map.getSource('ghana-regions-source')) {
      map.addSource('ghana-regions-source', {
        type: 'geojson',
        data: geojsonData
      });

      // 1. Region Fill Layer (Dimming other regions when one is selected)
      map.addLayer({
        id: 'regions-fill',
        type: 'fill',
        source: 'ghana-regions-source',
        paint: {
          'fill-color': [
            'match',
            ['get', 'region_id'],
            'central', '#006B3F',
            'ashanti', '#006B3F',
            '#2D3748'
          ],
          'fill-opacity': 0.12
        }
      });

      // 2. Region Outline Layer
      map.addLayer({
        id: 'regions-outline',
        type: 'line',
        source: 'ghana-regions-source',
        paint: {
          'line-color': [
            'match',
            ['get', 'region_id'],
            'central', '#FCD116',
            'ashanti', '#FCD116',
            '#CBD5E0'
          ],
          'line-width': 2.0
        }
      });

      // Region Click Handler
      map.on('click', 'regions-fill', (e) => {
        if (!e.features || e.features.length === 0) return;
        const regionId = e.features[0].properties.region_id;
        if (regionId === 'central' || regionId === 'ashanti') {
          window.location.hash = `#/${regionId}`;
        } else {
          const name = e.features[0].properties.name;
          showToast(`📌 ${name}: Attractions dataset scheduled for upcoming roadmap release.`);
          // Still fly to region bounds
          const region = state.regions.find(r => r.properties.region_id === regionId);
          if (region && region.properties.bbox) {
            const [minx, miny, maxx, maxy] = region.properties.bbox;
            map.fitBounds([[minx, miny], [maxx, maxy]], { padding: 40, duration: 1400 });
          }
        }
      });

      // Cursor changes on hover
      map.on('mouseenter', 'regions-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'regions-fill', () => { map.getCanvas().style.cursor = ''; });
    }

    renderNationalRegionsList();
    renderRegionBadges();
  } catch (err) {
    console.error('Failed to load regions GeoJSON:', err);
  }
}

// Load Region Districts (ADM2) dynamically per region
async function loadDistrictsForRegion(regionId) {
  try {
    const res = await fetch(`/api/regions/${regionId}/districts`);
    const geojsonData = await res.json();
    state.districts = geojsonData.features || [];

    const source = map.getSource('districts-source');
    if (source) {
      source.setData(geojsonData);
    } else {
      map.addSource('districts-source', {
        type: 'geojson',
        data: geojsonData
      });

      map.addLayer({
        id: 'districts-line',
        type: 'line',
        source: 'districts-source',
        layout: {
          'visibility': 'none' // Hidden by default at national scale
        },
        paint: {
          'line-color': '#006B3F',
          'line-width': 1.2,
          'line-dasharray': [3, 2],
          'line-opacity': 0.65
        }
      });
    }
  } catch (err) {
    console.error(`Failed to load districts for ${regionId}:`, err);
  }
}

// Fetch all attractions from FastAPI
async function fetchAttractions() {
  try {
    const res = await fetch('/api/attractions');
    state.allAttractions = await res.json();
    // Default to active region or all if none selected
    if (state.selectedRegionId) {
      state.attractions = state.allAttractions.filter(a => 
        (a.region_id && a.region_id === state.selectedRegionId) ||
        (a.region && a.region.toLowerCase().includes(state.selectedRegionId))
      );
    } else {
      state.attractions = [...state.allAttractions];
    }
    state.filtered = [...state.attractions];
  } catch (err) {
    console.error('Error fetching attractions:', err);
  }
}

// ---------------------------------------------------------------------------
// 2. Multi-Scale Hierarchy & Camera Navigation
// ---------------------------------------------------------------------------

// Hash Change Handler (SPA Deep Linking & Story Routing, Doc 09 §6.3)
function handleHashChange() {
  const hash = window.location.hash || '#/';
  const clean = hash.replace(/^#\/?/, '');
  const parts = clean ? clean.split('/') : [];

  const regionSlug = parts[0] || null;
  const siteSlug = parts[1] || null;
  const subView = parts[2] || null;
  const actParam = parts[3] || null;

  if (!regionSlug) {
    transitionToTier('national');
  } else if (siteSlug === 'kakum-national-park') {
    if (subView === 'story') {
      enterSiteConsole(regionSlug, siteSlug, 'story', actParam);
    } else {
      enterSiteConsole(regionSlug, siteSlug, 'explorer');
    }
  } else if (regionSlug === 'central' || regionSlug === 'ashanti') {
    transitionToTier('regional', regionSlug, siteSlug);
  } else {
    transitionToTier('regional', regionSlug);
  }
}

// Transition between National and Regional Tiers
async function transitionToTier(tier, regionId = null, siteSlug = null) {
  // If transitioning out of site console, clean it up
  if (state.currentTier === 'site') {
    exitSiteConsole(false);
  }

  state.currentTier = tier;
  state.selectedRegionId = regionId;

  const nationalPanel = document.getElementById('national-panel');
  const regionalPanel = document.getElementById('regional-panel');
  const siteConsolePanel = document.getElementById('site-console-panel');
  if (siteConsolePanel) siteConsolePanel.classList.add('hidden');

  const bcSepRegion = document.getElementById('bc-sep-region');
  const bcRegion = document.getElementById('bc-region');
  const bcSepAttraction = document.getElementById('bc-sep-attraction');
  const bcAttraction = document.getElementById('bc-attraction');
  const bcSepConsole = document.getElementById('bc-sep-console');
  const bcConsole = document.getElementById('bc-console');

  if (bcSepConsole) bcSepConsole.classList.add('hidden');
  if (bcConsole) bcConsole.classList.add('hidden');


  if (tier === 'national') {
    // 1. Sidebar Panels
    nationalPanel.classList.remove('hidden');
    regionalPanel.classList.add('hidden');

    // 2. Breadcrumbs
    bcSepRegion.classList.add('hidden');
    bcRegion.classList.add('hidden');
    bcSepAttraction.classList.add('hidden');
    bcAttraction.classList.add('hidden');

    // 3. Map Styling & Boundaries
    updateRegionDimming(null);
    setDistrictsVisibility(false);
    hideSiteMarkers();
    showRegionBadges();

    // 4. Camera Ease to National View
    map.flyTo({
      center: NATIONAL_VIEW.center,
      zoom: NATIONAL_VIEW.zoom,
      pitch: 0,
      bearing: 0,
      duration: 1500,
      essential: true
    });

  } else if (tier === 'regional') {
    // 1. Sidebar Panels
    nationalPanel.classList.add('hidden');
    regionalPanel.classList.remove('hidden');

    // Filter attractions for this region
    state.attractions = state.allAttractions.filter(a => 
      (a.region_id && a.region_id === regionId) || 
      (a.region && a.region.toLowerCase().includes(regionId))
    );
    state.filtered = [...state.attractions];

    // Reset category filter & render dynamic chips
    state.activeCategory = 'all';
    renderCategoryChips();
    renderAttractionsList();

    // 2. Breadcrumbs
    bcSepRegion.classList.remove('hidden');
    bcRegion.classList.remove('hidden');
    const regObj = state.regions.find(r => r.properties.region_id === regionId);
    const regName = regObj ? regObj.properties.name : (regionId === 'ashanti' ? 'Ashanti Region' : 'Central Region');
    bcRegion.innerText = regName;
    bcRegion.href = `#/${regionId}`;

    // Update regional panel header badge & search input placeholder
    const regionalBadge = document.getElementById('regional-badge-pill');
    if (regionalBadge) {
      regionalBadge.innerHTML = `
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
        <span>${regName} &bull; ${state.attractions.length} Verified Sites</span>
      `;
    }
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.placeholder = `Search ${regName} attractions, crafts, heritage...`;
    }

    // 3. Map Styling & Boundaries
    updateRegionDimming(regionId);
    await loadDistrictsForRegion(regionId);
    setDistrictsVisibility(true);
    hideRegionBadges();
    showSiteMarkers();

    // 4. Camera Ease to Region Bounds
    if (regObj && regObj.properties.bbox) {
      const [minx, miny, maxx, maxy] = regObj.properties.bbox;
      const sidebarWidth = window.innerWidth >= 768 ? 440 : 20;
      map.fitBounds([[minx, miny], [maxx, maxy]], {
        padding: { top: 40, bottom: 40, left: sidebarWidth, right: 40 },
        maxZoom: 10.2,
        duration: 1600
      });
    }

    // Site Slug modal auto-open
    if (siteSlug) {
      openModal(siteSlug);
    } else {
      closeModal();
    }
  }

  lucide.createIcons();
}

// Update MapLibre Paint Properties for Region Dimming
function updateRegionDimming(activeRegionId) {
  if (!map.getLayer('regions-fill')) return;

  if (!activeRegionId) {
    // National View: subtle tint, Central & Ashanti prominent
    map.setPaintProperty('regions-fill', 'fill-opacity', [
      'match',
      ['get', 'region_id'],
      'central', 0.16,
      'ashanti', 0.16,
      0.08
    ]);
    map.setPaintProperty('regions-fill', 'fill-color', [
      'match',
      ['get', 'region_id'],
      'central', '#006B3F',
      'ashanti', '#006B3F',
      '#4A5568'
    ]);
    map.setPaintProperty('regions-outline', 'line-color', [
      'match',
      ['get', 'region_id'],
      'central', '#FCD116',
      'ashanti', '#FCD116',
      '#A0AEC0'
    ]);
  } else {
    // Regional View: Active region remains vibrant, other 15 regions dimmed to 55% dark mask
    map.setPaintProperty('regions-fill', 'fill-opacity', [
      'case',
      ['==', ['get', 'region_id'], activeRegionId], 0.05,
      0.55 // Dimming mask
    ]);
    map.setPaintProperty('regions-fill', 'fill-color', [
      'case',
      ['==', ['get', 'region_id'], activeRegionId], '#006B3F',
      '#1A202C' // Dark dimming overlay
    ]);
    map.setPaintProperty('regions-outline', 'line-color', [
      'case',
      ['==', ['get', 'region_id'], activeRegionId], '#006B3F',
      '#2D3748'
    ]);
  }
}

// Toggle District Boundary visibility
function setDistrictsVisibility(visible) {
  if (map.getLayer('districts-line')) {
    map.setLayoutProperty('districts-line', 'visibility', visible ? 'visible' : 'none');
  }
}

// ---------------------------------------------------------------------------
// 3. UI Component Renderers
// ---------------------------------------------------------------------------

// Render Category Horizontal Filter Chips dynamically based on active region
function renderCategoryChips() {
  const container = document.getElementById('category-chips');
  if (!container) return;

  const counts = {};
  state.attractions.forEach(a => {
    counts[a.category] = (counts[a.category] || 0) + 1;
  });

  const categories = Object.keys(counts).sort();
  container.innerHTML = `
    <button data-category="all" class="category-chip ${state.activeCategory === 'all' ? 'active bg-ghana-green text-white border-ghana-green' : 'bg-gray-50 text-gray-700 border-gray-200'} whitespace-nowrap text-xs font-semibold px-3 py-1.5 rounded-full border shadow-sm transition-all">
      All (${state.attractions.length})
    </button>
    ${categories.map(cat => {
      const meta = CATEGORY_META[cat] || { icon: '📍', label: cat };
      const isActive = state.activeCategory === cat;
      return `
        <button data-category="${cat}" class="category-chip ${isActive ? 'active bg-ghana-green text-white border-ghana-green' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'} whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-full border transition-all">
          ${meta.icon} ${cat} (${counts[cat]})
        </button>
      `;
    }).join('')}
  `;

  // Attach filter event listeners
  container.querySelectorAll('.category-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('.category-chip').forEach(c => {
        c.classList.remove('active', 'bg-ghana-green', 'text-white', 'border-ghana-green');
        c.classList.add('bg-gray-50', 'text-gray-700', 'border-gray-200');
      });
      chip.classList.add('active', 'bg-ghana-green', 'text-white', 'border-ghana-green');
      chip.classList.remove('bg-gray-50', 'text-gray-700', 'border-gray-200');
      state.activeCategory = chip.dataset.category;
      applyFilters();
    });
  });
}

// Render National 16 Regions Deck in Sidebar
function renderNationalRegionsList() {
  const container = document.getElementById('regions-list');
  if (!container || !state.regions.length) return;

  container.innerHTML = state.regions.map(r => {
    const p = r.properties;
    const isCentral = p.region_id === 'central';
    const isAshanti = p.region_id === 'ashanti';
    const isActive = isCentral || isAshanti;

    let badgeHtml = '';
    if (isCentral) {
      badgeHtml = `<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
        <span>Active &bull; 20 Sites</span>
      </span>`;
    } else if (isAshanti) {
      badgeHtml = `<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
        <span>Active &bull; 25 Sites</span>
      </span>`;
    } else {
      badgeHtml = `<span class="bg-gray-100 text-gray-500 text-[10px] font-semibold px-2 py-0.5 rounded-full">
        Roadmap
      </span>`;
    }

    return `
      <div 
        onclick="navigateToRegion('${p.region_id}')"
        class="region-card p-3.5 rounded-xl border transition-all cursor-pointer ${
          isActive 
            ? 'bg-white border-emerald-300 shadow-md hover:border-emerald-500 hover:shadow-lg ring-1 ring-emerald-500/20' 
            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm opacity-90 hover:opacity-100'
        }"
      >
        <div class="flex items-start justify-between">
          <div>
            <h3 class="font-bold text-sm text-gray-900 flex items-center space-x-1.5">
              <span>${p.name}</span>
            </h3>
            <p class="text-xs text-gray-500 mt-0.5 flex items-center space-x-1">
              <i data-lucide="building" class="w-3 h-3 text-gray-400"></i>
              <span>Capital: <strong>${p.capital}</strong></span>
            </p>
          </div>
          <div>
            ${badgeHtml}
          </div>
        </div>

        <p class="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
          ${p.tagline}
        </p>

        <div class="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
          <span class="text-[11px] text-gray-400">
            ${isCentral ? 'Cape Coast &bull; Kakum &bull; Elmina' : (isAshanti ? 'Kumasi &bull; Lake Bosomtwe &bull; Bonwire' : 'ADM1 Region')}
          </span>
          <span class="${isActive ? 'text-ghana-green font-bold flex items-center space-x-1' : 'text-gray-400 font-medium'}">
            <span>${isActive ? 'Explore Region &rarr;' : 'View Bounds'}</span>
          </span>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// Navigate to Region
function navigateToRegion(regionId) {
  if (regionId === 'central' || regionId === 'ashanti') {
    window.location.hash = `#/${regionId}`;
  } else {
    const reg = state.regions.find(r => r.properties.region_id === regionId);
    if (reg && reg.properties.bbox) {
      const [minx, miny, maxx, maxy] = reg.properties.bbox;
      map.fitBounds([[minx, miny], [maxx, maxy]], { padding: 40, duration: 1500 });
      showToast(`📌 ${reg.properties.name}: Dataset curation scheduled for upcoming phase.`);
    }
  }
}

// Render National Floating Region Badges (Central and Ashanti Pills)
function renderRegionBadges() {
  const central = state.regions.find(r => r.properties.region_id === 'central');
  const ashanti = state.regions.find(r => r.properties.region_id === 'ashanti');

  if (central && !state.regionBadges['central']) {
    const el = document.createElement('div');
    el.className = 'region-badge-pill bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-xl border-2 border-ghana-gold flex items-center space-x-2 cursor-pointer hover:scale-105 transition-all text-xs font-bold text-gray-900 group';
    el.innerHTML = `
      <span class="w-2.5 h-2.5 rounded-full bg-ghana-green animate-pulse"></span>
      <span class="group-hover:text-ghana-green transition-colors">Central Region</span>
      <span class="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold">20 Sites</span>
    `;
    el.addEventListener('click', () => {
      window.location.hash = '#/central';
    });
    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([-1.2464, 5.1053])
      .addTo(map);
    state.regionBadges['central'] = marker;
  }

  if (ashanti && !state.regionBadges['ashanti']) {
    const el2 = document.createElement('div');
    el2.className = 'region-badge-pill bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-xl border-2 border-ghana-gold flex items-center space-x-2 cursor-pointer hover:scale-105 transition-all text-xs font-bold text-gray-900 group';
    el2.innerHTML = `
      <span class="w-2.5 h-2.5 rounded-full bg-ghana-green animate-pulse"></span>
      <span class="group-hover:text-ghana-green transition-colors">Ashanti Region</span>
      <span class="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold">25 Sites</span>
    `;
    el2.addEventListener('click', () => {
      window.location.hash = '#/ashanti';
    });
    const marker2 = new maplibregl.Marker({ element: el2 })
      .setLngLat([-1.6244, 6.6885])
      .addTo(map);
    state.regionBadges['ashanti'] = marker2;
  }
}

function showRegionBadges() {
  Object.values(state.regionBadges).forEach(m => {
    m.getElement().style.display = 'flex';
  });
}

function hideRegionBadges() {
  Object.values(state.regionBadges).forEach(m => {
    m.getElement().style.display = 'none';
  });
}

function showSiteMarkers() {
  renderMarkers();
}

function hideSiteMarkers() {
  Object.values(state.markers).forEach(m => m.remove());
  state.markers = {};
}

// ---------------------------------------------------------------------------
// 4. Attractions Markers & List Rendering
// ---------------------------------------------------------------------------

// Render HTML Markers on Map
function renderMarkers() {
  // If in national tier, don't clutter map with site pins
  if (state.currentTier === 'national') {
    hideSiteMarkers();
    return;
  }

  // Clear existing markers
  Object.values(state.markers).forEach(m => m.remove());
  state.markers = {};

  state.filtered.forEach(item => {
    const meta = CATEGORY_META[item.category] || { pinClass: 'pin-default', icon: '📍' };
    
    // Create custom DOM element for pin
    const el = document.createElement('div');
    el.className = `custom-pin ${meta.pinClass}`;
    el.id = `marker-${item.id}`;
    el.innerHTML = `<span class="custom-pin-inner">${meta.icon}</span>`;
    
    // MapLibre Popup
    const popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
      <div class="w-56 overflow-hidden">
        <img src="${item.image_url}" onerror="this.onerror=null; this.src='/static/img/placeholder.svg';" class="h-28 w-full object-cover" alt="${item.name}" />
        <div class="p-3">
          <span class="text-[10px] font-bold text-ghana-green uppercase tracking-wider">${item.category}</span>
          <h4 class="font-bold text-xs text-gray-900 leading-tight mt-0.5">${item.name}</h4>
          <p class="text-[11px] text-gray-500 mt-1">${item.district}</p>
          <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-[11px]">
            <span class="font-semibold text-gray-700">From GHS ${item.entry_fee_ghs.local_adult}</span>
            <div class="flex items-center space-x-1.5">
              ${item.id === 'kakum-national-park' ? `<button onclick="enterSiteConsole('central', 'kakum-national-park')" class="text-emerald-700 font-bold hover:underline text-[10px]">🌲 Console</button>` : ''}
              <button onclick="openModal('${item.id}')" class="text-ghana-green font-bold hover:underline">Details &rarr;</button>
            </div>
          </div>
        </div>
      </div>
    `);

    // Pin click event
    el.addEventListener('click', () => {
      selectAttraction(item.id);
    });

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([item.longitude, item.latitude])
      .setPopup(popup)
      .addTo(map);

    state.markers[item.id] = marker;
  });
}

// Render Sidebar List
function renderAttractionsList() {
  const container = document.getElementById('attractions-list');
  const countEl = document.getElementById('results-count');
  if (!container || !countEl) return;

  countEl.innerText = `${state.filtered.length} Attraction${state.filtered.length === 1 ? '' : 's'}`;

  if (state.filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 px-4">
        <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400 mb-3">
          <i data-lucide="map-pin-off" class="w-6 h-6"></i>
        </div>
        <h4 class="text-sm font-bold text-gray-700">No attractions match your search</h4>
        <p class="text-xs text-gray-500 mt-1">Try clearing filters or searching another keyword</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = state.filtered.map(item => {
    const meta = CATEGORY_META[item.category] || { icon: '📍', label: item.category };
    const distanceBadge = item.distance_km != null 
      ? `<span class="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
           <i data-lucide="navigation" class="w-3 h-3"></i>
           <span>${item.distance_km} km</span>
         </span>`
      : '';

    const feeText = item.entry_fee_ghs.local_adult === 0 
      ? '<span class="text-emerald-600 font-bold">Free Entry</span>' 
      : `<span class="font-bold text-gray-900">GHS ${item.entry_fee_ghs.local_adult}</span> <span class="text-gray-400 text-[10px]">local</span>`;

    return `
      <div id="card-${item.id}" onclick="selectAttraction('${item.id}')" class="attraction-card bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col group">
        <div class="relative h-36 overflow-hidden">
          <img src="${item.image_url}" onerror="this.onerror=null; this.src='/static/img/placeholder.svg';" alt="${item.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
          <div class="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-1 rounded-md flex items-center space-x-1">
            <span>${meta.icon}</span>
            <span>${item.category}</span>
          </div>
          ${distanceBadge ? `<div class="absolute top-2 right-2">${distanceBadge}</div>` : ''}
        </div>
        <div class="p-3.5 flex flex-col justify-between flex-1">
          <div>
            <div class="flex items-start justify-between">
              <h3 class="font-bold text-sm text-gray-900 leading-tight group-hover:text-ghana-green transition-colors">
                ${item.name}
              </h3>
            </div>
            <p class="text-xs text-gray-500 flex items-center space-x-1 mt-1">
              <i data-lucide="map-pin" class="w-3 h-3 text-gray-400"></i>
              <span>${item.district}</span>
            </p>
            <p class="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
              ${item.description}
            </p>
          </div>

          <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs">
            <div>
              ${feeText}
            </div>
            <div class="flex items-center space-x-1.5">
              ${item.id === 'kakum-national-park' ? `
                <button onclick="event.stopPropagation(); enterSiteConsole('central', 'kakum-national-park')" class="bg-emerald-800 hover:bg-emerald-900 text-white px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center space-x-1 shadow-sm transition-all">
                  <span>🌲 Site Console</span>
                </button>
              ` : ''}
              <button onclick="event.stopPropagation(); openModal('${item.id}')" class="bg-ghana-green/10 hover:bg-ghana-green text-ghana-green hover:text-white px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all">
                Details
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// Select an attraction (Highlight marker, fly map, highlight card)
function selectAttraction(id) {
  state.selectedId = id;
  const item = state.attractions.find(a => a.id === id);
  if (!item) return;

  // Highlight list card
  document.querySelectorAll('.attraction-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById(`card-${id}`);
  if (card) {
    card.classList.add('selected');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Fly Map camera smoothly
  map.flyTo({
    center: [item.longitude, item.latitude],
    zoom: 13.5,
    pitch: 30,
    speed: 1.2,
    essential: true
  });

  // Open Popup
  if (state.markers[id]) {
    state.markers[id].togglePopup();
  }
}

// ---------------------------------------------------------------------------
// 5. Attraction Detail Modal
// ---------------------------------------------------------------------------

// Open Detailed Attraction Modal Drawer
function openModal(id) {
  const item = state.attractions.find(a => a.id === id) || state.allAttractions.find(a => a.id === id);
  if (!item) return;

  const regId = item.region_id || (item.region && item.region.toLowerCase().includes('ashanti') ? 'ashanti' : 'central');

  // Update URL hash without pushing redundant history if already there
  if (window.location.hash !== `#/${regId}/${id}`) {
    window.location.hash = `#/${regId}/${id}`;
  }

  // Update Breadcrumbs
  const bcSepAttraction = document.getElementById('bc-sep-attraction');
  const bcAttraction = document.getElementById('bc-attraction');
  if (bcSepAttraction && bcAttraction) {
    bcSepAttraction.classList.remove('hidden');
    bcAttraction.classList.remove('hidden');
    bcAttraction.innerText = item.name;
  }

  const modal = document.getElementById('detail-modal');
  const content = document.getElementById('modal-content');
  const meta = CATEGORY_META[item.category] || { icon: '📍', label: item.category };

  // Gallery thumbnails strip
  const galleryStrip = (item.gallery && item.gallery.length > 0) ? `
    <div class="mt-4 px-6">
      <div class="flex items-center justify-between mb-2">
        <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-1.5">
          <i data-lucide="camera" class="w-3.5 h-3.5 text-ghana-gold"></i>
          <span>Authentic Visitor Photos (${item.gallery.length})</span>
        </h4>
        <span class="text-[10px] text-gray-400">Stored locally &bull; CC Licensed</span>
      </div>
      <div class="flex space-x-2 overflow-x-auto pb-2 scrollbar-thin">
        ${item.gallery.map((imgSrc, idx) => `
          <button 
            type="button"
            onclick="switchModalHero('${imgSrc}', this)"
            class="modal-gallery-thumb flex-shrink-0 h-16 w-24 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shadow-sm ${idx === 0 ? 'border-ghana-green ring-2 ring-emerald-400/50 scale-105' : 'border-transparent opacity-75 hover:opacity-100'}"
          >
            <img src="${imgSrc}" onerror="this.onerror=null; this.src='/static/img/placeholder.svg';" class="w-full h-full object-cover" alt="Visitor shot ${idx + 1}" />
          </button>
        `).join('')}
      </div>
    </div>
  ` : '';

  content.innerHTML = `
    <!-- Hero Image Banner -->
    <div class="relative h-64 sm:h-72 w-full overflow-hidden bg-gray-900">
      <img id="modal-hero-img" src="${item.image_url}" onerror="this.onerror=null; this.src='/static/img/placeholder.svg';" alt="${item.name}" class="w-full h-full object-cover transition-all duration-300" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"></div>
      <div class="absolute bottom-4 left-4 right-4 text-white">
        <span class="bg-ghana-gold text-ghana-dark text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider inline-flex items-center space-x-1">
          <span>${meta.icon}</span>
          <span>${item.category}</span>
        </span>
        <h2 class="text-xl sm:text-2xl font-black mt-2 leading-tight">${item.name}</h2>
        <p class="text-sm text-gray-200 mt-0.5">${item.local_name ? `${item.local_name} &bull; ` : ''}${item.district}, ${item.region}</p>
      </div>
    </div>

    ${galleryStrip}

    <!-- Body Information -->
    <div class="p-6 space-y-6">
      
      <!-- Grounded Data Verification Standard Badge -->
      <div class="flex flex-wrap items-center justify-between gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950">
        <div class="flex items-center space-x-1.5 font-bold text-emerald-800">
          <i data-lucide="shield-check" class="w-4 h-4 text-emerald-600"></i>
          <span>Grounded Fact Standard</span>
        </div>
        <div class="flex flex-wrap items-center gap-3 text-[11px] text-emerald-800">
          <span>Source: <strong class="text-gray-900">${item.source || 'Ghana Tourism Authority (GTA)'}</strong></span>
          <span>Verified: <strong class="text-gray-900">${item.verified_date || '2026-09-22'}</strong></span>
        </div>
      </div>

      <!-- Primary Overview -->
      <div>
        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">OVERVIEW</h4>
        <p class="text-sm text-gray-700 leading-relaxed">${item.description}</p>
      </div>

      <!-- Admission Fees Table -->
      <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center space-x-1.5">
            <i data-lucide="ticket" class="w-4 h-4 text-ghana-green"></i>
            <span>Indicative Entry Fees (Ghanaian Cedis - GHS)</span>
          </h4>
          <span class="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
            <i data-lucide="alert-triangle" class="w-3 h-3 text-amber-600"></i>
            <span>Confirm on Arrival</span>
          </span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
          <div class="bg-white p-2.5 rounded-lg border border-gray-200">
            <span class="text-[11px] text-gray-500 block">Ghanaian Adult</span>
            <span class="text-base font-black text-gray-900">GHS ${item.entry_fee_ghs.local_adult}</span>
          </div>
          <div class="bg-white p-2.5 rounded-lg border border-gray-200">
            <span class="text-[11px] text-gray-500 block">Ghanaian Student</span>
            <span class="text-base font-black text-gray-900">GHS ${item.entry_fee_ghs.local_student}</span>
          </div>
          <div class="bg-white p-2.5 rounded-lg border border-gray-200">
            <span class="text-[11px] text-gray-500 block">Foreign Adult</span>
            <span class="text-base font-black text-ghana-red">GHS ${item.entry_fee_ghs.foreigner_adult}</span>
          </div>
          <div class="bg-white p-2.5 rounded-lg border border-gray-200">
            <span class="text-[11px] text-gray-500 block">Foreign Student</span>
            <span class="text-base font-black text-ghana-red">GHS ${item.entry_fee_ghs.foreigner_student}</span>
          </div>
        </div>
        <p class="text-[10px] text-gray-500 mt-2.5 flex items-start space-x-1 leading-normal">
          <i data-lucide="info" class="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5"></i>
          <span>Official admission tariffs are subject to statutory adjustments by governing authorities. Please verify upon arrival.</span>
        </p>
      </div>

      <!-- Quick Fact Specs -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div class="flex items-start space-x-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200">
          <i data-lucide="clock" class="w-4 h-4 text-ghana-green flex-shrink-0 mt-0.5"></i>
          <div>
            <span class="font-bold text-gray-800 block">Operating Hours</span>
            <span class="text-gray-600">${item.opening_hours}</span>
          </div>
        </div>

        <div class="flex items-start space-x-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200">
          <i data-lucide="compass" class="w-4 h-4 text-ghana-green flex-shrink-0 mt-0.5"></i>
          <div>
            <span class="font-bold text-gray-800 block">Best Time & Duration</span>
            <span class="text-gray-600">${item.best_time_to_visit || 'Morning'} &bull; ~${item.duration_hours || 2} hours</span>
          </div>
        </div>

        <div class="flex items-start space-x-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200">
          <i data-lucide="car" class="w-4 h-4 text-ghana-green flex-shrink-0 mt-0.5"></i>
          <div>
            <span class="font-bold text-gray-800 block">Road Access & Vehicle</span>
            <span class="text-gray-600">${item.road_access.surface} &bull; ${item.road_access.vehicle_recommended}</span>
          </div>
        </div>

        <div class="flex items-start space-x-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200">
          <i data-lucide="shield-alert" class="w-4 h-4 text-ghana-green flex-shrink-0 mt-0.5"></i>
          <div>
            <span class="font-bold text-gray-800 block">Rainy Season Passability</span>
            <span class="${item.road_access.passable_rainy_season ? 'text-emerald-700' : 'text-rose-600'} font-semibold">
              ${item.road_access.passable_rainy_season ? 'Passable Year-Round' : '4x4 Required in Rainy Season'}
            </span>
          </div>
        </div>
      </div>

      <!-- What to Bring List -->
      ${item.what_to_bring && item.what_to_bring.length > 0 ? `
        <div>
          <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">WHAT TO BRING</h4>
          <div class="flex flex-wrap gap-1.5">
            ${item.what_to_bring.map(thing => `
              <span class="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-md border border-gray-200 flex items-center space-x-1">
                <span>&bull;</span>
                <span>${thing}</span>
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Action Buttons -->
      <div class="pt-4 border-t border-gray-200 flex flex-col gap-3">
        ${item.id === 'kakum-national-park' ? `
          <div class="p-3.5 bg-gradient-to-r from-emerald-950 to-ghana-dark rounded-xl border border-emerald-500/40 text-white shadow-md">
            <div class="flex items-start justify-between">
              <div>
                <span class="text-[10px] bg-ghana-gold text-ghana-dark font-black px-2 py-0.5 rounded-full uppercase">Tier-4 Pilot Active</span>
                <h4 class="text-sm font-black text-white mt-1">Grounded Micro-Spatial Site Console</h4>
                <p class="text-[11px] text-emerald-200 mt-0.5 leading-relaxed">
                  Inspect surveyed parking, reception hub, 7-bridge launch platform, emergency bailout path, and interactive pre-trip checklist.
                </p>
              </div>
              <span class="text-2xl flex-shrink-0 ml-2">🌲</span>
            </div>
            <button 
              onclick="closeModal(false); enterSiteConsole('central', 'kakum-national-park')"
              class="w-full mt-3 bg-ghana-gold hover:bg-yellow-400 text-ghana-dark font-black py-2.5 px-4 rounded-lg text-xs flex items-center justify-center space-x-2 shadow transition-all cursor-pointer"
            >
              <i data-lucide="map" class="w-4 h-4"></i>
              <span>Launch Site Console & Interactive Checklist &rarr;</span>
            </button>
          </div>
        ` : ''}

        <div class="flex flex-col sm:flex-row gap-3">
          <a 
            href="https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}" 
            target="_blank"
            class="flex-1 bg-ghana-green hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow transition-all"
          >
            <i data-lucide="navigation-2" class="w-4 h-4"></i>
            <span>Get Driving Directions</span>
          </a>

          <a 
            href="https://wa.me/?text=Check%20out%20${encodeURIComponent(item.name)}%20on%20ExploreGhana:%20${encodeURIComponent(window.location.origin + '/#/' + regId + '/' + item.id)}"
            target="_blank"
            class="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 border border-emerald-300 transition-all"
          >
            <i data-lucide="share-2" class="w-4 h-4"></i>
            <span>Share via WhatsApp</span>
          </a>
        </div>
      </div>

    </div>
  `;

  modal.classList.remove('hidden');
  setTimeout(() => modal.classList.remove('opacity-0'), 10);
  lucide.createIcons();
}

// Switch modal hero preview image when thumbnail clicked
function switchModalHero(imgSrc, btnEl) {
  const heroImg = document.getElementById('modal-hero-img');
  if (heroImg) {
    heroImg.src = imgSrc;
  }
  document.querySelectorAll('.modal-gallery-thumb').forEach(b => {
    b.classList.remove('border-ghana-green', 'ring-2', 'ring-emerald-400/50', 'scale-105');
    b.classList.add('border-transparent', 'opacity-75');
  });
  if (btnEl) {
    btnEl.classList.remove('border-transparent', 'opacity-75');
    btnEl.classList.add('border-ghana-green', 'ring-2', 'ring-emerald-400/50', 'scale-105');
  }
}

// Close Modal
function closeModal(updateHash = true) {
  const modal = document.getElementById('detail-modal');
  modal.classList.add('opacity-0');
  setTimeout(() => modal.classList.add('hidden'), 200);

  // Clear site breadcrumb if not transitioning to console
  if (state.currentTier !== 'site') {
    const bcSepAttraction = document.getElementById('bc-sep-attraction');
    const bcAttraction = document.getElementById('bc-attraction');
    if (bcSepAttraction && bcAttraction) {
      bcSepAttraction.classList.add('hidden');
      bcAttraction.classList.add('hidden');
    }
  }

  // Restore hash to region if we were viewing a site and updateHash is true
  if (updateHash) {
    if (state.selectedRegionId) {
      window.location.hash = `#/${state.selectedRegionId}`;
    } else {
      window.location.hash = '#/';
    }
  }
}

// ---------------------------------------------------------------------------
// 6. Event Listeners Configuration
// ---------------------------------------------------------------------------

function setupEventListeners() {
  // Modal Close
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);
  document.getElementById('detail-modal').addEventListener('click', (e) => {
    if (e.target.id === 'detail-modal') closeModal();
  });

  // Back to All Regions button
  document.getElementById('btn-back-national').addEventListener('click', () => {
    window.location.hash = '#/';
  });

  // Category Filter Chips
  const chips = document.querySelectorAll('.category-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.activeCategory = chip.dataset.category;
      applyFilters();
    });
  });

  // Search Input Filter
  const searchInput = document.getElementById('search-input');
  const clearBtn = document.getElementById('clear-search');

  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    if (state.searchQuery.length > 0) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }
    applyFilters();
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    clearBtn.classList.add('hidden');
    applyFilters();
  });

  // Proximity "Near Me" GPS Button
  document.getElementById('btn-locate-me').addEventListener('click', triggerNearMe);
  document.getElementById('btn-reset-nearby').addEventListener('click', () => {
    document.getElementById('nearby-banner').classList.add('hidden');
    state.userLocation = null;
    if (state.userMarker) {
      state.userMarker.remove();
      state.userMarker = null;
    }
    applyFilters();
  });

  // Boundary layer toggle
  document.getElementById('btn-toggle-boundary').addEventListener('click', () => {
    state.showBoundary = !state.showBoundary;
    const visibility = state.showBoundary ? 'visible' : 'none';
    if (map.getLayer('regions-fill')) {
      map.setLayoutProperty('regions-fill', 'visibility', visibility);
      map.setLayoutProperty('regions-outline', 'visibility', visibility);
    }
  });

  // Basemap style switcher
  document.getElementById('btn-style-streets').addEventListener('click', () => {
    map.setStyle(BASEMAP_STYLES.streets);
    setTimeout(() => {
      loadRegionsData();
      if (state.selectedRegionId) {
        loadDistrictsForRegion(state.selectedRegionId);
      }
      if (state.currentTier === 'site' && state.siteData) {
        setupMicroSpatialLayers(state.siteData.geojson);
        renderMicroMarkers(state.siteData.geojson);
      }
    }, 300);
  });
  document.getElementById('btn-style-satellite').addEventListener('click', () => {
    map.setStyle(BASEMAP_STYLES.satellite);
    setTimeout(() => {
      loadRegionsData();
      if (state.selectedRegionId) {
        loadDistrictsForRegion(state.selectedRegionId);
      }
      if (state.currentTier === 'site' && state.siteData) {
        setupMicroSpatialLayers(state.siteData.geojson);
        renderMicroMarkers(state.siteData.geojson);
      }
    }, 300);
  });

  // Mobile Drawer Toggle
  document.getElementById('btn-mobile-toggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('-translate-x-full');
  });

  // Setup Tier-4 Site Console Tab Listeners
  setupSiteConsoleTabs();
}

// Filter Attractions based on active category & query
function applyFilters() {
  state.filtered = state.attractions.filter(item => {
    const matchesCategory = state.activeCategory === 'all' || item.category === state.activeCategory;
    const q = state.searchQuery.toLowerCase();
    const matchesSearch = !q || (
      item.name.toLowerCase().includes(q) ||
      (item.local_name && item.local_name.toLowerCase().includes(q)) ||
      item.district.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.tags.some(t => t.toLowerCase().includes(q))
    );

    return matchesCategory && matchesSearch;
  });

  renderAttractionsList();
  renderMarkers();
}

// "Near Me" GPS Proximity Query using HTML5 Geolocation + Spatial API
function triggerNearMe() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }

  const locateBtn = document.getElementById('btn-locate-me');
  locateBtn.innerHTML = '<span class="animate-spin mr-1">⏳</span> Locating...';

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      state.userLocation = { lat, lon };

      locateBtn.innerHTML = '<i data-lucide="crosshair" class="w-3.5 h-3.5 text-ghana-gold"></i><span>Near Me</span>';
      lucide.createIcons();

      // Show user marker on map
      if (state.userMarker) state.userMarker.remove();
      
      const userEl = document.createElement('div');
      userEl.className = 'w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg ring-4 ring-blue-400/40 animate-pulse';
      state.userMarker = new maplibregl.Marker({ element: userEl })
        .setLngLat([lon, lat])
        .addTo(map);

      // Call Spatial Proximity API
      try {
        const res = await fetch(`/api/attractions/nearby?lat=${lat}&lon=${lon}&radius_km=100&limit=20`);
        const nearbyItems = await res.json();
        
        // Switch to region of the nearest site
        if (nearbyItems.length > 0) {
          const nearest = nearbyItems[0];
          const regId = nearest.region_id || (nearest.region && nearest.region.toLowerCase().includes('ashanti') ? 'ashanti' : 'central');
          if (state.selectedRegionId !== regId) {
            window.location.hash = `#/${regId}`;
          }
        } else if (state.currentTier !== 'regional') {
          window.location.hash = '#/central';
        }

        // Show nearby banner
        document.getElementById('nearby-banner').classList.remove('hidden');

        state.filtered = nearbyItems;
        renderAttractionsList();
        renderMarkers();

        // Fit map to user and nearest points
        map.flyTo({ center: [lon, lat], zoom: 10 });
      } catch (err) {
        console.error('Error in nearby search:', err);
      }
    },
    (err) => {
      locateBtn.innerHTML = '<i data-lucide="crosshair" class="w-3.5 h-3.5 text-ghana-gold"></i><span>Near Me</span>';
      lucide.createIcons();
      // If permission denied or simulated, fallback to Cape Coast center coordinates
      console.warn('Geolocation fallback to Cape Coast center:', err.message);
      simulateNearMe(5.1053, -1.2417);
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

// Fallback proximity simulation centered at Cape Coast
async function simulateNearMe(lat, lon) {
  try {
    const res = await fetch(`/api/attractions/nearby?lat=${lat}&lon=${lon}&radius_km=60&limit=20`);
    const nearbyItems = await res.json();
    if (nearbyItems.length > 0) {
      const nearest = nearbyItems[0];
      const regId = nearest.region_id || (nearest.region && nearest.region.toLowerCase().includes('ashanti') ? 'ashanti' : 'central');
      if (state.selectedRegionId !== regId) {
        window.location.hash = `#/${regId}`;
      }
    } else if (state.currentTier !== 'regional') {
      window.location.hash = '#/central';
    }
    document.getElementById('nearby-banner').classList.remove('hidden');
    state.filtered = nearbyItems;
    renderAttractionsList();
    renderMarkers();
  } catch (err) {
    console.error(err);
  }
}

// Toast notification helper
function showToast(msg) {
  const existing = document.getElementById('app-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'app-toast';
  toast.className = 'fixed bottom-8 right-8 z-50 bg-gray-900/95 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-gray-700 text-xs flex items-center space-x-2 animate-bounce';
  toast.innerHTML = `<span>${msg}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ---------------------------------------------------------------------------
// 7. Tier-4 Site Console & Micro-Spatial Pilot (Kakum National Park)
// ---------------------------------------------------------------------------

const CHECKLIST_STORAGE_KEY = 'exploreghana_kakum_checklist';

// Close all active popups on the map
function closeAllPopups() {
  if (state.activePopup) {
    try { state.activePopup.remove(); } catch(e){}
    state.activePopup = null;
  }
  Object.values(state.microMarkers).forEach(m => {
    try {
      const p = m.getPopup();
      if (p && p.isOpen()) p.remove();
    } catch(e){}
  });
}

// Quick Focus Camera Shortcuts for Tier-4 Zones
function focusSiteZone(zone) {
  closeAllPopups();
  const sidebarWidth = window.innerWidth >= 768 ? 440 : 0;
  const padding = { left: sidebarWidth, top: 40, bottom: 40, right: 40 };

  if (zone === 'hub') {
    // Focus on Visitor Services Hub (Parking, Reception, Tickets, Cafe, Washrooms)
    map.flyTo({
      center: [-1.3836, 5.34885],
      zoom: 18.1,
      pitch: 35,
      bearing: -10,
      padding: padding,
      duration: 1200,
      essential: true
    });
  } else if (zone === 'canopy') {
    // Focus on Canopy Walkway Platform 1 & Bridge 1 Bailout Route
    map.flyTo({
      center: [-1.3835, 5.3537],
      zoom: 17.6,
      pitch: 45,
      bearing: -15,
      padding: padding,
      duration: 1200,
      essential: true
    });
  } else if (zone === 'full') {
    // Fit entire trail extent
    map.fitBounds([
      [-1.3865, 5.3475],
      [-1.3810, 5.3570]
    ], {
      padding: padding,
      duration: 1400,
      maxZoom: 16.5
    });
  }
}

// ---------------------------------------------------------------------------
// TIER-4 STORYMAP & DUAL-MODE SPATIAL NARRATIVE ENGINE
// ---------------------------------------------------------------------------

let soundscapeAudioCtx = null;
let soundscapeGainNode = null;
let soundscapeInterval = null;

function toggleRainforestSound() {
  const btn = document.getElementById('soundscape-toggle-btn');
  const icon = document.getElementById('soundscape-icon');
  const label = document.getElementById('soundscape-label');

  const hudBtn = document.getElementById('hud-soundscape-btn');
  const hudIcon = document.getElementById('hud-soundscape-icon');
  const hudLabel = document.getElementById('hud-soundscape-label');

  if (state.soundscapeActive) {
    if (soundscapeGainNode && soundscapeAudioCtx) {
      try {
        soundscapeGainNode.gain.linearRampToValueAtTime(0.001, soundscapeAudioCtx.currentTime + 0.8);
        setTimeout(() => {
          try { soundscapeAudioCtx.close(); } catch(e){}
          soundscapeAudioCtx = null;
        }, 900);
      } catch(e){}
    }
    if (soundscapeInterval) clearInterval(soundscapeInterval);
    state.soundscapeActive = false;
    if (icon) icon.innerText = '🔇';
    if (label) label.innerText = 'Rainforest Sound';
    if (btn) btn.classList.remove('bg-emerald-700', 'text-white');

    if (hudIcon) hudIcon.innerText = '🔇';
    if (hudLabel) hudLabel.innerText = 'Rainforest Audio';
    if (hudBtn) hudBtn.classList.remove('bg-emerald-700', 'text-white');
  } else {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      soundscapeAudioCtx = new AudioCtx();
      
      const bufferSize = soundscapeAudioCtx.sampleRate * 2;
      const buffer = soundscapeAudioCtx.createBuffer(1, bufferSize, soundscapeAudioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }

      const noise = soundscapeAudioCtx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = soundscapeAudioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 450;

      soundscapeGainNode = soundscapeAudioCtx.createGain();
      soundscapeGainNode.gain.setValueAtTime(0.01, soundscapeAudioCtx.currentTime);
      soundscapeGainNode.gain.exponentialRampToValueAtTime(0.12, soundscapeAudioCtx.currentTime + 1.5);

      noise.connect(filter);
      filter.connect(soundscapeGainNode);
      soundscapeGainNode.connect(soundscapeAudioCtx.destination);
      noise.start(0);

      soundscapeInterval = setInterval(() => {
        if (!state.soundscapeActive || !soundscapeAudioCtx) return;
        try {
          const osc = soundscapeAudioCtx.createOscillator();
          const oscGain = soundscapeAudioCtx.createGain();
          const freqs = [1850, 2200, 2600, 3100];
          const f = freqs[Math.floor(Math.random() * freqs.length)];
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, soundscapeAudioCtx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(f * 0.75, soundscapeAudioCtx.currentTime + 0.18);
          oscGain.gain.setValueAtTime(0.02, soundscapeAudioCtx.currentTime);
          oscGain.gain.exponentialRampToValueAtTime(0.001, soundscapeAudioCtx.currentTime + 0.2);
          osc.connect(oscGain);
          oscGain.connect(soundscapeAudioCtx.destination);
          osc.start();
          osc.stop(soundscapeAudioCtx.currentTime + 0.22);
        } catch(e){}
      }, 3500);

      state.soundscapeActive = true;
      if (icon) icon.innerText = '🔊';
      if (label) label.innerText = 'Sound: Playing';
      if (btn) btn.classList.add('bg-emerald-700', 'text-white');

      if (hudIcon) hudIcon.innerText = '🔊';
      if (hudLabel) hudLabel.innerText = 'Playing';
      if (hudBtn) hudBtn.classList.add('bg-emerald-700', 'text-white');
    } catch(err) {
      console.warn('Web Audio not supported or blocked:', err);
      showToast('Audio autoplay not allowed without user gesture');
    }
  }
}

// Pause soundscape when browser tab is not active
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.soundscapeActive && soundscapeGainNode && soundscapeAudioCtx) {
    try { soundscapeGainNode.gain.setValueAtTime(0.0001, soundscapeAudioCtx.currentTime); } catch(e){}
  } else if (!document.hidden && state.soundscapeActive && soundscapeGainNode && soundscapeAudioCtx) {
    try { soundscapeGainNode.gain.setValueAtTime(0.12, soundscapeAudioCtx.currentTime); } catch(e){}
  }
});

// Dual-Mode Switching: StoryMap vs Explorer
function switchSiteSubMode(mode) {
  state.siteSubMode = mode;
  const storyBtn = document.getElementById('submode-btn-story');
  const explorerBtn = document.getElementById('submode-btn-explorer');
  const storyContainer = document.getElementById('site-story-container');
  const explorerContainer = document.getElementById('site-explorer-container');

  if (mode === 'story') {
    if (storyBtn) {
      storyBtn.className = 'flex-1 py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 bg-emerald-600 text-white shadow-sm cursor-pointer';
    }
    if (explorerBtn) {
      explorerBtn.className = 'flex-1 py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 text-emerald-300 hover:text-white cursor-pointer';
    }
    if (storyContainer) storyContainer.classList.remove('hidden');
    if (explorerContainer) explorerContainer.classList.add('hidden');

    if (state.siteData && state.siteData.story_chapters) {
      goToStoryChapter(state.currentStoryChapterIndex || 0);
    }
  } else {
    if (explorerBtn) {
      explorerBtn.className = 'flex-1 py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 bg-emerald-600 text-white shadow-sm cursor-pointer';
    }
    if (storyBtn) {
      storyBtn.className = 'flex-1 py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 text-emerald-300 hover:text-white cursor-pointer';
    }
    if (storyContainer) storyContainer.classList.add('hidden');
    if (explorerContainer) explorerContainer.classList.remove('hidden');
    closeStoryOverlay();
  }
  lucide.createIcons();
}

// ---------------------------------------------------------------------------
// Camera Choreography Engine (Doc 09 §4)
// ---------------------------------------------------------------------------

let driftAnimationId = null;
let driftBaseBearing = 0;
let driftStartTime = null;
let driftKilledForAct = false;

function runCameraTransition(spec) {
  if (!spec) return Promise.resolve();

  killAmbientDrift();
  driftKilledForAct = false;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    map.jumpTo({
      center: spec.center,
      zoom: spec.zoom,
      pitch: spec.pitch || 0,
      bearing: spec.bearing || 0
    });
    return Promise.resolve();
  }

  // Padding offset so focused feature centers in the visible canvas
  const padding = state.storyOverlayActive
    ? (window.innerWidth >= 768 ? { left: 480, top: 60, bottom: 60, right: 60 } : { top: 0, bottom: Math.round(window.innerHeight * 0.45), left: 20, right: 20 })
    : (window.innerWidth >= 768 ? { left: 440, top: 40, bottom: 40, right: 40 } : { top: 0, bottom: 40, left: 20, right: 20 });

  const transitionType = spec.transition || 'flyTo';

  return new Promise((resolve) => {
    if (transitionType === 'ease-chain' && spec.keyframes && spec.keyframes.length > 0) {
      // Chained easeTo keyframes (Customize-camera-animations pattern)
      let chain = Promise.resolve();
      spec.keyframes.forEach((kf) => {
        chain = chain.then(() => new Promise((kfResolve) => {
          map.easeTo({
            center: kf.center,
            zoom: kf.zoom,
            pitch: kf.pitch !== undefined ? kf.pitch : map.getPitch(),
            bearing: kf.bearing !== undefined ? kf.bearing : map.getBearing(),
            duration: kf.duration_ms || 1200,
            padding: padding
          });
          map.once('moveend', kfResolve);
        }));
      });
      chain.then(() => {
        startAmbientDriftIfNeeded(spec.ambient);
        resolve();
      });
    } else if (transitionType === 'fitBounds') {
      const bounds = spec.bounds || [
        [-1.3870, 5.3480],
        [-1.3800, 5.3580]
      ];
      map.fitBounds(bounds, {
        pitch: spec.pitch !== undefined ? spec.pitch : 30,
        bearing: spec.bearing !== undefined ? spec.bearing : 10,
        duration: (spec.fly_options && spec.fly_options.duration) || 3200,
        maxZoom: spec.zoom || 16.3,
        padding: padding
      });
      map.once('moveend', () => {
        startAmbientDriftIfNeeded(spec.ambient);
        resolve();
      });
    } else if (transitionType === 'easeTo') {
      map.easeTo({
        center: spec.center,
        zoom: spec.zoom,
        pitch: spec.pitch !== undefined ? spec.pitch : 0,
        bearing: spec.bearing !== undefined ? spec.bearing : 0,
        duration: (spec.fly_options && spec.fly_options.duration) || 2800,
        padding: padding
      });
      map.once('moveend', () => {
        startAmbientDriftIfNeeded(spec.ambient);
        resolve();
      });
    } else {
      // flyTo with curve and speed
      const curve = (spec.fly_options && spec.fly_options.curve) !== undefined ? spec.fly_options.curve : 1.42;
      const speed = (spec.fly_options && spec.fly_options.speed) !== undefined ? spec.fly_options.speed : 0.6;
      map.flyTo({
        center: spec.center,
        zoom: spec.zoom,
        pitch: spec.pitch !== undefined ? spec.pitch : 0,
        bearing: spec.bearing !== undefined ? spec.bearing : 0,
        curve: curve,
        speed: speed,
        padding: padding,
        essential: true
      });
      map.once('moveend', () => {
        startAmbientDriftIfNeeded(spec.ambient);
        resolve();
      });
    }
  });
}

function startAmbientDriftIfNeeded(ambientConfig) {
  if (!ambientConfig || !ambientConfig.drift) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (driftKilledForAct) return;

  killAmbientDrift();
  driftBaseBearing = map.getBearing();
  driftStartTime = performance.now();

  function step(timestamp) {
    if (driftKilledForAct) return;
    const elapsed = (timestamp - driftStartTime) / 1000;
    // Bearing oscillates +-0.8 degrees over ~40s (sine wave)
    const delta = Math.sin((elapsed / 40) * 2 * Math.PI) * 0.8;
    map.setBearing(driftBaseBearing + delta);
    driftAnimationId = requestAnimationFrame(step);
  }

  driftAnimationId = requestAnimationFrame(step);
}

function killAmbientDrift() {
  if (driftAnimationId) {
    cancelAnimationFrame(driftAnimationId);
    driftAnimationId = null;
  }
}

// User interaction events kill drift permanently for current act
['mousedown', 'wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(evt => {
  window.addEventListener(evt, (e) => {
    if (e.target.closest && (e.target.closest('#map') || e.target.closest('#storymap-overlay'))) {
      driftKilledForAct = true;
      killAmbientDrift();
    }
  }, { passive: true });
});

// ---------------------------------------------------------------------------
// Living Lines Engine (Progressive Line Draw & Dash-Flow)
// ---------------------------------------------------------------------------

let dashFlowAnimationId = null;
let dashStep = 0;

function startDashFlow() {
  if (dashFlowAnimationId) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function step() {
    dashStep = (dashStep + 1) % 100;
    const p1 = (dashStep * 0.08) % 2;
    if (map.getLayer('kakum-trail-line')) {
      try {
        map.setPaintProperty('kakum-trail-line', 'line-dasharray', [0.5 + p1, 2.2]);
      } catch(e){}
    }
    dashFlowAnimationId = setTimeout(() => requestAnimationFrame(step), 70);
  }
  step();
}

function stopDashFlow() {
  if (dashFlowAnimationId) {
    clearTimeout(dashFlowAnimationId);
    dashFlowAnimationId = null;
  }
  if (map.getLayer('kakum-trail-line')) {
    try { map.setPaintProperty('kakum-trail-line', 'line-dasharray', [1, 0]); } catch(e){}
  }
}

// Progressive Line Draw via requestAnimationFrame (Rule 5 & §5.2)
function animateLineDraw(featureId, durationMs = 2200) {
  if (!state.siteData || !state.siteData.geojson) return;
  const feat = state.siteData.geojson.features.find(f => f.properties && f.properties.id === featureId);
  if (!feat || !feat.geometry || !feat.geometry.coordinates) return;

  const coords = feat.geometry.coordinates;
  if (coords.length < 2) return;

  const animSource = map.getSource('kakum-animated-trail-source');
  if (!animSource) return;

  const startTime = performance.now();

  function frame(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / durationMs);
    const count = Math.max(2, Math.floor(progress * coords.length));
    const currentCoords = coords.slice(0, count);

    try {
      animSource.setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: currentCoords
          }
        }]
      });
    } catch(e){}

    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  }

  requestAnimationFrame(frame);
}

// Staggered Bridge Draw (Bridge 1 through 7, 180ms delay each)
function animateBridgesStaggered(delayMs = 180) {
  const bridgeIds = [
    'kakum-canopy-bridge-1',
    'kakum-canopy-bridge-2',
    'kakum-canopy-bridge-3',
    'kakum-canopy-bridge-4',
    'kakum-canopy-bridge-5',
    'kakum-canopy-bridge-6',
    'kakum-canopy-bridge-7'
  ];

  if (!map.getLayer('kakum-bridges-line')) return;

  // Start with empty filter
  map.setFilter('kakum-bridges-line', ['in', ['get', 'id'], ['literal', []]]);
  map.setFilter('kakum-bridges-glow', ['in', ['get', 'id'], ['literal', []]]);

  bridgeIds.forEach((id, idx) => {
    setTimeout(() => {
      const activeIds = bridgeIds.slice(0, idx + 1);
      if (map.getLayer('kakum-bridges-line')) {
        map.setFilter('kakum-bridges-line', ['in', ['get', 'id'], ['literal', activeIds]]);
        map.setFilter('kakum-bridges-glow', ['in', ['get', 'id'], ['literal', activeIds]]);
      }
    }, idx * delayMs);
  });
}

// ---------------------------------------------------------------------------
// Focus Semantics Engine (Rule 4: Focus is Subtraction)
// ---------------------------------------------------------------------------

function updateStoryFocusSemantics(ch, index) {
  // 1. POI Marker Focus Subtraction
  const focusIds = ch.focus_features || [];
  const hasFocus = focusIds.length > 0;

  Object.entries(state.microMarkers).forEach(([featId, marker]) => {
    const el = marker.getElement();
    if (!el) return;

    if (!hasFocus) {
      if (index === 0) {
        el.classList.remove('focused');
        el.classList.add('dimmed');
      } else {
        el.classList.remove('focused', 'dimmed');
      }
    } else if (focusIds.includes(featId)) {
      el.classList.add('focused');
      el.classList.remove('dimmed');
      el.setAttribute('aria-current', 'true');
    } else {
      el.classList.remove('focused');
      el.classList.add('dimmed');
      el.removeAttribute('aria-current');
    }
  });

  // 2. Vector Layer Opacity & Glow Transitions (Rule 4 & §5.1)
  // Boundary fill & outline
  if (map.getLayer('kakum-boundary-fill')) {
    map.setPaintProperty('kakum-boundary-fill', 'fill-opacity', index === 0 ? 0.10 : 0.03);
  }
  if (map.getLayer('kakum-boundary-line')) {
    map.setPaintProperty('kakum-boundary-line', 'line-opacity', index === 0 ? 0.90 : 0.25);
    map.setPaintProperty('kakum-boundary-line', 'line-width', index === 0 ? 2.5 : 1.5);
  }

  // Hub buildings and parking
  if (map.getLayer('kakum-parking-fill')) {
    map.setPaintProperty('kakum-parking-fill', 'fill-opacity', index === 1 ? 0.75 : 0.12);
  }
  if (map.getLayer('kakum-buildings-fill')) {
    map.setPaintProperty('kakum-buildings-fill', 'fill-opacity', index === 1 ? 0.75 : 0.12);
  }

  // Approach Trail
  if (map.getLayer('kakum-trail-line')) {
    map.setPaintProperty('kakum-trail-line', 'line-opacity', index === 2 ? 1.0 : 0.15);
    map.setPaintProperty('kakum-trail-line', 'line-width', index === 2 ? 4.5 : 2.5);
  }

  // Canopy Bridges
  if (map.getLayer('kakum-bridges-line')) {
    if (index === 3) {
      map.setPaintProperty('kakum-bridges-line', 'line-opacity', 1.0);
      map.setPaintProperty('kakum-bridges-line', 'line-width', 4.5);
      if (map.getLayer('kakum-bridges-glow')) {
        map.setPaintProperty('kakum-bridges-glow', 'line-opacity', 0.9);
      }
    } else if (index === 4) {
      map.setPaintProperty('kakum-bridges-line', 'line-opacity', 0.20);
      map.setPaintProperty('kakum-bridges-line', 'line-width', 2.5);
      if (map.getLayer('kakum-bridges-glow')) {
        map.setPaintProperty('kakum-bridges-glow', 'line-opacity', 0.15);
      }
    } else {
      map.setPaintProperty('kakum-bridges-line', 'line-opacity', 0.12);
      if (map.getLayer('kakum-bridges-glow')) {
        map.setPaintProperty('kakum-bridges-glow', 'line-opacity', 0.0);
      }
    }
  }
}

function resetFocusSemantics() {
  Object.values(state.microMarkers).forEach(m => {
    const el = m.getElement();
    if (el) {
      el.classList.remove('focused', 'dimmed');
      el.style.opacity = '1';
      el.style.filter = 'none';
      el.style.pointerEvents = 'auto';
    }
  });

  const allLayers = [
    'kakum-parking-fill', 'kakum-parking-line',
    'kakum-buildings-fill', 'kakum-buildings-line',
    'kakum-paved-line', 'kakum-trail-line',
    'kakum-bridges-glow', 'kakum-bridges-line'
  ];
  allLayers.forEach(id => {
    if (map.getLayer(id)) {
      if (id.includes('fill')) {
        map.setPaintProperty(id, 'fill-opacity', id.includes('parking') ? 0.35 : 0.4);
      } else if (id.includes('glow')) {
        map.setPaintProperty(id, 'line-opacity', 0.85);
      } else if (id.includes('line')) {
        map.setPaintProperty(id, 'line-opacity', 1.0);
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Scrollytelling Overlay & Chapter Progression (Doc 09 §6)
// ---------------------------------------------------------------------------

let storyObserver = null;

function renderStoryMode(data) {
  if (!data || !data.story_chapters) return;
  renderStoryChapter(state.currentStoryChapterIndex || 0);
  renderVerticalStratification(data.vertical_stratification);
  renderStoryOverlay(data);
}

function openStoryOverlay(targetIndex = 0) {
  state.storyOverlayActive = true;
  state.siteSubMode = 'story';

  // Hide left sidebar to let map fill full viewport
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.add('-translate-x-full', 'md:-translate-x-full');
  }

  // Show story overlay
  const overlay = document.getElementById('storymap-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    overlay.style.opacity = '1';
  }

  // Ensure steps are rendered
  if (state.siteData) {
    renderStoryOverlay(state.siteData);
  }

  // Jump to requested step
  setTimeout(() => {
    jumpToStoryStep(targetIndex);
  }, 100);

  lucide.createIcons();
}

function closeStoryOverlay() {
  state.storyOverlayActive = false;

  // Restore sidebar
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.remove('-translate-x-full', 'md:-translate-x-full');
  }

  // Hide overlay
  const overlay = document.getElementById('storymap-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }

  killAmbientDrift();
  stopDashFlow();
  resetFocusSemantics();
  focusSiteZone('hub');

  if (window.location.hash.includes('/story')) {
    window.location.hash = `#/central/kakum-national-park/console`;
  }
}

function jumpToStoryStep(index) {
  state.currentStoryStepIndex = index;
  const el = document.getElementById(`story-step-${index}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  for (let i = 0; i <= 5; i++) {
    const d = document.getElementById(`hud-dot-${i}`);
    if (d) {
      if (i === index) d.classList.add('active');
      else d.classList.remove('active');
    }
  }
}

function setupStoryScroller() {
  const container = document.getElementById('story-scroll-container');
  if (!container) return;

  container.removeEventListener('scroll', handleStoryContainerScroll);
  container.addEventListener('scroll', handleStoryContainerScroll, { passive: true });

  if (storyObserver) {
    storyObserver.disconnect();
  }

  const steps = container.querySelectorAll('.story-step');
  storyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const idx = parseInt(entry.target.dataset.stepIndex, 10);
        onStoryStepIntersection(idx);
      }
    });
  }, {
    root: container,
    threshold: 0.52
  });

  steps.forEach(s => storyObserver.observe(s));
}

function handleStoryContainerScroll() {
  const container = document.getElementById('story-scroll-container');
  if (!container) return;
  const maxScroll = container.scrollHeight - container.clientHeight;
  if (maxScroll > 0) {
    const pct = Math.min(100, Math.max(0, (container.scrollTop / maxScroll) * 100));
    const bar = document.getElementById('story-progress-bar');
    if (bar) bar.style.width = `${pct}%`;
  }
}

function onStoryStepIntersection(stepIdx) {
  state.currentStoryStepIndex = stepIdx;

  for (let i = 0; i <= 5; i++) {
    const d = document.getElementById(`hud-dot-${i}`);
    if (d) {
      if (i === stepIdx) d.classList.add('active');
      else d.classList.remove('active');
    }
  }

  if (stepIdx === 0) {
    // Intro step: macro overview
    killAmbientDrift();
    map.flyTo({
      center: [-1.38, 5.37],
      zoom: 12.0,
      pitch: 25,
      bearing: 0,
      duration: 1800
    });
    if (map.getLayer('kakum-boundary-fill')) {
      map.setPaintProperty('kakum-boundary-fill', 'fill-opacity', 0.12);
    }
    if (map.getLayer('kakum-boundary-line')) {
      map.setPaintProperty('kakum-boundary-line', 'line-opacity', 0.9);
    }
    Object.values(state.microMarkers).forEach(m => {
      const el = m.getElement();
      if (el) el.classList.add('dimmed');
    });
  } else {
    goToStoryChapter(stepIdx - 1, { source: 'scroll' });
  }
}

// Render Scrollytelling Steps (Intro + 5 Acts)
function renderStoryOverlay(data) {
  const container = document.getElementById('story-scroll-container');
  if (!container || !data || !data.story_chapters) return;

  const chapters = data.story_chapters;

  let stepsHtml = `
    <!-- Step 0: The Intro Step -->
    <section class="story-step w-full max-w-lg" id="story-step-0" data-step-index="0">
      <div class="story-step-card bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl border border-white/50 space-y-3.5">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
            Spatial Story Journey
          </span>
          <span class="text-[10px] font-bold text-gray-400">
            Kakum National Park &bull; Ghana
          </span>
        </div>

        <div>
          <h2 class="text-lg font-black text-gray-900 leading-tight">
            The Island of Green: 375 km² of Canopy Rainforest
          </h2>
          <p class="text-xs text-gray-600 mt-1 leading-relaxed">
            An interactive 3D cartographic expedition through one of West Africa's last primary rainforest refuges. 
            Scroll down to descend through the vertical strata from the forest floor to 40 meters above the ravine.
          </p>
        </div>

        <div class="rounded-xl overflow-hidden border border-gray-200 shadow-inner relative">
          <img src="/static/img/attractions/kakum-national-park/hero.jpg" alt="Kakum Canopy" class="w-full h-44 object-cover" />
          <div class="absolute bottom-1 right-2 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded font-mono">
            Wikimedia Commons (CC BY-SA)
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 text-center text-[10px]">
          <div class="bg-gray-50 p-2 rounded-xl border border-gray-200">
            <span class="text-gray-400 block font-semibold">Bridges</span>
            <strong class="text-emerald-800 text-xs font-black">7 Spans</strong>
          </div>
          <div class="bg-gray-50 p-2 rounded-xl border border-gray-200">
            <span class="text-gray-400 block font-semibold">Max Drop</span>
            <strong class="text-emerald-800 text-xs font-black">~40 Meters</strong>
          </div>
          <div class="bg-gray-50 p-2 rounded-xl border border-gray-200">
            <span class="text-gray-400 block font-semibold">Reserve</span>
            <strong class="text-emerald-800 text-xs font-black">375 km²</strong>
          </div>
        </div>

        <div class="pt-2 border-t border-gray-100 flex items-center justify-between">
          <span class="text-xs text-emerald-800 font-bold flex items-center space-x-1.5 animate-pulse">
            <span>Scroll down to begin</span>
            <span>↓</span>
          </span>
          <button type="button" onclick="jumpToStoryStep(1)" class="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm transition-all cursor-pointer">
            Begin Act I &rarr;
          </button>
        </div>
      </div>
    </section>
  `;

  chapters.forEach((ch, idx) => {
    const stepIdx = idx + 1;
    stepsHtml += `
      <section class="story-step w-full max-w-lg" id="story-step-${stepIdx}" data-step-index="${stepIdx}">
        <div class="story-step-card bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl border border-white/50 space-y-3.5">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
              ${ch.act_title}
            </span>
            <span class="text-[10px] font-bold text-gray-400">
              ${ch.era}
            </span>
          </div>

          <div>
            <h3 class="text-base font-black text-gray-900 leading-snug">
              ${ch.subtitle}
            </h3>
            <div class="flex items-center space-x-2 mt-1 text-[11px] text-gray-500">
              <span class="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                🏔️ ${ch.elevation_m}m Elevation
              </span>
              <span>&bull;</span>
              <span class="font-semibold">Act ${ch.act_number} of 5</span>
              ${ch.stratum_ref !== undefined ? `
                <span>&bull;</span>
                <button type="button" onclick="focusVerticalStratum(${ch.stratum_ref})" class="text-emerald-700 font-bold hover:underline">
                  Stratum Profile 🌲
                </button>
              ` : ''}
            </div>
          </div>

          ${ch.media && ch.media.image ? `
            <div class="rounded-xl overflow-hidden border border-gray-200 relative shadow-inner">
              <img src="${ch.media.image}" alt="${ch.act_title}" class="w-full h-40 object-cover" onerror="this.src='/static/img/attractions/kakum-national-park/hero.jpg'" />
              <div class="absolute bottom-1 right-2 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded font-mono">
                ${ch.media.credit || 'CC BY-SA'}
              </div>
            </div>
          ` : ''}

          <p class="text-xs text-gray-800 leading-relaxed font-normal">
            ${ch.narrative}
          </p>

          ${ch.proverb ? `
            <div class="proverb-quote p-3 text-xs text-amber-900 shadow-2xs">
              "${ch.proverb}"
            </div>
          ` : ''}

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div class="p-2.5 bg-emerald-50/90 rounded-xl border border-emerald-100 space-y-1">
              <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block">🌿 Ecological Science</span>
              <p class="text-[11px] text-emerald-900 leading-tight">${ch.ecological_focus}</p>
            </div>
            <div class="p-2.5 bg-amber-50/90 rounded-xl border border-amber-100 space-y-1">
              <span class="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">🏺 Cultural Heritage</span>
              <p class="text-[11px] text-amber-900 leading-tight">${ch.cultural_heritage}</p>
            </div>
          </div>

          ${ch.narrative_sources && ch.narrative_sources.length > 0 ? `
            <details class="text-[10px] text-gray-500 bg-gray-50/90 p-2.5 rounded-xl border border-gray-200">
              <summary class="font-bold text-gray-700 cursor-pointer flex items-center justify-between select-none">
                <span>📋 Verified Spatial & Historical Citations</span>
                <span class="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded text-[9px]">Verified</span>
              </summary>
              <div class="space-y-1 mt-2 pt-2 border-t border-gray-200">
                ${ch.narrative_sources.map(ns => `
                  <div class="leading-snug">
                    <strong class="text-gray-900">&bull; ${ns.claim}:</strong>
                    <span class="text-gray-600">${ns.source}</span>
                    <span class="text-gray-400 font-mono">(${ns.verified_date})</span>
                  </div>
                `).join('')}
              </div>
            </details>
          ` : ''}

          <div class="flex items-center justify-between pt-2 border-t border-gray-100 text-xs font-semibold">
            <button 
              type="button" 
              onclick="jumpToStoryStep(${stepIdx - 1})"
              class="text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 py-1.5 px-3 rounded-xl border border-gray-200 transition-all cursor-pointer"
            >
              <span>← Prev</span>
            </button>

            ${stepIdx === 5 ? `
              <button 
                type="button" 
                onclick="closeStoryOverlay()"
                class="bg-gradient-to-r from-emerald-700 to-emerald-800 text-white py-1.5 px-4 rounded-xl shadow-md font-bold transition-all cursor-pointer flex items-center space-x-1.5"
              >
                <span>Continue to Explorer Tools 🛠️</span>
              </button>
            ` : `
              <button 
                type="button" 
                onclick="jumpToStoryStep(${stepIdx + 1})"
                class="bg-emerald-700 hover:bg-emerald-800 text-white py-1.5 px-3.5 rounded-xl shadow-sm transition-all cursor-pointer flex items-center space-x-1"
              >
                <span>Next Act →</span>
              </button>
            `}
          </div>
        </div>
      </section>
    `;
  });

  container.innerHTML = stepsHtml;
  setupStoryScroller();
}

// Single Entry Point for Chapter Navigation (Doc 09 §6.3)
function goToStoryChapter(index, opts = {}) {
  const chapters = state.siteData ? state.siteData.story_chapters : null;
  if (!chapters || index < 0 || index >= chapters.length) return;

  state.currentStoryChapterIndex = index;
  state.currentStoryStepIndex = index + 1;
  closeAllPopups();

  // 1. Update Timeline & HUD dots
  for (let i = 0; i < chapters.length; i++) {
    const sDot = document.getElementById(`story-dot-${i}`);
    if (sDot) {
      if (i === index) sDot.classList.add('active');
      else sDot.classList.remove('active');
    }
    const hDot = document.getElementById(`hud-dot-${i + 1}`);
    if (hDot) {
      if (i === index) hDot.classList.add('active');
      else hDot.classList.remove('active');
    }
  }
  const introHudDot = document.getElementById('hud-dot-0');
  if (introHudDot) introHudDot.classList.remove('active');

  // 2. Render sidebar card
  renderStoryChapter(index);

  const ch = chapters[index];

  // 3. Camera Transition (Rule 2 & 3)
  runCameraTransition(ch.camera);

  // 4. Focus Subtraction & Paint Transitions (Rule 1 & 4)
  updateStoryFocusSemantics(ch, index);

  // 5. Living Line Progressive Draws (Rule 5)
  if (ch.draw_line === 'kakum-paved-concourse') {
    animateLineDraw('kakum-paved-concourse', 2200);
  } else if (ch.draw_line === 'kakum-canopy-trail-approach') {
    animateLineDraw('kakum-canopy-trail-approach', 2500);
  } else if (ch.draw_line === 'kakum-bridges-draw') {
    animateBridgesStaggered(180);
  } else {
    const animSrc = map.getSource('kakum-animated-trail-source');
    if (animSrc) {
      animSrc.setData({ type: 'FeatureCollection', features: [] });
    }
  }

  // 6. Dash-Flow (Rule 5 & §5.2)
  if (ch.ambient && ch.ambient.dash_flow) {
    startDashFlow();
  } else {
    stopDashFlow();
  }

  // 7. Vertical Stratum Link (Doc 09 §7, fixes D8)
  if (ch.stratum_ref !== undefined) {
    document.querySelectorAll('.vertical-stratum-card').forEach((c, i) => {
      if (i === ch.stratum_ref) c.classList.add('active');
      else c.classList.remove('active');
    });
  }

  // 8. Mark active step in overlay
  document.querySelectorAll('.story-step').forEach((s, idx) => {
    if (idx === index + 1) s.classList.add('is-active');
    else s.classList.remove('is-active');
  });

  // 9. If not triggered by scroll, scroll overlay into view
  if (opts.source !== 'scroll' && state.storyOverlayActive) {
    const cardEl = document.getElementById(`story-step-${index + 1}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // 10. Update URL hash cleanly (deep-linking)
  const targetHash = `#/central/kakum-national-park/story/act-${index + 1}`;
  if (window.location.hash !== targetHash && opts.source !== 'hash') {
    history.replaceState(null, '', targetHash);
  }
}

// Render Chapter Card in Sidebar
function renderStoryChapter(index) {
  const chapters = state.siteData ? state.siteData.story_chapters : null;
  if (!chapters || !chapters[index]) return;
  const ch = chapters[index];
  const card = document.getElementById('story-chapter-card');
  if (!card) return;

  const total = chapters.length;

  card.innerHTML = `
    <div class="space-y-3">
      <div>
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            ${ch.act_title}
          </span>
          <span class="text-[10px] font-bold text-gray-400">
            ${ch.era}
          </span>
        </div>
        <h3 class="text-sm font-black text-gray-900 leading-snug mt-1.5">
          ${ch.subtitle}
        </h3>
        <div class="flex items-center space-x-2 mt-1 text-[10px] text-gray-500">
          <span class="bg-gray-100 px-2 py-0.5 rounded font-semibold text-gray-700">🏔️ ${ch.elevation_m}m Elevation</span>
          <span>&bull;</span>
          <span>Act ${ch.act_number} of ${total}</span>
        </div>
      </div>

      ${ch.media && ch.media.image ? `
        <div class="rounded-xl overflow-hidden border border-gray-200 relative group shadow-2xs">
          <img src="${ch.media.image}" alt="${ch.act_title}" class="w-full h-36 object-cover" onerror="this.src='/static/img/attractions/kakum-national-park/hero.jpg'" />
          <div class="absolute bottom-1 right-2 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded backdrop-blur-xs font-mono">
            ${ch.media.credit || 'CC BY-SA'}
          </div>
        </div>
      ` : ''}

      <p class="text-xs text-gray-700 leading-relaxed">
        ${ch.narrative}
      </p>

      ${ch.proverb ? `
        <div class="proverb-quote p-2.5 text-xs text-amber-900">
          "${ch.proverb}"
        </div>
      ` : ''}

      <div class="space-y-1.5 pt-1">
        <div class="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-100 text-xs text-emerald-950 space-y-1">
          <div class="flex items-center space-x-1.5 font-bold text-[11px] text-emerald-900">
            <span>🌿</span>
            <span>Ecological Science</span>
          </div>
          <p class="text-[11px] text-emerald-800 leading-snug">
            ${ch.ecological_focus}
          </p>
        </div>

        <div class="p-2.5 bg-amber-50/70 rounded-xl border border-amber-100 text-xs text-amber-950 space-y-1">
          <div class="flex items-center space-x-1.5 font-bold text-[11px] text-amber-900">
            <span>🏺</span>
            <span>Cultural & Sacred Heritage</span>
          </div>
          <p class="text-[11px] text-amber-800 leading-snug">
            ${ch.cultural_heritage}
          </p>
        </div>
      </div>

      ${ch.narrative_sources && ch.narrative_sources.length > 0 ? `
        <details class="text-[10px] text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-200">
          <summary class="font-bold text-gray-700 cursor-pointer flex items-center justify-between select-none">
            <span>📋 Verified Narrative Citations (${ch.narrative_sources.length})</span>
            <span class="text-emerald-700 font-bold">Rule 6 Verified</span>
          </summary>
          <div class="space-y-1 mt-1.5 pt-1.5 border-t border-gray-200">
            ${ch.narrative_sources.map(ns => `
              <div class="leading-tight">
                <strong class="text-gray-800">&bull; ${ns.claim}:</strong>
                <span class="text-gray-600">${ns.source}</span>
                <span class="text-gray-400 font-mono">(${ns.verified_date})</span>
              </div>
            `).join('')}
          </div>
        </details>
      ` : ''}

      <div class="flex items-center justify-between pt-2 border-t border-gray-100 text-xs font-semibold">
        <button 
          type="button" 
          onclick="goToStoryChapter(${index - 1})"
          ${index === 0 ? 'disabled class="text-gray-300 cursor-not-allowed py-1.5 px-3 rounded-lg border border-gray-100"' : 'class="text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 py-1.5 px-3 rounded-lg border border-gray-200 transition-all cursor-pointer flex items-center space-x-1"'}
        >
          <span>← Prev Act</span>
        </button>

        <button 
          type="button" 
          onclick="openStoryOverlay(${index + 1})"
          class="text-emerald-700 hover:bg-emerald-50 py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center space-x-1"
          title="Expand to Full-Viewport 3D StoryMap"
        >
          <span>✨ Fullscreen</span>
        </button>

        <button 
          type="button" 
          onclick="goToStoryChapter(${index + 1})"
          ${index === total - 1 ? 'disabled class="text-gray-300 cursor-not-allowed py-1.5 px-3 rounded-lg border border-gray-100"' : 'class="bg-emerald-700 hover:bg-emerald-800 text-white py-1.5 px-3 rounded-lg shadow-sm transition-all cursor-pointer flex items-center space-x-1"'}
        >
          <span>Next Act →</span>
        </button>
      </div>
    </div>
  `;
}

// Keyboard Navigation for StoryMap Overlay
window.addEventListener('keydown', (e) => {
  if (!state.storyOverlayActive) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
    e.preventDefault();
    const nextIdx = Math.min(5, (state.currentStoryStepIndex || 0) + 1);
    jumpToStoryStep(nextIdx);
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
    e.preventDefault();
    const prevIdx = Math.max(0, (state.currentStoryStepIndex || 0) - 1);
    jumpToStoryStep(prevIdx);
  } else if (e.key === 'Escape') {
    closeStoryOverlay();
  }
});

function renderVerticalStratification(strata) {
  const container = document.getElementById('vertical-strata-list');
  if (!container || !strata) return;

  container.innerHTML = strata.map((s, idx) => `
    <div 
      onclick="focusVerticalStratum(${idx})"
      class="vertical-stratum-card p-2.5 bg-white rounded-xl border border-gray-200 hover:border-emerald-500 cursor-pointer shadow-2xs transition-all space-y-1"
      id="stratum-card-${idx}"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-1.5">
          <span class="text-base">${s.icon}</span>
          <div>
            <h5 class="text-xs font-bold text-gray-900 leading-tight">${s.stratum}</h5>
            <span class="text-[10px] text-gray-500">${s.altitude_label}</span>
          </div>
        </div>
        <div class="text-right">
          <span class="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
            ☀️ ${s.sunlight_pct}% Light
          </span>
        </div>
      </div>
      <p class="text-[11px] text-gray-600 leading-snug">
        ${s.human_experience}
      </p>
      <div class="flex flex-wrap gap-1 pt-0.5 text-[9px]">
        <span class="font-semibold text-gray-400 uppercase tracking-wider">Species:</span>
        ${s.key_species.slice(0, 3).map(sp => `
          <span class="bg-gray-100 text-gray-700 px-1.5 py-0.2 rounded font-medium">${sp}</span>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function focusVerticalStratum(idx) {
  const strata = state.siteData ? state.siteData.vertical_stratification : null;
  if (!strata || !strata[idx]) return;

  document.querySelectorAll('.vertical-stratum-card').forEach((c, i) => {
    if (i === idx) c.classList.add('active');
    else c.classList.remove('active');
  });

  const sidebarWidth = window.innerWidth >= 768 ? 440 : 0;
  closeAllPopups();

  if (idx === 0) {
    map.flyTo({
      center: [-1.3825, 5.3532],
      zoom: 18.6,
      pitch: 60,
      bearing: -20,
      padding: { left: sidebarWidth, top: 40, bottom: 40, right: 40 },
      duration: 1400
    });
  } else if (idx === 1) {
    map.flyTo({
      center: [-1.3835, 5.3537],
      zoom: 18.2,
      pitch: 45,
      bearing: -10,
      padding: { left: sidebarWidth, top: 40, bottom: 40, right: 40 },
      duration: 1400
    });
  } else if (idx === 2) {
    map.flyTo({
      center: [-1.3828, 5.3512],
      zoom: 17.8,
      pitch: 50,
      bearing: -15,
      padding: { left: sidebarWidth, top: 40, bottom: 40, right: 40 },
      duration: 1400
    });
  } else {
    map.flyTo({
      center: [-1.3836, 5.34885],
      zoom: 18.2,
      pitch: 35,
      bearing: -10,
      padding: { left: sidebarWidth, top: 40, bottom: 40, right: 40 },
      duration: 1400
    });
  }
}

async function enterSiteConsole(regionId = 'central', siteSlug = 'kakum-national-park', initialSubMode = 'story', targetAct = null) {
  state.currentTier = 'site';
  state.selectedRegionId = regionId;
  state.selectedSiteId = siteSlug;

  // Close any stray open popups
  closeAllPopups();

  // Hide regional legend card to free up map space
  const regLeg = document.getElementById('region-legend-card');
  if (regLeg) regLeg.classList.add('hidden');

  // Toggle sidebar panels
  const nationalPanel = document.getElementById('national-panel');
  const regionalPanel = document.getElementById('regional-panel');
  const siteConsolePanel = document.getElementById('site-console-panel');
  if (nationalPanel) nationalPanel.classList.add('hidden');
  if (regionalPanel) regionalPanel.classList.add('hidden');
  if (siteConsolePanel) siteConsolePanel.classList.remove('hidden');

  // Update Breadcrumbs
  const bcSepRegion = document.getElementById('bc-sep-region');
  const bcRegion = document.getElementById('bc-region');
  const bcSepAttraction = document.getElementById('bc-sep-attraction');
  const bcAttraction = document.getElementById('bc-attraction');
  const bcSepConsole = document.getElementById('bc-sep-console');
  const bcConsole = document.getElementById('bc-console');

  if (bcSepRegion && bcRegion) {
    bcSepRegion.classList.remove('hidden');
    bcRegion.classList.remove('hidden');
    bcRegion.innerText = regionId === 'ashanti' ? 'Ashanti Region' : 'Central Region';
    bcRegion.href = `#/${regionId}`;
  }
  if (bcSepAttraction && bcAttraction) {
    bcSepAttraction.classList.remove('hidden');
    bcAttraction.classList.remove('hidden');
    bcAttraction.innerText = 'Kakum National Park';
    bcAttraction.href = `#/${regionId}/${siteSlug}`;
  }
  if (bcSepConsole && bcConsole) {
    bcSepConsole.classList.remove('hidden');
    bcConsole.classList.remove('hidden');
  }

  // Hide general regional markers and boundary lines
  hideSiteMarkers();
  hideRegionBadges();
  setDistrictsVisibility(false);

  // Fetch micro-spatial dataset
  try {
    const res = await fetch(`/api/attractions/${siteSlug}/micro-spatial`);
    if (!res.ok) throw new Error(`Failed to load micro-spatial dataset for ${siteSlug}`);
    const data = await res.json();
    state.siteData = data;

    // Render Micro-Spatial Vector Layers (Parking, Buildings, Concourse, Trails, 7 Bridges, Boundary)
    await setupMicroSpatialLayers(data.geojson);

    // Render HTML Markers on Map
    renderMicroMarkers(data.geojson);

    // Render StoryMap Mode
    renderStoryMode(data);

    // Render Sidebar Console Panels
    renderMicroPOIsTab(data.geojson);
    renderEligibilityTab(data.eligibility_criteria);
    renderChecklistTab(data.pre_trip_checklist);
    renderDisputedSpecsTab(data.disputed_specifications);
    renderSafetyTab(data.physical_safety_protocols, data.official_contacts);

    if (initialSubMode === 'story') {
      let targetStep = 0;
      if (targetAct) {
        if (targetAct.startsWith('act-')) {
          targetStep = parseInt(targetAct.replace('act-', ''), 10);
        } else if (!isNaN(parseInt(targetAct, 10))) {
          targetStep = parseInt(targetAct, 10);
        }
      }
      openStoryOverlay(targetStep);
    } else {
      switchSiteSubMode('explorer');
      focusSiteZone('hub');
    }

  } catch (err) {
    console.error('Error in enterSiteConsole:', err);
    showToast('Failed to load Kakum micro-spatial dataset');
  }

  lucide.createIcons();
}

function exitSiteConsole(updateHash = true) {
  closeAllPopups();

  if (state.soundscapeActive) {
    toggleRainforestSound();
  }

  // Clear micro markers from map
  Object.values(state.microMarkers).forEach(m => m.remove());
  state.microMarkers = {};

  // Remove micro-spatial vector layers
  removeMicroSpatialLayers();

  // Hide console panel
  const siteConsolePanel = document.getElementById('site-console-panel');
  if (siteConsolePanel) siteConsolePanel.classList.add('hidden');

  // Restore regional legend card
  const regLeg = document.getElementById('region-legend-card');
  if (regLeg) regLeg.classList.remove('hidden');

  // Clear console breadcrumb
  const bcSepConsole = document.getElementById('bc-sep-console');
  const bcConsole = document.getElementById('bc-console');
  if (bcSepConsole && bcConsole) {
    bcSepConsole.classList.add('hidden');
    bcConsole.classList.add('hidden');
  }

  state.currentTier = 'regional';
  state.selectedSiteId = null;

  if (updateHash) {
    window.location.hash = `#/${state.selectedRegionId || 'central'}`;
  }
}


async function setupMicroSpatialLayers(geojson) {
  // 1. Boundary Polygon Layer (375 km² Macro Context, Doc 09 Act I)
  try {
    const bRes = await fetch('/api/attractions/kakum-national-park/boundary');
    if (bRes.ok) {
      const bData = await bRes.json();
      if (!map.getSource('kakum-boundary-source')) {
        map.addSource('kakum-boundary-source', {
          type: 'geojson',
          data: bData
        });

        map.addLayer({
          id: 'kakum-boundary-fill',
          type: 'fill',
          source: 'kakum-boundary-source',
          paint: {
            'fill-color': '#059669',
            'fill-opacity': 0.10
          }
        }, 'kakum-hillshade');

        map.addLayer({
          id: 'kakum-boundary-line',
          type: 'line',
          source: 'kakum-boundary-source',
          paint: {
            'line-color': '#10b981',
            'line-width': 2.5,
            'line-opacity': 0.85
          }
        });
      } else {
        map.getSource('kakum-boundary-source').setData(bData);
        ['kakum-boundary-fill', 'kakum-boundary-line'].forEach(id => {
          if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'visible');
        });
      }
    }
  } catch (bErr) {
    console.warn('Boundary polygon load notice:', bErr);
  }

  // 2. Micro-Spatial Source & Vector Layers
  if (map.getSource('kakum-micro-source')) {
    map.getSource('kakum-micro-source').setData(geojson);
    [
      'kakum-parking-fill', 'kakum-parking-line', 
      'kakum-buildings-fill', 'kakum-buildings-line', 
      'kakum-paved-line', 'kakum-trail-line',
      'kakum-bridges-glow', 'kakum-bridges-line'
    ].forEach(id => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'visible');
    });
    return;
  }

  map.addSource('kakum-micro-source', {
    type: 'geojson',
    data: geojson
  });

  // Parking fill
  map.addLayer({
    id: 'kakum-parking-fill',
    type: 'fill',
    source: 'kakum-micro-source',
    filter: ['==', ['get', 'category'], 'parking'],
    paint: {
      'fill-color': '#2563eb',
      'fill-opacity': 0.35
    }
  });

  // Parking outline
  map.addLayer({
    id: 'kakum-parking-line',
    type: 'line',
    source: 'kakum-micro-source',
    filter: ['==', ['get', 'category'], 'parking'],
    paint: {
      'line-color': '#1d4ed8',
      'line-width': 2.5
    }
  });

  // Buildings fill (Museum, Toilets)
  map.addLayer({
    id: 'kakum-buildings-fill',
    type: 'fill',
    source: 'kakum-micro-source',
    filter: ['==', '$type', 'Polygon'],
    paint: {
      'fill-color': '#059669',
      'fill-opacity': 0.4
    }
  });

  // Buildings outline
  map.addLayer({
    id: 'kakum-buildings-line',
    type: 'line',
    source: 'kakum-micro-source',
    filter: ['==', '$type', 'Polygon'],
    paint: {
      'line-color': '#047857',
      'line-width': 2
    }
  });

  // Paved concourse line
  map.addLayer({
    id: 'kakum-paved-line',
    type: 'line',
    source: 'kakum-micro-source',
    filter: ['==', ['get', 'id'], 'kakum-paved-concourse'],
    paint: {
      'line-color': '#f59e0b',
      'line-width': 3.5,
      'line-dasharray': [2, 2]
    }
  });

  // Canopy approach trail line
  map.addLayer({
    id: 'kakum-trail-line',
    type: 'line',
    source: 'kakum-micro-source',
    filter: ['==', ['get', 'id'], 'kakum-canopy-trail-approach'],
    paint: {
      'line-color': '#10b981',
      'line-width': 3
    }
  });

  // 7-Bridge Canopy Walkway Layers (Doc 09 §5.1 / §5.2)
  map.addLayer({
    id: 'kakum-bridges-glow',
    type: 'line',
    source: 'kakum-micro-source',
    filter: ['==', ['get', 'category'], 'canopy_bridge'],
    paint: {
      'line-color': '#065f46',
      'line-width': 9,
      'line-blur': 3,
      'line-opacity': 0.85
    }
  });

  map.addLayer({
    id: 'kakum-bridges-line',
    type: 'line',
    source: 'kakum-micro-source',
    filter: ['==', ['get', 'category'], 'canopy_bridge'],
    paint: {
      'line-color': '#34d399',
      'line-width': 4.5,
      'line-opacity': 1.0
    }
  });

  // Progressive Animated Line-Draw Source & Layers
  if (!map.getSource('kakum-animated-trail-source')) {
    map.addSource('kakum-animated-trail-source', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });

    map.addLayer({
      id: 'kakum-animated-trail-glow',
      type: 'line',
      source: 'kakum-animated-trail-source',
      paint: {
        'line-color': '#065f46',
        'line-width': 9,
        'line-blur': 3,
        'line-opacity': 0.9
      }
    });

    map.addLayer({
      id: 'kakum-animated-trail-line',
      type: 'line',
      source: 'kakum-animated-trail-source',
      paint: {
        'line-color': '#34d399',
        'line-width': 4.5,
        'line-opacity': 1.0
      }
    });
  }
}

function removeMicroSpatialLayers() {
  [
    'kakum-boundary-fill', 'kakum-boundary-line',
    'kakum-parking-fill', 'kakum-parking-line', 
    'kakum-buildings-fill', 'kakum-buildings-line', 
    'kakum-paved-line', 'kakum-trail-line',
    'kakum-bridges-glow', 'kakum-bridges-line',
    'kakum-animated-trail-glow', 'kakum-animated-trail-line'
  ].forEach(id => {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
  });
}

function renderMicroMarkers(geojson) {
  // Clear existing micro markers and popups
  closeAllPopups();
  Object.values(state.microMarkers).forEach(m => m.remove());
  state.microMarkers = {};

  const pointFeatures = geojson.features.filter(f => f.geometry.type === 'Point');

  pointFeatures.forEach(feat => {
    const props = feat.properties;
    const coords = feat.geometry.coordinates;
    const cat = props.category || 'nature';
    const meta = MICRO_POI_META[cat] || { pinClass: 'micro-pin-nature', icon: '📍', label: cat };

    const el = document.createElement('div');
    el.className = `micro-pin ${meta.pinClass}`;
    el.id = `micro-pin-${props.id}`;
    el.innerHTML = `<span>${props.icon || meta.icon}</span>`;

    const popup = new maplibregl.Popup({ 
      offset: 18, 
      closeButton: true,
      closeOnClick: true,
      maxWidth: '260px'
    }).setHTML(`
      <div class="p-3 text-left">
        <span class="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">${meta.label}</span>
        <h4 class="font-bold text-xs text-gray-900 leading-tight mt-0.5">${props.name}</h4>
        ${props.elevation_m ? `<span class="text-[10px] text-gray-500 block mt-0.5">Elevation: ${props.elevation_m}m</span>` : ''}
        <p class="text-[11px] text-gray-600 mt-1.5 leading-relaxed">${props.description}</p>
        ${props.fee_token ? `<div class="mt-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 p-1.5 rounded border border-emerald-200">Token: ${props.fee_token}</div>` : ''}
      </div>
    `);

    // Ensure only one popup is active at a time
    popup.on('open', () => {
      if (state.activePopup && state.activePopup !== popup) {
        try { state.activePopup.remove(); } catch(e){}
      }
      state.activePopup = popup;
    });

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([coords[0], coords[1]])
      .setPopup(popup)
      .addTo(map);

    state.microMarkers[props.id] = marker;
  });
}

function renderMicroPOIsTab(geojson) {
  const container = document.getElementById('micro-pois-list');
  const countEl = document.getElementById('micro-poi-count');
  if (!container) return;

  if (countEl) countEl.innerText = `${geojson.features.length} Features`;

  // Group features into 3 structured zones
  const zones = [
    {
      name: "Arrival & Visitor Services Hub",
      icon: "🏛️",
      ids: [
        'kakum-parking-lot',
        'kakum-reception-office',
        'kakum-ticket-office',
        'kakum-rainforest-cafeteria',
        'kakum-restrooms-poi',
        'kakum-toilets-building',
        'kakum-museum-building',
        'kakum-observation-tower'
      ]
    },
    {
      name: "Canopy Walkway Suspension System",
      icon: "🌉",
      ids: [
        'kakum-canopy-launch-platform',
        'kakum-emergency-bailout',
        'kakum-paved-concourse',
        'kakum-canopy-trail-approach'
      ]
    },
    {
      name: "Rainforest Wilderness & Natural Giants",
      icon: "🌳",
      ids: [
        'kakum-historic-big-tree',
        'kakum-afafranto-campsite'
      ]
    }
  ];

  container.innerHTML = zones.map(zone => {
    const zoneFeatures = geojson.features.filter(f => zone.ids.includes(f.properties.id));
    if (zoneFeatures.length === 0) return '';

    const cardsHtml = zoneFeatures.map(feat => {
      const props = feat.properties;
      const isPoint = feat.geometry.type === 'Point';
      const coords = isPoint 
        ? feat.geometry.coordinates 
        : (feat.geometry.type === 'Polygon' ? feat.geometry.coordinates[0][0] : feat.geometry.coordinates[0]);

      const isHub = zone.name.includes("Arrival");
      const targetZoom = isHub ? 18.2 : 17.6;

      return `
        <div 
          onclick="flyToMicroFeature('${props.id}', ${coords[0]}, ${coords[1]}, ${targetZoom})"
          class="p-2.5 bg-white rounded-xl border border-gray-200 hover:border-emerald-500 hover:shadow-sm cursor-pointer transition-all flex items-start space-x-2.5 group"
        >
          <span class="text-base flex-shrink-0 mt-0.5">${props.icon || (feat.geometry.type === 'Polygon' ? '📐' : '🥾')}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <h5 class="text-xs font-bold text-gray-900 leading-snug group-hover:text-emerald-700 transition-colors truncate">
                ${props.name}
              </h5>
              <span class="text-[9px] bg-gray-100 text-gray-600 font-semibold px-1.5 py-0.5 rounded capitalize flex-shrink-0 ml-1">
                ${props.category || feat.geometry.type}
              </span>
            </div>
            <p class="text-[11px] text-gray-500 line-clamp-2 mt-0.5 leading-tight">
              ${props.description}
            </p>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="space-y-1.5 pt-1">
        <div class="flex items-center space-x-1.5 px-1 text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
          <span>${zone.icon}</span>
          <span>${zone.name}</span>
          <span class="text-[10px] text-gray-400 font-normal">(${zoneFeatures.length})</span>
        </div>
        <div class="space-y-1.5">
          ${cardsHtml}
        </div>
      </div>
    `;
  }).join('');
}

function flyToMicroFeature(id, lon, lat, zoom = 18.0) {
  // Dismiss all existing popups first
  closeAllPopups();

  const sidebarWidth = window.innerWidth >= 768 ? 440 : 0;
  map.flyTo({
    center: [lon, lat],
    zoom: zoom,
    pitch: 35,
    bearing: -10,
    padding: { left: sidebarWidth, top: 40, bottom: 40, right: 40 },
    duration: 1000,
    essential: true
  });

  // Open only the clicked feature's popup
  setTimeout(() => {
    if (state.microMarkers[id]) {
      const p = state.microMarkers[id].getPopup();
      if (p) {
        p.addTo(map);
        state.activePopup = p;
      }
    }
  }, 450);
}

// Checklist Storage & State Helpers
function getCheckedItems() {
  try {
    const saved = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveCheckedItems(checked) {
  try {
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checked));
  } catch (e) {
    console.warn('Could not save checklist to localStorage:', e);
  }
}

function toggleChecklistItem(itemId) {
  let checked = getCheckedItems();
  if (checked.includes(itemId)) {
    checked = checked.filter(id => id !== itemId);
  } else {
    checked.push(itemId);
  }
  saveCheckedItems(checked);

  updateChecklistUI();
}

function updateChecklistUI() {
  const checked = getCheckedItems();
  const total = (state.siteData && state.siteData.pre_trip_checklist) ? state.siteData.pre_trip_checklist.length : 6;
  const count = checked.length;
  const pct = Math.round((count / total) * 100);

  const progBar = document.getElementById('checklist-progress-bar');
  const progText = document.getElementById('checklist-progress-text');
  const badge = document.getElementById('checklist-counter-badge');

  if (progBar) progBar.style.width = `${pct}%`;
  if (progText) progText.innerText = `${count} of ${total} Ready (${pct}%)`;
  if (badge) badge.innerText = `${count}/${total}`;

  document.querySelectorAll('.checklist-item-card').forEach(card => {
    const id = card.dataset.id;
    const isChecked = checked.includes(id);
    const cb = card.querySelector('input[type="checkbox"]');
    if (cb) cb.checked = isChecked;

    if (isChecked) {
      card.classList.add('bg-emerald-50', 'border-emerald-300');
      card.classList.remove('bg-white', 'border-gray-200');
    } else {
      card.classList.remove('bg-emerald-50', 'border-emerald-300');
      card.classList.add('bg-white', 'border-gray-200');
    }
  });
}

function renderChecklistTab(items) {
  const container = document.getElementById('checklist-items-container');
  if (!container) return;

  const checked = getCheckedItems();

  container.innerHTML = items.map(item => {
    const isChecked = checked.includes(item.id);

    return `
      <label 
        data-id="${item.id}"
        class="checklist-item-card p-3 rounded-xl border transition-all cursor-pointer flex items-start space-x-3 select-none ${isChecked ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-200 hover:border-gray-300'}"
      >
        <input 
          type="checkbox" 
          ${isChecked ? 'checked' : ''} 
          onchange="toggleChecklistItem('${item.id}')"
          class="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
        />
        <div class="flex-1">
          <div class="flex items-center space-x-1.5">
            <span class="text-sm">${item.icon}</span>
            <span class="text-xs font-bold text-gray-900">${item.title}</span>
            ${item.mandatory ? '<span class="text-[9px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded uppercase">Mandatory</span>' : '<span class="text-[9px] bg-gray-100 text-gray-600 font-medium px-1.5 py-0.2 rounded">Recommended</span>'}
          </div>
          <p class="text-[11px] text-gray-500 mt-1 leading-snug">
            ${item.rationale}
          </p>
        </div>
      </label>
    `;
  }).join('');

  updateChecklistUI();
}

function renderDisputedSpecsTab(specs) {
  const container = document.getElementById('disputed-specs-container');
  if (!container) return;

  container.innerHTML = specs.map(spec => {
    return `
      <div class="bg-white rounded-xl border border-gray-200 p-3.5 space-y-2.5">
        <div class="flex items-center justify-between border-b border-gray-100 pb-1.5">
          <h4 class="text-xs font-bold text-gray-900 flex items-center space-x-1.5">
            <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-600"></i>
            <span>${spec.parameter}</span>
          </h4>
        </div>

        <div class="p-2.5 bg-gray-50 rounded-lg text-xs text-gray-800 font-medium leading-relaxed">
          <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">Consensus Finding</span>
          ${spec.consensus_summary}
        </div>

        <div class="space-y-1.5">
          <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Authoritative Source Citations</span>
          ${spec.sources.map(s => `
            <div class="flex items-start justify-between p-2 rounded-lg bg-gray-50/70 border border-gray-100 text-xs">
              <div>
                <span class="font-bold text-gray-900 block">${s.source_name}</span>
                <span class="text-[10px] text-gray-500">${s.note}</span>
              </div>
              <span class="font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-xs flex-shrink-0 ml-2">
                ${s.stated_value}
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function renderSafetyTab(protocols, contacts) {
  const safetyContainer = document.getElementById('safety-protocols-container');
  const contactsContainer = document.getElementById('official-contacts-container');

  if (safetyContainer && protocols) {
    safetyContainer.innerHTML = `
      <div class="p-2.5 bg-white/80 rounded-lg border border-rose-100">
        <strong class="text-rose-900 block mb-0.5">Hands-Free Mandate</strong>
        <p class="text-[11px] text-gray-700">${protocols.hands_free_rule}</p>
      </div>
      <div class="p-2.5 bg-white/80 rounded-lg border border-rose-100">
        <strong class="text-rose-900 block mb-0.5">Footwear Requirements</strong>
        <p class="text-[11px] text-gray-700">${protocols.footwear_requirement}</p>
      </div>
      <div class="p-2.5 bg-white/80 rounded-lg border border-rose-100">
        <strong class="text-rose-900 block mb-0.5">Emergency Vertigo Bailout Spur</strong>
        <p class="text-[11px] text-gray-700">${protocols.acrophobia_exit_spur}</p>
      </div>
      <div class="p-2.5 bg-white/80 rounded-lg border border-rose-100">
        <strong class="text-rose-900 block mb-0.5">Weather Suspensions</strong>
        <p class="text-[11px] text-gray-700">${protocols.weather_safety_rule}</p>
      </div>
    `;
  }

  if (contactsContainer && contacts) {
    contactsContainer.innerHTML = contacts.map(c => `
      <div class="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
        <div class="flex items-center justify-between">
          <strong class="text-gray-900 text-xs">${c.entity}</strong>
          <span class="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">${c.channel}</span>
        </div>
        <a href="${c.value.startsWith('http') ? c.value : '#'}" target="_blank" rel="noreferrer" class="text-emerald-700 hover:underline text-xs font-semibold block mt-0.5">
          ${c.value}
        </a>
        <p class="text-[10px] text-gray-500 mt-0.5">${c.note}</p>
      </div>
    `).join('');
  }
}

function renderEligibilityTab(criteria) {
  const container = document.getElementById('eligibility-cards-container');
  if (!container || !criteria) return;

  container.innerHTML = criteria.map(crit => `
    <div class="bg-white rounded-xl border border-gray-200 p-3.5 space-y-2 shadow-2xs">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span class="text-lg">${crit.icon}</span>
          <h4 class="text-xs font-bold text-gray-900">${crit.label}</h4>
        </div>
        <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
          crit.badge_color === 'amber' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
          crit.badge_color === 'blue' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
          crit.badge_color === 'rose' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
          'bg-emerald-100 text-emerald-800 border border-emerald-300'
        }">
          ${crit.recommendation}
        </span>
      </div>
      <p class="text-[11px] text-gray-700 leading-relaxed bg-gray-50/70 p-2 rounded-lg border border-gray-100">
        ${crit.guidance}
      </p>
    </div>
  `).join('');
}

function setupSiteConsoleTabs() {
  const tabs = document.querySelectorAll('.site-console-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active', 'border-emerald-700', 'text-emerald-800');
        t.classList.add('border-transparent', 'text-gray-500');
      });
      tab.classList.add('active', 'border-emerald-700', 'text-emerald-800');
      tab.classList.remove('border-transparent', 'text-gray-500');

      const targetTab = tab.dataset.tab;
      ['pois', 'eligibility', 'checklist', 'specs', 'safety'].forEach(tabName => {
        const pane = document.getElementById(`tab-pane-${tabName}`);
        if (pane) {
          if (tabName === targetTab) {
            pane.classList.remove('hidden');
          } else {
            pane.classList.add('hidden');
          }
        }
      });
    });
  });

  // Back to regional button
  const backBtn = document.getElementById('btn-back-regional');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      exitSiteConsole(true);
    });
  }
}


