const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
let source = fs.readFileSync(process.cwd() + '/assets/js/campaign/scene.js', 'utf8');

function mount(compact = false, frontMissing = false, record = false, withHeadline = false) {
  let frames = 0, serial = 0, operations = [], canvasCount = 0, resizeCallback;
  const contexts = [], images = [];
  const append = (...args) => { if (record) operations.push(args); };
  const encode = x => x && typeof x === 'object' && x.id ? { ref: x.id } : x;
  function canvas() {
    const id = `canvas${canvasCount++}`;
    const target = { id, style: {}, width: 300, height: 150, addEventListener() {}, removeEventListener() {}, getBoundingClientRect() { return {left:0,top:0,width: compact ? 390 : 960, height: compact ? 490 : 800}; } };
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
      this.naturalWidth = value.includes('smooth') ? 3840 : value.includes('front') ? 1254 : 1536;
      this.naturalHeight = value.includes('smooth') ? 2816 : value.includes('front') ? 1254 : 1024;
      append('image', this.id, value);
      if (frontMissing && value.includes('front')) this.onerror?.(); else this.onload?.();
    }
  }
  const sandbox = {
    window: {}, Image, devicePixelRatio: 1,
    matchMedia: query => ({matches: query.includes('850') && compact, addEventListener() {}, removeEventListener() {}}),
    document: { hidden: false, createElement: canvas, addEventListener() {}, removeEventListener() {} },
    ResizeObserver: class {constructor(callback){resizeCallback=callback} observe(){} disconnect(){}}, IntersectionObserver: class {observe(){} disconnect(){}},
    requestAnimationFrame() { return ++frames; }, cancelAnimationFrame() {}
  };
  let headlineState=null,headlineDestroyed=false;
  if(withHeadline)sandbox.window.FuchsiafishHeadline={create(){return {
    measure(){return Array.from({length:compact?5:3},(_,i)=>({i:20+i,x:compact?35:-660,y:150+i*(compact?85:92),w:i===0?(compact?60:150):compact?300:610,h:i===0&&compact?28:78,asset:canvas(),dir:i%2?1:-1,typography:true}))},
    update(state){headlineState=state},destroy(){headlineDestroyed=true}
  }}};
  vm.runInNewContext(fs.readFileSync('assets/js/campaign/turn-sequence.js','utf8'),sandbox);
  vm.runInNewContext(fs.readFileSync('assets/js/campaign/turn-atlas.js','utf8'),sandbox);
  vm.runInNewContext(fs.readFileSync('assets/js/campaign/paper-bite.js','utf8'),sandbox);
  vm.runInNewContext(source, sandbox);
  const surface = canvas();
  const scene = sandbox.window.FuchsiafishScene.mount({canvas: surface,
    heading:withHeadline?{closest(){return {getBoundingClientRect(){return {left:compact?0:-720}}}}}:null,
    sideSrc: process.cwd() + '/assets/images/fuchsiafish-side.png', frontSrc: process.cwd() + '/assets/images/fuchsiafish-front.png',turnSrc:process.cwd()+'/assets/images/fuchsiafish-turn-smooth.webp',turnAtlas:sandbox.window.FuchsiafishTurnAtlas});
  return {scene, contexts, operations, surface, sandbox, resize(value){compact=value;resizeCallback()},get headlineState(){return headlineState},get headlineDestroyed(){return headlineDestroyed}};
}


// Regression checks for the user's two reported failures: quantized rotation
// and zooming at turn/renderer boundaries. No browser is required for these.
for (const compact of [false, true]) for (const frontMissing of [false, true]) {
  const {scene,contexts,sandbox}=mount(compact,frontMissing),t=scene.timings;
  assert.equal(scene.state.turnFrameCount,129);
  assert.equal(t.ITEMS,4);assert.equal(t.BITES,12);
  assert.equal(scene.state.bites.length,4,'Only the two photos and two chats remain');
  assert(Math.abs((t.END-t.FEED)-7.8/2)<1e-9,'Halve the former feeding time');
  assert(Math.abs(t.CYCLE-9.9)<1e-9);
  for(let n=0;n<12;n++){
    const start=t.FEED+Math.floor(n/3)*t.CARD+n%3*t.BITE;
    const held=scene.seek(start+(t.CONTACT+.08)*t.BITE);
    assert.equal(held.jaw,1,'The jaw must hold its grip throughout the tug');
    assert.equal(held.paper.phase,'pull');assert.equal(held.paper.attached,true);
    assert.equal(held.bites.reduce((a,b)=>a+b),n,'Contact must not delete the sheet');
    assert(Math.abs(Math.abs(held.facing)-1)<1e-10,'Do not rotate away while gripping paper');
    const chewing=scene.seek(start+(t.TEAR+.06)*t.BITE);
    assert.equal(chewing.paper.phase,'swallow');assert.equal(chewing.paper.attached,false);
    assert.equal(scene.seek(start+t.SWALLOW*t.BITE+1e-8).paper.visible,false);
    const contact=start+t.TEAR*t.BITE;
    const before=scene.seek(contact-1e-6),after=scene.seek(contact+1e-6);
    assert.equal(before.bites.reduce((a,b)=>a+b),n);
    assert.equal(after.bites.reduce((a,b)=>a+b),n+1);
    assert.equal(before.battery,Math.round(100-n/12*100),'Charge follows each of the twelve tears');
    assert.equal(after.battery,n===11?1:Math.round(100-(n+1)/12*100));
  }
  for(const [a,b] of [[t.EXIT,t.EXIT+3.6*.46],[t.EXIT+3.6*.62,t.CYCLE]]){
    const expected=scene.seek(a).scale;
    for(let time=a;time<b;time+=1/120)assert(Math.abs(scene.seek(time).scale-expected)<1e-12,'Yaw must not change return scale');
  }
  for(let group=0;group<3;group++){
    const from=t.FEED+group*t.CARD+(2+t.CONTACT)*t.BITE,to=t.FEED+(group+1)*t.CARD+t.CONTACT*t.BITE;
    const scales=[];
    for(let time=from;time<=to;time+=1/120)scales.push(scene.seek(time).scale);
    // The tilted phone's perspective changes with position by less than 2%;
    // the former 5% artificial mid-turn scale dip must not return.
    assert(Math.max(...scales)/Math.min(...scales)<1.02,'No feeding-turn shrink');
  }
  for(let group=0;group<4;group++){
    const swallowed=scene.seek(t.FEED+group*t.CARD+(2+t.SWALLOW)*t.BITE+1e-6);
    assert.equal(swallowed.battery,75-group*25,'Each complete card consumes a quarter of the charge');
    assert.equal(swallowed.bites.reduce((a,b)=>a+b),(group+1)*3);
  }
  const lastSwallow=t.FEED+3*t.CARD+(2+t.SWALLOW)*t.BITE;
  assert.equal(scene.seek(lastSwallow-1e-6).battery,1,'Keep the last swallow visible');
  assert.equal(scene.seek(lastSwallow+1e-6).battery,0);
  const first=scene.seek(0),last=scene.seek(t.CYCLE);
  assert.deepEqual(first.position,last.position);assert.equal(first.scale,last.scale);
  assert.equal(scene.seek(t.END).battery,0);assert.equal(last.battery,100);
  assert.equal(scene.seek(t.END).phase,'DEPLETED');
  assert.equal(scene.seek(t.DEAD).phase,'ESCAPING');
  assert.equal(scene.seek(t.DEAD).bites.join(','),'3,3,3,3','Escape after all four cards');
  const player=sandbox.window.FuchsiafishTurnSequence.create({
    image:{complete:true,naturalWidth:3840,naturalHeight:2816},atlas:sandbox.window.FuchsiafishTurnAtlas});
  // Sub-frame angles must survive sampling; a rounded 24/129-frame player fails.
  const values=Array.from({length:11},(_,i)=>player.sampleForFacing(Math.cos((40+i/10)/128*Math.PI)));
  assert.equal(new Set(values).size,11);
  assert(Math.abs(values[5]-40.5)<1e-10);
  assert.equal(player.frameForFacing(1),0);assert.equal(player.frameForFacing(-1),128);
  assert(contexts.every(c=>c.depth===0),'Canvas save/restore balance');
  scene.pause();assert.equal(scene.state.playing,false);scene.resume();assert.equal(scene.state.playing,true);
  scene.destroy();
  console.log(`PASS ${compact?'compact':'desktop'}, front fallback ${frontMissing}, 129 continuous samples, 12 bites in 3.9 seconds, proportional battery, constant return-turn scale`);
}

for(const compact of [false,true]){
  const {scene,operations}=mount(compact,false,true);
  const labels=operations.filter(op=>op[0]==='call'&&op[2]==='fillText').map(op=>op[3]);
  for(const label of ['PHOTO_028','PHOTO_104','PRIVATE CHAT','VOICE / CHAT','04 PRIVATE ITEMS'])assert(labels.includes(label),label);
  for(const label of ['PERSONAL FILE','MEMORIES','06 PRIVATE ITEMS'])assert(!labels.includes(label),`Removed card or stale count: ${label}`);
  scene.destroy();
}
console.log('PASS four visible phone cards and matching item counter in both layouts');

// The same material coordinates must meet the teeth, the torn card edge and
// the detached flap. These checks catch substitutions or detached fake scraps.
const paperSandbox={window:{}};
vm.runInNewContext(fs.readFileSync('assets/js/campaign/paper-bite.js','utf8'),paperSandbox);
const paper=paperSandbox.window.FuchsiafishPaperBite;
for(const dir of [-1,1])for(let piece=0;piece<3;piece++){
 const card={i:piece,x:100,y:200,w:118,h:104,dir};
 const centerX=card.x+(paper.edge(card,piece,.5)+paper.edge(card,piece+1,.5))/2;
 const grip={x:centerX-dir*13,y:249};
 const make=q=>paper.sample({card,piece,q,grip});
 for(const q of [.18,.36,.4,.52,.639999,.64,.8,.959999,.96]){
  const f=make(q);
  for(const row of f.vertices)for(const v of row){
   assert([v.x,v.y,v.sx,v.sy].every(Number.isFinite));
   assert(v.sx>=0&&v.sx<=236&&v.sy>=0&&v.sy<=208);
  }
 }
 for(const q of [paper.CONTACT,.42,.56]){
  const pin=make(q).vertex(.5,.5);
  assert(Math.hypot(pin.x-grip.x,pin.y-grip.y)<1e-8,'Paper must follow the actual moving tooth');
 }
 const heldRoot=make(.4).vertex(0,0);
 assert.equal(heldRoot.x,card.x+paper.edge(card,piece+1,0));assert.equal(heldRoot.y,card.y);
 assert(make(paper.TEAR).vertices.every(row=>row[0].released===1),'Both torn corners must release');
 assert(make(.959999).vertices.every(row=>row.every(v=>dir*(v.x-grip.x)<-65)), 'Swallow slides all material past the throat before removal');
 assert.equal(make(paper.SWALLOW).active,false);
}
console.log('PASS tooth pin, attached corners, matching tear edges and complete swallowing in both directions');

// Preserve the phone visit and rear escape, then take a continuous shortcut
// to the words. Follow alternating rows, re-entry and delayed rebuilding of ink.
function sameFrame(actual,expected,message){
 if(typeof actual==='number'&&typeof expected==='number')assert(Math.abs(actual-expected)<1e-8,message);
 else if(actual&&typeof actual==='object'){
  assert.equal(JSON.stringify(Object.keys(actual)),JSON.stringify(Object.keys(expected)),message);
  for(const key of Object.keys(actual))sameFrame(actual[key],expected[key],message);
 }else assert.equal(actual,expected,message);
}
for(const compact of [false,true]){
 const baseline=mount(compact),extended=mount(compact,false,false,true),scene=extended.scene,t=scene.timings;
 const rows=compact?5:3;
 assert(t.CYCLE>t.HEADLINE_END&&t.HEADLINE===t.RETURN);
 assert(Math.abs((t.HEADLINE_END-t.HEADLINE)-(compact?4.975:2.825))<1e-9);
 assert.equal(t.HEADLINE_TURN,t.TURN,'Match the phone turn rhythm');
 const rearTurn=t.EXIT+(t.RETURN-t.EXIT)*.46,depart=t.EXIT+(t.RETURN-t.EXIT)*.62;
 for(let time=0;time<rearTurn;time+=1/24){
  const before=baseline.scene.seek(time),after=scene.seek(time);
  for(const field of ['position','facing','scale','bank','battery','bites','jaw','paper','layer'])sameFrame(after[field],before[field],`First phone visit changed at ${time}: ${field}`);
  assert.equal(extended.headlineState.repair,1,'Do not eat the headline during the first phone visit');
 }
 // Battery restoration keeps its existing timing while the swim takes the shortcut.
 for(let time=t.EXIT;time<t.RETURN;time+=1/12){
  assert.equal(scene.seek(time).battery,baseline.scene.seek(time).battery);
 }
 let previous=scene.seek(depart);
 for(let time=depart+1/60;time<t.HEADLINE;time+=1/60){
  const current=scene.seek(time);
  assert(current.position.x<previous.position.x-1e-4,'Swim directly left to the title without stopping or turning back');
  assert(Math.abs(current.facing+1)<1e-10,'Do not face the phone again before eating the title');
  assert(Math.abs(current.scale-.29)<1e-12,'Keep foreground scale through the shortcut');
  previous=current;
 }
 const reveal=t.EXIT+(t.RETURN-t.EXIT)*.68;
 assert.equal(scene.seek(reveal-1e-6).layer,'behind');assert.equal(scene.seek(reveal+1e-6).layer,'front');
 const biteTime=(t.HEADLINE_END-t.HEADLINE-(rows-1)*t.HEADLINE_TURN)/(rows*3),cardTime=3*biteTime+t.HEADLINE_TURN;
 assert(Math.abs(biteTime-t.BITE)<1e-12,'Match the phone bite rhythm in both layouts');
 for(let row=0;row<rows;row++)for(let piece=0;piece<3;piece++){
  const at=t.HEADLINE+row*cardTime+piece*biteTime;
  for(const offset of [.04,.08,.1,.15,.18,.22]){
   const phone=baseline.scene.seek(t.FEED+piece*t.BITE+offset),title=scene.seek(at+offset);
   assert(Math.abs(title.jaw-phone.jaw)<1e-10,'Phone and title bites must chew at the same speed');
   for(const field of ['phase','attached','visible'])assert.equal(title.paper?.[field],phone.paper?.[field],`Match ${field} throughout each bite`);
  }
  const held=scene.seek(at+(t.CONTACT+.08)*biteTime);
  assert.equal(held.phase,'EATING_HEADLINE');assert.equal(held.headline.row,row);assert.equal(held.headline.piece,piece);
  assert.equal(held.jaw,1);assert.equal(held.paper.attached,true);assert.equal(held.paper.phase,'pull');
  assert(Math.abs(held.facing-(row%2?1:-1))<1e-10,'Alternate rows and keep facing the letters while gripping them');
  assert.equal(held.layer,'front');assert.equal(held.battery,100);
  assert.equal(scene.seek(at+(t.TEAR+.04)*biteTime).paper.phase,'swallow');
  assert.equal(scene.seek(at+(t.SWALLOW+1e-6)*biteTime).paper.visible,false);
 }
 for(let row=0;row<rows-1;row++){
  const turn=t.HEADLINE+row*cardTime+3*biteTime;
  const before=scene.seek(turn),after=scene.seek(turn+t.HEADLINE_TURN+t.CONTACT*biteTime);
  assert.equal(scene.seek(turn+t.HEADLINE_TURN*.5).turning,true);
  assert(Math.abs(scene.seek(turn+t.HEADLINE_TURN*.5).facing)<1e-10,'Rotate once between adjacent rows');
  for(let time=turn;time<turn+t.HEADLINE_TURN;time+=1/60){
   const frame=scene.seek(time);
   assert(!frame.paper?.visible,'Finish swallowing before rotating');
   assert(frame.position.x>=Math.min(before.position.x,after.position.x)-35&&frame.position.x<=Math.max(before.position.x,after.position.x)+35,'Keep the turn at the adjacent row edge');
  }
 }
 const finalSwallow=t.HEADLINE+(rows-1)*cardTime+(2+t.SWALLOW)*biteTime;
 assert(t.HEADLINE_END-finalSwallow<.03,'No spare turn or pause after the final title bite');
 for(let time=t.RETURN;time<t.CYCLE;time+=1/60)assert(Math.abs(scene.seek(time).scale-.29)<1e-12,'No zoom during the headline hunt');
 assert.equal(scene.seek(t.HEADLINE_END+.1).headline.repair,0);
 const epsilon=1e-4,entry=scene.seek(0),end=scene.seek(t.CYCLE-epsilon),afterEntry=scene.seek(epsilon),beforeEnd=scene.seek(t.CYCLE-2*epsilon);
 for(const axis of ['x','y']){
  assert(Math.abs(entry.position[axis]-end.position[axis])<.1,'No position jump on re-entry');
  const incoming=(end.position[axis]-beforeEnd.position[axis])/epsilon,outgoing=(afterEntry.position[axis]-entry.position[axis])/epsilon;
  assert(Math.abs(incoming-outgoing)<1,'Match swim speed through re-entry');
 }
 for(const cycle of [1,2]){
  const start=cycle*t.CYCLE;
  const entry=scene.seek(start);assert.equal(entry.phase,'BREACHING');assert.equal(entry.headline.repair,0);
  sameFrame(entry.position,baseline.scene.seek(0).position,'Return seamlessly to the next phone entry');
  assert(scene.seek(start+t.REPAIR_START).headline.repair<1e-12);
  const repair=scene.seek(start+(t.REPAIR_START+t.REPAIR_END)/2);
  assert.equal(repair.phase,'FEEDING');assert(Math.abs(repair.headline.repair-.5)<1e-12);
  assert.equal(scene.seek(start+t.REPAIR_END+1e-6).headline.repair,1);
  assert.equal(scene.seek(start+t.HEADLINE+.2).phase,'EATING_HEADLINE');
 }
 assert(extended.contexts.every(c=>c.depth===0),'Canvas save/restore balance through the added hunt');
 baseline.scene.destroy();scene.destroy();assert.equal(extended.headlineDestroyed,true);
 console.log(`PASS ${compact?'compact':'desktop'}: unchanged phone feeding and rear escape, matching phone/title bite and turn rhythm, direct approach, ${rows*3} alternating bites, seamless re-entry and repeated hunts`);
}

const responsive=mount(false,false,false,true);
responsive.scene.seek(responsive.scene.timings.HEADLINE+1.2);
for(const compact of [true,false,true]){
 responsive.resize(compact);
 const scene=responsive.scene,t=scene.timings,rows=compact?5:3;
 assert.equal(scene.state.headline.rows,rows);
 assert(Math.abs(t.CYCLE-(compact?16.275:14.125))<1e-9,'Refresh public timings after the headline reflows');
 assert.equal(t.BITE,.225);assert.equal(t.TURN,.4);
 const lastBite=t.HEADLINE+(rows-1)*t.CARD+2*t.BITE;
 assert.equal(scene.seek(lastBite+(t.CONTACT+.08)*t.BITE).paper.phase,'pull');
 assert.equal(scene.seek(t.HEADLINE_END+1e-6).phase,'RETURNING');
 assert.equal(scene.seek(t.CYCLE).phase,'BREACHING');
}
responsive.scene.destroy();
console.log('PASS responsive reflow keeps the shared bite rhythm and updates loop/last-bite timing');
