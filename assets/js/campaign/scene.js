/* Character artwork and articulated rig preserved from prototype.html. */
'use strict';
window.FuchsiafishScene = { mount({ canvas, sideSrc, frontSrc, onReady = () => {}, onError = () => {}, onPlaybackChange = () => {} }) {
const mainCtx=canvas.getContext('2d',{alpha:true});
if (!mainCtx) { onError(); return null; }
let ctx=mainCtx;
const image=new Image(),frontImage=new Image();let frontReady=false;
// Eighteen bites share a five-second feeding window.
const TAU=Math.PI*2, BITE=5/18, FEED=1.0, END=FEED+18*BITE, DEAD=END+.72, EXIT=DEAD+.58, RETURN=EXIT+2.3, CYCLE=RETURN;
const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n)),lerp=(a,b,t)=>a+(b-a)*t,ease=t=>{t=clamp(t);return t*t*(3-2*t)},rand=n=>{const q=Math.sin(n*127.1+311.7)*43758.5453;return q-Math.floor(q)};
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
let W=960,H=800,dpr=1,elapsed=0,last=0,playing=!motionQuery.matches,ready=false;
let frameId=0,inView=true,destroyed=false,stateSnapshot=null,frontSettled=false;
let body,tail,jaw,tiles=[],cycleNo=1,loaded=false;
const order=[1,0,3,2,5,4],colors=['#f792ca','#b6a6ff','#77e4e4','#e6adfc','#ffc19b','#7ddce9'];
let phoneLayer,phoneCtx,projector=null;
const P={x:460,y:100,w:322,h:604},S={x:478,y:121,w:286,h:555};
function rounded(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r)}
function fill(c,color){c.fillStyle=color;c.fill()}
function text(c,s,x,y,size=12,color='#f8edff',weight=500,align='left'){c.font=`${weight} ${size}px ui-monospace,SFMono-Regular,Consolas,monospace`;c.fillStyle=color;c.textAlign=align;c.fillText(s,x,y)}
function path(c,points){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath()}
function off(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function jawMask(c){
 c.beginPath();c.moveTo(793,701);c.quadraticCurveTo(800,685,805,656);
 c.quadraticCurveTo(792,582,859,468);c.quadraticCurveTo(859,548,880,611);
 c.lineTo(906,625);c.quadraticCurveTo(922,590,945,566);c.lineTo(964,623);c.lineTo(976,624);c.lineTo(997,584);c.lineTo(1013,625);c.lineTo(1041,627);
 c.lineTo(1066,572);c.quadraticCurveTo(1081,583,1090,630);c.lineTo(1108,634);c.lineTo(1122,602);c.lineTo(1133,628);c.lineTo(1146,578);c.quadraticCurveTo(1162,600,1168,641);
 c.lineTo(1184,647);c.lineTo(1196,614);c.lineTo(1206,579);c.quadraticCurveTo(1213,594,1211,628);c.lineTo(1229,569);c.quadraticCurveTo(1252,599,1251,654);c.lineTo(1267,670);
 c.quadraticCurveTo(1296,613,1290,473);c.quadraticCurveTo(1326,510,1331,606);c.quadraticCurveTo(1333,659,1311,701);c.lineTo(1330,716);c.lineTo(1320,750);
 c.bezierCurveTo(1250,764,1080,652,808,733);c.closePath();
}
function tailMask(c){c.beginPath();c.moveTo(0,280);c.lineTo(320,280);c.quadraticCurveTo(375,442,458,529);c.lineTo(487,572);c.quadraticCurveTo(491,622,460,659);c.quadraticCurveTo(392,682,364,760);c.lineTo(330,900);c.lineTo(0,960);c.closePath()}
function rig(){
 body=off(1536,1024);const b=body.getContext('2d');b.drawImage(image,0,0,1536,1024);b.globalCompositeOperation='destination-out';jawMask(b);b.fill();tailMask(b);b.fill();
 jaw=off(1536,1024);const j=jaw.getContext('2d');jawMask(j);j.clip();j.drawImage(image,0,0,1536,1024);
 tail=off(1536,1024);const t=tail.getContext('2d');tailMask(t);t.clip();t.drawImage(image,0,0,1536,1024);
 ready=true;
}
function makeCard(i){
 const a=off(236,208),c=a.getContext('2d');c.scale(2,2);rounded(c,0,0,118,104,7);fill(c,i<2?'#f5e9f4':'#f0ebfa');
 text(c,['PHOTO_028','PHOTO_104','PRIVATE CHAT','VOICE / CHAT','PERSONAL FILE','MEMORIES'][i],8,13,6.5,'#5c4268',750);
 if(i<2){
  const g=c.createLinearGradient(0,20,0,80);g.addColorStop(0,i?'#7d64a0':'#46668b');g.addColorStop(1,i?'#f4b4c5':'#d1c9bd');c.fillStyle=g;c.fillRect(7,20,104,62);
  c.fillStyle=i?'#f9d2a9':'#f7dcbf';c.beginPath();c.arc(82,35,9,0,TAU);c.fill();
  path(c,[[7,76],[36,43],[57,65],[78,49],[111,80],[111,82],[7,82]]);fill(c,i?'#625077':'#4b6c77');
  path(c,[[7,82],[48,61],[66,74],[91,64],[111,80],[111,82]]);fill(c,i?'#3e335a':'#294d53');
  text(c,i?'One last summer.':'Wish you were here.',8,95,6.5,'#785b84');
 }else if(i<4){
  [['Are you still awake?',5,23,91],['I saved it for you.',20,43,91],['See you tomorrow ♡',5,63,96]].forEach((v,k)=>{rounded(c,v[1],v[2],v[3],16,4);fill(c,k===1?'#e9b2dd':'#d8cceb');text(c,v[0],v[1]+5,v[2]+10.5,6,'#493651')});
  text(c,i===3?'00:42  ▂ ▄ ▆ ▃ ▅ ▂':'ENCRYPTED · JUST US',8,96,6,'#826c8d');
 }else{
  text(c,i===4?'Things I never said':'A life, in little files.',8,31,7,'#47374f',700);
  for(let k=0;k<6;k++){c.fillStyle=k===5?'#c79dc2':'#baaac7';c.fillRect(8,41+k*6,70+rand(k+i)*30,1.8)}
  rounded(c,8,83,43,12,3);fill(c,'#dbc9e5');text(c,i===4?'DRAFT_07':'ARCHIVE',12,91,5.5,'#695474',700);
 }
 return a;
}
function resize(){
 const b=canvas.getBoundingClientRect();if(!b.width||!b.height)return;
 const compact=matchMedia('(max-width: 850px)').matches;
 W=compact?780:960;H=compact?820:800;dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.round(b.width*dpr);canvas.height=Math.round(b.height*dpr);
 P.x=compact?435:535;P.y=compact?110:86;S.x=P.x+18;S.y=P.y+23;
 tiles=Array.from({length:6},(_,i)=>({i,x:S.x+18+(i%2)*132,y:S.y+90+Math.floor(i/2)*120,w:118,h:104,asset:makeCard(i),dir:i%2?1:-1}));
 buildPhoneMesh();
 if(loaded)render(elapsed%CYCLE);
}
function fishPose(x,y,s=.25,dir=1,angle=0){return{x,y,s,dir,angle}}
function startPose(t){return fishPose(W===780?248:291,W===780?390:408,.29,1,0)}
function mixPose(a,b,u){return fishPose(lerp(a.x,b.x,u),lerp(a.y,b.y,u),lerp(a.s,b.s,u),lerp(a.dir,b.dir,u),lerp(a.angle,b.angle,u))}
function biteTarget(n){const card=tiles[order[Math.min(5,Math.floor(n/3))]],piece=n%3,cx=card.dir===1?card.x+card.w-(piece+.5)*card.w/3:card.x+(piece+.5)*card.w/3;return {card,piece,x:cx,y:card.y+card.h*.51}}
function feedingPose(f){
 const n=Math.min(17,Math.floor(Math.max(0,f)/BITE)),q=clamp((f-n*BITE)/BITE),v=biteTarget(n),a=biteTarget(Math.max(0,n-1));
 const u=ease(q/.24),mx=lerp(a.x,v.x,u),my=lerp(a.y,v.y,u),dir=v.card.dir,scale=.178;
 const turn=n%3===0&&n>0?lerp(a.card.dir,dir,u):dir;
 let p=fishPose(mx-turn*285*scale,my-63*scale,scale,turn,Math.sin(n*.9)*.035);
 // A small backward head jerk pulls the seized strip away from the card.
 if(q>.34){p.x-=dir*18*Math.sin(clamp((q-.34)/.66)*Math.PI);p.y+=Math.sin((q-.34)*18)*2.2}
 if(n%3===0&&n>0&&q<.22){p.s*=1-.12*Math.sin(q/.22*Math.PI);p.angle+=.10*Math.sin(q/.22*Math.PI)}
 return {p,n,q,target:v};
}
function mouth(p){const x=285*p.s*p.dir,y=63*p.s;return{x:p.x+x*Math.cos(p.angle)-y*Math.sin(p.angle),y:p.y+x*Math.sin(p.angle)+y*Math.cos(p.angle)}}
function fish(c,p,t,closed=0,paper=null,alpha=1){
 if(!ready||alpha<=0)return;
 if(p.squeeze){c.save();c.translate(p.x,p.y);c.rotate(p.angle);c.scale(p.squeeze,1);c.rotate(-p.angle);c.translate(-p.x,-p.y);fish(c,{...p,squeeze:undefined},t,closed,paper,alpha);c.restore();return}
 const yaw=clamp(p.dir,-1,1),facing=Math.abs(yaw);
 const frontMix=frontReady?1-ease((facing-.03)/.78):0;
 const sideYaw=(yaw<0?-1:1)*lerp(.65,1,facing);
 // The frontal view bridges the turn: the silhouette retains real width.
 if(frontMix<.999)sideFish(c,{...p,dir:sideYaw},t,closed,paper,alpha*(1-frontMix));
 if(frontMix>.001){
  c.save();c.globalAlpha=alpha*frontMix;c.translate(p.x+yaw*76*p.s,p.y+13*p.s);
  c.rotate(p.angle*(.3+.7*facing));c.scale(p.s*(1+.018*Math.sin(t*TAU/CYCLE*6)),p.s);
  c.drawImage(frontImage,-490,-500,980,980);c.restore();
 }
}
function sideFish(c,p,t,closed=0,paper=null,alpha=1){
 if(!ready||alpha<=0)return;c.save();c.globalAlpha=alpha;c.translate(p.x,p.y);c.rotate(p.angle);c.scale(p.s*p.dir,p.s);c.translate(-820,-520);
 const tailBeat=Math.sin(t*TAU/CYCLE*11),sw=.065*tailBeat;c.save();c.translate(473,592);c.rotate(sw);c.scale(1,1+.03*tailBeat);c.translate(-473,-592);c.drawImage(tail,0,0);c.restore();
 // Dark, recessed mouth behind the articulated jaw.
 c.fillStyle='#09030d';c.beginPath();c.ellipse(1049,648,270,108,0,0,TAU);c.fill();c.drawImage(body,0,0);
 if(paper){c.save();c.beginPath();c.moveTo(879,523);c.quadraticCurveTo(1040,487,1245,520);c.lineTo(1261,682);c.quadraticCurveTo(1035,676,876,694);c.closePath();c.clip();paper(c);c.restore()}
 c.save();c.translate(805,685);c.rotate(-.145*closed);c.translate(-805,-685);c.drawImage(jaw,0,0);c.restore();
 c.restore();
}
function tornBoundary(c,card,amount,part=false){
 const k=card.w/3,cut=card.dir===1?card.w-amount*k:amount*k;
 c.beginPath();if(card.dir===1){c.moveTo(0,0);c.lineTo(cut,0);for(let j=0;j<=13;j++)c.lineTo(cut+(j%2?3:-3)+rand(j+amount)*3,j*card.h/13);c.lineTo(0,card.h)}
 else{c.moveTo(card.w,0);c.lineTo(cut,0);for(let j=0;j<=13;j++)c.lineTo(cut+(j%2?-3:3)-rand(j+amount)*3,j*card.h/13);c.lineTo(card.w,card.h)}c.closePath();
}
function drawCard(card,bites,reveal=1){
 if(bites>=3||reveal<=0)return;ctx.save();ctx.globalAlpha=reveal;ctx.translate(card.x,card.y+(1-reveal)*18);if(bites>0){tornBoundary(ctx,card,bites);ctx.clip()}
 ctx.drawImage(card.asset,0,0,card.w,card.h);ctx.restore();
 // Exposed white paper fibres along the torn edge.
 if(bites>0){ctx.save();ctx.strokeStyle='#fff8fc';ctx.lineWidth=1;const edge=card.x+(card.dir===1?card.w-bites*card.w/3:bites*card.w/3);ctx.beginPath();for(let k=0;k<16;k++){const y=card.y+k*6.4;ctx.moveTo(edge+(k%2?2:-2),y);ctx.lineTo(edge+card.dir*(3+rand(k)*4),y-2)}ctx.stroke();ctx.restore()}
}
function drawScrap(c,card,piece,x,y,scale,angle,fold=0){
 c.save();c.translate(x,y);c.rotate(angle);c.scale(scale*(1-.48*fold),scale*(1-.63*fold));c.translate(-20,-52);
 c.beginPath();c.moveTo(1,0);for(let k=0;k<=13;k++)c.lineTo((k%2?4:0),k*8);c.lineTo(38,104);for(let k=13;k>=0;k--)c.lineTo(38+(k%2?3:-2),k*8);c.closePath();c.clip();
 const sx=card.dir===1?(2-piece)*card.w/3:piece*card.w/3;c.drawImage(card.asset,sx*2,0,card.w/3*2,208,0,0,40,104);
 c.strokeStyle='#fff';c.lineWidth=1.8;c.stroke();if(fold){c.fillStyle=`rgba(63,21,62,${fold*.32})`;path(c,[[0,0],[20,45],[0,104]]);c.fill();c.strokeStyle='#ffffffb0';c.beginPath();c.moveTo(20,0);c.lineTo(12,50);c.lineTo(24,104);c.stroke()}c.restore();
}
function fragments(f,pose){
 const {n,q,target}=f;if(q<.35)return;const m=mouth(pose),u=clamp((q-.35)/.55);
 // Coloured paper flecks split at the teeth, curl, then disappear into the mouth.
 for(let k=0;k<10;k++){let v=clamp((q-.38-k*.016)/.48);if(v<=0||v>=1)continue;let x=lerp(target.x,m.x,v)+Math.sin(v*Math.PI)*(rand(n*13+k)*50-25),y=lerp(target.y,m.y,v)+Math.sin(v*Math.PI)*(rand(k+n)*55-27);
  ctx.save();ctx.translate(x,y);ctx.rotate(v*(k%2?7:-8));ctx.scale(1-v*.86,1-v*.86);path(ctx,[[-3,-5],[3,-3],[2,5],[-2,3]]);fill(ctx,k%3?'#fff0ff':colors[target.card.i]);ctx.restore()}
}
function projectPhone(x,y,z=0){
 const cx=P.x+P.w/2,cy=P.y+P.h/2,px=x-cx,py=y-cy;
 const yaw=-.22,pitch=.035,roll=-.025;
 const ax=px*Math.cos(yaw)+z*Math.sin(yaw),az=-px*Math.sin(yaw)+z*Math.cos(yaw);
 const ay=py*Math.cos(pitch)-az*Math.sin(pitch),bz=py*Math.sin(pitch)+az*Math.cos(pitch);
 const rx=ax*Math.cos(roll)-ay*Math.sin(roll),ry=ax*Math.sin(roll)+ay*Math.cos(roll);
 const perspective=1350/(1350-bz);
 return{x:cx+rx*perspective,y:cy+ry*perspective,k:perspective};
}
function unprojectPhone(x,y){
 let u=x,v=y;
 for(let i=0;i<7;i++){
  const p=projectPhone(u,v),px=projectPhone(u+1,v),py=projectPhone(u,v+1),a=px.x-p.x,b=py.x-p.x,c=px.y-p.y,d=py.y-p.y,det=a*d-b*c,ex=x-p.x,ey=y-p.y;
  u+=(ex*d-b*ey)/det;v+=(a*ey-ex*c)/det;
 }
 return{x:u,y:v};
}
function planePose(p){
 const q=projectPhone(p.x,p.y),dx=projectPhone(p.x+10,p.y),dy=projectPhone(p.x,p.y+10);
 return fishPose(q.x,q.y,p.s*Math.hypot(dy.x-q.x,dy.y-q.y)/10,p.dir,p.angle+Math.atan2(dx.y-q.y,dx.x-q.x));
}
function localPose(p){
 const q=unprojectPhone(p.x,p.y),base=planePose({...p,x:q.x,y:q.y,s:1,angle:0});
 return fishPose(q.x,q.y,p.s/base.s,p.dir,p.angle-base.angle);
}
function createProjector(){
 const surface=document.createElement('canvas');
 const gl=surface.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:true});
 if(!gl)return null;
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))return null;return s}
 const vs=shader(gl.VERTEX_SHADER,'attribute vec4 aPosition;attribute vec2 aUV;varying vec2 vUV;void main(){gl_Position=aPosition;vUV=aUV;}');
 const fs=shader(gl.FRAGMENT_SHADER,'precision mediump float;uniform sampler2D uTexture;varying vec2 vUV;void main(){gl_FragColor=texture2D(uTexture,vUV);}');
 if(!vs||!fs)return null;
 const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return null;gl.useProgram(program);
 const buffer=gl.createBuffer(),texture=gl.createTexture();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 const position=gl.getAttribLocation(program,'aPosition'),uv=gl.getAttribLocation(program,'aUV');
 gl.enableVertexAttribArray(position);gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(position,4,gl.FLOAT,false,24,0);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,24,16);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(program,'uTexture'),0);
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.clearColor(0,0,0,0);
 const renderer={surface,gl,buffer,texture,ready:true};
 surface.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.ready=false});
 surface.addEventListener('webglcontextrestored',()=>{projector=createProjector()});
 return renderer;
}
function projectPhoneTexture(){
 if(!projector||!projector.ready)return false;
 const {gl,surface,buffer,texture}=projector;
 if(surface.width!==canvas.width||surface.height!==canvas.height){surface.width=canvas.width;surface.height=canvas.height;gl.viewport(0,0,surface.width,surface.height)}
 const x=P.x-8,y=P.y-8,w=P.w+16,h=P.h+16;
 const vertices=[[x,y,0,1],[x,y+h,0,0],[x+w,y,1,1],[x+w,y+h,1,0]],data=[];
 for(const [u,v,tx,ty] of vertices){const p=projectPhone(u,v),clipW=1/p.k;data.push((2*p.x/W-1)*clipW,(1-2*p.y/H)*clipW,0,clipW,tx,ty)}
 gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);
 gl.bindTexture(gl.TEXTURE_2D,texture);
 try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,phoneLayer)}
 catch(error){
  // Some browsers taint local file images when the fish enters the phone texture.
  // Continue with Canvas instead of stopping the animation on direct HTML opening.
  if(error.name!=='SecurityError')throw error;
  projector.ready=false;return false;
 }
 gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
 ctx.drawImage(surface,0,0,W,H);return true;
}
function buildPhoneMesh(){
 const pad=8,res=2,tw=P.w+pad*2,th=P.h+pad*2;
 if(!phoneLayer){phoneLayer=off(tw*res,th*res);phoneCtx=phoneLayer.getContext('2d')}
 if(!projector)projector=createProjector();
}
function flatPhoneFallback(){
 // A clean oblique rendering also works when a browser disables WebGL.
 const x=P.x-8,y=P.y-8,w=P.w+16,h=P.h+16,a=projectPhone(x,y),b=projectPhone(x+w,y),d=projectPhone(x,y+h);
 ctx.save();ctx.transform((b.x-a.x)/phoneLayer.width,(b.y-a.y)/phoneLayer.width,(d.x-a.x)/phoneLayer.height,(d.y-a.y)/phoneLayer.height,a.x,a.y);ctx.drawImage(phoneLayer,0,0);ctx.restore();
}
function phoneOutline(depth){
 ctx.beginPath();const radius=49,corners=[[P.x+P.w-radius,P.y+radius,-Math.PI/2],[P.x+P.w-radius,P.y+P.h-radius,0],[P.x+radius,P.y+P.h-radius,Math.PI/2],[P.x+radius,P.y+radius,Math.PI]];
 corners.forEach(([x,y,start],index)=>{for(let i=0;i<=10;i++){const a=start+i/10*Math.PI/2,p=projectPhone(x+Math.cos(a)*radius,y+Math.sin(a)*radius,depth);if(index===0&&i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y)}});ctx.closePath();
}
function drawPhone(t,pct,fullness,bites,f,inner,alpha){
 // Render the phone, its data and the feeding fish on the same perspective plane.
 const output=ctx;ctx=phoneCtx;
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,phoneLayer.width,phoneLayer.height);
 ctx.setTransform(2,0,0,2,(8-P.x)*2,(8-P.y)*2);
 phoneBase(t,pct===0,f&&f.q>.3&&f.q<.4);screen(t,pct,fullness,bites,f,inner,alpha);
 ctx=output;
 const shell=ctx.createLinearGradient(P.x,0,P.x+P.w+25,0);shell.addColorStop(0,'#12121f');shell.addColorStop(.82,'#1f152b');shell.addColorStop(.94,'#77506a');shell.addColorStop(1,'#21192c');
 phoneOutline(-25);fill(ctx,shell);ctx.strokeStyle='#b48ca74d';ctx.lineWidth=1.2;ctx.stroke();
 if(!projectPhoneTexture())flatPhoneFallback();
}
function phoneBase(t,empty,shock){
 ctx.save();ctx.translate(P.x,P.y);
 const g=ctx.createLinearGradient(0,0,P.w,P.h);g.addColorStop(0,'#73637d');g.addColorStop(.1,'#20182b');g.addColorStop(.5,'#0c101b');g.addColorStop(.9,'#45334b');g.addColorStop(1,'#8d4a7a');
 ctx.shadowColor='#000';ctx.shadowBlur=0;ctx.shadowOffsetY=0;rounded(ctx,0,0,P.w,P.h,49);fill(ctx,g);ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.strokeStyle='#ad84a46b';ctx.lineWidth=1.5;ctx.stroke();
 rounded(ctx,11,12,P.w-22,P.h-25,39);fill(ctx,'#03050b');ctx.strokeStyle=shock?'#ff8bdb':'#51415a';ctx.stroke();
 ctx.fillStyle='#59465e';ctx.fillRect(-3,104,3,36);ctx.fillRect(-3,153,3,54);ctx.fillRect(P.w,136,3,61);
 rounded(ctx,P.w/2-39,23,78,17,12);fill(ctx,'#03040a');ctx.beginPath();ctx.arc(P.w/2+29,31,3.2,0,TAU);fill(ctx,'#242a3b');
 rounded(ctx,P.w/2-36,P.h-17,72,3,2);fill(ctx,'#877385');ctx.restore();
}
function screen(t,pct,fullness,bites,feedObj,innerPose,insideAlpha){
 ctx.save();rounded(ctx,S.x,S.y,S.w,S.h,31);ctx.clip();
 const g=ctx.createLinearGradient(S.x,S.y,S.x+S.w,S.y+S.h);g.addColorStop(0,'#111726');g.addColorStop(.6,'#170e21');g.addColorStop(1,'#0d0b14');ctx.fillStyle=g;ctx.fillRect(S.x,S.y,S.w,S.h);
 text(ctx,'21:08',S.x+17,S.y+29,10,'#e0cbdc',700);text(ctx,'▂▄▆',S.x+S.w-65,S.y+28,10,'#a498ad',700);
 const bx=S.x+S.w-36;rounded(ctx,bx,S.y+18,22,11,3);ctx.strokeStyle='#ac98ab';ctx.stroke();ctx.fillStyle=pct<20?'#ff567f':'#ec8cce';ctx.fillRect(bx+2,S.y+20,18*pct/100,7);ctx.fillRect(bx+23,S.y+21,2,5);
 text(ctx,'YOUR DIGITAL LIFE',S.x+18,S.y+64,10,'#d2b8d0',700);text(ctx,'06 PRIVATE ITEMS',S.x+18,S.y+80,6.5,'#81718c');
 tiles.forEach((card,i)=>drawCard(card,bites[i],fullness));
 if(innerPose){const f=feedObj;let closure=f?jawClosure(f.q):.05;
 const paper=f&&f.q>.35&&f.q<.91?(c)=>{const u=clamp((f.q-.35)/.54),sc=lerp(3.3,.02,ease(u));drawScrap(c,f.target.card,f.target.piece,1105-u*43,593-u*8,sc,Math.sin(u*18)*.13,u)}:null;
 fish(ctx,innerPose,t,closure,paper,insideAlpha);
 if(f)fragments(f,innerPose);
 }
 // Fine moving glass scanlines put the creature behind the screen surface.
 ctx.fillStyle='#ecd7ff03';for(let y=S.y+(t*9)%4;y<S.y+S.h;y+=4)ctx.fillRect(S.x,y,S.w,1);
 if(pct===0){ctx.fillStyle='#03020ba8';ctx.fillRect(S.x,S.y,S.w,S.h);text(ctx,'NO CHARGE LEFT',S.x+S.w/2,S.y+S.h/2-7,14,'#f096ce',700,'center');text(ctx,'DEVICE DEPLETED',S.x+S.w/2,S.y+S.h/2+14,7,'#91778e',400,'center')}
 text(ctx,'POWER REMAINING',S.x+18,S.y+S.h-51,7.5,'#b590ad',600);
 text(ctx,Math.round(pct)+'%',S.x+18,S.y+S.h-15,32,pct<15?'#ff537c':'#fff0fb',800);
 text(ctx,pct===0?'EMPTY':feedObj?'BEING CONSUMED':'HUMAN_001',S.x+S.w-18,S.y+S.h-19,7,pct<15?'#ff6a97':'#b38ba8',600,'right');
 const shine=ctx.createLinearGradient(S.x,0,S.x+S.w,0);shine.addColorStop(0,'#ffe1fb0c');shine.addColorStop(.4,'#ffffff00');shine.addColorStop(1,'#bc9aff07');ctx.fillStyle=shine;ctx.fillRect(S.x,S.y,S.w,S.h);ctx.restore();
 rounded(ctx,S.x,S.y,S.w,S.h,31);ctx.strokeStyle='#df8cce38';ctx.lineWidth=1;ctx.stroke();
}
function jawClosure(q){if(q<.24)return .03;if(q<.36)return ease((q-.24)/.12);if(q<.49)return lerp(1,.10,(q-.36)/.13);if(q<.62)return lerp(.10,.92,(q-.49)/.13);if(q<.75)return lerp(.92,.16,(q-.62)/.13);if(q<.86)return lerp(.16,.8,(q-.75)/.11);return lerp(.8,.03,(q-.86)/.14)}
function cat(points,u){const x=clamp(u)*(points.length-1),i=Math.min(points.length-2,Math.floor(x)),f=x-i;const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];const v=k=>.5*(2*b[k]+(-a[k]+c[k])*f+(2*a[k]-5*b[k]+4*c[k]-d[k])*f*f+(-a[k]+3*b[k]-3*c[k]+d[k])*f*f*f);return{x:v('x'),y:v('y')}}
// The layer changes only after the entire silhouette clears the phone's left edge.
// The return ends at the exact next entry pose: no idle or teleport at the seam.
function orbit(u){
 const start=startPose(0),cx=P.x+P.w/2,cy=P.y+P.h/2;
 const points=[{x:cx+32,y:cy},{x:Math.min(P.x+P.w+30,W-130),y:cy-65},
  {x:cx+60,y:P.y+74},{x:P.x-80,y:P.y+74},{x:P.x-155,y:cy-85},
  {x:start.x-15,y:start.y+15},{x:start.x,y:start.y}];
 const p=cat(points,u),next=cat(points,clamp(u+.003)),dx=next.x-p.x,dy=next.y-p.y;
 return fishPose(p.x,p.y,lerp(.15,.29,ease((u-.65)/.35)),
  u<.18?1:u<.35?lerp(1,-1,ease((u-.18)/.17)):u<.66?-1:u<.90?lerp(-1,1,ease((u-.66)/.24)):1,
  clamp(Math.atan2(dy,Math.abs(dx)),-.17,.17)*(1-ease((u-.82)/.18)));
}
function background(t){
 ctx.clearRect(0,0,W,H);
 const base=projectPhone(P.x+P.w/2,P.y+P.h),x=base.x,y=base.y+8;
 ctx.save();ctx.translate(x,y);ctx.scale(1,.20);
 const shadow=ctx.createRadialGradient(0,0,8,0,0,175);shadow.addColorStop(0,'#000000b0');shadow.addColorStop(.55,'#00000072');shadow.addColorStop(1,'#00000000');
 ctx.fillStyle=shadow;ctx.fillRect(-180,-180,360,360);
 const glow=ctx.createRadialGradient(0,0,4,0,0,130);glow.addColorStop(0,'#ed4cab22');glow.addColorStop(1,'#ed4cab00');ctx.fillStyle=glow;ctx.fillRect(-135,-135,270,270);ctx.restore();
}
function render(t){
 if(!ready)return;// Contain the scene with a uniform scale; never stretch the phone or crop a turn.
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
 const scale=Math.min(canvas.width/W,canvas.height/H);
 // Compact compositions reserve the left side for the headline behind the fish.
 const offsetX=(canvas.width-W*scale)/(W===780?1:2);
 ctx.setTransform(scale,0,0,scale,offsetX,(canvas.height-H*scale)/2);background(t);
 let f=null,inner=null,front=null,rear=null,insideAlpha=1,pct=100,fullness=1,bites=[0,0,0,0,0,0],state='APPROACHING',phase='THE HUNT BEGINS',frontAlpha=1;
 if(t<FEED){const u=ease(t/FEED),target=feedingPose(0).p;front=mixPose(startPose(t),planePose(target),u);front.angle=lerp(0,planePose(target).angle,u);frontAlpha=1-ease((u-.48)/.45);inner=localPose(front);const pc=projectPhone(inner.x,inner.y),px=projectPhone(inner.x+10,inner.y),py=projectPhone(inner.x,inner.y+10);front.squeeze=lerp(1,Math.hypot(px.x-pc.x,px.y-pc.y)/Math.hypot(py.x-pc.x,py.y-pc.y),ease(u/.48));insideAlpha=1-frontAlpha;state='BREACHING';phase='SLIPPING THROUGH THE GLASS';}
 else if(t<END){f=feedingPose(t-FEED);inner=f.p;const eaten=f.n+(f.q>=.35?1:0);pct=100-eaten/18*100;if(f.n===17&&f.q<.9)pct=Math.max(1,pct);for(let k=0;k<eaten;k++)bites[order[Math.floor(k/3)]]++;state='FEEDING';phase=f.q<.35?'TEETH SINK INTO '+['A PHOTO','A PHOTO','A PRIVATE CHAT','A PRIVATE CHAT','A PERSONAL FILE','A MEMORY'][f.target.card.i]:'TEAR. CHEW. SWALLOW.';}
 else if(t<DEAD){pct=0;bites.fill(3);inner=feedingPose(18*BITE-.001).p;state='DEPLETED';phase='NOTHING LEFT. NOT EVEN A CHARGE.';}
 else if(t<EXIT){const u=ease((t-DEAD)/(EXIT-DEAD));pct=0;bites.fill(3);inner=mixPose(feedingPose(18*BITE-.001).p,localPose(orbit(0)),u);insideAlpha=1-u;rear=orbit(0);state='ESCAPING';phase='DISAPPEARING BEHIND THE PHONE';}
 else{const u=(t-EXIT)/(RETURN-EXIT),p=orbit(u);const recharge=ease((u-.72)/.28);pct=100*recharge;fullness=recharge;if(recharge===0)bites.fill(3);if(u<.62)rear=p;else front=p;state=recharge>0?'RESTORING':'CIRCLING';phase='STILL HUNGRY.';}
 if(rear)fish(ctx,rear,t,.08,null,1);
 drawPhone(t,pct,fullness,bites,f,inner,insideAlpha);
 if(front)fish(ctx,front,t,.08+Math.max(0,Math.sin(t*TAU/CYCLE*4))*.12,null,frontAlpha);
 stateSnapshot={time:t,cycle:cycleNo,phase:state,battery:Math.round(pct),bites:bites.slice(),jaw:f?jawClosure(f.q):0,layer:rear?'behind':inner?'screen':'front',playing,facing:(front||rear||inner||{dir:1}).dir,hasFrontView:frontReady,perspectiveRenderer:projector?.ready?'webgl':'canvas'};
}
function canAnimate(){return loaded&&playing&&inView&&!document.hidden&&!destroyed}
function schedule(){if(canAnimate()&&!frameId)frameId=requestAnimationFrame(tick)}
function tick(now){
 frameId=0;if(!canAnimate()){last=0;return}
 const dt=last?Math.min((now-last)/1000,.05):0;last=now;elapsed+=dt;
 cycleNo=Math.floor(elapsed/CYCLE)+1;render(elapsed%CYCLE);schedule();
}
function setPlaying(value){
 playing=value;last=0;if(!playing&&frameId){cancelAnimationFrame(frameId);frameId=0}
 if(loaded)render(elapsed%CYCLE);onPlaybackChange(playing);schedule();
}
function keydown(event){if(event.code==='Space'){event.preventDefault();setPlaying(!playing)}}
function visibility(){last=0;if(document.hidden&&frameId){cancelAnimationFrame(frameId);frameId=0}else schedule()}
function motionChange(){setPlaying(!motionQuery.matches)}
canvas.addEventListener('keydown',keydown);
document.addEventListener('visibilitychange',visibility);
motionQuery.addEventListener('change',motionChange);
const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas);
const intersectionObserver=new IntersectionObserver(entries=>{
 inView=entries[0].isIntersecting;last=0;
 if(!inView&&frameId){cancelAnimationFrame(frameId);frameId=0}else schedule();
});intersectionObserver.observe(canvas);
function boot(){
 if(destroyed||loaded||!image.complete||!image.naturalWidth||!frontSettled)return;
 rig();loaded=true;resize();render(0);onReady();onPlaybackChange(playing);schedule();
}
image.onload=boot;
frontImage.onload=()=>{frontReady=true;frontSettled=true;boot()};
image.onerror=()=>{if(!destroyed)onError()};
frontImage.onerror=()=>{frontReady=false;frontSettled=true;boot()};
image.src=sideSrc;frontImage.src=frontSrc;
return {
 get state(){return stateSnapshot},
 timings:{FEED,END,DEAD,EXIT,RETURN,CYCLE,BITE},
 pause(){setPlaying(false)},resume(){setPlaying(true)},toggle(){setPlaying(!playing)},
 seek(seconds){setPlaying(false);elapsed=Math.max(0,seconds);cycleNo=Math.floor(elapsed/CYCLE)+1;if(loaded)render(elapsed%CYCLE);return stateSnapshot},
 destroy(){destroyed=true;cancelAnimationFrame(frameId);resizeObserver.disconnect();intersectionObserver.disconnect();canvas.removeEventListener('keydown',keydown);document.removeEventListener('visibilitychange',visibility);motionQuery.removeEventListener('change',motionChange);projector?.gl.getExtension('WEBGL_lose_context')?.loseContext()}
};
}};
