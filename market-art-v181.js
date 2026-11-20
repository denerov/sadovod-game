import {PARK_IDS} from './park-content-v181.js?v=189';
export const PARK_ART=Object.fromEntries(PARK_IDS.map(id=>[id,Array.from({length:4},(_,rotation)=>({src:`./assets/park-v181/${id==='curb_daisy'?'curb_limestone':id}-${rotation}.webp`,width:512,height:512}))]));
