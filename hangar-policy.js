import {CATALOG} from './decor-model.js?v=268';
// Only portable decoration. Existing stored items remain withdrawable.
const loose=new Set(['bench','hay','scarecrow','stakhanov_bench','stakhanov_monument','grandma_soobes','shore_1','shore_2']);
export function canStoreInHangar(o){
 const d=CATALOG[o?.type];
 return !!d&&(d.placement==='boundary'||loose.has(o.type)||d.subcategory==='flowerbeds');
}
