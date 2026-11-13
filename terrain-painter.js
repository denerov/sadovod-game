import {shoreSections} from './shore-geometry.js?v=182';
import {contour} from './terrain-geometry.js?v=237';
import {landBoundary,cellColumn,cellRow} from './land-model.js?v=182';
import {roundedBed} from './terrain-details.js?v=182';
import {terrainTiles,edgePoints as tileEdgePoints} from './terrain-autotile.js?v=242';
import {turfCutGeometry,turfCastGeometry} from './path-surface.js?v=278';
const W=3072,H=1536,LEFT=-1152;
function pattern(ctx,image,width,height,matrix){const p=ctx.createPattern(image,'repeat');p.setTransform(new DOMMatrix(matrix||[width/image.width,0,0,height/image.height,0,0]));return p}
function seedNoise(x,y,s=0){let n=(Math.imul(Math.round(x*19)+s,374761393)^Math.imul(Math.round(y*23)-s,668265263))>>>0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295}
function edgePoints(d,spacing=1.65){const out=[],parts=d.match(/[MLQCZ][^MLQCZ]*/g)||[];let p=[0,0],start=[0,0],carry=0;const line=end=>{const a=[...p],dx=end[0]-a[0],dy=end[1]-a[1],len=Math.hypot(dx,dy)||1;let at=spacing-carry;while(at<len){out.push([a[0]+dx*at/len,a[1]+dy*at/len]);at+=spacing}carry=Math.max(0,len-(at-spacing));p=end};for(const part of parts){const t=part[0],v=(part.slice(1).match(/-?\d*\.?\d+/g)||[]).map(Number);if(t==='M'){p=[v[0],v[1]];start=[...p];carry=0}else if(t==='L')line([v[0],v[1]]);else if(t==='Z')line(start);else{const a=[...p],end=v.slice(-2),steps=Math.max(4,Math.ceil(Math.hypot(end[0]-a[0],end[1]-a[1])/1.6));for(let i=1;i<=steps;i++){const q=i/steps,u=1-q;if(t==='Q')line([u*u*a[0]+2*u*q*v[0]+q*q*v[2],u*u*a[1]+2*u*q*v[1]+q*q*v[3]]);else line([u*u*u*a[0]+3*u*u*q*v[0]+3*u*q*q*v[2]+q*q*q*v[4],u*u*u*a[1]+3*u*u*q*v[1]+3*u*q*q*v[3]+q*q*q*v[5]])}}}return out}
// Traverse the same closed contours for the soil, turf and shallow water.
// Offsets follow the local inward normal, including holes and concave turns.
function rim(loops,offset){const path=new Path2D();for(const loop of loops){loop.forEach((p,i)=>{const n=offset(p);path[i?'lineTo':'moveTo'](p.x+p.nx*n,p.y+p.ny*n)});path.closePath()}return path}
// Farmandia uses broad, calm erosion lobes.  Never use cell-sized teeth here.
const wave=p=>Math.sin(p.x*.045+p.y*.031)*.72+Math.sin(p.y*.082-p.x*.057)*.31;
export class TerrainPainter{
 constructor(images,makeCanvas){this.images=images;this.buffer=makeCanvas();this.tiles=new Map();this.turfSource=null}
 turfMaterial(){
  if(this.turfSource||!this.images.turfCut)return this.turfSource;
  const image=this.images.turfCut,canvas=document.createElement('canvas');canvas.width=image.naturalWidth||image.width;canvas.height=image.naturalHeight||image.height;
  const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);const rgba=c.getImageData(0,0,canvas.width,canvas.height).data,edge=[];
  for(let x=0;x<canvas.width;x++){let y=canvas.height-1;while(y>0&&rgba[(y*canvas.width+x)*4+3]<180)y--;edge.push(y)}
  return this.turfSource={image,edge};
 }
 paintedTurf(ctx,d,{front=false,soil=true}={}){
  const material=this.turfMaterial();if(!material||!d)return;const {image,edge}=material,scale=52/768;ctx.save();
  for(const loop of shoreSections(d))for(let i=0;i<loop.length-1;i++){
   const p=loop[i],q=loop[i+1],length=Math.hypot(q.x-p.x,q.y-p.y);if(length<.001)continue;
   const tx=(q.x-p.x)/length,ty=(q.y-p.y)/length,face=front?Math.abs(tx):tx;if(face<=.12)continue;
   const sourceWidth=Math.max(2,Math.min(image.width-2,Math.ceil((length+.16)/scale))),available=Math.max(1,image.width-sourceWidth-1);
   const sourceX=((Math.round((p.x*3.7+p.y*2.1)/scale)%available)+available)%available,sourceY=edge[sourceX]||image.height-1,sourceTop=Math.max(0,sourceY-23);
   ctx.save();ctx.globalAlpha=Math.min(1,(face-.12)*3);ctx.transform(tx,ty,0,1,p.x,p.y);const cropHeight=soil?37:17,top=soil?-23:-17;
   ctx.drawImage(image,sourceX,sourceTop,sourceWidth,Math.min(cropHeight,image.height-sourceTop),-.08,top*scale,length+.16,cropHeight*scale);ctx.restore();
  }
  ctx.restore();
 }
prepare(cells){this.landPath=new Path2D(landBoundary(cells));this.roadD=contour(cells,'path');this.waterD=contour(cells,'water');const banks=shoreSections(this.waterD),roads=shoreSections(this.roadD);this.roadTiles=terrainTiles(cells,'path');this.waterTiles=terrainTiles(cells,'water');this.roadEdge=new Path2D(this.roadD||'');this.waterEdge=new Path2D(this.waterD||'');this.roadEarth=rim(roads,p=>.65+wave(p)*.18);this.roadPath=rim(roads,p=>1.45+wave(p)*.32);this.roadCore=rim(roads,p=>3.1+wave(p)*.46);this.roadFringe=tileEdgePoints(this.roadTiles).filter(p=>seedNoise(p.x,p.y,551)>.06);this.waterSoil=rim(banks,p=>.72+wave(p)*.18);this.waterPath=rim(banks,p=>1.7+wave(p)*.3+p.depth*.025);this.waterFringe=tileEdgePoints(this.waterTiles).filter(p=>seedNoise(p.x,p.y,751)>.08);this.waterStones=tileEdgePoints(this.waterTiles).filter(p=>seedNoise(p.x,p.y,991)>.94);this.shelves=Array.from({length:5},(_,i)=>rim(banks,p=>1.7+wave(p)*.3+p.depth*.025+(i+1)/5*(2.7+.25*Math.sin(p.x*.04+p.y*.07))));this.beds=[];cells.forEach((type,i)=>{if(type!=='bed')return;const c=cellColumn(i),r=cellRow(i),path=new Path2D(roundedBed(c,r)),clods=[];for(let j=0;j<22;j++){const u=.12+seedNoise(c*31+j,r*37-j,4101)*.76,v=.12+seedNoise(c*41-j,r*29+j,4201)*.76,x=384+(c+u-r-v)*32,y=(c+u+r+v)*16,s=.45+seedNoise(c*23+j,r*17+j,4301)*.72;clods.push([x,y,s,seedNoise(c+j,r-j,4401)])}this.beds.push({path,clods})})}
 fineGrass(ctx,points,wet=false){ctx.save();ctx.lineCap='round';for(const point of points){const x0=Array.isArray(point)?point[0]:point.x,y0=Array.isArray(point)?point[1]:point.y,n=seedNoise(x0,y0,wet?71:31),gap=seedNoise(x0,y0,wet?179:173);if(n<.15||gap<.08)continue;const nx=Array.isArray(point)?0:point.nx,ny=Array.isArray(point)?0:point.ny,tuft=n>.78?3:n>.52?2:1;for(let k=0;k<tuft;k++){const side=(k-(tuft-1)/2)*.32,x=x0-nx*(.22+n*.28)+ny*side,y=y0-ny*(.22+n*.28)-nx*side,h=1.55+n*1.65+k*.12,lean=(seedNoise(x+k*7,y-k*5,47)-.5)*.58;ctx.strokeStyle=n>.72?(wet?'#31953a':'#45a23f'):(wet?'#176b28':'#1d7229');ctx.globalAlpha=.68+n*.27;ctx.lineWidth=.12+seedNoise(x,y,83)*.09;ctx.beginPath();ctx.moveTo(x,y+.05);ctx.quadraticCurveTo(x+lean*.18,y-h*.48,x+lean,y-h);ctx.stroke()}}ctx.restore()}
 reliefGrass(ctx,points,wet=false){ctx.save();ctx.lineCap='round';for(const p of points){const n=seedNoise(p.x,p.y,wet?701:501),count=n>.72?2:1;for(let k=0;k<count;k++){const q=seedNoise(p.x+k*13,p.y-k*17,wet?733:533),side=(k-(count-1)/2)*.36,x=p.x-p.nx*(.04+q*.28)+p.ny*side,y=p.y-p.ny*(.04+q*.28)-p.nx*side,h=.58+q*1.08,lean=(seedNoise(x,y,wet?719:519)-.5)*.42;ctx.strokeStyle=wet?(q>.6?'#3c963e':'#1c6c2a'):(q>.6?'#3f9638':'#1d7128');ctx.globalAlpha=.62+q*.28;ctx.lineWidth=.11+q*.09;ctx.beginPath();ctx.moveTo(x,y+.08);ctx.quadraticCurveTo(x+lean*.2,y-h*.55,x+lean,y-h);ctx.stroke()}}ctx.restore()}
 bankStones(ctx){ctx.save();for(const p of this.waterStones){const n=seedNoise(p.x,p.y,1007),x=p.x-p.nx*(1.35+n*.65),y=p.y-p.ny*(1.35+n*.65),rx=.28+n*.42,ry=rx*(.38+.18*n);ctx.fillStyle='rgba(60,65,46,.38)';ctx.beginPath();ctx.ellipse(x,y+.16,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(181,173,129,.52)';ctx.beginPath();ctx.ellipse(x-.08,y,rx*.72,ry*.62,0,0,Math.PI*2);ctx.fill()}ctx.restore()}
 draw(cells,view){
  const started=performance.now(),width=Math.round(view.width*view.dpr),height=Math.round(view.height*view.dpr);
  if(this.buffer.width!==width||this.buffer.height!==height){this.buffer.width=width;this.buffer.height=height}
  const ctx=this.buffer.getContext('2d'),grass=this.images.grass,road=this.images.road,water=this.images.water;
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);ctx.save();
  ctx.setTransform(view.scale*view.dpr,0,0,view.scale*view.dpr,view.x*view.dpr,view.y*view.dpr);
  // The same world grid continues beyond the owned land, aligned during zoom/pan.
  const left=-view.x/view.scale,top=-view.y/view.scale,right=(view.width-view.x)/view.scale,bottom=(view.height-view.y)/view.scale;
  ctx.fillStyle='#143d24';ctx.fillRect(left,top,right-left,bottom-top);
  const corners=[[left,top],[right,top],[left,bottom],[right,bottom]];
  const columns=corners.map(([x,y])=>(x-384)/64+y/32),rows=corners.map(([x,y])=>y/32-(x-384)/64);
  const c0=Math.floor(Math.min(...columns))-1,c1=Math.ceil(Math.max(...columns))+1,r0=Math.floor(Math.min(...rows))-1,r1=Math.ceil(Math.max(...rows))+1;
  const point=(c,r)=>[384+(c-r)*32,(c+r)*16];
  ctx.beginPath();
  for(let c=c0;c<=c1;c++){ctx.moveTo(...point(c,r0));ctx.lineTo(...point(c,r1))}
  for(let r=r0;r<=r1;r++){ctx.moveTo(...point(c0,r));ctx.lineTo(...point(c1,r))}
  ctx.strokeStyle='rgba(174,200,133,.10)';ctx.lineWidth=.55;ctx.stroke();
  ctx.clip(this.landPath);
  // Texture is sampled from the supplied Farmandia reference and mirrored into
  // a seamless material; geometry and all interactions remain fully dynamic.
  // Keep the approved blades at a readable native scale. The old 54-unit tile
  // downsampled them into green noise on phones.
  // Dense fine lawn: no oversized repeating carpet motif at close zoom.
  // 82 world units made the accepted grass look like one enlarged carpet at
  // close zoom. Keep individual short blades readable while retaining enough
  // variation that the repeat cannot be seen as a tile grid.
  const lawn=pattern(ctx,grass,52,52);ctx.fillStyle='#238b23';ctx.fillRect(LEFT,0,W,H);ctx.fillStyle=lawn;ctx.fillRect(LEFT,0,W,H);
  const {roadD,waterD}=this;
  for(const bed of this.beds){ctx.save();ctx.fillStyle='rgba(36,31,19,.22)';ctx.translate(0,.55);ctx.fill(bed.path);ctx.translate(0,-.55);ctx.fillStyle=pattern(ctx,this.images.soil,34,25);ctx.fill(bed.path);ctx.clip(bed.path);for(const [x,y,s,n] of bed.clods){ctx.fillStyle=`rgba(42,31,20,${.28+n*.22})`;ctx.beginPath();ctx.ellipse(x,y+.15,s*1.18,s*.48,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=`rgba(136,97,56,${.18+n*.2})`;ctx.beginPath();ctx.ellipse(x-.12,y-.08,s*.74,s*.24,0,0,Math.PI*2);ctx.fill()}ctx.restore()}
  if(roadD){const path=this.roadEdge;
   // A real cut through the lawn: soft shadow, exposed soil, compacted sand,
   // then irregular blades overlap the edge again.
   ctx.save();ctx.strokeStyle='rgba(62,45,25,.48)';ctx.lineWidth=1.35;ctx.stroke(this.roadEdge);ctx.restore();
   ctx.save();ctx.clip(this.roadEarth,'evenodd');ctx.fillStyle='rgba(91,69,38,.42)';ctx.fillRect(LEFT,0,W,H);ctx.restore();
   ctx.save();ctx.clip(path,'evenodd');ctx.fillStyle='#b5a17b';ctx.fillRect(LEFT,0,W,H);ctx.fillStyle=pattern(ctx,road,56,56);ctx.fillRect(LEFT,0,W,H);ctx.restore();
   ctx.save();ctx.clip(this.roadCore,'evenodd');ctx.globalAlpha=.07;ctx.fillStyle='#efd7a4';ctx.fillRect(LEFT,0,W,H);ctx.restore();
   const relief=turfCutGeometry(roadD),cast=turfCastGeometry(roadD);
   ctx.save();ctx.clip(path,'evenodd');ctx.fillStyle='rgba(32,36,22,.09)';ctx.fill(new Path2D(cast.penumbra));ctx.fillStyle='rgba(36,40,25,.14)';ctx.fill(new Path2D(cast.umbra));ctx.restore();
   relief.shadows.forEach((d,i)=>{ctx.save();ctx.strokeStyle='#3e3320';ctx.globalAlpha=[.14,.085,.04][i];ctx.lineWidth=.65;ctx.stroke(new Path2D(d));ctx.restore()});
   relief.faces.forEach((d,i)=>{ctx.save();ctx.fillStyle=['#46602a','#51612d','#636339'][i];ctx.globalAlpha=.45;ctx.fill(new Path2D(d));ctx.restore()});
   ctx.save();ctx.strokeStyle='#267a24';ctx.globalAlpha=.8;ctx.lineWidth=.25;ctx.stroke(new Path2D(relief.lip));ctx.restore();
   this.paintedTurf(ctx,roadD);this.fineGrass(ctx,this.roadFringe,false);
  }
  if(waterD){const path=this.waterEdge;
   // The base lawn remains visible between the logical water cells and the inset water.
   // This is the variable-width living bank used by paths, beds and water alike.
   // A narrow soil shadow lives underneath the turf. It is irregular and soft,
   // not a graphic outline; this is what gives the Farmandia bank its depth.
   ctx.save();ctx.strokeStyle='rgba(61,43,25,.6)';ctx.lineWidth=1.6;ctx.stroke(this.waterEdge);ctx.restore();
   ctx.save();ctx.clip(this.waterSoil,'evenodd');ctx.fillStyle='rgba(78,58,33,.58)';ctx.fillRect(LEFT,0,W,H);ctx.restore();
   ctx.save();ctx.clip(path,'evenodd');
   // Calm Farmandia water: not neon blue and not an opaque sticker. The turf
   // underlay softly influences the shallow edge; only the centre reaches the
   // full blue value. Underwater decoration can later be composited between
   // the shallow and surface passes without changing this geometry.
   ctx.fillStyle='#1899c2';ctx.fillRect(LEFT,0,W,H);if(water){ctx.fillStyle=pattern(ctx,water,192,192);ctx.fillRect(LEFT,0,W,H)}
   // Exact shallow-water treatment from the accepted SVG renderer: four calm
   // translucent strokes clipped inside the real water contour.
   ctx.strokeStyle='#8abfb0';for(const width of [5.2,3.8,2.4,1.2]){ctx.globalAlpha=.075;ctx.lineWidth=width;ctx.stroke(path)}ctx.globalAlpha=1;
   ctx.restore();ctx.save();ctx.strokeStyle='rgba(80,100,58,.46)';ctx.lineWidth=.2;ctx.stroke(path);ctx.restore();this.paintedTurf(ctx,waterD,{front:true,soil:false});this.bankStones(ctx);this.fineGrass(ctx,this.waterFringe,true);
  }
  ctx.restore();
  // The visible canvas is drawn once, at device resolution.
  return {waterD,renderMs:performance.now()-started};
 }
}
