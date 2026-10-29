/* Offline recording only; no browser or network access. */
const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
let source = fs.readFileSync(process.cwd() + '/assets/js/campaign/scene.js', 'utf8');

function mount(compact = false, frontMissing = false, record = false) {
  let frames = 0, serial = 0, operations = [], canvasCount = 0;
  const contexts = [], images = [];
  const append = (...args) => { if (record) operations.push(args); };
  const encode = x => x && typeof x === 'object' && x.id ? { ref: x.id } : x;
  function canvas() {
    const id = `canvas${canvasCount++}`;
    const target = { id, width: 300, height: 150, addEventListener() {}, removeEventListener() {}, getBoundingClientRect() { return {width: compact ? 390 : 960, height: compact ? 490 : 800}; } };
    append('canvas', id, 300, 150);
    let depth = 0;
    const state = {};
    const ctx = new Proxy(state, {
      get(_, key) {
        if (key === 'depth') return depth;
        if (key in state) return state[key];
        if (key.startsWith('create')) return (...args) => {
          const gradient = {id: `gradient${serial++}`, addColorStop(...stop) { append('stop', this.id, ...stop); }};
          append('gradient', id, gradient.id, key, ...args); return gradient;
        };
        return (...args) => {
          for (const value of args) if (typeof value === 'number') assert(Number.isFinite(value), `${id}.${key}: ${args}`);
          if (key === 'save') depth++;
          if (key === 'restore') assert(--depth >= 0, 'unbalanced restore');
          append('call', id, key, ...args.map(encode));
        };
      },
      set(_, key, value) { state[key] = value; append('set', id, key, encode(value)); return true; }
    });
    contexts.push(ctx);
    target.getContext = type => type === '2d' ? ctx : null;
    return new Proxy(target, {set(obj, key, value) { obj[key] = value; if (key === 'width' || key === 'height') append('size', id, key, value); return true; }});
  }
  class Image {
    constructor() { this.id = `image${images.length}`; images.push(this); }
    set src(value) {
      this._src = value; this.complete = true;
      this.naturalWidth = value.includes('front') ? 1254 : 1536;
      this.naturalHeight = value.includes('front') ? 1254 : 1024;
      append('image', this.id, value);
      if (frontMissing && value.includes('front')) this.onerror?.(); else this.onload?.();
    }
  }
  const sandbox = {
    window: {}, Image, devicePixelRatio: 1,
    matchMedia: query => ({matches: query.includes('850') && compact, addEventListener() {}, removeEventListener() {}}),
    document: { hidden: false, createElement: canvas, addEventListener() {}, removeEventListener() {} },
    ResizeObserver: class {observe(){} disconnect(){}}, IntersectionObserver: class {observe(){} disconnect(){}},
    requestAnimationFrame() { return ++frames; }, cancelAnimationFrame() {}
  };
  vm.runInNewContext(fs.readFileSync('tools/turn-source.js','utf8'),sandbox);
  vm.runInNewContext(fs.readFileSync('tools/turn-source-atlas.js','utf8'),sandbox);
  vm.runInNewContext(fs.readFileSync('assets/js/campaign/paper-bite.js','utf8'),sandbox);
  vm.runInNewContext(source, sandbox);
  const surface = canvas();
  const scene = sandbox.window.FuchsiafishScene.mount({canvas: surface,
    sideSrc: process.cwd() + '/assets/images/fuchsiafish-side.png', frontSrc: process.cwd() + '/assets/images/fuchsiafish-front.png',turnSrc:process.cwd()+'/assets/images/fuchsiafish-turn-24.png',turnFrames:sandbox.window.FuchsiafishTurnFrames});
  return {scene, contexts, operations, surface};
}


// Capture the actual Canvas source renderer, including the articulated endpoint
// jaw. Only its tail displacement is disabled: the live scene adds that wave.
source=source.replace('amplitude=25+22*(p.effort??.55),bend=p.bend||0','amplitude=0,bend=0');
source=source.replace('for(let x=0;x<w;x+=32){','c.drawImage(sprite,0,0,w,h);return;for(let x=0;x<w;x+=32){');
source=source.replace(' get state(){return stateSnapshot},',` get state(){return stateSnapshot},
 drawFish(yaw){mainCtx.setTransform(1,0,0,1,0,0);mainCtx.clearRect(0,0,canvas.width,canvas.height);fish(mainCtx,{x:164,y:112,s:.2,dir:yaw,angle:0,effort:0,bend:0},0,.08)},`);
const destination=process.argv[2];
if(!destination)throw new Error('Usage: node tools/capture-turn-source.cjs OUTPUT_DIRECTORY');
fs.mkdirSync(destination,{recursive:true});
const {scene,operations,surface}=mount(false,false,true);
surface.width=320;surface.height=256;
const angles=[0,4,8,12,18,26,40,58,76,90,104,122,140,154,162,168,172,176,180];
for(let frame=0;frame<angles.length;frame++){
 scene.drawFish(Math.cos(angles[frame]/180*Math.PI));
 operations.push(['snapshot',surface.id,destination+'/frame-'+frame+'.png']);
}
fs.writeFileSync(destination+'/ops.json',JSON.stringify(operations));
fs.writeFileSync(destination+'/angles.json',JSON.stringify(angles));
scene.destroy();
