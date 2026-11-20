import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const cameraSource = await fs.readFile(new URL('../camera-motion.js', import.meta.url), 'utf8');
const {CameraLayer} = await import('data:text/javascript;base64,' + Buffer.from(cameraSource).toString('base64'));

test('objects keep the exact terrain projection at every camera position', () => {
 const attributes = new Map();
 const plot = {style: {}, setAttribute(name, value) {attributes.set(name, value)}};
 const camera = new CameraLayer(plot);
 for (const view of [
  {width: 1363, height: 936, scale: 1.5, x: 84, y: 122},
  {width: 1363, height: 936, scale: 6.2, x: -1190, y: -430},
  {width: 844, height: 390, scale: .23, x: 372, y: 15},
 ]) {
  camera.update(view);
  const [x, y, width, height] = attributes.get('viewBox').split(' ').map(Number);
  for (const [wx, wy] of [[-1152, 1536], [384, 192], [1920, 0]]) {
   assert.ok(Math.abs((wx - x) * view.width / width - (wx * view.scale + view.x)) < 1e-9);
   assert.ok(Math.abs((wy - y) * view.height / height - (wy * view.scale + view.y)) < 1e-9);
  }
  assert.equal(plot.style.transform, 'none');
  assert.equal(plot.style.width, view.width + 'px');
 }
});

function fixture() {
 const listeners = new Map(), timers = new Map(), frames = new Map(), urls = new Map();
 const rasters = [], draws = [];
 let id = 0, clones = 0;
 const makeNode = (kind, attrs = {}) => ({
  attrs: {...attrs}, style: {},
  setAttribute(name, value) {this.attrs[name] = String(value)},
  querySelector(selector) {return selector === 'rect' ? this.coverage : null},
  querySelectorAll() {return []},
  get outerHTML() {
   return `<${kind} ${Object.entries(this.attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}>${this.coverage?.outerHTML || ''}</${kind}>`;
  },
 });
 const root = {
  dataset: {terrainRevision: '1'}, style: {},
  getBBox: () => ({x: -1152, y: 0, width: 3072, height: 1536}),
  querySelector: () => null,
  cloneNode() {
   clones++;
   const mask = makeNode('mask', {'data-camera-turf-mask': 'true', x: 0, y: 0, width: 772, height: 388});
   mask.coverage = makeNode('rect', {x: -1400, y: -100, width: 3600, height: 1900});
   const node = makeNode('g');
   node.querySelectorAll = selector => selector === '[data-camera-turf-mask]' ? [mask] : [];
   Object.defineProperty(node, 'outerHTML', {get: () => '<g>' + mask.outerHTML + '</g>'});
   return node;
  },
 };
 const ctx = {setTransform(...args) {this.transform = args}, clearRect() {}, drawImage(...args) {draws.push(args)}};
 const canvas = {width: 0, height: 0, getContext: () => ctx};
 const svg = {querySelector: () => root, querySelectorAll: () => []};
 const document = {documentElement: {dataset: {}}, querySelector: selector => selector === '.plot' ? svg : canvas};
 const window = {
  devicePixelRatio: 2,
  addEventListener(name, callback) {listeners.set(name, callback)},
  async createImageBitmap(image) {return {width: image.width, height: image.height, close() {this.closed = true}}},
 };
 class Image {
  async decode() {
   const text = await urls.get(this.src).text();
   const match = text.match(/width="(\d+)" height="(\d+)" viewBox="([^"]+)"/);
   this.width = Number(match[1]); this.height = Number(match[2]);
   rasters.push({text, box: match[3].split(' ').map(Number), width: this.width, height: this.height});
  }
 }
 const context = vm.createContext({window, document, console, Image, Blob, createImageBitmap: window.createImageBitmap, location: {href: 'https://example.test/game/'},
  URL: {createObjectURL(blob) {const url = 'blob:' + ++id; urls.set(url, blob); return url}, revokeObjectURL(url) {urls.delete(url)}},
  requestAnimationFrame(callback) {const key = ++id; frames.set(key, callback); return key},
  cancelAnimationFrame(key) {frames.delete(key)},
  setTimeout(callback) {const key = ++id; timers.set(key, callback); return key},
  clearTimeout(key) {timers.delete(key)},
 });
 const emit = (name, detail) => listeners.get(name)?.({detail});
 const settle = async () => {
  for (let i = 0; i < 100; i++) {
   for (const [key, callback] of [...timers]) {timers.delete(key); callback()}
   await new Promise(resolve => setImmediate(resolve));
   for (const [key, callback] of [...frames]) {frames.delete(key); callback()}
  }
 };
 return {context, root, canvas, ctx, emit, settle, rasters, draws, get clones() {return clones}};
}

const terrainSource = await fs.readFile(new URL('../terrain-chunk-screen.js', import.meta.url), 'utf8');
test('expanded map masks, camera synchronisation, resolution and terrain edits', async () => {
 const f = fixture();
 vm.runInContext(terrainSource, f.context);
 const view = {width: 844, height: 390, scale: 2, x: -300, y: -1100};
 f.emit('sadovod:camera-frame', view);
 await f.settle();
 assert.equal(f.root.style.visibility, 'hidden');
 assert.equal(f.canvas.width, 1688);
 const overview = f.rasters[0];
 assert.ok(overview.width <= 1024);
 assert.ok(overview.text.includes('x="-1156" y="-4" width="3080" height="1544"'));
 assert.ok(f.rasters.slice(1).every(r => r.width === 400 && r.height === 400));
 assert.ok(f.draws.some(args => args.length === 9 && args[1] === 8 && args[3] === 384 && args[7] === 96));
 const clones = f.clones;
 const rasters = f.rasters.length;
 for (let i = 0; i < 60; i++) {
  const camera = {...view, x: view.x + i / 10};
  f.emit('sadovod:camera-frame', camera);
  assert.deepEqual(Array.from(f.ctx.transform), [4, 0, 0, 4, camera.x * 2, camera.y * 2]);
 }
 await f.settle();
 assert.equal(f.clones, clones, 'camera movement must not clone or serialize the landscape');
 assert.equal(f.rasters.length, rasters, 'already cached camera positions must reuse their bitmaps');
 f.emit('sadovod:terrain-ready');
 await f.settle();
 assert.equal(f.clones, clones, 'object updates must not rebuild unchanged terrain');
 f.root.dataset.terrainRevision = '2';
 f.emit('sadovod:terrain-ready');
 await f.settle();
 assert.equal(f.clones, clones + 1, 'terrain painting must rebuild the bitmap cache');
});
