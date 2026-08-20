/**
 * PIN OUT CFPM GBE AUTO 237 - Application Logic
 * Base de données professionnelle de brochages et schémas calculateurs
 * Version 2.1.0 - Moteur HD Lightbox & Visualisation Optimisée
 */

(function () {
  'use strict';

  // --- SAFE ERROR LOGGING (Non-blocking) ---
  window.addEventListener('error', function (event) {
    console.warn('[CFPM GBE AUTO] Erreur script capturée:', event.message, event.filename, event.lineno);
  });

  window.addEventListener('unhandledrejection', function (event) {
    console.warn('[CFPM GBE AUTO] Promesse rejetée:', event.reason);
  });

  // --- APP STATE ---
  let database = window.PINOUT_DATABASE || [];
  let filteredResults = [];
  let currentEcu = null;
  let currentImages = [];
  let activeImageIndex = 0;
  let favorites = new Set(JSON.parse(localStorage.getItem('cfpm_favorites') || '[]'));
  let showOnlyFavorites = false;

  // Modal Stage Zoom & Pan state
  let stageZoom = 1;
  let stagePanX = 0;
  let stagePanY = 0;
  let stageIsDragging = false;
  let stageStartX = 0;
  let stageStartY = 0;
  let stageIsInverted = false;
  let stagePinchDist = null;
  let stageInitialZoom = 1;

  // Lightbox Zoom, Pan & Rotate state
  let lbZoom = 1;
  let lbPanX = 0;
  let lbPanY = 0;
  let lbRotation = 0;
  let lbIsDragging = false;
  let lbStartX = 0;
  let lbStartY = 0;
  let lbIsInverted = false;
  let lbPinchDist = null;
  let lbInitialZoom = 1;

  // Pagination
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

  // Detail Modal Elements
  const detailModal = document.getElementById('detailModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalEcuTitle = document.getElementById('modalEcuTitle');
  const modalEcuTags = document.getElementById('modalEcuTags');
  const modalSchematicImg = document.getElementById('modalSchematicImg');
  const schematicStage = document.getElementById('schematicStage');
  const schematicSpinner = document.getElementById('schematicSpinner');
  const imageSelectorTabs = document.getElementById('imageSelectorTabs');
  const modalPinTableBody = document.getElementById('modalPinTableBody');
  const modalTechNotes = document.getElementById('modalTechNotes');
  const technicianNoteInput = document.getElementById('technicianNoteInput');
  const btnSaveNote = document.getElementById('btnSaveNote');

  // Modal Toolbar Buttons
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnResetZoom = document.getElementById('btnResetZoom');
  const btnInvertColors = document.getElementById('btnInvertColors');
  const btnOpenLightbox = document.getElementById('btnOpenLightbox');
  const btnDownloadImg = document.getElementById('btnDownloadImg');
  const btnFavModal = document.getElementById('btnFavModal');

  // Lightbox Modal Elements
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxPageIndicator = document.getElementById('lightboxPageIndicator');
  const lightboxStage = document.getElementById('lightboxStage');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxSpinner = document.getElementById('lightboxSpinner');
  const lightboxZoomLevel = document.getElementById('lightboxZoomLevel');
  const btnLightboxZoomIn = document.getElementById('btnLightboxZoomIn');
  const btnLightboxZoomOut = document.getElementById('btnLightboxZoomOut');
  const btnLightboxReset = document.getElementById('btnLightboxReset');
  const btnLightboxRotate = document.getElementById('btnLightboxRotate');
  const btnLightboxInvert = document.getElementById('btnLightboxInvert');
  const btnLightboxDownload = document.getElementById('btnLightboxDownload');
  const btnLightboxClose = document.getElementById('btnLightboxClose');
  const btnLightboxPrev = document.getElementById('btnLightboxPrev');
  const btnLightboxNext = document.getElementById('btnLightboxNext');

  // Header & Tools Modals
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
    setupSchematicInteractivity();
    setupLightboxInteractivity();
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

    const sortedBrands = Array.from(brandsSet).sort((a, b) => a.localeCompare(b, 'fr'));
    sortedBrands.forEach(brand => {
      const opt = document.createElement('option');
      opt.value = brand;
      opt.textContent = brand;
      filterBrand.appendChild(opt);
    });

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

    [filterBrand, filterEcuBrand, filterFamily, filterMode, filterFuel, sortOrder].forEach(el => {
      if (el) el.addEventListener('change', applyFilters);
    });

    document.querySelectorAll('.quick-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const query = pill.dataset.search || '';
        searchInput.value = query;
        searchClearBtn.style.display = 'flex';
        applyFilters();
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

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

    btnOpenTools?.addEventListener('click', () => openModal(toolsModal));
    toolsModalCloseBtn?.addEventListener('click', () => closeModal(toolsModal));

    btnDownloadApk?.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(apkModal);
    });
    apkModalCloseBtn?.addEventListener('click', () => closeModal(apkModal));

    modalCloseBtn?.addEventListener('click', () => closeModal(detailModal));

    [detailModal, toolsModal, apkModal].forEach(modal => {
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) closeModal(modal);
        });
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (lightboxModal && lightboxModal.classList.contains('open')) {
          closeLightbox();
        } else {
          closeModal(detailModal);
          closeModal(toolsModal);
          closeModal(apkModal);
        }
      } else if (lightboxModal && lightboxModal.classList.contains('open')) {
        if (e.key === 'ArrowLeft') showLightboxPrevImage();
        if (e.key === 'ArrowRight') showLightboxNextImage();
        if (e.key === '+' || e.key === '=') adjustLightboxZoom(0.3);
        if (e.key === '-' || e.key === '_') adjustLightboxZoom(-0.3);
        if (e.key === '0') resetLightboxZoom();
        if (e.key.toLowerCase() === 'r') rotateLightboxImage();
        if (e.key.toLowerCase() === 'i') toggleLightboxInvert();
      }
    });

    btnZoomIn?.addEventListener('click', () => adjustStageZoom(0.3));
    btnZoomOut?.addEventListener('click', () => adjustStageZoom(-0.3));
    btnResetZoom?.addEventListener('click', resetStageZoom);
    btnInvertColors?.addEventListener('click', toggleStageInvert);
    btnOpenLightbox?.addEventListener('click', openLightbox);
    btnDownloadImg?.addEventListener('click', downloadCurrentSchematic);
    btnFavModal?.addEventListener('click', toggleModalFavorite);

    btnSaveNote?.addEventListener('click', saveCurrentTechnicianNote);

    schematicStage?.addEventListener('click', (e) => {
      if (stageIsDragging) return;
      openLightbox();
    });

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
      if (showOnlyFavorites && !favorites.has(item.id)) {
        return false;
      }
      if (selectedBrand && (!item.vehicle_brands || !item.vehicle_brands.includes(selectedBrand))) {
        return false;
      }
      if (selectedEcuBrand && item.ecu_brand !== selectedEcuBrand) {
        return false;
      }
      if (selectedFamily && item.ecu_family !== selectedFamily) {
        return false;
      }
      if (selectedMode && item.connection_mode && !item.connection_mode.toLowerCase().includes(selectedMode.toLowerCase())) {
        return false;
      }
      if (selectedFuel && item.fuel_type && item.fuel_type !== selectedFuel) {
        return false;
      }
      if (queryTokens.length > 0) {
        const searchableText = `${item.name} ${item.ecu_family || ''} ${item.ecu_brand || ''} ${(item.vehicle_brands || []).join(' ')} ${item.mcu || ''} ${item.connection_mode || ''} ${item.notes || ''} ${item.search_tokens || ''}`.toLowerCase();
        const matchesAll = queryTokens.every(token => searchableText.includes(token));
        if (!matchesAll) return false;
      }
      return true;
    });

    sortResults(sortBy);

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

  // --- CARDS RENDERING ---
  function renderNextChunk() {
    const nextChunk = filteredResults.slice(displayedCount, displayedCount + ITEMS_PER_PAGE);
    if (nextChunk.length === 0) return;

    const fragment = document.createDocumentFragment();

    nextChunk.forEach(ecu => {
      const card = createEcuCard(ecu);
      fragment.appendChild(card);
    });

    const existingLoadMore = document.getElementById('loadMoreContainer');
    if (existingLoadMore) existingLoadMore.remove();

    cardsGrid.appendChild(fragment);
    displayedCount += nextChunk.length;

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

      document.getElementById('btnLoadMore')?.addEventListener('click', () => {
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

    const thumbSrc = (ecu.images && ecu.images.length > 0) ? ecu.images[0] : 'assets/icon-192.png';
    const brandsList = (ecu.vehicle_brands && ecu.vehicle_brands.length > 0) ? ecu.vehicle_brands.slice(0, 3).join(', ') : 'Multi-Marques';
    const pinCount = (ecu.pinout_table && Array.isArray(ecu.pinout_table)) ? ecu.pinout_table.length : 0;
    const viewCount = (ecu.images && Array.isArray(ecu.images)) ? ecu.images.length : 1;

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
          <img src="${thumbSrc}" alt="${escapeHtml(ecu.name)}" loading="lazy" onerror="this.src='assets/icon-192.png';">
          <div class="card-mode-badge">${escapeHtml(ecu.connection_mode || 'Bench / Boot')}</div>
          ${viewCount > 1 ? `<span class="img-badge-count">📸 ${viewCount} Vues</span>` : ''}
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

    return card;
  }

  // --- DETAIL MODAL & SCHEMATIC VIEWER ---
  function openEcuDetails(ecu) {
    if (!ecu) return;
    currentEcu = ecu;
    currentImages = (ecu.images && Array.isArray(ecu.images) && ecu.images.length > 0) ? ecu.images : ['assets/icon-192.png'];
    activeImageIndex = 0;

    modalEcuTitle.textContent = ecu.name;

    modalEcuTags.innerHTML = `
      <span class="badge badge-brand">${escapeHtml(ecu.ecu_brand || 'ECU')}</span>
      <span class="badge badge-family">${escapeHtml(ecu.ecu_family || 'Calculateur')}</span>
      <span class="badge badge-mode">${escapeHtml(ecu.connection_mode || 'Direct Bench')}</span>
      <span class="badge badge-fuel">${escapeHtml(ecu.fuel_type || 'Diesel/Essence')}</span>
      ${(ecu.vehicle_brands || []).map(b => `<span class="badge badge-car">${escapeHtml(b)}</span>`).join('')}
    `;

    loadStageImage(currentImages[0]);

    if (imageSelectorTabs) {
      if (currentImages.length > 1) {
        imageSelectorTabs.style.display = 'flex';
        imageSelectorTabs.innerHTML = currentImages.map((imgSrc, idx) => `
          <button type="button" class="img-thumb-btn image-tab ${idx === 0 ? 'active' : ''}" data-idx="${idx}">
            <img src="${imgSrc}" alt="Vue ${idx + 1}" onerror="this.src='assets/icon-192.png';">
            <span>Vue ${idx + 1}</span>
          </button>
        `).join('');

        imageSelectorTabs.querySelectorAll('.image-tab').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.getAttribute('data-idx'), 10);
            selectImageTab(idx);
          });
        });
      } else {
        imageSelectorTabs.style.display = 'none';
        imageSelectorTabs.innerHTML = '';
      }
    }

    renderPinoutTable(ecu.pinout_table || []);
    renderTechNotes(ecu);

    if (technicianNoteInput) {
      const savedNote = localStorage.getItem('cfpm_note_' + ecu.id) || '';
      technicianNoteInput.value = savedNote;
    }

    updateModalFavButton();
    openModal(detailModal);
  }

  function selectImageTab(idx) {
    if (!currentImages || idx < 0 || idx >= currentImages.length) return;
    activeImageIndex = idx;
    loadStageImage(currentImages[idx]);

    if (imageSelectorTabs) {
      imageSelectorTabs.querySelectorAll('.image-tab').forEach((b, i) => {
        b.classList.toggle('active', i === idx);
      });
    }
  }

  function loadStageImage(src) {
    if (!modalSchematicImg) return;
    resetStageZoom();

    if (schematicSpinner) schematicSpinner.style.display = 'flex';
    modalSchematicImg.style.opacity = '0';

    const tempImg = new Image();
    tempImg.onload = function () {
      modalSchematicImg.src = src;
      modalSchematicImg.style.opacity = '1';
      if (schematicSpinner) schematicSpinner.style.display = 'none';
    };
    tempImg.onerror = function () {
      modalSchematicImg.src = 'assets/icon-192.png';
      modalSchematicImg.style.opacity = '1';
      if (schematicSpinner) schematicSpinner.style.display = 'none';
      console.warn('[CFPM GBE AUTO] Image non trouvée:', src);
    };
    tempImg.src = src;
  }

  function renderPinoutTable(pinout) {
    modalPinTableBody.innerHTML = '';

    if (!pinout || pinout.length === 0) {
      modalPinTableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 18px;">
            Consultez directement le schéma haute définition ci-dessus pour le repérage des broches.
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
        const textToCopy = `${currentEcu ? currentEcu.name : 'ECU'} | ${row.pin}: ${row.signal} (${row.wire})`;
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
          <strong>Source Technique :</strong> Base certifiée ${escapeHtml(ecu.source)}.
        </div>
      `;
    }

    modalTechNotes.innerHTML = html;
  }

  // --- STAGE PAN & ZOOM (Modal Viewer) ---
  function setupSchematicInteractivity() {
    if (!schematicStage) return;

    schematicStage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      adjustStageZoom(delta);
    }, { passive: false });

    schematicStage.addEventListener('mousedown', (e) => {
      if (stageZoom > 1) {
        stageIsDragging = true;
        stageStartX = e.clientX - stagePanX;
        stageStartY = e.clientY - stagePanY;
        schematicStage.style.cursor = 'grabbing';
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (stageIsDragging) {
        stagePanX = e.clientX - stageStartX;
        stagePanY = e.clientY - stageStartY;
        applyStageTransform();
      }
    });

    window.addEventListener('mouseup', () => {
      if (stageIsDragging) {
        stageIsDragging = false;
        if (schematicStage) schematicStage.style.cursor = stageZoom > 1 ? 'grab' : 'zoom-in';
      }
    });

    schematicStage.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        if (stageZoom > 1) {
          stageIsDragging = true;
          stageStartX = e.touches[0].clientX - stagePanX;
          stageStartY = e.touches[0].clientY - stagePanY;
        }
      } else if (e.touches.length === 2) {
        stageIsDragging = false;
        stagePinchDist = getDistance(e.touches[0], e.touches[1]);
        stageInitialZoom = stageZoom;
      }
    }, { passive: true });

    schematicStage.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && stageIsDragging && stageZoom > 1) {
        if (e.cancelable) e.preventDefault();
        stagePanX = e.touches[0].clientX - stageStartX;
        stagePanY = e.touches[0].clientY - stageStartY;
        applyStageTransform();
      } else if (e.touches.length === 2 && stagePinchDist) {
        if (e.cancelable) e.preventDefault();
        const dist = getDistance(e.touches[0], e.touches[1]);
        const scaleChange = dist / stagePinchDist;
        stageZoom = Math.min(Math.max(0.8, stageInitialZoom * scaleChange), 4);
        applyStageTransform();
      }
    }, { passive: false });

    schematicStage.addEventListener('touchend', () => {
      stageIsDragging = false;
      stagePinchDist = null;
    });
  }

  function adjustStageZoom(amount) {
    stageZoom = Math.min(Math.max(0.5, stageZoom + amount), 4);
    applyStageTransform();
  }

  function resetStageZoom() {
    stageZoom = 1;
    stagePanX = 0;
    stagePanY = 0;
    stageIsInverted = false;
    btnInvertColors?.classList.remove('active');
    if (modalSchematicImg) {
      modalSchematicImg.style.filter = 'none';
    }
    applyStageTransform();
  }

  function toggleStageInvert() {
    stageIsInverted = !stageIsInverted;
    btnInvertColors?.classList.toggle('active', stageIsInverted);
    if (modalSchematicImg) {
      modalSchematicImg.style.filter = stageIsInverted ? 'invert(1) hue-rotate(180deg) contrast(1.2)' : 'none';
    }
  }

  function applyStageTransform() {
    if (!modalSchematicImg) return;
    if (stageZoom === 1 && stagePanX === 0 && stagePanY === 0) {
      modalSchematicImg.style.transform = 'none';
    } else {
      modalSchematicImg.style.transform = `translate(${stagePanX}px, ${stagePanY}px) scale(${stageZoom})`;
    }
    if (schematicStage) {
      schematicStage.style.cursor = stageZoom > 1 ? (stageIsDragging ? 'grabbing' : 'grab') : 'zoom-in';
    }
  }

  // --- FULLSCREEN HD LIGHTBOX VIEWER ---
  function setupLightboxInteractivity() {
    if (!lightboxModal || !lightboxStage) return;

    btnLightboxClose?.addEventListener('click', closeLightbox);
    btnLightboxZoomIn?.addEventListener('click', () => adjustLightboxZoom(0.35));
    btnLightboxZoomOut?.addEventListener('click', () => adjustLightboxZoom(-0.35));
    btnLightboxReset?.addEventListener('click', resetLightboxZoom);
    btnLightboxRotate?.addEventListener('click', rotateLightboxImage);
    btnLightboxInvert?.addEventListener('click', toggleLightboxInvert);
    btnLightboxDownload?.addEventListener('click', downloadCurrentSchematic);

    btnLightboxPrev?.addEventListener('click', showLightboxPrevImage);
    btnLightboxNext?.addEventListener('click', showLightboxNextImage);

    lightboxStage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.25 : -0.25;
      adjustLightboxZoom(delta);
    }, { passive: false });

    lightboxStage.addEventListener('dblclick', (e) => {
      e.preventDefault();
      if (lbZoom > 1.2) {
        resetLightboxZoom();
      } else {
        lbZoom = 2.5;
        applyLightboxTransform();
      }
    });

    lightboxStage.addEventListener('mousedown', (e) => {
      lbIsDragging = true;
      lbStartX = e.clientX - lbPanX;
      lbStartY = e.clientY - lbPanY;
      lightboxStage.classList.add('dragging');
    });

    window.addEventListener('mousemove', (e) => {
      if (lbIsDragging) {
        lbPanX = e.clientX - lbStartX;
        lbPanY = e.clientY - lbStartY;
        applyLightboxTransform();
      }
    });

    window.addEventListener('mouseup', () => {
      if (lbIsDragging) {
        lbIsDragging = false;
        lightboxStage.classList.remove('dragging');
      }
    });

    lightboxStage.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        lbIsDragging = true;
        lbStartX = e.touches[0].clientX - lbPanX;
        lbStartY = e.touches[0].clientY - lbPanY;
      } else if (e.touches.length === 2) {
        lbIsDragging = false;
        lbPinchDist = getDistance(e.touches[0], e.touches[1]);
        lbInitialZoom = lbZoom;
      }
    }, { passive: true });

    lightboxStage.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && lbIsDragging) {
        if (e.cancelable) e.preventDefault();
        lbPanX = e.touches[0].clientX - lbStartX;
        lbPanY = e.touches[0].clientY - lbStartY;
        applyLightboxTransform();
      } else if (e.touches.length === 2 && lbPinchDist) {
        if (e.cancelable) e.preventDefault();
        const dist = getDistance(e.touches[0], e.touches[1]);
        const scaleChange = dist / lbPinchDist;
        lbZoom = Math.min(Math.max(0.6, lbInitialZoom * scaleChange), 6);
        applyLightboxTransform();
      }
    }, { passive: false });

    lightboxStage.addEventListener('touchend', () => {
      lbIsDragging = false;
      lbPinchDist = null;
    });
  }

  function openLightbox() {
    if (!currentEcu) return;
    if (!currentImages || currentImages.length === 0) return;

    lightboxTitle.textContent = currentEcu.name;
    updateLightboxPage();
    loadLightboxImage(currentImages[activeImageIndex]);

    lightboxModal.classList.add('open', 'active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightboxModal) return;
    lightboxModal.classList.remove('open', 'active');
    if (!detailModal.classList.contains('open')) {
      document.body.style.overflow = '';
    }
  }

  function loadLightboxImage(src) {
    if (!lightboxImg) return;
    resetLightboxZoom();

    if (lightboxSpinner) lightboxSpinner.style.display = 'flex';
    lightboxImg.style.opacity = '0';

    const temp = new Image();
    temp.onload = function () {
      lightboxImg.src = src;
      lightboxImg.style.opacity = '1';
      if (lightboxSpinner) lightboxSpinner.style.display = 'none';
    };
    temp.onerror = function () {
      lightboxImg.src = 'assets/icon-192.png';
      lightboxImg.style.opacity = '1';
      if (lightboxSpinner) lightboxSpinner.style.display = 'none';
    };
    temp.src = src;
  }

  function updateLightboxPage() {
    if (!currentImages) return;
    const total = currentImages.length;
    if (lightboxPageIndicator) {
      lightboxPageIndicator.textContent = `Vue ${activeImageIndex + 1} / ${total}`;
    }

    if (btnLightboxPrev) btnLightboxPrev.style.display = total > 1 ? 'flex' : 'none';
    if (btnLightboxNext) btnLightboxNext.style.display = total > 1 ? 'flex' : 'none';
  }

  function showLightboxPrevImage() {
    if (!currentImages || currentImages.length <= 1) return;
    activeImageIndex = (activeImageIndex - 1 + currentImages.length) % currentImages.length;
    updateLightboxPage();
    loadLightboxImage(currentImages[activeImageIndex]);
    selectImageTab(activeImageIndex);
  }

  function showLightboxNextImage() {
    if (!currentImages || currentImages.length <= 1) return;
    activeImageIndex = (activeImageIndex + 1) % currentImages.length;
    updateLightboxPage();
    loadLightboxImage(currentImages[activeImageIndex]);
    selectImageTab(activeImageIndex);
  }

  function adjustLightboxZoom(amount) {
    lbZoom = Math.min(Math.max(0.5, lbZoom + amount), 6);
    applyLightboxTransform();
  }

  function resetLightboxZoom() {
    lbZoom = 1;
    lbPanX = 0;
    lbPanY = 0;
    lbRotation = 0;
    lbIsInverted = false;
    btnLightboxInvert?.classList.remove('active');
    if (lightboxImg) {
      lightboxImg.style.filter = 'none';
    }
    applyLightboxTransform();
  }

  function rotateLightboxImage() {
    lbRotation = (lbRotation + 90) % 360;
    applyLightboxTransform();
  }

  function toggleLightboxInvert() {
    lbIsInverted = !lbIsInverted;
    btnLightboxInvert?.classList.toggle('active', lbIsInverted);
    if (lightboxImg) {
      lightboxImg.style.filter = lbIsInverted ? 'invert(1) hue-rotate(180deg) contrast(1.25)' : 'none';
    }
  }

  function applyLightboxTransform() {
    if (!lightboxImg) return;
    lightboxImg.style.transform = `translate(${lbPanX}px, ${lbPanY}px) scale(${lbZoom}) rotate(${lbRotation}deg)`;
    if (lightboxZoomLevel) {
      lightboxZoomLevel.textContent = `${Math.round(lbZoom * 100)}%`;
    }
  }

  // --- DOWNLOAD & FAVORITES ---
  function downloadCurrentSchematic() {
    if (!currentEcu) return;
    const currentImgSrc = (currentImages && currentImages[activeImageIndex]) || 'assets/icon-192.png';

    const link = document.createElement('a');
    link.href = currentImgSrc;
    link.download = `PINOUT_${currentEcu.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_VUE${activeImageIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Téléchargement du schéma en cours...');
  }

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
    if (btnFavModal) {
      btnFavModal.classList.toggle('active', isFav);
      btnFavModal.innerHTML = isFav ? '★ Favori Enregistré' : '☆ Favori';
    }
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

  function getDistance(t1, t2) {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
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
    toast.className = `cfpm-toast ${type === 'error' ? 'toast-error' : ''}`;
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
      navigator.serviceWorker.register('./sw.js?v=2.1.0')
        .then((reg) => {
          if (reg) reg.update();
        })
        .catch(err => console.log('SW registration note:', err));
    }
  }

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
