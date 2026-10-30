/* Original character artwork, with a continuous swim path and flexible sprite rig. */
'use strict';
window.FuchsiafishScene = { mount({ canvas, stage = canvas, heading = null, dumbphone = null, sideSrc, frontSrc, turnSrc = null, turnFrames = null, turnAtlas = null, photoSrcs = [], profilePhotoSrcs = [], onReady = () => {}, onError = () => {}, onPlaybackChange = () => {} }) {
const mainCtx=canvas.getContext('2d',{alpha:true});
if (!mainCtx) { onError(); return null; }
let ctx=mainCtx;
const image=new Image(),frontImage=new Image(),turnImage=new Image();let frontReady=false,turnSequence=null,turnSettled=!turnSrc;
const photoImages=photoSrcs.slice(0,2).map(()=>new Image()),photoReady=photoImages.map(()=>false);
const profilePhotoImages=profilePhotoSrcs.slice(0,6).map(()=>new Image()),profilePhotoReady=profilePhotoImages.map(()=>false);
let photosPending=photoImages.length+profilePhotoImages.length;
// Give each change of direction its own time, separate from the paper bites.
const paperBites=window.FuchsiafishPaperBite;
const headline=heading&&window.FuchsiafishHeadline?.create(heading);
const order=[3,2,1,0],ITEMS=order.length,BITES=ITEMS*3;
const TAU=Math.PI*2, BITE=.225, TURN=.4, CONTACT=paperBites.CONTACT, TEAR=paperBites.TEAR, SWALLOW=paperBites.SWALLOW, CARD=3*BITE+TURN;
const FEED=1.2, END=FEED+BITES*BITE+(ITEMS-1)*TURN, DEAD=END+.45, EXIT=DEAD+.75, RETURN=EXIT+3.6;
const HEADLINE=RETURN, HEADLINE_TURN=TURN, REPAIR_START=FEED+.15, REPAIR_END=FEED+3.4;
let HEADLINE_END=HEADLINE,CYCLE=RETURN;
const DUMBPHONE_ATTEMPTS=3,DUMBPHONE_ATTEMPT=.9;
let DUMBPHONE=null,DUMBPHONE_END=null,GIVE_UP_END=null,dumbphoneTarget=null;
const dumbphoneTransform=dumbphone?.style.transform||'';
const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n)),lerp=(a,b,t)=>a+(b-a)*t,rand=n=>{const q=Math.sin(n*127.1+311.7)*43758.5453;return q-Math.floor(q)};
const smooth=t=>{t=clamp(t);return t*t*t*(10+t*(-15+6*t))};
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
let W=960,H=800,dpr=1,elapsed=0,last=0,playing=!motionQuery.matches,ready=false;
let frameId=0,inView=true,destroyed=false,stateSnapshot=null,frontSettled=false;
let body,tail,jaw,rigFrame,rigCtx,tiles=[],swimKeys=[],cycleNo=1,loaded=false;
let headlineCards=[],viewScale=1,viewX=0,viewY=0;
const headlineCardTime=CARD,headlineBiteTime=BITE;
let phoneLayer,phoneCtx,projector=null;
const P={x:460,y:100,w:322,h:604},S={x:478,y:121,w:286,h:555};
function rounded(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r)}
function fill(c,color){c.fillStyle=color;c.fill()}
function text(c,s,x,y,size=12,color='#f8edff',weight=500,align='left'){c.font=`${weight} ${size}px ui-monospace,SFMono-Regular,Consolas,monospace`;c.fillStyle=color;c.textAlign=align;c.fillText(s,x,y)}
function path(c,points){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath()}
function off(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
const cardHeight=i=>i<2?104:280;
function appText(c,s,x,y,size=7,color='#262626',weight=400,align='left'){
 c.font=`${weight} ${size}px Arial,Helvetica,sans-serif`;c.fillStyle=color;c.textAlign=align;c.fillText(s,x,y);
}
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
 rigFrame=off(1536,1024);rigCtx=rigFrame.getContext('2d');
 ready=true;
}
function instagramHeader(c){
 c.save();
 const g=c.createLinearGradient(8,27,27,8);g.addColorStop(0,'#ffbf55');g.addColorStop(.4,'#f33f77');g.addColorStop(1,'#8744d7');
 rounded(c,8,8,19,19,5);fill(c,g);
 c.strokeStyle='#fff';c.lineWidth=1.3;rounded(c,11.5,11.5,12,12,3.5);c.stroke();
 c.beginPath();c.arc(17.5,17.5,3.1,0,TAU);c.stroke();c.beginPath();c.arc(21.2,13.9,.9,0,TAU);fill(c,'#fff');
 appText(c,'Instagram',32,22,12,'#171717',700);
 c.strokeStyle='#e8e8e8';c.lineWidth=.5;c.beginPath();c.moveTo(0,34);c.lineTo(118,34);c.stroke();
 c.restore();
}
function handset(c,x,y,size,color){
 c.save();c.translate(x,y);c.scale(size/16,size/16);
 c.beginPath();c.moveTo(3.2,1.3);c.quadraticCurveTo(1.9,.6,1.2,2.4);
 c.bezierCurveTo(-.7,7,8.9,16.7,13.1,14.3);c.quadraticCurveTo(15.2,13.2,14.1,11.7);
 c.lineTo(11,9.8);c.quadraticCurveTo(10.2,9.3,9.5,10.3);c.lineTo(8.8,11.1);
 c.quadraticCurveTo(5.2,9.6,4,6.2);c.lineTo(5,5.5);c.quadraticCurveTo(5.8,4.9,5.3,4);c.closePath();fill(c,color);c.restore();
}
function whatsappCard(c,h){
 c.fillStyle='#075e54';c.fillRect(0,0,118,34);
 c.beginPath();c.arc(17,17,10,0,TAU);fill(c,'#25d366');
 c.strokeStyle='#fff';c.lineWidth=1.1;c.beginPath();c.arc(17,16.5,8.1,Math.PI*.8,Math.PI*2.7);c.lineTo(8.5,26);c.lineTo(10.1,21.8);c.stroke();
 handset(c,12,11,10,'#fff');appText(c,'WhatsApp',32,22,12,'#fff',700);
 c.fillStyle='#f7faf8';c.fillRect(0,34,118,33);profileAvatar(c,19,50,10);
 appText(c,'Luma',34,47,8,'#173b32',700);appText(c,'online',34,57,5.5,'#627d72');handset(c,98,43,10,'#128c7e');
 // Familiar warm wallpaper, green outgoing bubbles and blue read receipts.
 c.save();c.beginPath();c.rect(0,67,118,h-67);c.clip();
 c.strokeStyle='#ddd5c8';c.lineWidth=.55;
 for(let k=0;k<28;k++){
  const x=6+(k*37)%108,y=73+Math.floor(k/4)*27;
  rounded(c,x,y,8,5,2);c.stroke();c.beginPath();c.moveTo(x+1,y+5);c.lineTo(x,y+7);c.lineTo(x+4,y+5);c.stroke();
 }
 c.restore();
 rounded(c,42,73,34,11,4);fill(c,'#e8f1eb');appText(c,'TODAY',59,80.5,4.7,'#597168',500,'center');
 const bubbles=[
  {x:6,y:91,w:91,h:31,lines:['Hey! Are we still on','for tomorrow?'],time:'10:42'},
  {x:22,y:129,w:90,h:25,lines:['Of course :)'],time:'10:43',out:true},
  {x:6,y:161,w:97,h:32,lines:['I found a little cafe.','Sending you the spot.'],time:'10:43'},
  {x:22,y:200,w:90,h:25,lines:["Can\'t wait! <3"],time:'10:44',out:true}
 ];
 for(const b of bubbles){
  rounded(c,b.x,b.y,b.w,b.h,4);fill(c,b.out?'#d9fdd3':'#fff');
  path(c,b.out?[[b.x+b.w-3,b.y],[b.x+b.w+3,b.y],[b.x+b.w-1,b.y+5]]:[[b.x+3,b.y],[b.x-3,b.y],[b.x+1,b.y+5]]);fill(c,b.out?'#d9fdd3':'#fff');
  b.lines.forEach((line,k)=>appText(c,line,b.x+5,b.y+10+k*8,5.9,'#25382f'));
  appText(c,b.time,b.x+b.w-(b.out?16:4),b.y+b.h-4,4.4,'#7e8e84',400,'right');
  if(b.out){
   c.strokeStyle='#38a9d4';c.lineWidth=.7;
   for(const offset of [0,3]){c.beginPath();c.moveTo(b.x+b.w-12+offset,b.y+b.h-6);c.lineTo(b.x+b.w-10+offset,b.y+b.h-4);c.lineTo(b.x+b.w-6+offset,b.y+b.h-8);c.stroke()}
  }
 }
 rounded(c,6,232,96,18,4);fill(c,'#fff');path(c,[[13,237],[13,245],[19,241]]);fill(c,'#7a9186');
 c.strokeStyle='#96aaa0';c.lineWidth=1;
 for(let k=0;k<24;k++){const v=1+rand(k)*7;c.beginPath();c.moveTo(25+k*2.1,241-v/2);c.lineTo(25+k*2.1,241+v/2);c.stroke()}
 appText(c,'0:12',95,244,5,'#7e8e84',400,'right');
 rounded(c,4,h-24,93,19,10);fill(c,'#fff');appText(c,'+',13,h-11,11,'#84948c',400,'center');appText(c,'Message',24,h-11,6.3,'#8c9891');
 c.beginPath();c.arc(106,h-14.5,9,0,TAU);fill(c,'#128c7e');
 c.strokeStyle='#fff';c.lineWidth=1;rounded(c,104,h-20,4,7,2);c.stroke();c.beginPath();c.moveTo(102,h-15);c.quadraticCurveTo(102,h-9,106,h-9);c.quadraticCurveTo(110,h-9,110,h-15);c.moveTo(106,h-9);c.lineTo(106,h-6);c.stroke();
}
function profileAvatar(c,x,y,r){
 // An invented illustrated character, shared by the chat and profile cards.
 c.save();c.translate(x,y);c.scale(r,r);c.beginPath();c.arc(0,0,1,0,TAU);c.clip();
 c.fillStyle='#d8b5ed';c.fillRect(-1,-1,2,2);
 c.beginPath();c.ellipse(0,.98,.85,.65,0,0,TAU);fill(c,'#8b56b6');
 c.beginPath();c.ellipse(0,-.05,.62,.83,0,0,TAU);fill(c,'#48335e');
 c.beginPath();c.ellipse(0,-.01,.4,.57,0,0,TAU);fill(c,'#f3c5b4');
 c.beginPath();c.ellipse(-.21,-.51,.43,.24,-.55,0,TAU);fill(c,'#48335e');
 c.fillStyle='#48335e';c.fillRect(-.22,-.04,.08,.09);c.fillRect(.14,-.04,.08,.09);
 c.strokeStyle='#b16883';c.lineWidth=.06;c.beginPath();c.arc(0,.17,.16,.2,Math.PI-.2);c.stroke();
 c.restore();
}
function profilePost(c,x,y,w,h,i){
 // Personal-memory photos are baked into the card and its torn fragments.
 c.save();rounded(c,x,y,w,h,1.5);c.clip();c.fillStyle='#eee9e3';c.fillRect(x,y,w,h);
 const photo=profilePhotoImages[i];
 if(profilePhotoReady[i]&&photo.naturalWidth&&photo.naturalHeight){
  const sw=Math.min(photo.naturalWidth,photo.naturalHeight*w/h),sh=sw*h/w;
  c.drawImage(photo,(photo.naturalWidth-sw)/2,(photo.naturalHeight-sh)/2,sw,sh,x,y,w,h);
 }
 c.restore();
}
function instagramProfile(c,h){
 instagramHeader(c);
 appText(c,'luma.daydream',8,47,8,'#202020',700);
 c.strokeStyle='#262626';c.lineWidth=.9;c.beginPath();c.moveTo(102,42);c.lineTo(105,45);c.lineTo(108,42);c.stroke();
 const ring=c.createLinearGradient(8,92,40,58);ring.addColorStop(0,'#ffbc52');ring.addColorStop(.45,'#f33a7b');ring.addColorStop(1,'#a13be2');
 c.beginPath();c.arc(26,76,18,0,TAU);fill(c,ring);c.beginPath();c.arc(26,76,15.8,0,TAU);fill(c,'#fff');profileAvatar(c,26,76,14.3);
 for(const [x,count,label] of [[57,'6','posts'],[81,'128','followers'],[105,'64','following']]){
  appText(c,count,x,74,8,'#262626',700,'center');appText(c,label,x,83,4.6,'#555',400,'center');
 }
 appText(c,'Luma',8,104,7.5,'#262626',700);appText(c,'Digital daydreamer',8,114,6,'#737373');
 appText(c,'Little moments, big dreams.',8,124,5.7,'#353535');appText(c,'Fictional creator · AI',8,133,5.2,'#737373');
 rounded(c,8,141,49,15,4);fill(c,'#0095f6');appText(c,'Follow',32.5,151,6.3,'#fff',700,'center');
 rounded(c,61,141,49,15,4);fill(c,'#efefef');appText(c,'Message',85.5,151,6.3,'#262626',600,'center');
 for(const [x,label,i] of [[21,'Travel',0],[59,'Friends',1],[97,'Food',2]]){
  c.beginPath();c.arc(x,174,10,0,TAU);c.strokeStyle='#d9d9d9';c.lineWidth=.7;c.stroke();
  c.save();c.beginPath();c.arc(x,174,8.5,0,TAU);c.clip();profilePost(c,x-9,165,18,18,i);c.restore();appText(c,label,x,191,5.4,'#474747',400,'center');
 }
 c.strokeStyle='#dbdbdb';c.lineWidth=.5;c.beginPath();c.moveTo(0,197);c.lineTo(118,197);c.stroke();
 c.strokeStyle='#262626';c.lineWidth=.65;
 for(let row=0;row<3;row++)for(let col=0;col<3;col++){c.beginPath();c.rect(29+col*2.7,202+row*2.7,1.7,1.7);c.stroke()}
 c.strokeStyle='#aaa';c.beginPath();c.rect(85,202,7,7);c.stroke();c.beginPath();c.arc(88.5,204.5,1,0,TAU);c.stroke();
 c.fillStyle='#262626';c.fillRect(0,213,59,1);
 for(let k=0;k<6;k++)profilePost(c,(k%3)*39.7,216+Math.floor(k/3)*25,38.6,24,k);
 c.strokeStyle='#262626';c.lineWidth=.9;
 // Bottom navigation makes this read as a miniature Instagram screen.
 c.beginPath();c.moveTo(11,h-6);c.lineTo(11,h-11);c.lineTo(15,h-15);c.lineTo(19,h-11);c.lineTo(19,h-6);c.closePath();c.stroke();
 c.beginPath();c.arc(43,h-11,3,0,TAU);c.moveTo(45,h-9);c.lineTo(48,h-6);c.stroke();
 rounded(c,68,h-15,8,8,2);c.stroke();c.beginPath();c.moveTo(72,h-13);c.lineTo(72,h-9);c.moveTo(70,h-11);c.lineTo(74,h-11);c.stroke();profileAvatar(c,102,h-11,4.5);
}
function makeCard(i){
 const h=cardHeight(i),a=off(236,h*2),c=a.getContext('2d');c.scale(2,2);rounded(c,0,0,118,h,7);fill(c,i<2?'#f5e9f4':i===2?'#efeae2':'#fff');
 c.save();c.clip();
 if(i<2){
  text(c,['PHOTO_028','PHOTO_104'][i],8,13,6.5,'#5c4268',750);
  c.fillStyle='#cbbdca';c.fillRect(7,20,104,62);
  const photo=photoImages[i];
  if(photoReady[i]&&photo.naturalWidth&&photo.naturalHeight){
   // Cover the photo window without stretching faces. Baking into the card
   // also gives the torn flap and swallowed fragments the same illustration.
   const w=Math.min(photo.naturalWidth,photo.naturalHeight*104/62),h=w*62/104;
   c.drawImage(photo,(photo.naturalWidth-w)/2,(photo.naturalHeight-h)/2,w,h,7,20,104,62);
  }
  text(c,i?'Shiraz, with you.':'Make a wish.',8,95,6.5,'#785b84');
 }else if(i===2){
  whatsappCard(c,h);
 }else{
  instagramProfile(c,h);
 }
 c.restore();
 return a;
}
function resize(){
 const b=stage.getBoundingClientRect();if(!b.width||!b.height)return;
 const compact=matchMedia('(max-width: 850px)').matches;
 W=compact?780:960;H=compact?820:800;dpr=Math.min(devicePixelRatio||1,2);
 // Extend only the drawing surface over the existing heading. The phone and
 // the entire first visit retain their original stage, scale and coordinates.
 const extra=headline?Math.max(0,b.left):0;
 // The keypad phone stays in its existing layout. Extend the transparent
 // canvas down to it, retaining the original stage coordinates and scale.
 if(dumbphone)dumbphone.style.transform=dumbphoneTransform;
 const phoneBounds=dumbphone?.getBoundingClientRect();
 const extraBottom=phoneBounds?Math.max(0,phoneBounds.bottom+90-(b.top+b.height)):0;
 if(headline)canvas.style.width=`${b.width+extra}px`;
 if(dumbphone)canvas.style.height=`${b.height+extraBottom}px`;
 canvas.width=Math.round((b.width+extra)*dpr);canvas.height=Math.round((b.height+extraBottom)*dpr);
 viewScale=Math.min(b.width/W,b.height/H);
 viewX=extra+(b.width-W*viewScale)/(compact?1:2);viewY=(b.height-H*viewScale)/2;
 P.x=compact?435:535;P.y=compact?110:86;S.x=P.x+18;S.y=P.y+23;
 tiles=Array.from({length:ITEMS},(_,i)=>({i,x:S.x+18+(i%2)*132,y:S.y+90+Math.floor(i/2)*120,w:118,h:cardHeight(i),asset:makeCard(i),dir:i%2?1:-1}));
 if(headline){
  headlineCards=headline.measure({left:b.left-extra+viewX,top:b.top+viewY,scale:viewScale});
  // Use the phone's bite and turn rhythm regardless of the measured row count.
  // Reserve turns only between rows, so the final swallow flows into re-entry.
  HEADLINE_END=HEADLINE+headlineCards.length*3*BITE+(headlineCards.length-1)*HEADLINE_TURN;
  CYCLE=HEADLINE_END+1.4;
 }
 dumbphoneTarget=null;DUMBPHONE=DUMBPHONE_END=GIVE_UP_END=null;
 if(phoneBounds?.width&&phoneBounds.height&&headlineCards.length){
  dumbphoneTarget={x:(phoneBounds.left-b.left+extra-viewX+phoneBounds.width*.08)/viewScale,
   y:(phoneBounds.top-b.top-viewY+phoneBounds.height*.48)/viewScale};
  DUMBPHONE=HEADLINE_END+1.2;
  DUMBPHONE_END=DUMBPHONE+DUMBPHONE_ATTEMPTS*DUMBPHONE_ATTEMPT;
  GIVE_UP_END=DUMBPHONE_END+.45;
  CYCLE=GIVE_UP_END+1.4;
 }
 buildSwimPath();
 buildPhoneMesh();
 if(loaded)renderElapsed();
}
function fishPose(x,y,s=.25,dir=1,angle=0){return{x,y,s,dir,angle}}
function startPose(){return fishPose(W===780?248:291,W===780?390:408,.29,1,-.12)}
function biteTarget(n){const card=tiles[order[Math.min(ITEMS-1,Math.floor(n/3))]],piece=n%3,cx=card.x+(paperBites.edge(card,piece,.5)+paperBites.edge(card,piece+1,.5))/2;return {card,piece,x:cx,y:card.y+card.h*.5}}
function jawPoint(x,y,closed){const angle=-.145*closed,dx=x-805,dy=y-685;return{x:805+dx*Math.cos(angle)-dy*Math.sin(angle),y:685+dx*Math.sin(angle)+dy*Math.cos(angle)}}
function jawPin(closed){return jawPoint(1245,625,closed)}
function bitePose(n){
 const v=biteTarget(n),s=.178,pin=jawPin(1);
 return fishPose(v.x-v.card.dir*(pin.x-820)*s,v.y-(pin.y-520)*s,s,v.card.dir);
}
function headlineTarget(n){
 const row=Math.min(headlineCards.length-1,Math.floor(n/3)),card=headlineCards[row],piece=n%3;
 return {row,card,piece,x:card.x+(paperBites.edge(card,piece,.5)+paperBites.edge(card,piece+1,.5))/2,y:card.y+card.h/2};
}
function headlinePose(n){
 const v=headlineTarget(n),s=.29,pin=jawPin(1);
 return fishPose(v.x-v.card.dir*(pin.x-820)*s,v.y-(pin.y-520)*s,s,v.card.dir);
}
function headlineFeeding(t){
 const row=Math.min(headlineCards.length-1,Math.floor((t-HEADLINE)/headlineCardTime));
 const within=t-HEADLINE-row*headlineCardTime,piece=Math.min(2,Math.floor(within/headlineBiteTime));
 const q=clamp((within-piece*headlineBiteTime)/headlineBiteTime),target=headlineTarget(row*3+piece),p=swimPose(t),turning=within>=3*headlineBiteTime;
 if(!turning){
  const anticipation=-5*(smooth(q/.18)-smooth((q-.18)/(CONTACT-.18)));
  const tug=smooth((q-CONTACT)/(TEAR-CONTACT))*(1-smooth((q-.72)/.28));
  p.x+=target.card.dir*(anticipation-13*tug);p.y-=3*tug;
  p.angle+=target.card.dir*.018*tug;
 }
 return {p,q,target,turning,paper:turning?null:paperBites.sample({card:target.card,piece,q,grip:mouth(p,jawClosure(q))})};
}
function dumbphonePose(){
 const p=fishPose(0,0,.29,1,0),offset=mouth(p,.08);
 return {...p,x:dumbphoneTarget.x-offset.x-22,y:dumbphoneTarget.y-offset.y};
}
function dumbphoneFeeding(t){
 const attempt=Math.min(DUMBPHONE_ATTEMPTS-1,Math.floor((t-DUMBPHONE)/DUMBPHONE_ATTEMPT));
 const q=clamp((t-DUMBPHONE-attempt*DUMBPHONE_ATTEMPT)/DUMBPHONE_ATTEMPT);
 // Close on the casing, try chewing, then recoil without tearing anything off.
 let closed;
 if(q<.32)closed=lerp(.08,1,smooth((q-.16)/.16));
 else if(q<.52)closed=1;
 else if(q<.8)closed=1-.32*Math.sin((q-.52)/.28*TAU)**2;
 else closed=lerp(1,.08,smooth((q-.8)/.2));
 const p=swimPose(t),open=mouth({...p,x:0,y:0},.08),grip=mouth({...p,x:0,y:0},closed);
 const lunge=smooth(q/.32)*(1-smooth((q-.8)/.2));
 const recoil=18*(smooth((q-.45)/.22)-smooth((q-.8)/.2));
 p.x+=22*lunge-recoil+open.x-grip.x;p.y+=open.y-grip.y;
 return {p,q,attempt,closed,contact:mouth(p,closed)};
}
function buildSwimPath(){
 const start=startPose(),cx=P.x+P.w/2,cy=P.y+P.h/2;
 swimKeys=[];
 const add=(at,p,effort=.55,bend=0)=>swimKeys.push({at,...p,yaw:Math.acos(clamp(p.dir,-1,1)),effort,bend});
 const inside=(at,p,effort=.4,bend=0)=>add(at,planePose(p),effort,bend);
 add(0,start,.75);
 const first=bitePose(0);
 add(FEED*.55,fishPose(P.x-10,Math.max(start.y,first.y),.225,1,-.21),.85);
 inside(FEED,{...first,x:first.x-10},.65);
 for(let group=0;group<ITEMS;group++){
  const at=FEED+group*CARD;
  for(let piece=0;piece<3;piece++)inside(at+(piece+CONTACT)*BITE,bitePose(group*3+piece));
  // Finish swallowing the third piece before yaw begins: the turn atlas has
  // no articulated bite, and must not replace the jaw while it holds paper.
  inside(at+(2+SWALLOW)*BITE,bitePose(group*3+2));
  if(group<ITEMS-1){
   const a=bitePose(group*3+2),b=bitePose((group+1)*3);
   // A banked arc lets the head lead the turn while the tail follows it.
   inside(at+3*BITE+TURN*.5,fishPose((a.x+b.x)/2+a.dir*16,
    (a.y+b.y)/2+(group%2?12:-28),.178,0,a.dir*.09),.72,a.dir);
  }
 }
 const final=bitePose(BITES-1);
 inside(END,{...final,x:final.x-final.dir*14,y:final.y+3},.35);
 // Rise toward the top rim before the screen goes dark. The rear pass can
 // already peek out while the clipped screen pass still shows the body.
 inside(DEAD,fishPose(cx-9,P.y+75,.178,0,-.08),.5,-.6);
 const returnScale=planePose(final).s;
 add(EXIT,fishPose(cx+32,P.y+5,returnScale,1,-.13),.65);
 const duration=RETURN-EXIT;
 add(EXIT+duration*.14,fishPose(Math.min(P.x+P.w+30,W-120),P.y-5,returnScale,.8,-.22),.7,.65);
 add(EXIT+duration*.28,fishPose(cx+54,P.y+5,returnScale,0,.04),.65,1);
 add(EXIT+duration*.46,fishPose(P.x-78,P.y+83,returnScale,-1,-.08),.55);
 // Recover foreground depth while swimming straight. Both yaw turns keep
 // their own constant scale; turning itself must never zoom the fish.
 add(EXIT+duration*.62,fishPose(P.x-158,cy-75,start.s,-1,-.22),.65,-.5);
 add(EXIT+duration*.78,fishPose(start.x-78,start.y+56,start.s,0,-.06),.7,-1);
 add(EXIT+duration*.9,fishPose(start.x-43,start.y+27,start.s,.85,-.15),.65,-.35);
 add(RETURN,start,.75);
 // Periodic, shape-preserving tangents keep velocity continuous at every knot,
 // including the last frame -> first frame, without overshooting a bite or turn.
 const fields=['x','y','s','yaw','angle','effort','bend'];
 swimKeys.forEach((key,i)=>{
  const prev=i?swimKeys[i-1]:{...swimKeys[swimKeys.length-2],at:swimKeys[swimKeys.length-2].at-RETURN};
  const next=i<swimKeys.length-1?swimKeys[i+1]:{...swimKeys[1],at:swimKeys[1].at+RETURN};
  const before=key.at-prev.at,after=next.at-key.at;
  key.velocity={};
  for(const field of fields){
   const a=(key[field]-prev[field])/before,b=(next[field]-key[field])/after;
   key.velocity[field]=a*b<=0?0:3*(before+after)/((2*after+before)/a+(after+2*before)/b);
  }
 });
 if(headlineCards.length){
  // Keep entry, feeding and the rear escape unchanged. Once facing left,
  // continue to the first word instead of turning back to the idle pose.
  const depart=EXIT+duration*.62;
  swimKeys=swimKeys.filter(key=>key.at<=depart);
  const branch=swimKeys.length-1;
  const first=headlinePose(0);
  add(HEADLINE,{...first,x:first.x-first.dir*18},.6);
  for(let row=0;row<headlineCards.length;row++){
   const at=HEADLINE+row*headlineCardTime;
   for(let piece=0;piece<3;piece++)add(at+(piece+CONTACT)*headlineBiteTime,headlinePose(row*3+piece),.5);
   add(at+(2+SWALLOW)*headlineBiteTime,headlinePose(row*3+2),.5);
   if(row<headlineCards.length-1){
    const a=headlinePose(row*3+2),b=headlinePose((row+1)*3);
    const turn=at+3*headlineBiteTime;
    // Alternate direction like the phone cards: one local, banked turn
    // connects the end of this row to the adjacent edge of the next row.
    add(turn+HEADLINE_TURN*.5,fishPose((a.x+b.x)/2+a.dir*16,
     (a.y+b.y)/2,.29,0,a.dir*.09),.72,a.dir);
   }
  }
  const final=headlinePose(headlineCards.length*3-1);
  if(dumbphoneTarget){
   const target=dumbphonePose();
   add(HEADLINE_END+.3,fishPose(final.x-20,lerp(final.y,target.y,.2),.29,0,.04),.7,-1);
   add(DUMBPHONE,target,.65);
   for(let attempt=0;attempt<DUMBPHONE_ATTEMPTS;attempt++){
    add(DUMBPHONE+(attempt+.5)*DUMBPHONE_ATTEMPT,target,.55);
    add(DUMBPHONE+(attempt+1)*DUMBPHONE_ATTEMPT,target,.55);
   }
   // Back away in frustration, then face the route to the smartphone. On
   // narrow screens that route goes up and left before turning into entry.
   if(target.x>start.x){
    add(GIVE_UP_END,{...target,x:target.x-35,y:target.y-12,dir:0,angle:-.12},.35,-1);
    add(GIVE_UP_END+.5,fishPose(start.x+110,lerp(target.y,start.y,.65),.29,-1,-.12),.7);
    add(GIVE_UP_END+.95,fishPose(start.x-40,start.y+28,.29,0,-.04),.7,-1);
    add(GIVE_UP_END+1.2,fishPose(start.x-22,start.y+10,.29,1,-.12),.7);
   }else{
    add(GIVE_UP_END,{...target,x:target.x-35,y:target.y-12,angle:-.12},.35);
    add(GIVE_UP_END+.55,fishPose(lerp(target.x,start.x,.38),lerp(target.y,start.y,.6)-35,.29,1,-.2),.7);
   }
  }else if(final.dir<0){
   add(HEADLINE_END+.3,fishPose(final.x-20,lerp(final.y,start.y,.2),.29,0,.04),.7,-1);
   add(HEADLINE_END+.6,fishPose(lerp(final.x,start.x,.25),lerp(final.y,start.y,.4),.29,1,-.08),.7);
  }
  add(CYCLE,start,.75);
  for(let i=branch;i<swimKeys.length;i++){
   const key=swimKeys[i],prev=swimKeys[i-1],next=swimKeys[i+1]||{...swimKeys[1],at:CYCLE+swimKeys[1].at};
   const before=key.at-prev.at,after=next.at-key.at;key.velocity={};
   for(const field of fields){
    const a=(key[field]-prev[field])/before,b=(next[field]-key[field])/after;
    key.velocity[field]=a*b<=0?0:3*(before+after)/((2*after+before)/a+(after+2*before)/b);
   }
  }
  swimKeys.at(-1).velocity={...swimKeys[0].velocity};
 }
}
function swimPose(t){
 t=((t%CYCLE)+CYCLE)%CYCLE;
 let i=0;while(i<swimKeys.length-2&&swimKeys[i+1].at<t)i++;
 const a=swimKeys[i],b=swimKeys[i+1],dt=b.at-a.at,u=(t-a.at)/dt,u2=u*u,u3=u2*u;
 const value=field=>(2*u3-3*u2+1)*a[field]+(u3-2*u2+u)*dt*a.velocity[field]+(-2*u3+3*u2)*b[field]+(u3-u2)*dt*b.velocity[field];
 const p=fishPose(value('x'),value('y'),value('s'),Math.cos(value('yaw')),value('angle'));
 p.effort=value('effort');p.bend=value('bend');
 // This gentle heave continues through feeding and layer changes. All wave
 // frequencies are whole cycles, so seeking and looping produce the same pose.
 const phase=swimPhase(t);
 p.y+=(.7+2.6*smooth((p.s-.178)/.112))*Math.sin(phase*7);
 p.angle+=.009*Math.sin(phase*11);
 return p;
}
function swimPhase(t){
 if(t<=RETURN)return t*TAU/RETURN;
 const duration=CYCLE-RETURN,u=(t-RETURN)/duration,rate=duration/RETURN;
 // Match the tail wave's speed at both ends of the added hunt as well.
 return TAU*(1+rate*u+(1-rate)*smooth(u));
}
function feedingPose(f){
 const group=Math.min(ITEMS-1,Math.floor(Math.max(0,f)/CARD)),within=Math.max(0,f-group*CARD);
 const piece=Math.min(2,Math.floor(within/BITE)),n=group*3+piece,q=clamp((within-piece*BITE)/BITE);
 const p=localPose(swimPose(FEED+f)),target=biteTarget(n),turning=within>=3*BITE;
 if(!turning){
  const anticipation=-5*(smooth(q/.18)-smooth((q-.18)/(CONTACT-.18)));
  const tug=smooth((q-CONTACT)/(TEAR-CONTACT))*(1-smooth((q-.72)/.28));
  p.x+=target.card.dir*(anticipation-13*tug);p.y-=3*tug;
  p.angle+=target.card.dir*.018*tug;
 }
 return {p,n,q,target,turning};
}
function mouth(p,closed=.08){const pin=jawPin(closed),x=(pin.x-820)*p.s*p.dir,y=(pin.y-520)*p.s;return{x:p.x+x*Math.cos(p.angle)-y*Math.sin(p.angle),y:p.y+x*Math.sin(p.angle)+y*Math.cos(p.angle)}}
function fish(c,p,t,closed=0,paper=null,alpha=1){
 if(!ready||alpha<=0)return;
 if(p.squeeze){c.save();c.translate(p.x,p.y);c.rotate(p.angle);c.scale(p.squeeze,1);c.rotate(-p.angle);c.translate(-p.x,-p.y);fish(c,{...p,squeeze:undefined},t,closed,paper,alpha);c.restore();return}
 if(turnSequence&&Math.abs(p.dir)<1-1e-7){
  const phase=swimPhase(t)*22,amplitude=25+22*(p.effort??.55);
  turnSequence.draw(c,p,alpha,x=>{
   const tailward=clamp((180-x*p.dir)/850)*Math.abs(p.dir);
   return tailward*tailward*(amplitude*Math.sin(phase-tailward*3.1)+(p.bend||0)*36);
  });return;
 }
 // If the atlas cannot load, retain intact artwork rather than distorting it.
 if(frontReady&&Math.abs(p.dir)<.35){
  c.save();c.globalAlpha=alpha;c.translate(p.x,p.y);c.rotate(p.angle);c.scale(p.s,p.s);
  c.drawImage(frontImage,-490,-487,980,980);c.restore();
 }else sideFish(c,{...p,dir:p.dir<0?-1:1},t,closed,paper,alpha);
}

function flexSprite(c,sprite,w,h,offset){
 // Sheared strips join into a travelling body wave. The head remains steady;
 // displacement builds toward the tail, rather than rotating a cut-out fin.
 for(let x=0;x<w;x+=32){
  const width=Math.min(32,w-x),y=offset(x),slope=(offset(x+width)-y)/width;
  c.save();c.transform(1,slope,0,1,0,y-slope*x);
  c.drawImage(sprite,x,0,width,h,x,0,width+.35,h);c.restore();
 }
}
function sideFish(c,p,t,closed=0,paper=null,alpha=1){
 if(!ready||alpha<=0)return;
 const r=rigCtx;r.clearRect(0,0,1536,1024);r.drawImage(tail,0,0);
 // Dark, recessed mouth behind the articulated jaw.
 r.fillStyle='#09030d';r.beginPath();r.ellipse(1049,648,270,108,0,0,TAU);r.fill();r.drawImage(body,0,0);
 if(paper){
  // The printed flap passes behind the upper tooth tips and the moving lower
  // jaw. Its outside and inside passes share exactly the same mesh vertices.
  const rim=[[1261,682],[1100,678],[876,694]].map(([x,y])=>{const v=jawPoint(x,y,closed);return[v.x,v.y]});
  r.save();path(r,[[879,595],[910,611],[925,575],[950,610],[975,571],[997,603],
   [1020,563],[1040,598],[1061,559],[1082,593],[1105,554],[1126,589],
   [1147,550],[1168,590],[1190,554],[1211,590],[1231,554],[1250,591],
   ...rim]);r.clip();
  r.translate(820,520);r.scale(1/(p.s*p.dir),1/p.s);r.rotate(-p.angle);r.translate(-p.x,-p.y);
  paper(r);r.restore();
 }
 r.save();r.translate(805,685);r.rotate(-.145*closed);r.translate(-805,-685);r.drawImage(jaw,0,0);r.restore();
 c.save();c.globalAlpha=alpha;c.translate(p.x,p.y);c.rotate(p.angle);c.scale(p.s*p.dir,p.s);c.translate(-820,-520);
 const phase=swimPhase(t)*22,amplitude=25+22*(p.effort??.55),bend=p.bend||0;
 flexSprite(c,rigFrame,1536,1024,x=>{
  const tailward=clamp((1000-x)/850);
  return tailward*tailward*(amplitude*Math.sin(phase-tailward*3.1)+bend*36);
 });
 c.restore();
}
function drawCard(card,bites,reveal=1){
 if(bites>=3||reveal<=0)return;
 ctx.save();ctx.globalAlpha=reveal;ctx.translate(card.x,card.y+(1-reveal)*18);
 if(bites>0){paperBites.remainderPath(ctx,card,bites);ctx.clip()}
 ctx.drawImage(card.asset,0,0,card.w,card.h);ctx.restore();
 if(bites>0){
  ctx.save();ctx.globalAlpha=reveal;ctx.strokeStyle='#fff5e9';ctx.lineWidth=.85;
  ctx.beginPath();for(let j=0;j<=12;j++){
   const x=card.x+paperBites.edge(card,bites,j/12),y=card.y+j/12*card.h;
   if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }ctx.stroke();ctx.restore();
 }
}
function fragments(f,pose){
 const {n,q,target}=f;if(q<TEAR||q>=SWALLOW||f.turning)return;
 const m=mouth(pose,jawClosure(q)),u=(q-TEAR)/(SWALLOW-TEAR);
 // Flecks carry pixels from the same document. They leave the torn seam,
 // trail behind the tug, and are caught by the mouth rather than exploding.
 for(let k=0;k<6;k++){
  const v=clamp((u-k*.035)/.8);if(v<=0||v>=1)continue;
  const sx=target.card.x+paperBites.edge(target.card,target.piece+1,.5),sy=target.y+(rand(n*13+k)-.5)*32;
  const arc=Math.sin(v*Math.PI),x=lerp(sx,m.x,v)-target.card.dir*arc*(4+rand(k)*8),y=lerp(sy,m.y,v)-arc*(6+rand(k+n)*9);
  ctx.save();ctx.translate(x,y);ctx.rotate((k%2?1:-1)*v*3);ctx.scale(1-v*.55,1-v*.55);ctx.globalAlpha=1-smooth((v-.72)/.28);
  const tx=clamp((target.x-target.card.x)/target.card.w)*(target.card.asset.width-7),ty=(target.card.h*.5+(rand(n+k)-.5)*40)*2;
  ctx.drawImage(target.card.asset,tx,ty,7,11,-1.75,-2.75,3.5,5.5);ctx.restore();
 }
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
 return {...p,...fishPose(q.x,q.y,p.s*Math.hypot(dy.x-q.x,dy.y-q.y)/10,p.dir,p.angle+Math.atan2(dx.y-q.y,dx.x-q.x))};
}
function localPose(p){
 const q=unprojectPhone(p.x,p.y),base=planePose({...p,x:q.x,y:q.y,s:1,angle:0});
 return {...p,...fishPose(q.x,q.y,p.s/base.s,p.dir,p.angle-base.angle)};
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
 phoneBase();screen(t,pct,fullness,bites,f,inner,alpha);
 ctx=output;
 const shell=ctx.createLinearGradient(P.x,0,P.x+P.w+25,0);shell.addColorStop(0,'#12121f');shell.addColorStop(.82,'#1f152b');shell.addColorStop(.94,'#77506a');shell.addColorStop(1,'#21192c');
 phoneOutline(-25);fill(ctx,shell);ctx.strokeStyle='#b48ca74d';ctx.lineWidth=1.2;ctx.stroke();
 if(!projectPhoneTexture())flatPhoneFallback();
}
function phoneBase(){
 ctx.save();ctx.translate(P.x,P.y);
 const g=ctx.createLinearGradient(0,0,P.w,P.h);g.addColorStop(0,'#73637d');g.addColorStop(.1,'#20182b');g.addColorStop(.5,'#0c101b');g.addColorStop(.9,'#45334b');g.addColorStop(1,'#8d4a7a');
 ctx.shadowColor='#000';ctx.shadowBlur=0;ctx.shadowOffsetY=0;rounded(ctx,0,0,P.w,P.h,49);fill(ctx,g);ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.strokeStyle='#ad84a46b';ctx.lineWidth=1.5;ctx.stroke();
 rounded(ctx,11,12,P.w-22,P.h-25,39);fill(ctx,'#03050b');ctx.strokeStyle='#51415a';ctx.stroke();
 ctx.fillStyle='#59465e';ctx.fillRect(-3,104,3,36);ctx.fillRect(-3,153,3,54);ctx.fillRect(P.w,136,3,61);
 rounded(ctx,P.w/2-39,23,78,17,12);fill(ctx,'#03040a');ctx.beginPath();ctx.arc(P.w/2+29,31,3.2,0,TAU);fill(ctx,'#242a3b');
 rounded(ctx,P.w/2-36,P.h-17,72,3,2);fill(ctx,'#877385');ctx.restore();
}
function screen(t,pct,fullness,bites,feedObj,innerPose,insideAlpha){
 ctx.save();rounded(ctx,S.x,S.y,S.w,S.h,31);ctx.clip();
 const g=ctx.createLinearGradient(S.x,S.y,S.x+S.w,S.y+S.h);g.addColorStop(0,'#111726');g.addColorStop(.6,'#170e21');g.addColorStop(1,'#0d0b14');ctx.fillStyle=g;ctx.fillRect(S.x,S.y,S.w,S.h);
 text(ctx,'21:08',S.x+17,S.y+29,10,'#e0cbdc',700);text(ctx,'▂▄▆',S.x+S.w-65,S.y+28,10,'#a498ad',700);
 const bx=S.x+S.w-36;rounded(ctx,bx,S.y+18,22,11,3);ctx.strokeStyle='#ac98ab';ctx.stroke();ctx.fillStyle=pct<20?'#ff567f':'#ec8cce';ctx.fillRect(bx+2,S.y+20,18*pct/100,7);ctx.fillRect(bx+23,S.y+21,2,5);
 text(ctx,'YOUR DIGITAL LIFE',S.x+18,S.y+64,10,'#d2b8d0',700);text(ctx,String(ITEMS).padStart(2,'0')+' PRIVATE ITEMS',S.x+18,S.y+80,6.5,'#81718c');
 const flap=feedObj?.paper;
 tiles.forEach((card,i)=>drawCard(card,flap?.active&&flap.card===card?flap.piece+1:bites[i],fullness));
 if(flap?.active){paperBites.shadow(ctx,flap);paperBites.draw(ctx,flap)}
 if(innerPose){const f=feedObj,closure=f?jawClosure(f.q):.08;
 const paper=flap?.active?c=>paperBites.draw(c,flap,false):null;
 fish(ctx,innerPose,t,closure,paper,insideAlpha);
 if(f)fragments(f,innerPose);
 }
 // Fine moving glass scanlines put the creature behind the screen surface.
 ctx.fillStyle='#ecd7ff03';for(let y=S.y+(t*9)%4;y<S.y+S.h;y+=4)ctx.fillRect(S.x,y,S.w,1);
 // Keep the departing fish visible until its rear silhouette clears the rim,
 // then fade to the same depleted screen instead of cutting it off at 0%.
 const shutdown=pct===0?smooth((t-DEAD-.1)/(EXIT-DEAD-.1)):0;
 if(shutdown>0){ctx.save();ctx.globalAlpha=shutdown;ctx.fillStyle='#03020ba8';ctx.fillRect(S.x,S.y,S.w,S.h);text(ctx,'NO CHARGE LEFT',S.x+S.w/2,S.y+S.h/2-7,14,'#f096ce',700,'center');text(ctx,'DEVICE DEPLETED',S.x+S.w/2,S.y+S.h/2+14,7,'#91778e',400,'center');ctx.restore()}
 text(ctx,'POWER REMAINING',S.x+18,S.y+S.h-51,7.5,'#b590ad',600);
 text(ctx,Math.round(pct)+'%',S.x+18,S.y+S.h-15,32,pct<15?'#ff537c':'#fff0fb',800);
 text(ctx,pct===0?'EMPTY':feedObj?'BEING CONSUMED':'HUMAN_001',S.x+S.w-18,S.y+S.h-19,7,pct<15?'#ff6a97':'#b38ba8',600,'right');
 const shine=ctx.createLinearGradient(S.x,0,S.x+S.w,0);shine.addColorStop(0,'#ffe1fb0c');shine.addColorStop(.4,'#ffffff00');shine.addColorStop(1,'#bc9aff07');ctx.fillStyle=shine;ctx.fillRect(S.x,S.y,S.w,S.h);ctx.restore();
 rounded(ctx,S.x,S.y,S.w,S.h,31);ctx.strokeStyle='#df8cce38';ctx.lineWidth=1;ctx.stroke();
}
function jawClosure(q){
 if(q<.18)return .08;
 if(q<CONTACT)return lerp(.08,1,smooth((q-.18)/(CONTACT-.18)));
 // Hold the sheet between the teeth throughout the backward tug.
 if(q<TEAR)return 1;
 if(q<.78)return lerp(1,.24,smooth((q-TEAR)/(.78-TEAR)));
 if(q<.87)return lerp(.24,.75,smooth((q-.78)/.09));
 return lerp(.75,.08,smooth((q-.87)/.13));
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
 ctx.setTransform(viewScale*dpr,0,0,viewScale*dpr,viewX*dpr,viewY*dpr);background(t);
 let f=null,inner=null,front=null,rear=null,insideAlpha=1,pct=100,fullness=1,bites=Array(ITEMS).fill(0),state='APPROACHING',phase='THE HUNT BEGINS',frontAlpha=1;
 let titleFeed=null,failedBite=null,titleRepair=1,titleRow=-1,titlePiece=0,titleQ=0;
 let pose=swimPose(t);
 if(t<FEED){const u=t/FEED;front=pose;frontAlpha=1-smooth((u-.45)/.51);inner=localPose(pose);const pc=projectPhone(inner.x,inner.y),px=projectPhone(inner.x+10,inner.y),py=projectPhone(inner.x,inner.y+10);front.squeeze=lerp(1,Math.hypot(px.x-pc.x,px.y-pc.y)/Math.hypot(py.x-pc.x,py.y-pc.y),smooth(u/.45));insideAlpha=1-frontAlpha;state='BREACHING';phase='SLIPPING THROUGH THE GLASS';}
 else if(t<END){f=feedingPose(t-FEED);inner=f.p;const eaten=f.n+(f.q>=TEAR?1:0);pct=100-eaten/BITES*100;if(eaten===BITES&&f.q<SWALLOW)pct=1;for(let k=0;k<eaten;k++)bites[order[Math.floor(k/3)]]++;state='FEEDING';phase=f.turning?'HUNTING THE NEXT MORSEL':f.q<CONTACT?'TEETH SINK INTO '+(f.target.card.i<2?'A PHOTO':f.target.card.i===2?'A WHATSAPP CHAT':'AN INSTAGRAM PROFILE'):'TEAR. CHEW. SWALLOW.';}
 else if(t<DEAD){pct=0;bites.fill(3);inner=localPose(pose);rear=pose;state='DEPLETED';phase='NOTHING LEFT. NOT EVEN A CHARGE.';}
 else if(t<EXIT){const u=smooth((t-DEAD)/(EXIT-DEAD));pct=0;bites.fill(3);inner=localPose(pose);insideAlpha=1-u;rear=pose;state='ESCAPING';phase='DISAPPEARING BEHIND THE PHONE';}
 else if(t<RETURN){const u=(t-EXIT)/(RETURN-EXIT),recharge=smooth((u-.72)/.28);pct=100*recharge;fullness=recharge;if(recharge===0)bites.fill(3);if(u<.68)rear=pose;else front=pose;state=recharge>0?'RESTORING':headline?'HUNTING_HEADLINE':'CIRCLING';phase='STILL HUNGRY.';}
 else if(t<HEADLINE_END){titleFeed=headlineFeeding(t);front=pose=titleFeed.p;state='EATING_HEADLINE';phase='TEAR. CHEW. SWALLOW THE WORDS.';}
 else if(dumbphoneTarget&&t<DUMBPHONE){front=pose;state='HUNTING_DUMBPHONE';phase='TRY THE KEYPAD PHONE.';}
 else if(dumbphoneTarget&&t<DUMBPHONE_END){failedBite=dumbphoneFeeding(t);front=pose=failedBite.p;state='ATTEMPTING_DUMBPHONE';phase='TOO TOUGH TO CHEW.';}
 else if(dumbphoneTarget&&t<GIVE_UP_END){front=pose;state='GIVING_UP';phase='NOTHING TO EAT HERE.';}
 else{front=pose;state='RETURNING';phase='BACK THROUGH THE GLASS.';}
 if(headline){
  // Keep the phone empty until the fish is halfway through eating the title.
  if(t>=EXIT){
   const restoreAt=HEADLINE+(HEADLINE_END-HEADLINE)*.5;
   fullness=smooth((t-restoreAt)/.6);if(fullness===0)bites.fill(3);
  }
  if(t>=HEADLINE&&t<HEADLINE_END){titleRow=titleFeed.target.row;titlePiece=titleFeed.target.piece;titleQ=titleFeed.q}
  else if(t>=HEADLINE_END)titleRepair=0;
  else if(cycleNo>1&&t<REPAIR_END)titleRepair=clamp((t-REPAIR_START)/(REPAIR_END-REPAIR_START));
  headline.update({row:titleRow,piece:titlePiece,q:titleQ,repair:titleRepair});
 }
 if(f&&!f.turning)f.paper=paperBites.sample({card:f.target.card,piece:f.target.piece,q:f.q,grip:mouth(inner,jawClosure(f.q))});
 if(rear)fish(ctx,rear,t,.08,null,1);
 drawPhone(t,pct,fullness,bites,f,inner,insideAlpha);
 const titlePaper=titleFeed?.paper;
 if(titlePaper?.active)paperBites.draw(ctx,titlePaper,false);
 if(front)fish(ctx,front,t,failedBite?failedBite.closed:titleFeed?jawClosure(titleFeed.q):.08,titlePaper?.active?c=>paperBites.draw(c,titlePaper,false):null,frontAlpha);
 // A brief casing shudder follows each failed grip, then settles completely.
 if(dumbphone){
  const q=failedBite?.q??0,impact=smooth((q-.3)/.06)*(1-smooth((q-.64)/.16));
  const shake=Math.sin(q*TAU*5)*impact;
  dumbphone.style.transform=impact?`${dumbphoneTransform} translateX(${shake*1.3}px) rotate(${shake*.8}deg)`:dumbphoneTransform;
 }
 const currentPaper=f?.paper||titlePaper;
 stateSnapshot={time:t,cycle:cycleNo,phase:state,battery:Math.round(pct),bites:bites.slice(),headline:headline?{row:titleRow,piece:titlePiece,q:titleQ,repair:titleRepair,rows:headlineCards.length}:null,dumbphone:failedBite?{attempt:failedBite.attempt+1,attempts:DUMBPHONE_ATTEMPTS,q:failedBite.q,intact:true,contact:failedBite.contact}:null,jaw:f?jawClosure(f.q):failedBite?failedBite.closed:titleFeed?jawClosure(titleFeed.q):.08,paper:currentPaper?{phase:currentPaper.phase,attached:currentPaper.attached,visible:currentPaper.active,grip:currentPaper.grip}:null,layer:rear?'behind':inner?'screen':'front',playing,facing:pose.dir,position:{x:pose.x,y:pose.y},scale:pose.s,bank:pose.angle,turning:!!(f?.turning||titleFeed?.turning),hasFrontView:frontReady,turnFrameCount:turnSequence?.frameCount||0,turnFrame:turnSequence?turnSequence.frameForFacing(pose.dir):null,perspectiveRenderer:projector?.ready?'webgl':'canvas'};
}
function canAnimate(){return loaded&&playing&&inView&&!document.hidden&&!destroyed}
function renderElapsed(){
 let lap=Math.floor(elapsed/CYCLE),time=elapsed-lap*CYCLE;
 // Multiplying a fractional cycle duration can land just below the next lap.
 // Treat that floating-point residue as the same entry frame when seeking.
 if(CYCLE-time<1e-9){lap++;time=0}
 cycleNo=lap+1;render(time);
}
function schedule(){if(canAnimate()&&!frameId)frameId=requestAnimationFrame(tick)}
function tick(now){
 frameId=0;if(!canAnimate()){last=0;return}
 const dt=last?Math.min((now-last)/1000,.05):0;last=now;elapsed+=dt;
 renderElapsed();schedule();
}
function setPlaying(value){
 playing=value;last=0;if(!playing&&frameId){cancelAnimationFrame(frameId);frameId=0}
 if(loaded)renderElapsed();onPlaybackChange(playing);schedule();
}
function visibility(){last=0;if(document.hidden&&frameId){cancelAnimationFrame(frameId);frameId=0}else schedule()}
function motionChange(){setPlaying(!motionQuery.matches)}
document.addEventListener('visibilitychange',visibility);
motionQuery.addEventListener('change',motionChange);
const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);if(heading)resizeObserver.observe(heading);
if(dumbphone)resizeObserver.observe(dumbphone);
const intersectionObserver=new IntersectionObserver(entries=>{
 inView=entries[0].isIntersecting;last=0;
 if(!inView&&frameId){cancelAnimationFrame(frameId);frameId=0}else schedule();
});intersectionObserver.observe(canvas);
function boot(){
 if(destroyed||loaded||!image.complete||!image.naturalWidth||!frontSettled||!turnSettled||photosPending)return;
 rig();loaded=true;resize();render(0);onReady();onPlaybackChange(playing);schedule();
}
image.onload=boot;
frontImage.onload=()=>{frontReady=true;frontSettled=true;boot()};
image.onerror=()=>{if(!destroyed)onError()};
frontImage.onerror=()=>{frontReady=false;frontSettled=true;boot()};
turnImage.onload=()=>{
 if(destroyed)return;
 try{turnSequence=window.FuchsiafishTurnSequence?.create({image:turnImage,atlas:turnAtlas,frames:turnFrames,lure:true})||null}
 catch(error){turnSequence=null;console.warn('Fuchsiafish turn atlas could not be loaded.',error)}
 turnSettled=true;boot();
};
turnImage.onerror=()=>{turnSettled=true;boot()};
photoImages.forEach((photo,i)=>{
 const settle=ok=>{if(destroyed)return;photoReady[i]=ok;photosPending--;boot()};
 photo.onload=()=>settle(true);photo.onerror=()=>settle(false);
 photo.src=photoSrcs[i];
});
profilePhotoImages.forEach((photo,i)=>{
 const settle=ok=>{if(destroyed)return;profilePhotoReady[i]=ok;photosPending--;boot()};
 photo.onload=()=>settle(true);photo.onerror=()=>settle(false);
 photo.src=profilePhotoSrcs[i];
});
image.src=sideSrc;frontImage.src=frontSrc;if(turnSrc)turnImage.src=turnSrc;
return {
 get state(){return stateSnapshot},
 get timings(){return {FEED,END,DEAD,EXIT,RETURN,CYCLE,ITEMS,BITES,BITE,TURN,CARD,CONTACT,TEAR,SWALLOW,HEADLINE,HEADLINE_END,HEADLINE_TURN,REPAIR_START,REPAIR_END,DUMBPHONE,DUMBPHONE_END,DUMBPHONE_ATTEMPT,DUMBPHONE_ATTEMPTS,GIVE_UP_END}},
 pause(){setPlaying(false)},resume(){setPlaying(true)},toggle(){setPlaying(!playing)},
 seek(seconds){setPlaying(false);elapsed=Math.max(0,seconds);if(loaded)renderElapsed();return stateSnapshot},
 destroy(){destroyed=true;cancelAnimationFrame(frameId);resizeObserver.disconnect();intersectionObserver.disconnect();document.removeEventListener('visibilitychange',visibility);motionQuery.removeEventListener('change',motionChange);headline?.destroy();if(headline)canvas.style.width='';if(dumbphone){canvas.style.height='';dumbphone.style.transform=dumbphoneTransform}projector?.gl.getExtension('WEBGL_lose_context')?.loseContext()}
};
}};
