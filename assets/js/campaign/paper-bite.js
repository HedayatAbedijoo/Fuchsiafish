/* One printed sheet stays connected to the card until the tooth-driven tear
 * reaches both edges. The same mesh is drawn outside and inside the mouth. */
'use strict';
window.FuchsiafishPaperBite = (() => {
  const CONTACT = .36, TEAR = .64, SWALLOW = .96;
  const clamp = x => Math.max(0, Math.min(1, x));
  const smooth = x => { x = clamp(x); return x*x*x*(10+x*(-15+6*x)); };
  const random = n => { const x = Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x); };
  const ROWS = 12, COLS = 4, PIN_U = .5, PIN_V = .5;

  function edge(card, removed, v) {
    // Start at the edge facing the approaching teeth, so the remaining sheet
    // stays in front of the fish rather than disappearing behind its body.
    const base = card.dir === 1 ? card.w*removed/3 : card.w*(1-removed/3);
    if (removed === 0 || removed === 3) return base;
    const f = clamp(v)*ROWS, a = Math.min(ROWS-1, Math.floor(f)), t = f-a;
    const tooth = i => (i%2 ? 1 : -1)*(1.1+random(card.i*97+removed*19+i)*1.5);
    return base + tooth(a)*(1-t) + tooth(a+1)*t;
  }
  function remainderPath(ctx, card, removed) {
    ctx.beginPath();
    ctx.moveTo(card.dir === 1 ? card.w : 0, 0);
    for (let row=0; row<=ROWS; row++) ctx.lineTo(edge(card, removed, row/ROWS), row/ROWS*card.h);
    ctx.lineTo(card.dir === 1 ? card.w : 0, card.h);ctx.closePath();
  }
  function sample({ card, piece, q, grip }) {
    const active = q > .18 && q < SWALLOW;
    const contact = smooth((q-.18)/(CONTACT-.18));
    const pull = smooth((q-CONTACT)/(TEAR-CONTACT));
    const crack = smooth((q-CONTACT-.025)/(TEAR-CONTACT-.025));
    const swallow = smooth((q-TEAR)/(SWALLOW-TEAR));
    const center = { x:card.x+(edge(card,piece,PIN_V)+edge(card,piece+1,PIN_V))/2, y:card.y+card.h*PIN_V };
    const dx=(grip.x-center.x)*contact-card.dir*80*swallow;
    const dy=(grip.y-center.y)*contact-3*swallow;
    const vertex = (u,v) => {
      const root=edge(card,piece+1,v), free=edge(card,piece,v);
      const sx=root+(free-root)*u, sy=v*card.h;
      const distance=Math.abs(v-PIN_V)/.5;
      const released=q>=TEAR?1:smooth((crack*1.13-distance)/.13);
      // Until the crack arrives, the inner edge is physically pinned to the
      // remaining sheet. The bitten half follows the moving lower jaw.
      const follow=released+(1-released)*smooth(u/PIN_U);
      const pinch=(.67*pull+.29*swallow)*follow;
      const crease=Math.sin(u*Math.PI*2)*Math.sin(v*Math.PI*3)*pull;
      return { sx:sx*2, sy:sy*2,
        x:card.x+sx+dx*follow+card.dir*crease*2.8+(center.x-card.x-sx)*swallow*.55,
        y:card.y+sy+dy*follow+(center.y-card.y-sy)*pinch+crease*1.5,
        u,v,released };
    };
    const vertices=Array.from({length:ROWS+1},(_,row)=>Array.from({length:COLS+1},(_,col)=>vertex(col/COLS,row/ROWS)));
    return { card,piece,q,active,contact,pull,crack,swallow,grip,vertices,vertex,
      attached:q<TEAR, phase:q<CONTACT?'pierce':q<TEAR?'pull':q<SWALLOW?'swallow':'finished' };
  }
  function triangle(ctx,image,a,b,c,shade) {
    const u1=b.sx-a.sx,v1=b.sy-a.sy,u2=c.sx-a.sx,v2=c.sy-a.sy,det=u1*v2-u2*v1;
    const x1=b.x-a.x,y1=b.y-a.y,x2=c.x-a.x,y2=c.y-a.y;
    // Edge-on folds below a quarter square pixel have no useful coverage.
    // Culling them also avoids nearly singular texture transforms on Canvas.
    if(Math.abs(det)<1e-8 || Math.abs(x1*y2-x2*y1)<.25)return;
    const aa=(x1*v2-x2*v1)/det,bb=(y1*v2-y2*v1)/det,cc=(x2*u1-x1*u2)/det,dd=(y2*u1-y1*u2)/det;
    // Subpixel overlap closes antialiasing cracks between textured facets.
    const mx=(a.x+b.x+c.x)/3,my=(a.y+b.y+c.y)/3;
    const bleed=p=>{const x=p.x-mx,y=p.y-my,k=.35/Math.max(.01,Math.hypot(x,y));return{x:p.x+x*k,y:p.y+y*k}};
    const pa=bleed(a),pb=bleed(b),pc=bleed(c);
    ctx.save();ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.lineTo(pc.x,pc.y);ctx.closePath();ctx.clip();
    ctx.transform(aa,bb,cc,dd,a.x-aa*a.sx-cc*a.sy,a.y-bb*a.sx-dd*a.sy);
    ctx.drawImage(image,0,0);
    if(shade){ctx.fillStyle=`rgba(49,25,54,${shade})`;ctx.fillRect(0,0,image.width,image.height)}
    ctx.restore();
  }
  function draw(ctx, frame, details=true) {
    if(!frame?.active)return;
    const {card,vertices,pull,swallow}=frame;
    for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++){
      const a=vertices[row][col],b=vertices[row][col+1],c=vertices[row+1][col+1],d=vertices[row+1][col];
      const shade=card.typography?0:(.04+.14*Math.max(0,Math.sin(row/ROWS*Math.PI*3)))*pull;
      triangle(ctx,card.asset,a,b,c,shade);triangle(ctx,card.asset,a,c,d,shade);
    }
    // Headline flaps consist of ink with transparent space between letters.
    if(card.typography)return;
    // Creases shade the actual printed material; no substitute white sprite.
    ctx.save();ctx.lineWidth=.65;ctx.strokeStyle=`rgba(255,249,252,${pull*.8})`;
    for(const row of [4,8]){
      ctx.beginPath();vertices[row].forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
    }
    const root=vertices.map(row=>row[0]);
    ctx.lineWidth=1.05;ctx.strokeStyle='#fff5ef';ctx.beginPath();
    root.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
    // Two tooth punctures stay attached to the paper's material coordinates.
    if(frame.q>=CONTACT){
      ctx.fillStyle='#241020';
      for(const v of [.43,.57]){
        const p=frame.vertex(PIN_U,v);ctx.beginPath();ctx.moveTo(p.x-2,p.y-1.4);
        ctx.lineTo(p.x+2,p.y-1);ctx.lineTo(p.x+.2,p.y+2.4);ctx.closePath();ctx.fill();
      }
    }
    if(details && pull>0 && swallow<.5){
      ctx.strokeStyle='#fff7ee';ctx.lineWidth=.65;
      for(let row=1;row<ROWS;row++){
        const p=root[row];if(p.released<=0)continue;
        const x=card.x+edge(card,frame.piece+1,row/ROWS),y=card.y+row/ROWS*card.h;
        // Short fibres break progressively from the pin towards both corners.
        const length=1.5+random(row+card.i*31)*2;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-card.dir*length,y+1);ctx.stroke();
        ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+card.dir*length,p.y-1);ctx.stroke();
      }
    }
    ctx.restore();
  }
  function shadow(ctx,frame){
    if(!frame?.active||frame.pull<=0)return;
    const root=frame.vertices.map(row=>row[0]);
    ctx.save();ctx.strokeStyle=`rgba(10,3,17,${frame.pull*(1-frame.swallow)*.3})`;ctx.lineWidth=3;
    ctx.beginPath();root.forEach((p,i)=>i?ctx.lineTo(p.x+2,p.y+2):ctx.moveTo(p.x+2,p.y+2));ctx.stroke();ctx.restore();
  }
  return { CONTACT,TEAR,SWALLOW,edge,remainderPath,sample,draw,shadow };
})();
