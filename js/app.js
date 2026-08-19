/**
 * PIN OUT CFPM GBE AUTO 237 - Application Logic
 * Base de données professionnelle de brochages et schémas calculateurs
 */

(function () {
  'use strict';

  // --- STATE ---
  let database = window.PINOUT_DATABASE || [];
  let filteredResults = [];
  let currentEcu = null;
  let favorites = new Set(JSON.parse(localStorage.getItem('cfpm_favorites') || '[]'));
  let showOnlyFavorites = false;
  let activeImageIndex = 0;

  // Zoom & Pan state
  let zoomLevel = 1;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let isInverted = false;

  // Touch pinch-to-zoom state
  let initialPinchDistance = null;
  let initialZoom = 1;

  // Pagination & Lazy Rendering
  const ITEMS_PER_PAGE = 36;
  let displayedCount = 0;

  // --- DOM ELEMENTS ---
  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClearBtn');
  const filterBrand = document.getElementById('filterBrand');
  const filterEcuBrand = document.getElementById('filterEcuBrand');
  const filterFamily = document.getElementById('filterFamily');
  const filterMode = document.getElementById('filterMode');
  const filterFuel = document.getElementById('filterFuel');
  const sortOrder = document.getElementById('sortOrder');

  const cardsGrid = document.getElementById('cardsGrid');
  const emptyState = document.getElementById('emptyState');
  const displayCount = document.getElementById('displayCount');
  const totalCount = document.getElementById('totalCount');
  const favCount = document.getElementById('favCount');

  // Modals
  const detailModal = document.getElementById('detailModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalEcuTitle = document.getElementById('modalEcuTitle');
  const modalEcuTags = document.getElementById('modalEcuTags');
  const modalSchematicImg = document.getElementById('modalSchematicImg');
  const schematicStage = document.getElementById('schematicStage');
  const imageSelectorTabs = document.getElementById('imageSelectorTabs');
  const modalPinTableBody = document.getElementById('modalPinTableBody');
  const modalTechNotes = document.getElementById('modalTechNotes');
  const technicianNoteInput = document.getElementById('technicianNoteInput');
  const btnSaveNote = document.getElementById('btnSaveNote');

  // Zoom & Tool buttons
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnResetZoom = document.getElementById('btnResetZoom');
  const btnInvertColors = document.getElementById('btnInvertColors');
  const btnDownloadImg = document.getElementById('btnDownloadImg');
  const btnFavModal = document.getElementById('btnFavModal');

  // Header buttons & other Modals
  const btnOpenFavorites = document.getElementById('btnOpenFavorites');
  const btnOpenTools = document.getElementById('btnOpenTools');
  const toolsModal = document.getElementById('toolsModal');
  const toolsModalCloseBtn = document.getElementById('toolsModalCloseBtn');

  const btnDownloadApk = document.getElementById('btnDownloadApk');
  const apkModal = document.getElementById('apkModal');
  const apkModalCloseBtn = document.getElementById('apkModalCloseBtn');

  // --- INITIALIZATION ---
  function init() {
    if (!database || database.length === 0) {
      // Attempt to load from JSON if data.js wasn't loaded
      fetch('pinouts_database.json')
        .then(res => res.json())
        .then(data => {
          database = data;
          window.PINOUT_DATABASE = data;
          setupApp();
        })
        .catch(err => {
          console.error('Failed to load database JSON:', err);
          showToast('Erreur de chargement de la base de données', 'error');
        });
    } else {
      setupApp();
    }

    registerServiceWorker();
  }

  function setupApp() {
    totalCount.textContent = database.length;
    updateFavCounter();
    populateDropdowns();
    setupEventListeners();
    applyFilters();
  }

  // --- POPULATE FILTER DROPDOWNS ---
  function populateDropdowns() {
    const brandsSet = new Set();
    const familiesSet = new Set();

    database.forEach(item => {
      if (item.vehicle_brands && Array.isArray(item.vehicle_brands)) {
        item.vehicle_brands.forEach(b => {
          if (b && b.trim()) brandsSet.add(b.trim());
        });
      }
      if (item.ecu_family && item.ecu_family.trim()) {
        familiesSet.add(item.ecu_family.trim());
      }
    });

    // Populate Vehicle Brands
    const sortedBrands = Array.from(brandsSet).sort((a, b) => a.localeCompare(b, 'fr'));
    sortedBrands.forEach(brand => {
      const opt = document.createElement('option');
      opt.value = brand;
      opt.textContent = brand;
      filterBrand.appendChild(opt);
    });

    // Populate ECU Families
    const sortedFamilies = Array.from(familiesSet).sort((a, b) => a.localeCompare(b, 'fr'));
    sortedFamilies.forEach(family => {
      const opt = document.createElement('option');
      opt.value = family;
      opt.textContent = family;
      filterFamily.appendChild(opt);
    });
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Search input with instant search
    searchInput.addEventListener('input', () => {
      searchClearBtn.style.display = searchInput.value ? 'flex' : 'none';
      applyFilters();
    });

    searchClearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchClearBtn.style.display = 'none';
      searchInput.focus();
      applyFilters();
    });

    // Dropdown filters
    [filterBrand, filterEcuBrand, filterFamily, filterMode, filterFuel, sortOrder].forEach(el => {
      el.addEventListener('change', applyFilters);
    });

    // Quick filter pills
    document.querySelectorAll('.quick-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const query = pill.dataset.search || '';
        searchInput.value = query;
        searchClearBtn.style.display = 'flex';
        applyFilters();
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // Favorites filter button in header
    btnOpenFavorites.addEventListener('click', () => {
      showOnlyFavorites = !showOnlyFavorites;
      if (showOnlyFavorites) {
        btnOpenFavorites.classList.add('active');
        btnOpenFavorites.innerHTML = `<span>⭐</span> Voir Tout (${favorites.size})`;
        showToast('Affichage des calculateurs favoris');
      } else {
        btnOpenFavorites.classList.remove('active');
        btnOpenFavorites.innerHTML = `<span>⭐</span> Favoris (<span id="favCount">${favorites.size}</span>)`;
      }
      applyFilters();
    });

    // Workshop Tools Modal
    btnOpenTools.addEventListener('click', () => openModal(toolsModal));
    toolsModalCloseBtn.addEventListener('click', () => closeModal(toolsModal));

    // APK Download Modal
    btnDownloadApk.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(apkModal);
    });
    apkModalCloseBtn.addEventListener('click', () => closeModal(apkModal));

    // Detail Modal Close
    modalCloseBtn.addEventListener('click', () => closeModal(detailModal));

    // Close modals on background click or Escape key
    [detailModal, toolsModal, apkModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal(detailModal);
        closeModal(toolsModal);
        closeModal(apkModal);
      }
    });

    // Zoom & Pan controls
    btnZoomIn.addEventListener('click', () => adjustZoom(0.25));
    btnZoomOut.addEventListener('click', () => adjustZoom(-0.25));
    btnResetZoom.addEventListener('click', resetZoom);
    btnInvertColors.addEventListener('click', toggleInvertColors);
    btnDownloadImg.addEventListener('click', downloadCurrentSchematic);
    btnFavModal.addEventListener('click', toggleModalFavorite);

    // Save technician note
    btnSaveNote.addEventListener('click', saveCurrentTechnicianNote);

    // Schematic Pan & Zoom interactive stage
    setupSchematicInteractivity();

    // Delegated click listener for all cards and pinout buttons
    if (cardsGrid) {
      cardsGrid.addEventListener('click', (e) => {
        const favBtn = e.target.closest('.card-fav-btn');
        if (favBtn) {
          e.stopPropagation();
          const favId = favBtn.getAttribute('data-fav-id');
          if (favId) {
            toggleFavorite(favId);
            favBtn.classList.toggle('active', favorites.has(favId));
            favBtn.textContent = favorites.has(favId) ? '★' : '☆';
          }
          return;
        }

        const card = e.target.closest('.ecu-card');
        if (card) {
          const ecuId = card.getAttribute('data-id');
          const ecu = database.find(item => item.id === ecuId);
          if (ecu) {
            openEcuDetails(ecu);
          }
        }
      });
    }
  }

  // --- FILTER & SEARCH ENGINE ---
  function applyFilters() {
    const query = (searchInput.value || '').trim().toLowerCase();
    const queryTokens = query ? query.split(/\s+/).filter(Boolean) : [];

    const selectedBrand = filterBrand.value;
    const selectedEcuBrand = filterEcuBrand.value;
    const selectedFamily = filterFamily.value;
    const selectedMode = filterMode.value;
    const selectedFuel = filterFuel.value;
    const sortBy = sortOrder.value;

    filteredResults = database.filter(item => {
      // Favorites filter
      if (showOnlyFavorites && !favorites.has(item.id)) {
        return false;
      }

      // Brand filter
      if (selectedBrand && (!item.vehicle_brands || !item.vehicle_brands.includes(selectedBrand))) {
        return false;
      }

      // ECU Brand (Bosch, Delphi, Continental...)
      if (selectedEcuBrand && item.ecu_brand !== selectedEcuBrand) {
        return false;
      }

      // ECU Family
      if (selectedFamily && item.ecu_family !== selectedFamily) {
        return false;
      }

      // Connection Mode
      if (selectedMode && item.connection_mode && !item.connection_mode.toLowerCase().includes(selectedMode.toLowerCase())) {
        return false;
      }

      // Fuel Type
      if (selectedFuel && item.fuel_type && item.fuel_type !== selectedFuel) {
        return false;
      }

      // Search Query Tokens matching
      if (queryTokens.length > 0) {
        const searchableText = `${item.name} ${item.ecu_family || ''} ${item.ecu_brand || ''} ${(item.vehicle_brands || []).join(' ')} ${item.mcu || ''} ${item.connection_mode || ''} ${item.notes || ''} ${item.search_tokens || ''}`.toLowerCase();
        const matchesAll = queryTokens.every(token => searchableText.includes(token));
        if (!matchesAll) return false;
      }

      return true;
    });

    // Sorting
    sortResults(sortBy);

    // Reset pagination & render
    displayedCount = 0;
    cardsGrid.innerHTML = '';

    displayCount.textContent = filteredResults.length;

    if (filteredResults.length === 0) {
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
      renderNextChunk();
    }
  }

  function sortResults(sortBy) {
    if (sortBy === 'name_asc') {
      filteredResults.sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }));
    } else if (sortBy === 'name_desc') {
      filteredResults.sort((a, b) => b.name.localeCompare(a.name, 'fr', { numeric: true }));
    } else if (sortBy === 'family') {
      filteredResults.sort((a, b) => (a.ecu_family || '').localeCompare(b.ecu_family || '', 'fr'));
    } else if (sortBy === 'brand') {
      filteredResults.sort((a, b) => {
        const brandA = (a.vehicle_brands && a.vehicle_brands[0]) || '';
        const brandB = (b.vehicle_brands && b.vehicle_brands[0]) || '';
        return brandA.localeCompare(brandB, 'fr');
      });
    }
  }

  // --- CARDS RENDERING (CHUNKED / INFINITE SCROLL) ---
  function renderNextChunk() {
    const nextChunk = filteredResults.slice(displayedCount, displayedCount + ITEMS_PER_PAGE);
    if (nextChunk.length === 0) return;

    const fragment = document.createDocumentFragment();

    nextChunk.forEach(ecu => {
      const card = createEcuCard(ecu);
      fragment.appendChild(card);
    });

    // Remove existing 'Load More' button if present
    const existingLoadMore = document.getElementById('loadMoreContainer');
    if (existingLoadMore) existingLoadMore.remove();

    cardsGrid.appendChild(fragment);
    displayedCount += nextChunk.length;

    // If there are more items, add a 'Load More' trigger
    if (displayedCount < filteredResults.length) {
      const loadMoreContainer = document.createElement('div');
      loadMoreContainer.id = 'loadMoreContainer';
      loadMoreContainer.className = 'load-more-container';
      loadMoreContainer.innerHTML = `
        <button id="btnLoadMore" class="btn-load-more">
          Afficher plus (${filteredResults.length - displayedCount} restants) ⬇
        </button>
      `;
      cardsGrid.parentNode.insertBefore(loadMoreContainer, cardsGrid.nextSibling);

      document.getElementById('btnLoadMore').addEventListener('click', () => {
        loadMoreContainer.remove();
        renderNextChunk();
      });
    }
  }

  function createEcuCard(ecu) {
    const isFav = favorites.has(ecu.id);
    const card = document.createElement('div');
    card.className = 'ecu-card';
    card.setAttribute('data-id', ecu.id);

    // Primary image thumbnail
    const thumbSrc = (ecu.images && ecu.images.length > 0) ? ecu.images[0] : 'assets/icon.svg';
    const brandsList = (ecu.vehicle_brands && ecu.vehicle_brands.length > 0) ? ecu.vehicle_brands.slice(0, 3).join(', ') : 'Multi-Marques';
    const pinCount = (ecu.pinout_table && Array.isArray(ecu.pinout_table)) ? ecu.pinout_table.length : 0;

    card.innerHTML = `
      <div class="card-header">
        <div class="card-title-group">
          <h3 class="card-title">${escapeHtml(ecu.name)}</h3>
          <div class="card-brand">${escapeHtml(brandsList)}</div>
        </div>
        <button class="card-fav-btn ${isFav ? 'active' : ''}" title="${isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}" data-fav-id="${ecu.id}">
          ${isFav ? '★' : '☆'}
        </button>
      </div>

      <div class="card-body">
        <div class="card-img-wrapper">
          <img src="${thumbSrc}" alt="${escapeHtml(ecu.name)}" loading="lazy" onerror="this.src='assets/icon.svg';">
          <div class="card-mode-badge">${escapeHtml(ecu.connection_mode || 'Bench / Boot')}</div>
        </div>

        <div class="card-meta-list">
          <div class="meta-row">
            <span class="meta-label">Famille :</span>
            <span class="meta-value">${escapeHtml(ecu.ecu_family || 'Calculateur')}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">MCU / Proc :</span>
            <span class="meta-value">${escapeHtml(ecu.mcu || 'Infineon / ST / NXP')}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Brochage :</span>
            <span class="meta-value" style="color: var(--accent-teal); font-weight: 700;">${pinCount} Signaux Définis</span>
          </div>
        </div>
      </div>

      <div class="card-footer">
        <button class="btn-view-pinout" data-view-id="${ecu.id}">
          🔍 Voir Brochage & Schéma
        </button>
      </div>
    `;

    // Favorite button click
    const favBtn = card.querySelector('.card-fav-btn');
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(ecu.id);
      favBtn.classList.toggle('active', favorites.has(ecu.id));
      favBtn.textContent = favorites.has(ecu.id) ? '★' : '☆';
    });

    // View pinout click
    const viewBtn = card.querySelector('.btn-view-pinout');
    viewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEcuDetails(ecu);
    });

    // Card general click
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.card-fav-btn')) {
        openEcuDetails(ecu);
      }
    });

    return card;
  }

  // --- DETAIL MODAL & SCHEMATIC VIEWER ---
  function openEcuDetails(ecu) {
    currentEcu = ecu;
    activeImageIndex = 0;
    resetZoom();

    modalEcuTitle.textContent = ecu.name;

    // Tags
    modalEcuTags.innerHTML = `
      <span class="badge badge-brand">${escapeHtml(ecu.ecu_brand || 'ECU')}</span>
      <span class="badge badge-family">${escapeHtml(ecu.ecu_family || 'Calculateur')}</span>
      <span class="badge badge-mode">${escapeHtml(ecu.connection_mode || 'Direct Bench')}</span>
      <span class="badge badge-fuel">${escapeHtml(ecu.fuel_type || 'Diesel/Essence')}</span>
      ${(ecu.vehicle_brands || []).map(b => `<span class="badge badge-car">${escapeHtml(b)}</span>`).join('')}
    `;

    // Image Setup
    updateModalImages();

    // Pinout Table
    renderPinoutTable(ecu.pinout_table || []);

    // Tech Notes
    renderTechNotes(ecu);

    // Technician Saved Note
    const savedNote = localStorage.getItem('cfpm_note_' + ecu.id) || '';
    technicianNoteInput.value = savedNote;

    // Favorite button in modal
    updateModalFavButton();

    openModal(detailModal);
  }

  function updateModalImages() {
    const schematicLoader = document.getElementById('schematicLoader');
    const btnOpenDirectImg = document.getElementById('btnOpenDirectImg');

    if (!currentEcu || !currentEcu.images || currentEcu.images.length === 0) {
      if (schematicLoader) schematicLoader.style.display = 'none';
      modalSchematicImg.src = 'assets/icon-192.png';
      modalSchematicImg.style.opacity = '1';
      imageSelectorTabs.style.display = 'none';
      if (btnOpenDirectImg) btnOpenDirectImg.style.display = 'none';
      return;
    }

    if (btnOpenDirectImg) btnOpenDirectImg.style.display = 'inline-flex';

    const currentImgSrc = currentEcu.images[activeImageIndex] || currentEcu.images[0];
    
    if (schematicLoader) schematicLoader.style.display = 'flex';
    modalSchematicImg.style.opacity = '0.1';

    modalSchematicImg.onload = function () {
      if (schematicLoader) schematicLoader.style.display = 'none';
      modalSchematicImg.style.opacity = '1';
    };

    modalSchematicImg.onerror = function () {
      if (schematicLoader) schematicLoader.style.display = 'none';
      this.src = 'assets/icon-192.png';
      modalSchematicImg.style.opacity = '1';
    };

    modalSchematicImg.src = currentImgSrc;

    if (btnOpenDirectImg) {
      btnOpenDirectImg.href = currentImgSrc;
    }

    // Render image tabs/thumbnails if more than 1 image
    if (currentEcu.images.length > 1) {
      imageSelectorTabs.style.display = 'flex';
      imageSelectorTabs.innerHTML = '';
      currentEcu.images.forEach((imgSrc, idx) => {
        const thumb = document.createElement('button');
        thumb.type = 'button';
        thumb.className = `img-thumb-btn image-tab ${idx === activeImageIndex ? 'active' : ''}`;
        thumb.innerHTML = `
          <img src="${imgSrc}" alt="Vue ${idx + 1}" onerror="this.src='assets/icon-192.png'">
          <span>Vue ${idx + 1}</span>
        `;
        thumb.addEventListener('click', (ev) => {
          ev.stopPropagation();
          activeImageIndex = idx;
          if (schematicLoader) schematicLoader.style.display = 'flex';
          modalSchematicImg.style.opacity = '0.1';
          modalSchematicImg.src = imgSrc;
          if (btnOpenDirectImg) btnOpenDirectImg.href = imgSrc;
          resetZoom();
          document.querySelectorAll('.img-thumb-btn, .image-tab').forEach((t, i) => {
            t.classList.toggle('active', i === idx);
          });
        });
        imageSelectorTabs.appendChild(thumb);
      });
    } else {
      imageSelectorTabs.style.display = 'none';
    }
  }

  function renderPinoutTable(pinout) {
    modalPinTableBody.innerHTML = '';

    if (!pinout || pinout.length === 0) {
      modalPinTableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 18px;">
            Consultez directement le schéma haute définition pour le repérage des broches.
          </td>
        </tr>
      `;
      return;
    }

    pinout.forEach(row => {
      const tr = document.createElement('tr');
      const wireColor = row.color || '#0ea5e9';
      tr.innerHTML = `
        <td>
          <span class="pin-badge" style="border-left: 4px solid ${wireColor};">
            ${escapeHtml(row.pin || 'Pin')}
          </span>
        </td>
        <td>
          <span class="wire-indicator">
            <span class="color-dot" style="background-color: ${wireColor};"></span>
            ${escapeHtml(row.wire || 'Standard')}
          </span>
        </td>
        <td class="pin-desc">${escapeHtml(row.signal || '')}</td>
        <td>
          <button class="btn-copy-pin" title="Copier la consigne">📋 Copier</button>
        </td>
      `;

      tr.querySelector('.btn-copy-pin').addEventListener('click', () => {
        const textToCopy = `${currentEcu.name} | ${row.pin}: ${row.signal} (${row.wire})`;
        copyToClipboard(textToCopy);
      });

      modalPinTableBody.appendChild(tr);
    });
  }

  function renderTechNotes(ecu) {
    let html = `
      <div class="note-item">
        <strong>⚡ Tension Banc d'Essai :</strong> 13.8V Stabilisé (Consommation : 0.8A - 2.5A).
      </div>
      <div class="note-item">
        <strong>🔌 Mode de Connexion :</strong> ${escapeHtml(ecu.connection_mode || 'Bench Standard / Boot BSL')}.
      </div>
      <div class="note-item">
        <strong>💾 Microcontrôleur :</strong> ${escapeHtml(ecu.mcu || 'Infineon TriCore / MPC5xx / Renesas')}.
      </div>
    `;

    if (ecu.notes) {
      html += `
        <div class="note-item note-highlight">
          <strong>⚠️ Consigne Spécifique :</strong> ${escapeHtml(ecu.notes)}
        </div>
      `;
    }

    if (ecu.source) {
      html += `
        <div class="note-item" style="font-size: 0.75rem; color: var(--text-muted);">
          <strong>Source Technique :</strong> Module officiel ${escapeHtml(ecu.source)}.
        </div>
      `;
    }

    modalTechNotes.innerHTML = html;
  }

  // --- SCHEMATIC STAGE INTERACTION (ZOOM & PAN) ---
  function setupSchematicInteractivity() {
    schematicStage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      adjustZoom(delta);
    }, { passive: false });

    // Mouse drag
    schematicStage.addEventListener('mousedown', (e) => {
      if (zoomLevel > 1) {
        isDragging = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        schematicStage.style.cursor = 'grabbing';
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        applyTransform();
      }
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        schematicStage.style.cursor = zoomLevel > 1 ? 'grab' : 'default';
      }
    });

    // Schematic Stage Touch Events (Pinch & Pan)
    schematicStage.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX - panX;
        startY = e.touches[0].clientY - panY;
      } else if (e.touches.length === 2) {
        isDragging = false;
        initialPinchDistance = getDistance(e.touches[0], e.touches[1]);
        initialZoom = zoomLevel;
      }
    }, { passive: true });

    schematicStage.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && isDragging && zoomLevel > 1) {
        if (e.cancelable) e.preventDefault();
        panX = e.touches[0].clientX - startX;
        panY = e.touches[0].clientY - startY;
        applyTransform();
      } else if (e.touches.length === 2 && initialPinchDistance) {
        if (e.cancelable) e.preventDefault();
        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const scaleChange = currentDistance / initialPinchDistance;
        zoomLevel = Math.min(Math.max(0.8, initialZoom * scaleChange), 5);
        applyTransform();
      }
    }, { passive: false });

    schematicStage.addEventListener('touchend', () => {
      isDragging = false;
      initialPinchDistance = null;
    });
  }

  function getDistance(t1, t2) {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  }

  function adjustZoom(amount) {
    zoomLevel = Math.min(Math.max(0.5, zoomLevel + amount), 5);
    applyTransform();
  }

  function resetZoom() {
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    isInverted = false;
    modalSchematicImg.style.filter = 'none';
    btnInvertColors.classList.remove('active');
    applyTransform();
  }

  function toggleInvertColors() {
    isInverted = !isInverted;
    btnInvertColors.classList.toggle('active', isInverted);
    modalSchematicImg.style.filter = isInverted ? 'invert(1) hue-rotate(180deg) contrast(1.2)' : 'none';
  }

  function applyTransform() {
    modalSchematicImg.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
    schematicStage.style.cursor = zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default';
  }

  function downloadCurrentSchematic() {
    if (!currentEcu) return;
    const currentImgSrc = (currentEcu.images && currentEcu.images[activeImageIndex]) || currentEcu.images[0];
    if (!currentImgSrc) return;

    const link = document.createElement('a');
    link.href = currentImgSrc;
    link.download = `PINOUT_${currentEcu.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_VUE${activeImageIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Téléchargement du schéma en cours...');
  }

  // --- FAVORITES & NOTES ---
  function toggleFavorite(ecuId) {
    if (favorites.has(ecuId)) {
      favorites.delete(ecuId);
      showToast('Calculateur retiré des favoris');
    } else {
      favorites.add(ecuId);
      showToast('Calculateur ajouté aux favoris ⭐');
    }
    localStorage.setItem('cfpm_favorites', JSON.stringify(Array.from(favorites)));
    updateFavCounter();

    if (currentEcu && currentEcu.id === ecuId) {
      updateModalFavButton();
    }
  }

  function toggleModalFavorite() {
    if (!currentEcu) return;
    toggleFavorite(currentEcu.id);
  }

  function updateModalFavButton() {
    if (!currentEcu) return;
    const isFav = favorites.has(currentEcu.id);
    btnFavModal.classList.toggle('active', isFav);
    btnFavModal.innerHTML = isFav ? '★ Favori Enregistré' : '☆ Ajouter aux Favoris';
  }

  function updateFavCounter() {
    if (favCount) {
      favCount.textContent = favorites.size;
    }
  }

  function saveCurrentTechnicianNote() {
    if (!currentEcu) return;
    const note = technicianNoteInput.value.trim();
    if (note) {
      localStorage.setItem('cfpm_note_' + currentEcu.id, note);
      showToast('Note d\'atelier enregistrée avec succès ! 💾');
    } else {
      localStorage.removeItem('cfpm_note_' + currentEcu.id);
      showToast('Note effacée');
    }
  }

  // --- UTILS & HELPERS ---
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('active', 'open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active', 'open');
    document.body.style.overflow = '';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Copié dans le presse-papiers ! 📋');
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast('Copié dans le presse-papiers ! 📋');
    } catch (err) {
      showToast('Impossible de copier automatiquement', 'error');
    }
    document.body.removeChild(textarea);
  }

  function showToast(message, type = 'info') {
    const existingToast = document.querySelector('.cfpm-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `cfpm-toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js?v=2.0.3')
        .then((reg) => {
          console.log('Service Worker CFPM 237 v2.0.3 actif');
          if (reg) reg.update();
        })
        .catch(err => console.log('SW registration error:', err));
    }
  }

  // Run on DOM loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
