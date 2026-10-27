# 🎨 Повний Каталог Промптів для Генерації Візуалу Гри («Хроніки Граней»)

Усі промпти нижче написані в **єдиному візуальному стилі** (Dark Fantasy Stylized 2D RPG Art — саме як на вашому скріншоті інвентарю).
Коли згенеруєте зображення — просто закиньте їх у папку `ГРА/assets/` (якщо десь потрібно вирізати фон під прозорий PNG для персонажів на сцені — я зроблю це автоматично скриптом).

---

## 1. ФОНИ ЗАСТОСУНКУ ТА ЛОКАЦІЙ (5 шт.)

> **Важливо для локацій (№2–5):** У промптах спеціально закладено вільну темну підлогу/землю в нижній частині кадру (`clear empty foreground floor for 2D characters`), щоб наші анімовані герої та NPC ідеально стояли на сцені!

### 1.1. Головний фон Меню / Вітрини пригод та Лобі (`bg_menu_hub.jpg` — вертикальний `9:16`)
```text
Dark fantasy mobile RPG vertical background, ancient stone table in a dimly lit mystic hall, glowing golden runes carved into dark wood, warm candlelight on the edges, deep dark slate shadows in the center for UI cards, stylized 2D digital painting, rich atmosphere, no text, no characters --ar 9:16
```

### 1.2. Локація Акту I: Старий Шлях / Тихе Перехрестя (`loc_crossroads.jpg` — горизонтальний `16:9` для верхнього екрана гри)
```text
2D side-view RPG battle stage background, dark fantasy nighttime crossroads before an old wooden tavern in the distance, glowing iron lantern on a wooden post, misty blue moonlight, flat clear cobblestone ground in the foreground for 2D game characters to stand on, stylized digital art, no characters, no text --ar 16:9
```

### 1.3. Локація Акту II: Засмолена Корчма «Іржавий Ліхтар» (`loc_tavern.jpg` — `16:9`)
```text
2D side-view RPG game stage background, interior of a medieval dark fantasy tavern at night, warm fireplace in the back wall, wooden barrels and tables in the background, clear wide wooden floor in the foreground for 2D characters to stand on, moody amber lighting and dark shadows, stylized digital painting, no characters --ar 16:9
```

### 1.4. Локація Акту III: Вовча Стежка та Рунічні Двері Вежі (`loc_forest_gate.jpg` — `16:9`)
```text
2D side-view RPG game stage background, dark misty forest ravine leading to an ancient stone tower gate with glowing cyan runes, twisted trees and glowing mushrooms in background, flat clear rocky path in the foreground for 2D characters to stand on, stylized dark fantasy art, no characters --ar 16:9
```

### 1.5. Локація Акту IV: Тронна Зала Розколотої Печаті / Зала Боса (`loc_boss_hall.jpg` — `16:9`)
```text
2D side-view RPG boss arena background, ancient gothic stone hall inside a dark tower, burning braziers with crimson and golden fire, stone pillars, obsidian altar in the background, wide flat stone floor in the foreground for 2D characters to stand on, epic dark fantasy digital painting, no characters --ar 16:9
```

---

## 2. ПЕРСОНАЖІ ГРАВЦІВ (6 ГЕРОЇВ НА ВИБІР — пропорція `1:1` або `3:4`)

> **Порада:** Усі персонажі генеруються в повний зріст або до колін на темному однотонному фоні (`isolated on solid dark charcoal background`), щоб вони круто виглядали і в картках вибору, і як живі анімовані фігурки на верхній сцені гри.

### 2.1. Герой 1 — Северин «Вовче Око» (Майстер Клинка та Слідопит) — `hero_1_severyn.png`
```text
Stylized 2D dark fantasy RPG character sprite, battle-hardened male ranger warrior standing in 3/4 view facing right, wolf pelt cloak over dark leather cuirass, holding a gleaming steel saber sword, scar on eyebrow, isolated on solid dark charcoal background, clean silhouette, high detail game art --ar 1:1
```

### 2.2. Герой 2 — Ліра «Шепіт Тіней» (Лазутчиця та Зломниця) — `hero_2_lyra.png`
```text
Stylized 2D dark fantasy RPG character sprite, agile female rogue assassin standing in 3/4 view facing right, dark hooded cloak with purple trim, leather armor, holding a dark steel dagger and silver lockpicks, isolated on solid dark charcoal background, clean silhouette, high detail game art --ar 1:1
```

### 2.3. Герой 3 — Соломія з Чорного Лісу (Знахарка та Заклинателька Птахів) — `hero_3_solomia.png`
```text
Stylized 2D dark fantasy RPG character sprite, young female forest mystic healer standing in 3/4 view facing right, embroidered dark green cloak, raven perched on her shoulder, holding a silver herbalist sickle and glowing lantern, isolated on solid dark charcoal background, clean silhouette, game art --ar 1:1
```

### 2.4. Герой 4 — Марко «Грім» (Інженер-Алхімік та Підривник) — `hero_4_marko.png`
```text
Stylized 2D dark fantasy RPG character sprite, rugged male alchemist engineer standing in 3/4 view facing right, brass goggles on forehead, riveted leather apron, holding a heavy double-barreled flintlock pistol and glowing alchemical bomb, isolated on solid dark charcoal background, clean silhouette, game art --ar 1:1
```

### 2.5. Герой 5 — Корнелій Златоуст (Дипломат та Ілюзіоніст) — `hero_5_korneliy.png`
```text
Stylized 2D dark fantasy RPG character sprite, charismatic nobleman illusionist standing in 3/4 view facing right, ornate dark velvet coat with gold embroidery, holding a gilded rapier sword and a royal scroll with red wax seal, isolated on solid dark charcoal background, clean silhouette, game art --ar 1:1
```

### 2.6. Герой 6 — Гордій «Скеля» (Важкий Щитоносець) — `hero_6_hordiy.png`
```text
Stylized 2D dark fantasy RPG character sprite, powerful heavy defender warrior standing in 3/4 view facing right, heavy steel plate armor and massive iron bastion shield, holding a blacksmith warhammer, isolated on solid dark charcoal background, clean silhouette, high detail game art --ar 1:1
```

---

## 3. NPC, МАСОВКА, ВОРОГИ ТА ОБ'ЄКТИ СЦЕНИ (5 шт. — стоять справа на сцені, дивляться вліво)

### 3.1. ШІ-Майстер Гри — Хранитель Хронік (для чату і заставки) — `gm_chronicler.png`
```text
Stylized 2D dark fantasy portrait of a mysterious Game Master chronicler, hooded figure with glowing amber eyes and ornate bronze half-mask, holding an ancient book with floating golden dice runes, isolated on dark background, RPG game art --ar 1:1
```

### 3.2. Корчмар Омелян (Мирний NPC-інформатор) — `npc_innkeeper.png`
```text
Stylized 2D dark fantasy RPG character sprite, medieval bearded tavern innkeeper standing in 3/4 view facing left, holding a wooden mug of ale and wiping cloth, leather apron, warm expression, isolated on solid dark charcoal background, clean silhouette, game art --ar 1:1
```

### 3.3. Відвідувачі Корчми / Селяни (Нейтральна Масовка) — `npc_crowd.png`
```text
Stylized 2D dark fantasy RPG character group sprite, two medieval townsfolk villagers standing together facing left, cloaks and rustic clothes, one holding a lantern and another a wooden staff, neutral expression, isolated on solid dark charcoal background, clean silhouette, game art --ar 1:1
```

### 3.4. Зграя Сірих Вовків (Лісові Хижаки) — `enemy_wolves.png`
```text
Stylized 2D dark fantasy RPG creature sprite, ferocious alpha grey wolf with glowing yellow eyes standing in aggressive pose facing left, dark fur, isolated on solid dark charcoal background, clean silhouette, high detail game art --ar 1:1
```

### 3.5. Бос Пригоди — Командор Морґан — `boss_morgan.png`
```text
Stylized 2D dark fantasy RPG boss sprite, imposing dark knight commander standing in 3/4 view facing left, black steel armor with crimson cape and horned helmet, holding a glowing cursed greatsword and dark shield, isolated on solid dark charcoal background, clean silhouette, game art --ar 1:1
```

---

## 4. ВСІ ПРЕДМЕТИ ІНВЕНТАРЮ ТА ЕКІПІРОВКИ (18 шт. — точно під ваш скріншот інвентарю `1:1`)

> Усі предмети мають єдиний хвіст промпта: `stylized 2D RPG inventory icon, hand-painted game art style, isolated on dark slate blue-grey background (#151d28), no frame, no text --ar 1:1`

### Категорія «Предмети та Зброя» (Items & Equipment):
1. **Сталевий меч (`item_sword.png`):**
   ```text
   Steel broadsword with leather-wrapped hilt and brass crossguard, diagonal composition, gleaming metallic blade, stylized 2D RPG inventory icon, hand-painted game art style, isolated on dark slate blue-grey background, no frame, no text --ar 1:1
   ```
2. **Клинок Срібного Полум'я / Рідкісний меч (`item_flame_sword.png`):**
   ```text
   Ornate silver saber sword with glowing golden-orange runes along the blade, diagonal composition, stylized 2D RPG inventory icon, hand-painted game art style, isolated on dark slate blue-grey background, no frame, no text --ar 1:1
   ```
3. **Двоствольний Пістоль Інженера (`item_pistol.png`):**
   ```text
   Fantasy flintlock double-barreled pistol with brass gears and wooden grip, diagonal composition, stylized 2D RPG inventory icon, hand-painted game art style, isolated on dark slate blue-grey background, no frame, no text --ar 1:1
   ```
4. **Зілля Ясного Розуму — Синя колба (`item_potion_blue.png`):**
   ```text
   Round glass potion bottle filled with glowing blue magical liquid and cork stopper, bubbles and light reflection, stylized 2D RPG inventory icon, hand-painted game art style, isolated on dark slate blue-grey background, no frame, no text --ar 1:1
   ```
5. **Еліксир Життєвої Сили — Червона колба (`item_potion_red.png`):**
   ```text
   Round glass potion bottle filled with glowing crimson red healing liquid and cork stopper, glossy glass reflection, stylized 2D RPG inventory icon, hand-painted game art style, isolated on dark slate blue-grey background, no frame, no text --ar 1:1
   ```
6. **Сувій Таємного Шляху (`item_scroll.png`):**
   ```text
   Rolled ancient parchment scroll tied with a cord and sealed with red wax, diagonal composition, stylized 2D RPG inventory icon, hand-painted game art style, isolated on dark slate blue-grey background, no frame, no text --ar 1:1
   ```
7. **Срібні Відмички (`item_lockpicks.png`):**
   ```text
   Set of ornate silver thief lockpicks and a skeleton key on a ring, metallic shine, stylized 2D RPG inventory icon, hand-painted game art style, isolated on dark slate blue-grey background, no frame, no text --ar 1:1
   ```
8. **Шкіряний Кирас / Броня (`item_armor.png`):**
   ```text
   Dark brown reinforced leather chest armor cuirass with steel buckles and shoulder pads, stylized 2D RPG inventory icon, hand-painted game art style, isolated on dark slate blue-grey background, no frame, no text --ar 1:1
   ```
9. **Бастіонний Щит (`item_shield.png`):**
   ```text
   Heavy iron heater shield with brass rim and engraved wolf emblem, battle scratches, stylized 2D RPG inventory icon, hand-painted game art style, isolated on dark slate blue-grey background, no frame, no text --ar 1:1
   ```
10. **Перстень Тіней / Оберіг (`item_ring.png`):**
    ```text
    Ancient silver ring set with a glowing purple obsidian gem, mystical aura, stylized 2D RPG inventory icon, hand-painted game art style, isolated on dark slate blue-grey background, no frame, no text --ar 1:1
    ```

### Категорія «Матеріали» (Materials — точно за вашим референсом):
11. **Листя Чорнобильника (`mat_herb.png`):**
    ```text
    Sprig of fresh green medicinal forest leaves, vibrant veins and dew drops, stylized 2D RPG inventory icon, hand-painted game art style, isolated on dark slate blue-grey background, no frame, no text --ar 1:1
    ```
12. **Дублена Шкіра Звіра (`mat_leather.png`):**
    ```text
    Folded piece of cured brown crafting leather hide, rustic texture, stylized 2D RPG inventory icon, hand-painted game art style, isolated on dark slate blue-grey background, no frame, no text --ar 1:1
    ```
13. **Лісовий Боровик (`mat_mushroom.png`):**
    ```text
    Plump forest porcini mushroom with brown cap and thick stem, warm highlights, stylized 2D RPG inventory icon, hand-painted game art style, isolated on dark slate blue-grey background, no frame, no text --ar 1:1
    ```
14. **Цвіт Сріблястої Ромашки (`mat_flower.png`):**
    ```text
    Two blooming white chamomile flowers with yellow centers and green leaves, soft glow, stylized 2D RPG inventory icon, hand-painted game art style, isolated on dark slate blue-grey background, no frame, no text --ar 1:1
    ```
15. **Ікло Сірого Ватажка (`mat_fang.png`):**
    ```text
    Curved sharp wolf fang bone trophy with carved notches at the root, stylized 2D RPG inventory icon, hand-painted game art style, isolated on dark slate blue-grey background, no frame, no text --ar 1:1
    ```

### Категорія «Ресурси» (Resources — точно за вашим референсом):
16. **Уламок Льодового Кристалу — Синій кристал (`res_crystal_blue.png`):**
    ```text
    Faceted glowing sky-blue magic crystal shard, sharp geometric edges and inner light, stylized 2D RPG inventory icon, hand-painted game art style, isolated on dark slate blue-grey background, no frame, no text --ar 1:1
    ```
17. **Старовинні Золоті Дукати — Монета із зіркою (`res_gold_coin.png`):**
    ```text
    Heavy ancient gold coin embossed with a five-pointed star emblem in the center, warm metallic shine, stylized 2D RPG inventory icon, hand-painted game art style, isolated on dark slate blue-grey background, no frame, no text --ar 1:1
    ```
18. **Темний Аметист Тіней — Фіолетовий кристал (`res_crystal_purple.png`):**
    ```text
    Faceted glowing royal purple amethyst crystal gem, mystical violet reflections, stylized 2D RPG inventory icon, hand-painted game art style, isolated on dark slate blue-grey background, no frame, no text --ar 1:1
    ```
