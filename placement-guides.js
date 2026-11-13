import {CATALOG,groundPivot,EDGE_POSITIONS,isBridge,bridgeCells} from './decor-model.js?v=268';
import {cellIndex} from './land-model.js?v=182';
export function placementGuide(layer,o,cells){
 let guide=layer.querySelector('[data-placement-guide]');if(guide)guide.remove();
 if(!isBridge(o)&&!['edge-cell','center-grid'].includes(CATALOG[o.type]?.placement))return;
 const ns='http://www.w3.org/2000/svg',node=(tag,attrs)=>{const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
 guide=node('g',{'data-placement-guide':'','pointer-events':'none'});layer.insertBefore(guide,layer.firstElementChild);
 const point=(c,r)=>[384+(c-r)*32,(c+r)*16];
 if(isBridge(o)){for(const p of bridgeCells(o)){const surface=cells?.[cellIndex(p.column,p.row)],ok=!cells||['grass','path','water'].includes(surface),color=ok?'#e8cc77':'#ed7965';guide.append(node('polygon',{points:[[0,0],[1,0],[1,1],[0,1]].map(([c,r])=>point(p.column+c,p.row+r).join(',')).join(' '),fill:color,'fill-opacity':.12,stroke:color,'stroke-width':1.2}));}return;}
 if(CATALOG[o.type]?.placement==='center-grid'){const p=groundPivot(o),[cx,cy]=point(p.column,p.row);for(let y=0;y<2;y++)for(let x=0;x<2;x++)guide.append(node('polygon',{points:[[0,0],[.5,0],[.5,.5],[0,.5]].map(([c,r])=>point(o.column+x/2+c,o.row+y/2+r).join(',')).join(' '),fill:'none',stroke:'#fff1b9','stroke-width':.8}));guide.append(node('path',{d:`M${cx-4},${cy}h8 M${cx},${cy-4}v8`,stroke:'#ffdc69','stroke-width':1.2}));return;}
 guide.append(node('polygon',{points:[[0,0],[1,0],[1,1],[0,1]].map(([c,r])=>point(o.column+c,o.row+r).join(',')).join(' '),fill:'none',stroke:'#fff1b9','stroke-width':.8}));
 for(const position of Object.keys(EDGE_POSITIONS)){const p=groundPivot({...o,position,offsetX:undefined,offsetY:undefined,placementVersion:137}),[cx,cy]=point(p.column,p.row);guide.append(node('circle',{cx,cy,r:position===(o.position||'center')?2.1:1.3,fill:position===(o.position||'center')?'#ffdc69':'#fff4cc',opacity:.85}));}
}
