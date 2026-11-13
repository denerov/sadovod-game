// Approved 28 October render. No mirrored or invented reverse views.
export const STAKHANOV_MONUMENT={
 name:'Памятник А. Г. Стаханову',category:'decor',subcategory:'statues',
 cost:null,coal:60,level:1,size:1,canvasHeight:110,rotationLocked:true,
 placementRule:'land',icon:'https://sadovod-webgl-engine-test.ddenerov.chatgpt.site/assets/monument-v206/stakhanov.webp',
 description:'Памятник открыт 31 августа 1985 года в Стаханове и посвящён прославленному шахтёру-новатору. Он воздвигнут на площади в центре города: отлитый в бронзе молодой Алексей Стаханов широко шагает после трудовой смены с отбойным молотком на плече. Памятник был открыт в рамках празднования 50-летнего юбилея Стахановского движения.'
};
export const STAKHANOV_SCENE={src:STAKHANOV_MONUMENT.icon,width:1145,height:1374};
export const STAKHANOV_FRAMES=[{
 ...STAKHANOV_SCENE,rotation:0,anchorX:574,anchorY:1182,
 groundPolygon:[[208,1187],[558,1354],[941,1178],[591,1011]],
 hitPolygon:[[504,30],[632,27],[695,83],[646,121],[735,299],[812,463],[902,503],[868,563],[784,532],[746,853],[798,911],[852,1084],[941,1122],[941,1178],[558,1354],[208,1187],[208,1135],[321,1090],[362,903],[449,854],[450,423],[341,331],[334,258],[405,191],[491,165],[506,121]]
}];
