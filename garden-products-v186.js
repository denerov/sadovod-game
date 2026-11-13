import {WATER_SCENES} from './water-scenes-v196.js?v=196';
import {STAKHANOV_MONUMENT,STAKHANOV_SCENE} from './monument-v206.js?v=206';
import {FOUR_VIEW_GARDEN} from './garden-views-v188.js?v=188';
import {GARDEN_ATLASES} from './garden-atlases-v186.js';
export const GARDEN_PRODUCTS={};
export const GARDEN_SCENES={};
const sets=[
 ['pond', 'Растения пруда', ['Рогоз','Камыш','Кувшинка белая','Лотос розовый','Ирис болотный жёлтый','Ирис болотный фиолетовый','Папирус','Осока','Ситник цветущий','Эйхорния водная'],100,1,'water'],
 ['bridges','Мосты',['Деревянный мост','Зелёный парковый мост','Каменный арочный мост','Плетёный мост'],500,3,'bridge'],
 ['shore','Декор берега',['Камни с ромашками','Коряга с папоротником','Причал с фонарём','Каменный родник'],250,2,'shore'],
 ['flowerbeds','Цветники',['Донецкая красная роза','Ромашки','Тюльпаны','Пионы','Ирисы','Георгины','Астры','Хризантемы','Гортензии','Бархатцы','Маки','Васильки'],100,1,'land']
];
export function defineGardenAssets(atlases){for(const [group,label,names,cost,size,rule] of sets){const atlas=atlases[group];if(!atlas)continue;names.forEach((name,i)=>{const id=group+'_'+(i+1),crop=atlas.crops[i];GARDEN_PRODUCTS[id]={name,category:'decor',subcategory:group,cost,coal:null,size,canvasHeight:size===1?56:120,rotationLocked:true,placementRule:rule,description:label+'. '+name+' украшает вашу ферму. Выберите место и установите предмет.',icon:atlas.src};GARDEN_SCENES[id]={src:atlas.src,width:atlas.width,height:atlas.height,crop};});}}

defineGardenAssets(GARDEN_ATLASES);

for(const id of FOUR_VIEW_GARDEN)GARDEN_PRODUCTS[id].rotationLocked=false;

// Small decorative groups; preserve artwork proportions and owned positions.
for(const [id,d] of Object.entries(GARDEN_PRODUCTS)){
 d.renderScale=id.startsWith('pond_')?.45:id.startsWith('flowerbeds_')?.55:id.startsWith('shore_')?.60:.56;
}

Object.assign(GARDEN_SCENES,WATER_SCENES);
for(const [id,scene]of Object.entries(WATER_SCENES)){GARDEN_PRODUCTS[id].icon=scene.src;if(id.startsWith('shore_')){GARDEN_PRODUCTS[id].placementRule='land';GARDEN_PRODUCTS[id].allowedSurfaces=['grass','path','water'];}}
GARDEN_PRODUCTS.shore_1.name='Природные камни';
GARDEN_PRODUCTS.shore_1.description='Компактная группа природных камней без цветов и нарисованного берега. Можно поставить на суше или в воде.';
GARDEN_PRODUCTS.stakhanov_monument=STAKHANOV_MONUMENT;
GARDEN_SCENES.stakhanov_monument=STAKHANOV_SCENE;

Object.assign(GARDEN_PRODUCTS.shore_3,{name:'Деревянный причал',rotationLocked:false,renderScale:.72,description:'Низкий настил из деревянных досок на коротких сваях. Установите у берега, чтобы край настила выходил над водой. Четыре ракурса.'});
GARDEN_SCENES.shore_3={src:'https://sadovod-webgl-engine-test.ddenerov.chatgpt.site/assets/pier-v268/pier-0.webp',width:512,height:512};GARDEN_PRODUCTS.shore_3.icon=GARDEN_SCENES.shore_3.src;
