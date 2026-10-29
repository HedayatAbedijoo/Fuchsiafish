/* Exercise the real heading controller without a browser or network. */
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
for(const compact of [false,true]){
 const words=[],drawn=[];
 function span(){return {style:{},attributes:{},textContent:'',setAttribute(key,value){this.attributes[key]=value}}}
 for(const [i,text] of ['THE','FUCHSIA','FISH','ARE','COMING.'].entries()){
  const row=compact?i:i===0?0:i<3?1:2;
  const word={children:[],original:text,
   get textContent(){return this.children.length?this.children.map(g=>g.textContent).join(''):this.content},
   set textContent(value){this.content=value;this.children=[]},
   append(g){
    const n=this.children.length,x=(compact||i===0||i===1||i===3?20:i===2?160:90)+n*20;
    g.getBoundingClientRect=()=>({left:x,top:100+row*45,right:x+20,bottom:140+row*45,width:20,height:40});
    this.children.push(g);
   }};
  word.textContent=text;words.push(word);
 }
 const title={attributes:{},querySelectorAll(){return words},getAttribute(key){return this.attributes[key]??null},setAttribute(key,value){this.attributes[key]=value},removeAttribute(key){delete this.attributes[key]}};
 const sandbox={window:{},document:{createElement(kind){return kind==='span'?span():{getContext(){return {scale(){},measureText(){return {fontBoundingBoxAscent:32,fontBoundingBoxDescent:8}},fillText(char){drawn.push(char)}}}}}},
  getComputedStyle(){return {fontSize:'40px',fontWeight:'900',fontFamily:'sans-serif',color:'#ff65bf'}}};
 vm.runInNewContext(fs.readFileSync('assets/js/campaign/paper-bite.js','utf8'),sandbox);
 vm.runInNewContext(fs.readFileSync('assets/js/campaign/headline.js','utf8'),sandbox);
 const controller=sandbox.window.FuchsiafishHeadline.create(title),mapping={left:0,top:0,scale:.5};
 const cards=controller.measure(mapping),glyphs=words.flatMap(word=>word.children);
 assert.equal(cards.length,compact?5:3);assert.equal(drawn.join(''),'THEFUCHSIAFISHARECOMING.');
 assert.equal(cards.map(card=>card.dir).join(','),compact?'-1,1,-1,1,-1':'-1,1,-1');
 assert.equal(title.attributes['aria-label'],'THE FUCHSIAFISH ARE COMING.');
 assert(glyphs.every(g=>g.attributes['aria-hidden']==='true'));
 const opacity=g=>g.style.opacity===''?1:Number(g.style.opacity);
 let previous=glyphs.map(()=>0),partial=false;
 for(let repair=0;repair<=1.00001;repair+=.01){
  controller.update({repair});
  glyphs.forEach((g,i)=>{
   const value=opacity(g);assert(value>=previous[i]-1e-12,'Repair must only add ink');
   if(value>0&&value<1)partial=true;
   assert(value-previous[i]<.1,'Ink must rebuild smoothly');previous[i]=value;
  });
 }
 controller.update({repair:1});assert(glyphs.every(g=>opacity(g)===1&&g.style.clipPath===''&&g.style.transform===''));
 assert(partial,'Include visible intermediate repair states');
 for(let row=0;row<cards.length;row++){
  controller.update({row,piece:0,q:.4});
  const start=cards[row].dir===1?'polygon(100% 0%':'polygon(0% 0%';
  assert(cards[row].glyphs.every(g=>g.el.style.clipPath.startsWith(start)),'Match the remaining ink to the bite direction');
  assert(cards.slice(0,row).every(card=>card.glyphs.every(g=>opacity(g.el)===0)),'Previously eaten rows stay absent');
 }
 controller.update({row:cards.length-1,piece:2,q:1});assert(glyphs.every(g=>opacity(g)===0),'Eat all of the words');
 controller.update({repair:0});assert(glyphs.every(g=>opacity(g)===0),'Keep the heading absent during re-entry');
 const measuredAgain=controller.measure(mapping);assert.equal(measuredAgain.length,cards.length);
 controller.update({repair:.5});assert(glyphs.some(g=>opacity(g)>0&&opacity(g)<1));
 controller.destroy();assert.equal(words.map(w=>w.textContent).join(''),'THEFUCHSIAFISHARECOMING.');assert.equal(title.getAttribute('aria-label'),null);
 console.log(`PASS ${compact?'compact':'desktop'} heading: measured ink, progressive bites, smooth letter repair, resize and accessible cleanup`);
}
