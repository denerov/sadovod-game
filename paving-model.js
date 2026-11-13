import {PREMIUM_PAVING} from './premium-v207.js?v=207';
const names=['Кирпич ёлочкой','Песчаник','Старая брусчатка','Катушка','Классическая плитка','Ромб','Горняк — волна','Горняк — мозаика'];
const copies=['Тёплый кирпич, уложенный ёлочкой: уютная дорожка между домом и садом.','Светлый песчаник собирает солнечный свет и подчёркивает зелень сада.','Серая брусчатка веерами напоминает старые парковые аллеи.','Охристые и терракотовые фигурные камни складываются в спокойный, тёплый узор.','Ровные серые плиты для аккуратных аллей и площадок у построек.','Пыльно-розовые и светлые ромбы добавляют дорожкам мягкий геометрический рисунок.','Знакомая волнистая плитка в серо-розовых тонах — память о прогулках по парку.','Круги и фигурные вставки в серо-розовой гамме складываются в парковую мозаику.'];
const bounds=[[30,12,465,446],[534,12,470,446],[1043,12,465,446],[30,511,465,455],[534,511,470,455],[1043,511,465,455],[48,30,796,760],[931,30,799,760]];
export const PAVINGS=Object.freeze({...Object.fromEntries(names.map((name,i)=>['paving_'+(i+1),Object.freeze({name,cost:30,coal:null,description:copies[i],scene:{src:'https://sadovod-webgl-engine-test.ddenerov.chatgpt.site/assets/paving-v176/sheet-'+(i<6?'1-6':'7-8')+'.webp',width:i<6?1536:1774,height:i<6?1024:887,crop:bounds[i]}})])),paving_undy:PREMIUM_PAVING});
export const PAVING_KEY='sadovod-paving-v1';
export function cleanPaving(saved,cells){return Object.fromEntries(Object.entries(saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{}).filter(([i,id])=>/^\d+$/.test(i)&&cells[i]==='path'&&Object.hasOwn(PAVINGS,id)));}
// Validation and payment happen only at completion, never on selecting a card.
export function layPaving({id,index,cells,paving,spend,paint}){
 const d=PAVINGS[id];if(!d||!Number.isInteger(index)||index<0||!['grass','path'].includes(cells[index])||paving[index]===id)return false;
 if(!spend(d.cost))return false;
 try{if(!paint()){return {refund:d.cost};}paving[index]=id;return true;}catch(error){return {refund:d.cost,error};}
}
