import { createState, regenerateNames } from './state.js';
import { CanvasEditor } from './canvas-editor.js';
import { generateGridRectangles, readGridFromForm } from './grid.js';
import { buildExportPayload, formatJson, downloadJson, copyToClipboard, exportFilename } from './export.js';

const state = createState();

const els = {
  fileInput: document.getElementById('file-input'),
  dropOverlay: document.getElementById('drop-overlay'),
  canvasWrapper: document.getElementById('canvas-wrapper'),
  canvas: document.getElementById('editor-canvas'),
  minimap: document.getElementById('minimap'),
  btnFit: document.getElementById('btn-fit'),
  btnResetZoom: document.getElementById('btn-reset-zoom'),
  zoomLabel: document.getElementById('zoom-label'),
  coordsLabel: document.getElementById('coords-label'),
  sidebar: document.getElementById('sidebar'),
  toggleSidebar: document.getElementById('toggle-sidebar'),
  modeTabs: document.querySelectorAll('.mode-tab'),
  gridPanel: document.getElementById('grid-panel'),
  gridW: document.getElementById('grid-w'),
  gridH: document.getElementById('grid-h'),
  gridCols: document.getElementById('grid-cols'),
  gridRows: document.getElementById('grid-rows'),
  gridOx: document.getElementById('grid-ox'),
  gridOy: document.getElementById('grid-oy'),
  gridSx: document.getElementById('grid-sx'),
  gridSy: document.getElementById('grid-sy'),
  gridPrefix: document.getElementById('grid-prefix'),
  btnApplyGrid: document.getElementById('btn-apply-grid'),
  btnSwitchManual: document.getElementById('btn-switch-manual'),
  namePrefix: document.getElementById('name-prefix'),
  btnRegenNames: document.getElementById('btn-regen-names'),
  snapEnabled: document.getElementById('snap-enabled'),
  snapSize: document.getElementById('snap-size'),
  noSelection: document.getElementById('no-selection'),
  selectionPanel: document.getElementById('selection-panel'),
  rectName: document.getElementById('rect-name'),
  rectX: document.getElementById('rect-x'),
  rectY: document.getElementById('rect-y'),
  rectW: document.getElementById('rect-w'),
  rectH: document.getElementById('rect-h'),
  btnDeleteRect: document.getElementById('btn-delete-rect'),
  rectCount: document.getElementById('rect-count'),
  rectList: document.getElementById('rect-list'),
  showLabels: document.getElementById('show-labels'),
  exportScale: document.getElementById('export-scale'),
  exportAnchorX: document.getElementById('export-anchor-x'),
  exportAnchorY: document.getElementById('export-anchor-y'),
  exportWithOptions: document.getElementById('export-with-options'),
  btnExport: document.getElementById('btn-export'),
  btnCopy: document.getElementById('btn-copy'),
  jsonPreview: document.getElementById('json-preview'),
};

const editor = new CanvasEditor(els.canvas, els.minimap, {
  onChange: refreshUI,
  onCoords: updateCoordsLabel,
  onSelect: (id) => {
    state.selectedId = id;
    refreshUI();
  },
});

editor.setState(state);
editor.resize();

function refreshUI() {
  editor.setState(state);
  els.zoomLabel.textContent = `${Math.round(state.zoom * 100)}%`;
  updateSelectionPanel();
  updateRectList();
  updateJsonPreview();
  els.rectCount.textContent = String(state.rectangles.length);
}

function updateCoordsLabel(x, y, w, h) {
  if (w != null && h != null && w > 0 && h > 0) {
    els.coordsLabel.textContent = `x:${x} y:${y} w:${w} h:${h}`;
  } else {
    els.coordsLabel.textContent = `x:${x} y:${y}`;
  }
}

function updateSelectionPanel() {
  const selected = state.rectangles.find((r) => r.id === state.selectedId);
  if (!selected) {
    els.noSelection.hidden = false;
    els.selectionPanel.hidden = true;
    return;
  }

  els.noSelection.hidden = true;
  els.selectionPanel.hidden = false;
  els.rectName.value = selected.name;
  els.rectX.textContent = String(selected.x);
  els.rectY.textContent = String(selected.y);
  els.rectW.textContent = String(selected.width);
  els.rectH.textContent = String(selected.height);
}

function updateRectList() {
  els.rectList.innerHTML = '';
  state.rectangles.forEach((rect, index) => {
    const li = document.createElement('li');
    li.className = rect.id === state.selectedId ? 'selected' : '';
    li.innerHTML = `<span class="rect-index">${index}</span> <span class="rect-label">${escapeHtml(rect.name)}</span> <span class="rect-dim">${rect.width}×${rect.height}</span>`;
    li.title = `${rect.name} — (${rect.x}, ${rect.y}) ${rect.width}×${rect.height}`;
    li.addEventListener('click', () => {
      state.selectedId = rect.id;
      refreshUI();
    });
    els.rectList.appendChild(li);
  });
}

function updateJsonPreview() {
  const payload = buildExportPayload(state.rectangles, getExportOptions());
  els.jsonPreview.textContent = formatJson(payload);
}

function getExportOptions() {
  return {
    scale: parseFloat(els.exportScale.value) || 1,
    anchorX: parseFloat(els.exportAnchorX.value) ?? 0.5,
    anchorY: parseFloat(els.exportAnchorY.value) ?? 0.5,
    withOptions: els.exportWithOptions.checked,
  };
}

function syncGridFromForm() {
  state.grid = readGridFromForm({
    spriteWidth: els.gridW.value,
    spriteHeight: els.gridH.value,
    columns: els.gridCols.value,
    rows: els.gridRows.value,
    offsetX: els.gridOx.value,
    offsetY: els.gridOy.value,
    spacingX: els.gridSx.value,
    spacingY: els.gridSy.value,
    namePrefix: els.gridPrefix.value,
  });
}

function setMode(mode) {
  state.mode = mode;
  els.modeTabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });
  els.gridPanel.hidden = mode !== 'grid';
  refreshUI();
}

function loadImageFile(file) {
  if (!file || !file.type.startsWith('image/')) return;

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      state.image = img;
      state.imageName = file.name;
      state.rectangles = [];
      state.selectedId = null;
      editor.fitToScreen();
      refreshUI();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// File input
els.fileInput.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  loadImageFile(file);
});

// Drag & drop
['dragenter', 'dragover'].forEach((ev) => {
  els.canvasWrapper.addEventListener(ev, (e) => {
    e.preventDefault();
    els.dropOverlay.classList.remove('hidden');
  });
});

['dragleave', 'drop'].forEach((ev) => {
  els.canvasWrapper.addEventListener(ev, (e) => {
    e.preventDefault();
    if (ev === 'dragleave' && !els.canvasWrapper.contains(e.relatedTarget)) {
      els.dropOverlay.classList.add('hidden');
    }
  });
});

els.canvasWrapper.addEventListener('drop', (e) => {
  els.dropOverlay.classList.add('hidden');
  const file = e.dataTransfer?.files?.[0];
  loadImageFile(file);
});

// Toolbar
els.btnFit.addEventListener('click', () => editor.fitToScreen());
els.btnResetZoom.addEventListener('click', () => editor.resetZoom());

// Mode tabs
els.modeTabs.forEach((tab) => {
  tab.addEventListener('click', () => setMode(/** @type {'manual'|'grid'} */ (tab.dataset.mode)));
});

// Grid
[els.gridW, els.gridH, els.gridCols, els.gridRows, els.gridOx, els.gridOy, els.gridSx, els.gridSy, els.gridPrefix].forEach((input) => {
  input.addEventListener('input', () => {
    syncGridFromForm();
    refreshUI();
  });
});

els.btnApplyGrid.addEventListener('click', () => {
  if (!state.image) {
    alert('Carga una imagen primero.');
    return;
  }
  syncGridFromForm();
  state.rectangles = generateGridRectangles(state);
  state.selectedId = state.rectangles[0]?.id ?? null;
  setMode('manual');
});

els.btnSwitchManual.addEventListener('click', () => setMode('manual'));

// Naming
els.namePrefix.addEventListener('input', () => {
  state.namePrefix = els.namePrefix.value || 'sprite_';
});

els.btnRegenNames.addEventListener('click', () => {
  state.namePrefix = els.namePrefix.value || 'sprite_';
  regenerateNames(state.rectangles, state.namePrefix);
  refreshUI();
});

// Snap
els.snapEnabled.addEventListener('change', () => {
  state.snapEnabled = els.snapEnabled.checked;
  els.snapSize.disabled = !state.snapEnabled;
});

els.snapSize.addEventListener('input', () => {
  state.snapSize = Math.max(1, parseInt(els.snapSize.value, 10) || 1);
});

// Selection panel
els.rectName.addEventListener('input', () => {
  const selected = state.rectangles.find((r) => r.id === state.selectedId);
  if (selected) {
    selected.name = els.rectName.value;
    updateRectList();
    updateJsonPreview();
    editor.render();
  }
});

els.btnDeleteRect.addEventListener('click', deleteSelectedRect);

document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    deleteSelectedRect();
  }
});

function deleteSelectedRect() {
  if (!state.selectedId) return;
  state.rectangles = state.rectangles.filter((r) => r.id !== state.selectedId);
  state.selectedId = null;
  refreshUI();
}

// Visualization
els.showLabels.addEventListener('change', () => {
  state.showLabels = els.showLabels.checked;
  editor.render();
});

// Export
[els.exportScale, els.exportAnchorX, els.exportAnchorY, els.exportWithOptions].forEach((el) => {
  el.addEventListener('input', updateJsonPreview);
  el.addEventListener('change', updateJsonPreview);
});

els.btnExport.addEventListener('click', () => {
  const json = formatJson(buildExportPayload(state.rectangles, getExportOptions()));
  downloadJson(json, exportFilename(state.imageName));
});

els.btnCopy.addEventListener('click', async () => {
  const json = formatJson(buildExportPayload(state.rectangles, getExportOptions()));
  try {
    await copyToClipboard(json);
    els.btnCopy.textContent = '✓ Copiado';
    setTimeout(() => { els.btnCopy.textContent = '📋 Copy'; }, 1500);
  } catch {
    alert('No se pudo copiar al portapapeles.');
  }
});

// Mobile sidebar
els.toggleSidebar.addEventListener('click', () => {
  els.sidebar.classList.toggle('open');
});

// Initial
updateJsonPreview();
