/* Keep the real, accessible heading in the page; only its visible ink is bitten. */
'use strict';
window.FuchsiafishHeadline = { create(title) {
 const clamp=x=>Math.max(0,Math.min(1,x));
 const smooth=x=>{x=clamp(x);return x*x*x*(10+x*(-15+6*x))};
 const words=[...title.querySelectorAll('.title-the, .title-fish > span, .title-coming > span')];
 const originals=words.map(word=>word.textContent),glyphs=[];
 const originalLabel=title.getAttribute('aria-label');
 title.setAttribute('aria-label','THE FUCHSIAFISH ARE COMING.');
 for(const word of words){
  const content=word.textContent;word.textContent='';
  for(const char of content){
   const el=document.createElement('span');el.className='headline-glyph';el.textContent=char;el.setAttribute('aria-hidden','true');word.append(el);
   glyphs.push({el,char});
  }
 }
 let cards=[];
 function measure({left,top,scale}){
  // Clear animated transforms before measuring, including when resizing mid-bite.
  glyphs.forEach(g=>{g.el.style.transform='';g.el.style.clipPath='';g.el.style.opacity=''});
  const rows=[];
  for(const glyph of glyphs){
   const rect=glyph.el.getBoundingClientRect(),style=getComputedStyle(glyph.el);
   let row=rows.find(row=>Math.abs(row.top-rect.top)<Math.min(4,rect.height*.15));
   if(!row){row={top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right,glyphs:[]};rows.push(row)}
   row.left=Math.min(row.left,rect.left);row.right=Math.max(row.right,rect.right);row.bottom=Math.max(row.bottom,rect.bottom);
   row.glyphs.push({...glyph,rect,style});
  }
  rows.sort((a,b)=>a.top-b.top);
  cards=rows.map((row,i)=>{
   const w=(row.right-row.left)/scale,h=(row.bottom-row.top)/scale;
   const asset=document.createElement('canvas');asset.width=Math.ceil(w*2);asset.height=Math.ceil(h*2);
   const c=asset.getContext('2d');c.scale(2/scale,2/scale);
   for(const g of row.glyphs){
    const fontSize=parseFloat(g.style.fontSize);
    c.font=`${g.style.fontWeight} ${fontSize}px ${g.style.fontFamily}`;c.fillStyle=g.style.color;c.textBaseline='alphabetic';
    const m=c.measureText(g.char),ascent=m.fontBoundingBoxAscent??fontSize*.9,descent=m.fontBoundingBoxDescent??fontSize*.22;
    c.fillText(g.char,g.rect.left-row.left,g.rect.top-row.top+(g.rect.height-ascent-descent)/2+ascent);
   }
   return {i:20+i,x:(row.left-left)/scale,y:(row.top-top)/scale,w,h,asset,dir:i%2?1:-1,typography:true,glyphs:row.glyphs};
  });
  return cards;
 }
 function update({row=-1,piece=0,q=0,repair=1}){
  const paper=window.FuchsiafishPaperBite;
  cards.forEach((card,i)=>{
   const removed=row<0?3:i<row?3:i===row?piece+(q>.18?1:0):0;
   card.glyphs.forEach((g,k)=>{
    let opacity=1,transform='',clip='';
    if(row<0){
     // Stagger both rows and letters. Each glyph grows out of its surviving
     // baseline and gains ink gradually, rather than flashing the title on.
     const delay=.42*(i+.65*k/Math.max(1,card.glyphs.length-1))/(Math.max(1,cards.length-1)+.65);
     const u=smooth((repair-delay)/.55);opacity=u;
     if(u<1){clip=`inset(${(1-u)*100}% 0 0 0)`;transform=`translateY(${(1-u)*3}px)`}
    }else if(removed>=3){opacity=0}
    else if(removed>0){
     const origin=g.rect.left-card.glyphs[0].rect.left,width=g.rect.width;
     const points=[];
     // Use the same torn seam as the textured flap held between the teeth.
     points.push(card.dir===1?'100% 0%':'0% 0%');
     for(let n=0;n<=12;n++){
      const edge=paper.edge(card,removed,n/12)/card.w*(card.glyphs.at(-1).rect.right-card.glyphs[0].rect.left);
      points.push(`${clamp((edge-origin)/width)*100}% ${n/12*100}%`);
     }
     points.push(card.dir===1?'100% 100%':'0% 100%');clip=`polygon(${points.join(',')})`;
    }
    g.el.style.opacity=opacity===1?'':String(opacity);g.el.style.clipPath=clip;g.el.style.transform=transform;
   });
  });
 }
 return {measure,update,destroy(){words.forEach((word,i)=>{word.textContent=originals[i]});if(originalLabel===null)title.removeAttribute('aria-label');else title.setAttribute('aria-label',originalLabel)}};
}};
