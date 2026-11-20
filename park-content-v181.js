// Approved park artwork and ruble prices (13 Oct 2026). New production balance remains pending.
const art=id=>`./assets/park-v181/${id==='curb_daisy'?'curb_limestone':id}-0.webp`;
const harvest=id=>`./assets/park-v181/harvest-${id}.webp`;
export const PARK_FENCE_NAMES={
 park_fence_white:'Белый штакетник',park_fence_iron:'Парковая ограда',park_fence_willow:'Ивовый плетень',
 park_fence_ranch:'Американское ранчо',park_fence_cedar:'Кедровый забор',park_fence_horizontal:'Шоколадный забор',
 park_fence_sage:'Шалфейная решётка',park_fence_botanical:'Кованый сад',park_fence_arched:'Усадебный забор',
 park_fence_lattice:'Медовая решётка',park_fence_stone:'Каменная усадьба'
};
export const PARK_CURB_NAMES={
 curb_daisy:'Светлый каменный бордюр',curb_limestone:'Светлый известняк',curb_brick:'Кирпичный бордюр',
 curb_granite:'Серый гранит',curb_riverstone:'Речной камень',curb_sandstone:'Тёплый песчаник',
 curb_slate:'Тёмный сланец',curb_rose_long:'Розово-серый бордюр',curb_rose_short:'Розовая мозаика'
};
export const PARK_BOUNDARIES=Object.fromEntries([
 ...Object.entries(PARK_FENCE_NAMES).map(([id,name])=>[id,{name,subcategory:'fences',description:`${name} отделяет тихий уголок сада от оживлённой фермы. Секции соединяются вдоль границ участка.`}]),
 ...Object.entries(PARK_CURB_NAMES).map(([id,name])=>[id,{name,subcategory:'curbs',description:id==='curb_daisy'?'Светлая каменная кромка для садовой дорожки.':'Прямой аккуратный бордюр обрамляет плитку и отделяет её от газона. Выберите материал под цвет своей дорожки.'}])
].map(([id,d])=>[id,{...d,cost:d.subcategory==='curbs'?50:500,coal:d.subcategory==='curbs'?1:2,size:1,canvasHeight:64,placement:'boundary',allowedSurfaces:['grass','path','soil','bed'],icon:art(id)}]));
const plants=[
 ['stakhanov_chestnut','Стахановский каштан',140,'chestnut','Высокий каштан с раскидистой кроной и белыми свечами цветков напоминает о прогулках по родному парку. Осенью среди листьев прячутся блестящие каштаны.'],
 ['autumn_maple','Осенний клён',100,'maple_sap','Оранжево-золотая крона согревает сад даже в прохладный день. Клён даёт сладкий кленовый сок.'],
 ['autumn_birch','Золотая берёза',130,'birch_sap','Стройный белый ствол и лёгкое кружево золотых листьев. Берёза поднимается над садом и дарит берёзовый сок.'],
 ['autumn_oak','Осенний дуб',110,'acorn','Могучий дуб укрывает землю медными листьями. Под широкой кроной созревают гладкие жёлуди в маленьких шапочках.'],
 ['autumn_rowan','Осенняя рябина',85,'rowan_berry','Невысокая рябина украшает сад янтарной листвой и яркими красными гроздьями. Её ягоды особенно красивы в осеннем урожае.'],
 ['raspberry','Малина',65,'raspberry','Душистые малиновые ягоды прячутся среди резных листьев. Летний вкус для будущих ягодных заготовок вашей фермы.']
];
export const PARK_PLANTS=Object.fromEntries(plants.map(([id,name,canvasHeight,harvestProduct,description])=>[id,{name,category:'trees',cost:id==='raspberry'?450:600,coal:null,level:1,size:1,canvasHeight,rotationLocked:false,icon:art(id),harvestProduct,productionPending:true,description}]));
export const PARK_DECOR={stakhanov_bench:{name:'Стахановская лавочка',category:'decor',subcategory:'benches',cost:800,coal:null,level:1,size:1,canvasHeight:40,rotationLocked:false,placement:'edge-cell',icon:art('stakhanov_bench'),description:'Зелёная деревянная лавочка с чёрным металлическим узором — знакомое место для неспешного отдыха в парке. Поставьте её у дорожки, под каштаном или напротив фонтана.'}};
export const PARK_GOODS=Object.fromEntries([['birch_sap','Берёзовый сок'],['maple_sap','Кленовый сок'],['acorn','Жёлуди'],['rowan_berry','Рябина'],['chestnut','Каштаны'],['raspberry','Малина']].map(([id,name])=>[id,{name,sale:null,icon:harvest(id)}]));
export const PARK_BERRY_COPY={black_currant:'Тёмные ароматные гроздья черной смородины созревают среди пышной зелени. Соберите насыщенный ягодный урожай для запасов и производства.',red_currant:'Рубиновые бусины красной смородины сверкают на тонких веточках. Куст снова радует урожаем после каждого сбора.',strawberry:'Крупные алые ягоды греются на солнце рядом с белыми цветками. Соберите спелую клубнику и дождитесь следующего летнего урожая.'};
export const PARK_IDS=[...Object.keys(PARK_BOUNDARIES),...Object.keys(PARK_PLANTS),...Object.keys(PARK_DECOR),...Object.keys(PARK_BERRY_COPY)];
