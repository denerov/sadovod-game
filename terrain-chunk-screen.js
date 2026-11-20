// One low-resolution overview covers the entire owned map. Native-resolution
// detail tiles are prepared only for the visible area and reused while moving.
const svg = document.querySelector('.plot');
const canvas = document.querySelector('.terrain-chunk-screen');
const ctx = canvas?.getContext('2d', {alpha: true});
const TILE = 96;
const GUTTER = 2;
const MAX_PARALLEL = 2;
const MAX_CACHE_PIXELS = 24 * 1024 * 1024;
let view = window.SadovodCameraView || null;
let generation = 0;
let source = null;
let overview = null;
let tiles = new Map();
let required = new Map();
let queue = [];
let active = 0;
let frame = 0;
let rebuilding = 0;
let detailWork = 0;
let signature = '';
let materialsRevision = 0;
let cachePixels = 0;
let used = 0;

function release(image) {
 image?.close?.();
}

function absoluteImages(node) {
 for (const image of node.querySelectorAll('image')) {
  const href = image.getAttribute('href') || image.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
  if (href && !/^(data:|blob:|#)/.test(href)) image.setAttribute('href', new URL(href, location.href).href);
 }
}

function snapshot(root) {
 const bounds = root.getBBox();
 const box = {x: bounds.x - 4, y: bounds.y - 4, width: bounds.width + 8, height: bounds.height + 8};
 const defs = [...svg.querySelectorAll(':scope > defs')].map(node => node.cloneNode(true));
 const landscape = root.cloneNode(true);
 landscape.style.visibility = '';
 landscape.querySelector('[data-landscape-layer="ObjectContact"]')?.remove();
 landscape.querySelectorAll('[data-lod]').forEach(node => node.style.display = '');
 // Camera clipping belongs to the live SVG, never to a world-space bitmap.
 // Reset both the mask bounds and its white coverage for the expanded farm.
 for (const node of [...defs, landscape]) {
  for (const mask of node.querySelectorAll('[data-camera-turf-mask]')) {
   for (const [name, value] of Object.entries(box)) mask.setAttribute(name, value);
   const coverage = mask.querySelector('rect');
   if (coverage) for (const [name, value] of Object.entries(box)) coverage.setAttribute(name, value);
  }
  absoluteImages(node);
 }
 return {box, markup: defs.map(node => node.outerHTML).join('') + landscape.outerHTML, generation};
}

async function raster(source, box, density) {
 const width = Math.max(1, Math.ceil(box.width * density));
 const height = Math.max(1, Math.ceil(box.height * density));
 const text = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${box.x} ${box.y} ${box.width} ${box.height}" preserveAspectRatio="none">${source.markup}</svg>`;
 const url = URL.createObjectURL(new Blob([text], {type: 'image/svg+xml'}));
 try {
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  await image.decode();
  // SVG decoding retains the vector document. Convert it once to a reusable
  // bitmap so camera drawing cannot trigger another SVG rasterisation.
  if ('createImageBitmap' in window) {
   try {return await createImageBitmap(image)} catch {}
  }
  const buffer = document.createElement('canvas');
  buffer.width = width;
  buffer.height = height;
  buffer.getContext('2d').drawImage(image, 0, 0, width, height);
  return buffer;
 } finally {
  URL.revokeObjectURL(url);
 }
}

function pixelRatio() {
 return Math.min(window.devicePixelRatio || 1, 2);
}

function queuePaint() {
 if (!frame) frame = requestAnimationFrame(paint);
}

function paint() {
 frame = 0;
 if (!ctx || !view || !overview) return;
 const dpr = pixelRatio();
 const width = Math.max(1, Math.round(view.width * dpr));
 const height = Math.max(1, Math.round(view.height * dpr));
 if (canvas.width !== width || canvas.height !== height) {
  canvas.width = width;
  canvas.height = height;
 }
 ctx.setTransform(1, 0, 0, 1, 0, 0);
 ctx.clearRect(0, 0, width, height);
 ctx.imageSmoothingEnabled = true;
 ctx.imageSmoothingQuality = 'high';
 ctx.setTransform(view.scale * dpr, 0, 0, view.scale * dpr, view.x * dpr, view.y * dpr);
 const box = overview.box;
 ctx.drawImage(overview.image, box.x, box.y, box.width, box.height);
 if (view.scale * dpr <= overview.density) return;
 const left = -view.x / view.scale;
 const top = -view.y / view.scale;
 const right = (view.width - view.x) / view.scale;
 const bottom = (view.height - view.y) / view.scale;
 // Keep the previous detail level visible while sharper tiles are decoded.
 // Every level uses the same world coordinates, including during a gesture.
 for (const density of [1, 2, 4, 8, 16]) for (const tile of tiles.values()) {
  if (tile.density !== density || tile.x + TILE < left || tile.x > right || tile.y + TILE < top || tile.y > bottom) continue;
  tile.used = ++used;
  const gutter = GUTTER * density;
  const size = TILE * density;
  ctx.drawImage(tile.image, gutter, gutter, size, size, tile.x, tile.y, TILE, TILE);
 }
}

function trimCache() {
 if (cachePixels <= MAX_CACHE_PIXELS) return;
 const candidates = [...tiles].filter(([key]) => !required.has(key)).sort((a, b) => a[1].used - b[1].used);
 for (const [key, tile] of candidates) {
  tiles.delete(key);
  cachePixels -= tile.image.width * tile.image.height;
  release(tile.image);
  if (cachePixels <= MAX_CACHE_PIXELS) break;
 }
}

function scheduleVisible() {
 if (!source || !view || !overview || source.generation !== overview.generation) return;
 if (view.scale * pixelRatio() <= overview.density) {
  required = new Map();
  queue = [];
  return;
 }
 const density = Math.min(16, Math.max(1, 2 ** Math.ceil(Math.log2(view.scale * pixelRatio()))));
 const left = Math.max(source.box.x, -view.x / view.scale);
 const top = Math.max(source.box.y, -view.y / view.scale);
 const right = Math.min(source.box.x + source.box.width, (view.width - view.x) / view.scale);
 const bottom = Math.min(source.box.y + source.box.height, (view.height - view.y) / view.scale);
 const next = new Map();
 for (let y = Math.floor(top / TILE) * TILE; y < bottom; y += TILE) {
  for (let x = Math.floor(left / TILE) * TILE; x < right; x += TILE) {
   const key = `${density}:${x}:${y}`;
   next.set(key, {key, x, y, density});
  }
 }
 required = next;
 queue = [...required.values()].filter(job => !tiles.has(job.key));
 const centerX = (left + right) / 2;
 const centerY = (top + bottom) / 2;
 queue.sort((a, b) => Math.hypot(a.x + TILE / 2 - centerX, a.y + TILE / 2 - centerY) - Math.hypot(b.x + TILE / 2 - centerX, b.y + TILE / 2 - centerY));
 trimCache();
 requestDetails();
}

const pending = new Set();
function requestDetails() {
 if (detailWork || active >= MAX_PARALLEL || !queue.length) return;
 if (typeof window.requestIdleCallback === 'function') {
  detailWork = window.requestIdleCallback(deadline => {
   detailWork = 0;
   // Leave the next animation frame room to paint. There is no forced timeout
   // that can start a decode while a busy camera is still using that budget.
   if (deadline.timeRemaining() < 6) {requestDetails(); return}
   pump();
  });
 } else {
  // Start a single job after the next paint on browsers without idle callbacks.
  detailWork = requestAnimationFrame(() => setTimeout(() => {detailWork = 0; pump()}, 0));
 }
}
function pump() {
 if (active >= MAX_PARALLEL) return;
 while (queue.length) {
  const job = queue.shift();
  const current = source;
  const requestKey = `${current.generation}:${job.key}`;
  if (tiles.has(job.key) || pending.has(requestKey)) continue;
  pending.add(requestKey);
  active++;
  raster(current, {x: job.x - GUTTER, y: job.y - GUTTER, width: TILE + GUTTER * 2, height: TILE + GUTTER * 2}, job.density)
   .then(image => {
    if (current !== source) {release(image); return}
    tiles.set(job.key, {...job, image, used: ++used});
    cachePixels += image.width * image.height;
    trimCache();
    queuePaint();
   })
   .catch(error => console.error('Terrain detail tile', error))
   .finally(() => {pending.delete(requestKey); active--; requestDetails()});
  // One new decode per available idle slot, at most two in flight.
  requestDetails();
  break;
 }
}

async function rebuild() {
 const root = svg?.querySelector('[data-terrain-engine]');
 if (!root || !ctx) return;
 const nextSignature = `${root.dataset.terrainRevision}:${materialsRevision}`;
 if (signature === nextSignature) return;
 signature = nextSignature;
 generation++;
 const next = snapshot(root);
 source = next;
 queue = [];
 try {
  // A single 1x overview is sufficient for an entire zoomed-out farm.
  // Avoid decoding hundreds of tiny SVG tiles at distant camera scales.
  const density = Math.min(1, 4096 / Math.max(next.box.width, next.box.height));
  const image = await raster(next, next.box, density);
  if (next !== source) {release(image); return}
  release(overview?.image);
  for (const tile of tiles.values()) release(tile.image);
  tiles = new Map();
  cachePixels = 0;
  overview = {...next, image, density};
  root.style.visibility = 'hidden';
  const contact = root.querySelector('[data-landscape-layer="ObjectContact"]');
  if (contact) contact.style.visibility = 'visible';
  document.documentElement.dataset.terrainRenderer = 'chunks';
  scheduleVisible();
  paint();
 } catch (error) {
  signature = '';
  root.style.visibility = '';
  console.error('Terrain overview', error);
 }
}

function requestRebuild() {
 clearTimeout(rebuilding);
 rebuilding = setTimeout(rebuild, 40);
}
window.addEventListener('sadovod:camera-frame', event => {
 view = event.detail;
 // This event already runs inside the camera's animation frame. Painting here
 // keeps terrain and objects together instead of delaying terrain by one frame.
 if (frame) {cancelAnimationFrame(frame); frame = 0}
 scheduleVisible();
 paint();
});
window.addEventListener('sadovod:terrain-ready', requestRebuild);
window.addEventListener('sadovod:terrain-material-ready', () => {materialsRevision++; requestRebuild()});
if (svg?.querySelector('[data-terrain-engine]')) requestRebuild();
