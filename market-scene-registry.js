// Single source registry: previews, detail pages and shipping use this same map.
import {premiumScene} from './premium-v207.js?v=207';
import {GARDEN_SCENES} from './garden-products-v186.js?v=268';
import {PEN_SCENES} from './pen-designs-v183.js?v=207';
import {PRODUCT_SCENES} from './market-scenes-v155.js?v=182';
import {ANIMAL_SCENES} from './market-scenes-v158.js?v=182';
import {APPROVED_SCENES} from './market-scenes-v160.js?v=182';
import {RELEASE_SCENES} from './market-scenes-v165.js?v=190';
import {PARK_SCENES} from './market-scenes-v181.js?v=189';
import {PAVINGS} from './paving-model.js?v=207';
import {RECOVERED_SCENES} from './market-scenes-v196.js?v=196';
export const CURRENT_SCENES={...GARDEN_SCENES,...PEN_SCENES,...PRODUCT_SCENES,...ANIMAL_SCENES,...APPROVED_SCENES,...RELEASE_SCENES,...PARK_SCENES,...Object.fromEntries(Object.entries(PAVINGS).map(([id,d])=>[id,d.scene])),...RECOVERED_SCENES};
CURRENT_SCENES.pen_cow=PEN_SCENES.pen_cow;
for(const id of ['rim_workshop','pen_pigeon','pen_undyandyolik'])CURRENT_SCENES[id]=premiumScene(id);
CURRENT_SCENES.undy_fence={...premiumScene('fence')};
CURRENT_SCENES.rabbit={...CURRENT_SCENES.rabbit,src:'https://sadovod-webgl-engine-test.ddenerov.chatgpt.site/assets/market-v196/rabbit-source.webp'};
export function cardTemplate(id,kind){
 if(id.startsWith('pen_')||id==='beehive')return 'housing';
 if(kind==='Сад')return 'garden';
 if(kind==='Семена')return 'seeds';
 if(kind==='Животные')return 'animals';
 if(kind==='Фабрики')return 'factories';
 if(kind==='Техника')return 'machinery';
 return 'decor';
}
