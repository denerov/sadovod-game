// Canonical Farmandia-compatible shop structure. The market and future
// content batches read the same identifiers instead of duplicating lists.
export const SHOP_SECTIONS=[
 ['all','Все товары','grid'],['seeds','Семена','grass'],['garden','Растения','garden-art'],
 ['animals','Животные','paw'],['structures','Здания','barn'],['factories','Производство','factory'],['decor','Декорации','flower'],
 ['land','Развитие','land'],['machines','Техника','tractor']
];
export const SEED_SECTIONS=[
 ['all','Все культуры','grass'],['fruit','Фрукты','apple'],['vegetable','Овощи','apple'],
 ['grain','Зерновые','wheat'],['flower','Цветы','flower'],['berry','Ягоды','berries'],
 ['oil','Масличные','sunflower'],['other','Прочее','grass']
];
export const SHOP_SUBSECTIONS={
 garden:[['trees','Деревья','garden-art'],['bushes','Кусты','bushes-art'],['vineyards','Виноградники','vineyards-art']],
 animals:[['livestock','Все животные','paw'],['feed','Корма','seedbag']],
 structures:[['houses','Дома','barn'],['storage','Хранилища','barn'],['sheds','Сараи','barn'],['factories','Фабрики','factory'],['greenhouses','Теплицы','garden-art'],['pens','Загоны','fence'],['other','Прочее','grid']],
 decor:[['pond','Растения пруда','flower'],['bridges','Мосты и причалы','barn'],['shore','Декор берега','flower'],['flowerbeds','Цветники','flower'],['curbs','Бордюры','fence'],['benches','Лавочки','barn'],['fences','Ограждения','fence'],['paving','Дорожки и плитка','grid'],['fountains','Фонтаны','barn'],['statues','Статуи','flower']],
 machines:[['equipment','Вся техника','tractor'],['fuel','Топливо','fuel']]
};

// Verified historical names awaiting individual approved art/game models.
// They are deliberately not purchasable with duplicated placeholder sprites.
export const FARMANDIA_ASSET_QUEUE={
 seeds:['Овёс','Тюльпаны','Розы','Незабудки','Женьшень','Белые кувшинки','Шиитаке'],
 plants:['Апельсиновое дерево','Лайм','Гранат','Кофейное дерево','Олива','Зелёный клён','Жёлтый клён','Красный клён','Ежевика'],
 animals:['Як','Бык','Лошадь','Павлин','Страус','Слон','Верблюд','Пегас','Единорог','Вьетнамская вислобрюхая свинья'],
 buildings:['Сыроварня','Вареньеварня','Маслобойня','Гриль','Кофейная фабрика','Фабрика попкорна','Фабрика духов','Суши-ресторан','Жемчужная фабрика','Теплица','Курятник','Инструментальный склад'],
};
export const FARMANDIA_CHAIN_TEMPLATES=[
 ['Пшеница','Мельница','Мука'],['Молоко','Сыроварня','Сыр'],['Помидоры','Кетчупная фабрика','Кетчуп'],
 ['Подсолнух','Маслобойня','Масло'],['Ягоды','Вареньеварня','Варенье'],['Виноград','Винодельня','Вино'],
 ['Кофейные зёрна','Кофейная фабрика','Кофе'],['Цветы','Фабрика духов','Духи']
];
