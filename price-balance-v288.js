// One coherent price ladder. Premium-only goods keep coal; ordinary goods use rubles.
export const PRICE_OVERRIDES={
 tractor:{cost:45000,coal:12},seeder:{cost:75000,coal:20},combine:{cost:120000,coal:35},
 'wheat-mill':{cost:35000,coal:null},'ketchup-factory':{cost:55000,coal:null},winery:{cost:90000,coal:null},'dairy-factory':{cost:80000,coal:null},
 bakery:{cost:35000,coal:null},oil_press:{cost:60000,coal:null},jam_factory:{cost:85000,coal:null},mayonnaise_factory:{cost:125000,coal:null},juice_factory:{cost:95000,coal:null},cannery:{cost:145000,coal:null},lavender_distillery:{cost:130000,coal:null},china_set_2:{cost:45000,coal:null},tropical_set_3:{cost:65000,coal:null},kopanka:{cost:350000,coal:null},
 perfume_factory:{cost:null,coal:35},rim_workshop:{cost:null,coal:120},
 apple:{cost:1200},pear:{cost:4800},mandarin:{cost:2600},peach:{cost:6500},cherry:{cost:3400},apricot:{cost:5600},'sweet-cherry':{cost:8200},linden:{cost:9000},
 'white-hen':{cost:4000},'red-hen':{cost:7500},'dairy-cow':{cost:24000},duck:{cost:9000},swan:{cost:18000}
};
export function applyPriceBalance(catalog){for(const[id,price]of Object.entries(PRICE_OVERRIDES))if(catalog[id])Object.assign(catalog[id],price);return catalog}
