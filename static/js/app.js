// ExploreGhana — Frontend Application Logic

// Application State
const state = {
  attractions: [],
  filtered: [],
  selectedId: null,
  activeCategory: 'all',
  searchQuery: '',
  userLocation: null,
  markers: {},
  userMarker: null,
  showBoundary: true,
  currentBasemap: 'streets'
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
  'Accommodation & Luxury': { pinClass: 'pin-default', icon: '🏨', label: 'Resorts & Stays' }
};

// Initialize MapLibre GL Map
const map = new maplibregl.Map({
  container: 'map',
  style: BASEMAP_STYLES.streets,
  center: [-1.2464, 5.1053], // Cape Coast coordinates
  zoom: 9.8,
  minZoom: 6,
  maxZoom: 18
});

// Add Navigation and Scale controls
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

// Map Load Event Handler
map.on('load', async () => {
  await loadRegionBoundary();
  await fetchAttractions();
  setupEventListeners();
  lucide.createIcons();
});

// Load Central Region Boundary GeoJSON
async function loadRegionBoundary() {
  try {
    const res = await fetch('/api/regions');
    const geojsonData = await res.json();

    if (!map.getSource('central-region-boundary')) {
      map.addSource('central-region-boundary', {
        type: 'geojson',
        data: geojsonData
      });

      // Polygon fill
      map.addLayer({
        id: 'central-region-fill',
        type: 'fill',
        source: 'central-region-boundary',
        paint: {
          'fill-color': '#006B3F',
          'fill-opacity': 0.08
        }
      });

      // Polygon border line
      map.addLayer({
        id: 'central-region-outline',
        type: 'line',
        source: 'central-region-boundary',
        paint: {
          'line-color': '#006B3F',
          'line-width': 2.5,
          'line-dasharray': [3, 2]
        }
      });
    }
  } catch (err) {
    console.error('Failed to load boundary GeoJSON:', err);
  }
}

// Fetch all attractions from FastAPI
async function fetchAttractions() {
  try {
    const res = await fetch('/api/attractions');
    state.attractions = await res.json();
    state.filtered = [...state.attractions];
    renderAttractionsList();
    renderMarkers();
  } catch (err) {
    console.error('Error fetching attractions:', err);
  }
}

// Render HTML Markers on Map
function renderMarkers() {
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
            <button onclick="openModal('${item.id}')" class="text-ghana-green font-bold hover:underline">Details &rarr;</button>
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
            <button onclick="event.stopPropagation(); openModal('${item.id}')" class="bg-ghana-green/10 hover:bg-ghana-green text-ghana-green hover:text-white px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all">
              Details
            </button>
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

  // Highlight marker
  document.querySelectorAll('.custom-pin').forEach(p => p.classList.remove('active'));
  const pin = document.getElementById(`marker-${id}`);
  if (pin) pin.classList.add('active');

  // Fly to point on map
  map.flyTo({
    center: [item.longitude, item.latitude],
    zoom: 13,
    pitch: 25,
    speed: 1.2
  });

  // Open Popup
  if (state.markers[id]) {
    state.markers[id].togglePopup();
  }
}

// Open Full Detail Modal Drawer
function openModal(id) {
  const item = state.attractions.find(a => a.id === id);
  if (!item) return;

  const modal = document.getElementById('detail-modal');
  const content = document.getElementById('modal-content');
  const meta = CATEGORY_META[item.category] || { icon: '📍' };

  // Encode for WhatsApp Share
  const shareText = encodeURIComponent(
    `🇬🇭 Discover ${item.name} (${item.district}, Central Region) on ExploreGhana!\n` +
    `Entry: GHS ${item.entry_fee_ghs.local_adult} (Residents) / GHS ${item.entry_fee_ghs.foreigner_adult} (Tourists)\n` +
    `Google Maps: https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`
  );

  // Build gallery HTML if available
  const hasGallery = item.gallery && item.gallery.length > 1;
  const galleryStrip = hasGallery ? `
    <!-- Visitor Photo Gallery Strip -->
    <div class="px-6 pt-4 pb-1 border-b border-gray-100 bg-gray-50/50">
      <div class="flex items-center justify-between mb-2">
        <h4 class="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center space-x-1.5">
          <i data-lucide="camera" class="w-3.5 h-3.5 text-ghana-green"></i>
          <span>Authentic Visitor Photos (${item.gallery.length})</span>
        </h4>
        <span class="text-[10px] text-emerald-800 bg-emerald-100/90 font-bold px-2 py-0.5 rounded-full border border-emerald-300/40">
          Creative Commons Verified
        </span>
      </div>
      <div class="flex space-x-2.5 overflow-x-auto pb-2 scrollbar-thin">
        ${item.gallery.map((imgSrc, idx) => `
          <button 
            type="button" 
            onclick="switchModalImage('${imgSrc}', this)"
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
        <p class="text-sm text-gray-200 mt-0.5">${item.local_name ? `${item.local_name} &bull; ` : ''}${item.district}, Central Region</p>
      </div>
    </div>

    ${galleryStrip}

    <!-- Body Information -->
    <div class="p-6 space-y-6">
      
      <!-- Primary Overview -->
      <div>
        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">OVERVIEW</h4>
        <p class="text-sm text-gray-700 leading-relaxed">${item.description}</p>
      </div>

      <!-- Admission Fees Table -->
      <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <h4 class="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center space-x-1.5 mb-3">
          <i data-lucide="ticket" class="w-4 h-4 text-ghana-green"></i>
          <span>Official Entry Fees (Ghanaian Cedis - GHS)</span>
        </h4>
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
            <span class="font-bold text-gray-800 block">Road & Accessibility</span>
            <span class="text-gray-600">${item.road_access.surface} (${item.road_access.vehicle_recommended})</span>
          </div>
        </div>

        <div class="flex items-start space-x-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200">
          <i data-lucide="phone" class="w-4 h-4 text-ghana-green flex-shrink-0 mt-0.5"></i>
          <div>
            <span class="font-bold text-gray-800 block">Contact Information</span>
            <span class="text-gray-600">${item.contact_phone || 'Ghana Tourism Authority'}</span>
          </div>
        </div>
      </div>

      <!-- What to bring checklist -->
      ${item.what_to_bring && item.what_to_bring.length > 0 ? `
        <div>
          <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">RECOMMENDED TO BRING</h4>
          <div class="flex flex-wrap gap-1.5">
            ${item.what_to_bring.map(t => `
              <span class="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-lg flex items-center space-x-1">
                <i data-lucide="check-circle-2" class="w-3 h-3 text-ghana-green"></i>
                <span>${t}</span>
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Action Buttons (WhatsApp Share & Google Maps Route) -->
      <div class="pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center gap-3">
        <a 
          href="https://wa.me/?text=${shareText}" 
          target="_blank" 
          class="w-full sm:w-1/2 bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md"
        >
          <i data-lucide="share-2" class="w-4 h-4"></i>
          <span>Share on WhatsApp</span>
        </a>

        <a 
          href="https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}" 
          target="_blank" 
          class="w-full sm:w-1/2 bg-ghana-dark hover:bg-gray-800 text-white py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md"
        >
          <i data-lucide="navigation" class="w-4 h-4 text-ghana-gold"></i>
          <span>Get Directions</span>
        </a>
      </div>

    </div>
  `;

  modal.classList.remove('hidden');
  setTimeout(() => modal.classList.remove('opacity-0'), 10);
  lucide.createIcons();
}

// Switch Active Image in Modal Hero from Gallery Thumbnails
function switchModalImage(newSrc, thumbBtn) {
  const heroImg = document.getElementById('modal-hero-img');
  if (heroImg) {
    heroImg.style.opacity = '0.3';
    setTimeout(() => {
      heroImg.src = newSrc;
      heroImg.style.opacity = '1';
    }, 150);
  }

  // Update active thumbnail styling
  document.querySelectorAll('.modal-gallery-thumb').forEach(btn => {
    btn.classList.remove('border-ghana-green', 'ring-2', 'ring-emerald-400/50', 'scale-105');
    btn.classList.add('border-transparent', 'opacity-75');
  });

  if (thumbBtn) {
    thumbBtn.classList.remove('border-transparent', 'opacity-75');
    thumbBtn.classList.add('border-ghana-green', 'ring-2', 'ring-emerald-400/50', 'scale-105');
  }
}

// Close Modal
function closeModal() {
  const modal = document.getElementById('detail-modal');
  modal.classList.add('opacity-0');
  setTimeout(() => modal.classList.add('hidden'), 200);
}

// Event Listeners Configuration
function setupEventListeners() {
  // Modal Close
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);
  document.getElementById('detail-modal').addEventListener('click', (e) => {
    if (e.target.id === 'detail-modal') closeModal();
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
    if (map.getLayer('central-region-fill')) {
      map.setLayoutProperty('central-region-fill', 'visibility', visibility);
      map.setLayoutProperty('central-region-outline', 'visibility', visibility);
    }
  });

  // Basemap style switcher
  document.getElementById('btn-style-streets').addEventListener('click', () => {
    map.setStyle(BASEMAP_STYLES.streets);
    setTimeout(loadRegionBoundary, 300);
  });
  document.getElementById('btn-style-satellite').addEventListener('click', () => {
    map.setStyle(BASEMAP_STYLES.satellite);
    setTimeout(loadRegionBoundary, 300);
  });

  // Mobile Drawer Toggle
  document.getElementById('btn-mobile-toggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('-translate-x-full');
  });
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
    const res = await fetch(`/api/attractions/nearby?lat=${lat}&lon=${lon}&radius_km=50&limit=20`);
    const nearbyItems = await res.json();
    document.getElementById('nearby-banner').classList.remove('hidden');
    state.filtered = nearbyItems;
    renderAttractionsList();
    renderMarkers();
  } catch (err) {
    console.error(err);
  }
}
