// ============================================================================
// ГОЛОВНИЙ РУШІЙ ПЛАТФОРМИ ПРИГОД «ХРОНІКИ ГРАНЕЙ» (v2.0)
// 1. Стартовий екран Авторизації + Вибір мови (УКР / ENG)
// 2. Вітрина з нижньою навігацією: [Пригоди] [Архів і Сезони] [Налаштування]
// 3. Помітний вибір: «Створити свою кімнату» або «Приєднатися за кодом»
// 4. Вибір із 6 Класів (без фіксованих імен) -> Спливаюче вікно огляду класу +
//    введення власного імені персонажа (до 20 символів)
// 5. Верхній екран гри: ХП персонажа зверху в шапці, а на сцені — згенерована
//    фігурка героя з підсвіткою кольором класу та його ім'ям (без смужки ХП на фігурці)
// 6. Два чати:
//    - «Загальний чат (Локація)» (за ходами, перемикач [💬 Сказати] / [⚡ Дія],
//      звичайні слова та «Привіт» без кубика D20!)
//    - «Чат Гравців та Майстра» (вільний у будь-який момент; слово «Майстер»
//      автоматично підкреслюється і викликає підказку від ШІ-Майстра Гри)
// 7. Вкладка «Персонаж»: суто ваш персонаж + кнопка перегляду союзників (без інвентарю)
// 8. Вкладка «Інвентар»: використання (з вибором кількості) та вдягання/зняття
//    спорядження лише у свій хід із автоматичним записом дії в Загальний чат!
// ============================================================================

const I18N = {
  uk: {
    appTitle: "Хроніки Граней",
    appSub: "Кооперативна AI-RPG Платформа • 1–4 Гравці",
    welcomeTitle: "Ласкаво просимо до Пригод",
    chooseLang: "Оберіть мову інтерфейсу та пригод:",
    accountLabel: "Ваш акаунт (нікнейм або email):",
    enterBtn: "Увійти та відкрити пригоди →",
    hubNavMain: "Пригоди",
    hubNavArchive: "Архів і Сезони",
    hubNavSettings: "Налаштування",
    createRoomBtn: "➕ Створити свою кімнату",
    joinRoomBtn: "🔑 Приєднатися за кодом",
    playOrJoinBtn: "Грати (Створити / Увійти)",
    chatTab: "Чат",
    charTab: "персонаж",
    invTab: "інвентар",
    menuTab: "меню"
  },
  en: {
    appTitle: "Chronicles of Edges",
    appSub: "Co-op AI-RPG Platform • 1–4 Players",
    welcomeTitle: "Welcome to the Adventure",
    chooseLang: "Choose interface & story language:",
    accountLabel: "Your Account (nickname or email):",
    enterBtn: "Sign In & Open Adventures →",
    hubNavMain: "Adventures",
    hubNavArchive: "Archive & Seasons",
    hubNavSettings: "Settings",
    createRoomBtn: "➕ Create Your Room",
    joinRoomBtn: "🔑 Join by Room Code",
    playOrJoinBtn: "Play (Create / Join)",
    chatTab: "Chat",
    charTab: "character",
    invTab: "inventory",
    menuTab: "menu"
  }
};

const AppState = {
  // Якщо користувач ще не проходив стартовий екран авторизації/мови — показуємо 'onboarding'
  screen: localStorage.getItem("rpg_onboarded") === "true" ? "hub" : "onboarding", // 'onboarding' | 'hub' | 'lobby' | 'game'
  lang: localStorage.getItem("rpg_lang") || "uk", // 'uk' | 'en'
  accountName: localStorage.getItem("rpg_account_name") || "Мандрівник",
  isLoggedIn: localStorage.getItem("rpg_onboarded") === "true",
  hubBottomTab: "main", // 'main' | 'archive' | 'settings'
  hubFilter: "all",
  activeCartridgeId: "black-star-crown-01",
  roomCode: "K7X9",
  myPlayerId: "player_" + Math.random().toString(36).substring(2, 6),
  myPlayerName: localStorage.getItem("rpg_account_name") || "Ви (Хост)",
  activeControlPlayerId: null,
  turnPlayerIndex: 0, // Індекс гравця, чий зараз хід у Загальному чаті та для дій інвентарю
  players: [],
  currentActIndex: 0,
  activeBottomTab: "chat", // 'chat' | 'character' | 'inventory'
  chatChannel: "location", // 'location' (Загальний чат локації за ходами) | 'party' (Вільний чат гравців та Майстра)
  locationInputMode: "say", // 'say' (💬 Сказати) | 'act' (⚡ Дія)
  inventoryCategory: "all", // 'all' | 'items' | 'materials' | 'resources'
  selectedInventoryItemId: null,
  modalUseQty: 1,
  stageModeOverride: null, // null | 'center' | 'split'
  pendingCheck: null,
  isAiTyping: false,
  gameStatus: "playing",
  aiConfig: {
    provider: localStorage.getItem("rpg_ai_provider") || "free_cloud",
    apiKey: localStorage.getItem("rpg_ai_key") || "",
    ollamaModel: localStorage.getItem("rpg_ollama_model") || "llama3.2"
  },
  messages: [], // Загальний чат локації (сюжет, дії, репліки в локації)
  partyMessages: [], // Вільний чат гравців та звернень до Майстра ("Майстер")
  channel: null
};

AppState.activeControlPlayerId = AppState.myPlayerId;

function t(key) {
  const dict = I18N[AppState.lang] || I18N.uk;
  return dict[key] || I18N.uk[key] || key;
}

function getActiveCartridge() {
  return (
    window.ADVENTURE_CARTRIDGES.find(c => c.id === AppState.activeCartridgeId) ||
    window.ADVENTURE_CARTRIDGES[0]
  );
}

function getHeroById(cartridge, heroId) {
  return cartridge.heroes.find(h => h.id === heroId) || cartridge.heroes[0];
}

function getControlledPlayer() {
  return (
    AppState.players.find(p => p.id === AppState.activeControlPlayerId) ||
    AppState.players[0]
  );
}

function getCurrentTurnPlayer() {
  if (!AppState.players || AppState.players.length === 0) return null;
  const idx = AppState.turnPlayerIndex % AppState.players.length;
  return AppState.players[idx] || AppState.players[0];
}

function isControlledPlayerTurn() {
  const turnP = getCurrentTurnPlayer();
  const ctrlP = getControlledPlayer();
  if (!turnP || !ctrlP) return true;
  return turnP.id === ctrlP.id;
}

function advanceTurnToNextPlayer() {
  if (!AppState.players || AppState.players.length <= 1) return;
  AppState.turnPlayerIndex = (AppState.turnPlayerIndex + 1) % AppState.players.length;
  const nextP = getCurrentTurnPlayer();
  if (nextP) {
    AppState.activeControlPlayerId = nextP.id;
    showToast(`⏳ Хід переходить до: ${nextP.customHeroName || nextP.name}`);
  }
  broadcastRoomState();
  renderApp();
}

function getPlayerHeroDisplayName(player, hero) {
  if (player && player.customHeroName && player.customHeroName.trim()) {
    return player.customHeroName.trim();
  }
  return hero ? hero.className || hero.name : "Герой";
}

// ============================================================================
// ЖИВІ 16-BIT JRPG СПРАЙТИ ГЕРОЇВ (4 ПОЗИ), NPC/БОСІВ (3 ПОЗИ) ТА 48 ПРЕДМЕТІВ
// Усі спрайти вирізані з білого фону у прозорі PNG (assets/heroes, assets/npcs, assets/items)
// ============================================================================
AppState.heroPoses = AppState.heroPoses || {}; // custom pose override per player/class ('idle' | 'action' | 'front' | 'back')
AppState.heroActionBursts = AppState.heroActionBursts || {}; // { [playerId]: { until: timestamp, label: string } }
AppState.stageAnimTick = 0;

const HERO_CLASS_POSE_LABELS = {
  front: "Спереду",
  back: "3/4 Бій",
  idle: "Стійка",
  action: "Магія / Удар"
};

function getHeroSpriteUrl(heroOrClassKey, pose = "idle") {
  const key =
    typeof heroOrClassKey === "string"
      ? heroOrClassKey
      : heroOrClassKey?.classKey || "ranger";
  const validPose = ["front", "back", "idle", "action"].includes(pose) ? pose : "idle";
  return `assets/heroes/${key}_${validPose}.png`;
}

function triggerHeroStageActionBurst(playerId, actionLabel = "⚡ Дія!") {
  if (!playerId) return;
  AppState.heroActionBursts[playerId] = {
    until: Date.now() + 3200,
    label: actionLabel
  };
  updateStageAnimatedSpritesInPlace();
}

function cycleHeroStagePose(playerId, classKey, event) {
  if (event) event.stopPropagation();
  const order = ["idle", "action", "front", "back"];
  const cur = AppState.heroPoses[playerId || classKey] || "idle";
  const next = order[(order.indexOf(cur) + 1) % order.length];
  AppState.heroPoses[playerId || classKey] = next;
  showToast(`🎞️ Поза спрайта: ${HERO_CLASS_POSE_LABELS[next]}`);
  renderApp();
}

function renderGeneratedHeroPortraitSvg(hero, sizeClass = "w-14 h-16", poseOverride = null, playerId = null) {
  const key = hero?.classKey || "ranger";
  const burst = playerId ? AppState.heroActionBursts[playerId] : null;
  const isBurstActive = burst && burst.until > Date.now();

  let pose = poseOverride || (playerId && AppState.heroPoses[playerId]) || AppState.heroPoses[key] || "idle";
  if (isBurstActive) {
    pose = "action";
  }

  const src = getHeroSpriteUrl(key, pose);
  return `
    <img
      src="${src}"
      alt="${escapeHtml(hero?.className || key)}"
      data-hero-sprite-key="${key}"
      data-hero-player-id="${playerId || ""}"
      data-hero-base-pose="${pose}"
      class="${sizeClass} object-contain pixel-stage drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] select-none pointer-events-none transition-transform duration-200"
    />
  `;
}

function resolveEntityNpcKey(ent) {
  const nameLower = (ent?.name || "").toLowerCase();
  const emoji = ent?.emoji || "";

  if (nameLower.includes("тарганячий король") || (nameLower.includes("тарган") && nameLower.includes("король"))) {
    return "cockroach_king";
  }
  if (nameLower.includes("тарган") || nameLower.includes("хітинов") || emoji.includes("🪳")) {
    return "cockroach_guard";
  }
  if (nameLower.includes("коні") || nameLower.includes("кінь") || emoji.includes("🐎")) {
    return "white_horse";
  }
  if (nameLower.includes("конюх")) {
    return "stablemaster_rodan";
  }
  if (nameLower.includes("син") || nameLower.includes("іменинник") || nameLower.includes("принц")) {
    return "birthday_prince";
  }
  if (nameLower.includes("король") || nameLower.includes("узурпатор") || nameLower.includes("тиран") || emoji.includes("🤴")) {
    return "usurper_king";
  }
  if (nameLower.includes("кухар") || nameLower.includes("прислуг") || emoji.includes("👨‍🍳") || emoji.includes("🎉")) {
    return "castle_chef";
  }
  if (nameLower.includes("відвідувач") || nameLower.includes("маг") || emoji.includes("🧙")) {
    return "tavern_mages";
  }
  if (nameLower.includes("арбалет") || nameLower.includes("патруль") || emoji.includes("🏹")) {
    return "crossbow_patrol";
  }
  return "iron_knight";
}

function renderPixelEntitySpriteSvg(ent, sizeClass = "w-14 h-16", poseIdx = 1) {
  const nameLower = (ent?.name || "").toLowerCase();

  // Інтерактивні об'єкти сцени (Головна Витяжка, Чавунний Люк, Зачинена Брама) мають власні піксельні артефакти/іконки
  if (ent?.type === "object" && (nameLower.includes("витяжк") || nameLower.includes("люк") || nameLower.includes("брам"))) {
    const objIcon = nameLower.includes("витяжк")
      ? "assets/items/toxin_flask.png"
      : nameLower.includes("брам")
      ? "assets/items/px_iron_wedges.png"
      : "assets/items/px_wind_compass.png";
    return `
      <img
        src="${objIcon}"
        alt="${escapeHtml(ent?.name || "Об'єкт")}"
        class="${sizeClass} object-contain pixel-stage drop-shadow-[0_4px_10px_rgba(16,185,129,0.75)] animate-item-float"
      />
    `;
  }

  const npcKey = resolveEntityNpcKey(ent);
  const frameNum = ((poseIdx - 1) % 3) + 1;
  const src = `assets/npcs/${npcKey}_${frameNum}.png`;

  return `
    <img
      src="${src}"
      alt="${escapeHtml(ent?.name || npcKey)}"
      data-npc-sprite-key="${npcKey}"
      class="${sizeClass} object-contain pixel-stage drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] select-none pointer-events-none transition-transform duration-200"
    />
  `;
}

// Живий анімаційний цикл на сцені: плавно перемикає пози NPC (1 -> 2 -> 3)
// та активує бойові/магічні пози героїв без перезавантаження DOM і без втрати фокусу чату!
function updateStageAnimatedSpritesInPlace() {
  AppState.stageAnimTick = (AppState.stageAnimTick || 0) + 1;
  const now = Date.now();

  // 1. Оновлюємо спрайти героїв на сцені
  document.querySelectorAll("img[data-hero-sprite-key]").forEach((imgEl, idx) => {
    const key = imgEl.getAttribute("data-hero-sprite-key");
    const pid = imgEl.getAttribute("data-hero-player-id");
    const basePose = imgEl.getAttribute("data-hero-base-pose") || "idle";
    if (!key) return;

    const burst = pid ? AppState.heroActionBursts[pid] : null;
    if (burst && burst.until > now) {
      const actionSrc = getHeroSpriteUrl(key, "action");
      if (!imgEl.src.endsWith(actionSrc)) imgEl.src = actionSrc;
      imgEl.parentElement?.classList.add("animate-hero-lunge");
    } else {
      imgEl.parentElement?.classList.remove("animate-hero-lunge");
      // Якщо увімкнено стандартну стійку на сцені — кожні декілька тактів герой робить легкий рух у бойову стійку і назад
      let targetPose = basePose;
      if (pid && basePose === "idle" && (AppState.stageAnimTick + idx) % 5 === 0) {
        targetPose = "action";
      }
      const nextSrc = getHeroSpriteUrl(key, targetPose);
      if (!imgEl.src.endsWith(nextSrc)) imgEl.src = nextSrc;
    }
  });

  // 2. Оновлюємо 3-кадрову анімацію всіх NPC, Босів, Тарганів та Білих Коней на сцені
  document.querySelectorAll("img[data-npc-sprite-key]").forEach((imgEl, idx) => {
    const npcKey = imgEl.getAttribute("data-npc-sprite-key");
    if (!npcKey) return;
    const frame = ((AppState.stageAnimTick + idx) % 3) + 1;
    const nextSrc = `assets/npcs/${npcKey}_${frame}.png`;
    if (!imgEl.src.endsWith(nextSrc)) {
      imgEl.src = nextSrc;
    }
  });
}

if (!window.__rpgSpriteAnimInterval) {
  window.__rpgSpriteAnimInterval = setInterval(updateStageAnimatedSpritesInPlace, 1150);
}

// ============================================================================
// УСІ 48 УНІКАЛЬНИХ ПІКСЕЛЬНИХ ПРЕДМЕТІВ ІНВЕНТАРЮ ТА АРТЕФАКТІВ (assets/items/*.png)
// ============================================================================
function renderItemArtwork(item, sizeClass = "w-11 h-11") {
  const legacyIcons = {
    sword: "assets/items/item_sword.png",
    potion_blue: "assets/items/item_potion_blue.png",
    potion_red: "assets/items/item_potion_red.png",
    crystal_blue: "assets/items/item_crystal_blue.png",
    coin_gold: "assets/items/item_coin_gold.png",
    toxin_flask: "assets/items/toxin_flask.png"
  };

  const key = item?.artKey || "px_silver_saber";
  const imgSrc = item?.imageUrl || legacyIcons[key] || `assets/items/${key}.png`;

  return `
    <img
      src="${imgSrc}"
      alt="${escapeHtml(item?.name || key)}"
      class="${sizeClass} object-contain pixel-stage drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] select-none"
    />
  `;
}

// ============================================================================
// МЕРЕЖЕВА СИНХРОНІЗАЦІЯ КІМНАТИ (REALTIME MULTIPLAYER SYNC)
// ============================================================================
function initMultiplayerChannel(roomCode) {
  if (AppState.channel) {
    AppState.channel.close();
  }
  if ("BroadcastChannel" in window) {
    AppState.channel = new BroadcastChannel("rpg_room_" + roomCode);
    AppState.channel.onmessage = event => {
      const data = event.data;
      if (!data || data.sender === AppState.myPlayerId) return;
      if (data.type === "SYNC_STATE") {
        AppState.players = data.players;
        AppState.messages = data.messages;
        AppState.partyMessages = data.partyMessages || AppState.partyMessages;
        AppState.currentActIndex = data.currentActIndex;
        AppState.turnPlayerIndex = data.turnPlayerIndex || 0;
        AppState.pendingCheck = data.pendingCheck;
        AppState.gameStatus = data.gameStatus;
        AppState.stageModeOverride = data.stageModeOverride;
        if (data.screen && AppState.screen === "lobby" && data.screen === "game") {
          AppState.screen = "game";
        }
        renderApp();
        scrollToBottom();
      } else if (data.type === "REQUEST_STATE") {
        broadcastRoomState();
      }
    };
    AppState.channel.postMessage({ type: "REQUEST_STATE", sender: AppState.myPlayerId });
  }
}

function broadcastRoomState() {
  if (AppState.channel) {
    AppState.channel.postMessage({
      type: "SYNC_STATE",
      sender: AppState.myPlayerId,
      screen: AppState.screen,
      players: AppState.players,
      messages: AppState.messages,
      partyMessages: AppState.partyMessages,
      currentActIndex: AppState.currentActIndex,
      turnPlayerIndex: AppState.turnPlayerIndex,
      pendingCheck: AppState.pendingCheck,
      gameStatus: AppState.gameStatus,
      stageModeOverride: AppState.stageModeOverride
    });
  }
}

// ============================================================================
// 1. ЕКРАН АВТОРИЗАЦІЇ ТА ВИБОРУ МОВИ (ONBOARDING)
// ============================================================================
function setAppLanguage(lang) {
  AppState.lang = lang;
  localStorage.setItem("rpg_lang", lang);
  renderApp();
}

function completeOnboardingAuth(event) {
  if (event) event.preventDefault();
  const input = document.getElementById("onboardingAccountInput");
  const nameVal = (input?.value || "").trim().slice(0, 20) || "Мандрівник";
  AppState.accountName = nameVal;
  AppState.myPlayerName = nameVal;
  AppState.isLoggedIn = true;
  localStorage.setItem("rpg_account_name", nameVal);
  localStorage.setItem("rpg_onboarded", "true");
  AppState.screen = "hub";
  AppState.hubBottomTab = "main";
  showToast(AppState.lang === "en" ? `Welcome, ${nameVal}!` : `Вітаємо в грі, ${nameVal}!`);
  renderApp();
}

function logoutAccountToOnboarding() {
  localStorage.removeItem("rpg_onboarded");
  AppState.isLoggedIn = false;
  AppState.screen = "onboarding";
  renderApp();
}

function renderOnboardingScreen() {
  const isUk = AppState.lang === "uk";
  return `
    <div class="flex flex-col h-full bg-slate-950 text-slate-100 p-5 justify-between select-none">
      <div class="pt-4 text-center space-y-2">
        <div class="relative w-20 h-20 mx-auto flex items-center justify-center rounded-3xl bg-slate-900 border-2 border-amber-400/50 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
          <img src="assets/d20_emblem.png" onerror="this.style.display='none'" alt="D20" class="w-16 h-16 object-contain" />
        </div>
        <div class="text-[11px] font-extrabold uppercase tracking-widest text-amber-400">
          ${t("appSub")}
        </div>
        <h1 class="text-2xl font-black text-white tracking-tight">
          ${t("appTitle")}
        </h1>
        <p class="text-xs text-slate-400 max-w-xs mx-auto">
          ${
            isUk
              ? "Кооперативні настільні пригоди з живим ШІ-Майстром Гри, 3D-предметами та системою кидків D20."
              : "Co-op tabletop adventures with a live AI Game Master, 3D items, and D20 dice checks."
          }
        </p>
      </div>

      <form onsubmit="completeOnboardingAuth(event)" class="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
        <!-- Вибір мови -->
        <div>
          <label class="block text-xs font-extrabold uppercase tracking-wider text-amber-400 mb-2">
            🌐 ${t("chooseLang")}
          </label>
          <div class="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onclick="setAppLanguage('uk')"
              class="py-3 px-3 rounded-xl border-2 font-extrabold text-xs flex items-center justify-center gap-2 transition ${
                isUk
                  ? "bg-amber-500/20 border-amber-400 text-white shadow-md"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
              }"
            >
              <span class="text-lg">🇺🇦</span>
              <span>Українська</span>
            </button>
            <button
              type="button"
              onclick="setAppLanguage('en')"
              class="py-3 px-3 rounded-xl border-2 font-extrabold text-xs flex items-center justify-center gap-2 transition ${
                !isUk
                  ? "bg-amber-500/20 border-amber-400 text-white shadow-md"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
              }"
            >
              <span class="text-lg">🇬🇧</span>
              <span>English</span>
            </button>
          </div>
        </div>

        <!-- Вхід в акаунт -->
        <div>
          <label class="block text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-1.5">
            👤 ${t("accountLabel")}
          </label>
          <input
            id="onboardingAccountInput"
            type="text"
            maxlength="20"
            value="${escapeHtml(AppState.accountName)}"
            placeholder="${isUk ? "Введіть ваш логін (до 20 симв.)" : "Enter nickname (up to 20 chars)"}"
            class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-bold focus:outline-none focus:border-amber-400"
          />
          <div class="mt-1 text-[10px] text-slate-400">
            ${
              isUk
                ? "Цей профіль зберігає ваш прогрес, відкриті пригоди та налаштування."
                : "This profile saves your progress, unlocked adventures, and preferences."
            }
          </div>
        </div>

        <button
          type="submit"
          class="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg transition"
        >
          ${t("enterBtn")}
        </button>
      </form>

      <div class="text-center text-[11px] text-slate-500 pb-1">
        Blender 3D Assets • AI Game Master • 1–4 Players Co-op
      </div>
    </div>
  `;
}

// ============================================================================
// 2. СТВОРЕННЯ АБО ПРИЄДНАННЯ ДО КІМНАТИ + ВИБІР ІЗ 6 КЛАСІВ ПЕРСОНАЖІВ
// ============================================================================
function openPlayModeModal(cartridgeId) {
  const cartridge = window.ADVENTURE_CARTRIDGES.find(c => c.id === cartridgeId) || getActiveCartridge();
  AppState.activeCartridgeId = cartridge.id;

  const dlg = document.getElementById("roomModeDialog");
  const body = document.getElementById("roomModeModalBody");
  if (!dlg || !body) {
    openAdventureLobby(cartridge.id);
    return;
  }
  setupDialogLightDismissFallback(dlg);

  body.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div>
          <div class="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">Вибір режиму кімнати</div>
          <h3 id="roomModeModalTitle" class="text-base font-extrabold text-white">${escapeHtml(cartridge.title)}</h3>
        </div>
        <button onclick="document.getElementById('roomModeDialog').close()" class="w-7 h-7 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center">×</button>
      </div>

      <!-- Варіант 1: Створити нову кімнату -->
      <div class="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-slate-950 border-2 border-amber-400/60 space-y-2">
        <div class="flex items-center gap-2">
          <span class="text-xl">🏰</span>
          <div>
            <div class="text-xs font-extrabold text-white">Створити нову кімнату (Хост)</div>
            <div class="text-[11px] text-slate-300">Ви отримаєте код кімнати, щоб запросити до 3 друзів</div>
          </div>
        </div>
        <button
          onclick="document.getElementById('roomModeDialog').close(); openAdventureLobby('${cartridge.id}');"
          class="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition"
        >
          ➕ Створити свою гру →
        </button>
      </div>

      <!-- Варіант 2: Приєднатися за кодом до існуючої гри -->
      <div class="p-3.5 rounded-2xl bg-slate-950 border border-slate-700 space-y-2.5">
        <div class="flex items-center gap-2">
          <span class="text-xl">🔑</span>
          <div>
            <div class="text-xs font-extrabold text-emerald-400">Приєднатися до вже існуючої кімнати</div>
            <div class="text-[11px] text-slate-400">Введіть 4-значний код кімнати, який вам надіслав друг:</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <input
            id="modalJoinRoomCodeInput"
            type="text"
            maxlength="6"
            placeholder="Напр. K7X9"
            class="flex-1 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 font-mono uppercase text-sm font-extrabold text-amber-300 placeholder-slate-500 focus:outline-none focus:border-emerald-400"
          />
          <button
            onclick="joinRoomFromModal('${cartridge.id}')"
            class="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition"
          >
            Увійти →
          </button>
        </div>
      </div>
    </div>
  `;

  dlg.showModal();
}

function joinRoomFromModal(cartridgeId) {
  const code = (document.getElementById("modalJoinRoomCodeInput")?.value || "").trim().toUpperCase();
  if (!code) {
    showToast("Введіть код кімнати друга (наприклад, K7X9)!");
    return;
  }
  document.getElementById("roomModeDialog")?.close();
  openAdventureLobby(cartridgeId, code);
  showToast(`Ви приєдналися до кімнати #${code}! Тепер оберіть клас та ім'я персонажа.`);
}

function openAdventureLobby(cartridgeId, customCode) {
  const cartridge = window.ADVENTURE_CARTRIDGES.find(c => c.id === cartridgeId) || getActiveCartridge();
  if (!cartridge) return;

  if (!cartridge.isUnlocked) {
    cartridge.isUnlocked = true;
    showToast(`Демо-режим: Пригоду «${cartridge.title}» розблоковано!`);
  }

  const firstClass = cartridge.heroes[0];
  AppState.activeCartridgeId = cartridge.id;
  AppState.roomCode = customCode || generateRoomCode();
  AppState.screen = "lobby";
  AppState.turnPlayerIndex = 0;

  // За замовчуванням гравець ще може натиснути на будь-який із 6 класів, подивитися опис і дати ім'я до 20 символів
  const initialCustomName = (AppState.accountName || "Герой").slice(0, 20);
  AppState.players = [
    {
      id: AppState.myPlayerId,
      name: AppState.accountName || "Гравець 1",
      heroId: firstClass.id,
      customHeroName: initialCustomName,
      hp: firstClass.hp,
      maxHp: firstClass.maxHp,
      gold: 245,
      equipped: JSON.parse(JSON.stringify(firstClass.equipped)),
      inventory: JSON.parse(JSON.stringify(firstClass.inventory)),
      isDead: false
    }
  ];
  AppState.activeControlPlayerId = AppState.myPlayerId;
  AppState.selectedInventoryItemId = firstClass.inventory[0]?.id || null;
  initMultiplayerChannel(AppState.roomCode);
  renderApp();
}

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

// ============================================================================
// СПЛИВАЮЧЕ ВІКНО ОГЛЯДУ КЛАСУ ПЕРСОНАЖА + ВВЕДЕННЯ ВЛАСНОГО ІМЕНІ (ДО 20 СИМВ.)
// ============================================================================
function openClassPreviewModal(heroClassId) {
  const cartridge = getActiveCartridge();
  const heroClass = getHeroById(cartridge, heroClassId);
  const player = getControlledPlayer();
  if (!heroClass || !player) return;

  const takenByOther = AppState.players.find(
    p => p.heroId === heroClassId && p.id !== player.id
  );
  if (takenByOther) {
    showToast(`Клас «${heroClass.className}» вже зайнятий гравцем ${takenByOther.name}!`);
    return;
  }

  const dlg = document.getElementById("classPreviewDialog");
  const body = document.getElementById("classPreviewModalBody");
  if (!dlg || !body) return;
  setupDialogLightDismissFallback(dlg);

  const currentName = (player.customHeroName || player.name || "").slice(0, 20);

  body.innerHTML = `
    <div class="space-y-3.5 max-h-[82dvh] overflow-y-auto pr-0.5">
      <div class="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div class="flex items-center gap-3">
          <div class="w-16 h-20 rounded-2xl bg-slate-950 border-2 flex items-center justify-center shrink-0 shadow-lg animate-hero-idle" style="border-color: ${heroClass.color}">
            ${renderGeneratedHeroPortraitSvg(heroClass, "w-14 h-16", "front")}
          </div>
          <div>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-400/40">
              Клас персонажа • 4 Пози Спрайта
            </span>
            <h3 id="classPreviewModalTitle" class="text-lg font-black text-white mt-0.5">
              ${escapeHtml(heroClass.className)}
            </h3>
            <div class="text-xs font-semibold text-amber-300">${escapeHtml(heroClass.role)}</div>
          </div>
        </div>
        <button onclick="document.getElementById('classPreviewDialog').close()" class="w-7 h-7 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center text-base leading-none">×</button>
      </div>

      <!-- Галерея всіх 4 вирізаних поз класу (Спереду, 3/4 Спина, Стійка, Дія/Магія) -->
      <div class="p-2.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-1.5">
        <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>🎬 Усі 4 анімовані бойові ракурси класу:</span>
          <span class="text-amber-300">16-bit HD-2D Cutout</span>
        </div>
        <div class="grid grid-cols-4 gap-2">
          ${[
            { pose: "front", label: "Спереду" },
            { pose: "back", label: "3/4 Спина" },
            { pose: "idle", label: "Стійка" },
            { pose: "action", label: "Атака / Чари" }
          ]
            .map(
              pItem => `
            <div class="p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center gap-1">
              <div class="w-12 h-14 flex items-center justify-center animate-hero-idle">
                ${renderGeneratedHeroPortraitSvg(heroClass, "w-11 h-13", pItem.pose)}
              </div>
              <span class="text-[9px] font-bold text-slate-300">${pItem.label}</span>
            </div>
          `
            )
            .join("")}
        </div>
      </div>

      <!-- Поле вводу власного імені персонажа (обмеження до 20 символів) -->
      <div class="p-3 rounded-2xl bg-amber-500/10 border-2 border-amber-400/60 space-y-1.5">
        <div class="flex items-center justify-between">
          <label for="customHeroNameInput" class="text-xs font-extrabold text-amber-300">
            ✏️ Назвіть персонажа (до 20 символів):
          </label>
          <span id="heroNameCharCount" class="text-[11px] font-mono font-bold text-amber-200">${currentName.length}/20</span>
        </div>
        <input
          id="customHeroNameInput"
          type="text"
          maxlength="20"
          value="${escapeHtml(currentName)}"
          oninput="const c = document.getElementById('heroNameCharCount'); if (c) c.textContent = this.value.length + '/20';"
          placeholder="Введіть ім'я героя (макс. 20 символів)..."
          class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-400/60 text-sm font-extrabold text-white placeholder-slate-500 focus:outline-none focus:border-amber-300"
        />
        <div class="text-[10px] text-slate-300">
          Це ім'я буде відображатися над персонажем на сцені гри та в чаті пригоди.
        </div>
      </div>

      <!-- Життя та базові характеристики класу -->
      <div class="grid grid-cols-5 gap-1.5 text-center">
        <div class="p-2 rounded-xl bg-emerald-950/50 border border-emerald-500/40">
          <div class="text-[10px] text-emerald-300 font-bold">Життя</div>
          <div class="text-xs font-black text-white">❤️ ${heroClass.hp}</div>
        </div>
        <div class="p-2 rounded-xl bg-slate-950 border border-slate-800">
          <div class="text-[10px] text-slate-400">Сила</div>
          <div class="text-xs font-extrabold text-white">+${heroClass.stats.str}</div>
        </div>
        <div class="p-2 rounded-xl bg-slate-950 border border-slate-800">
          <div class="text-[10px] text-slate-400">Спритн.</div>
          <div class="text-xs font-extrabold text-white">+${heroClass.stats.agi}</div>
        </div>
        <div class="p-2 rounded-xl bg-slate-950 border border-slate-800">
          <div class="text-[10px] text-slate-400">Розум</div>
          <div class="text-xs font-extrabold text-white">+${heroClass.stats.int}</div>
        </div>
        <div class="p-2 rounded-xl bg-slate-950 border border-slate-800">
          <div class="text-[10px] text-slate-400">Харизма</div>
          <div class="text-xs font-extrabold text-white">+${heroClass.stats.cha}</div>
        </div>
      </div>

      <p class="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
        ${escapeHtml(heroClass.backstory)}
      </p>

      <!-- Унікальні вміння класу -->
      <div class="space-y-1.5">
        <div class="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">⚡ Унікальні вміння класу:</div>
        ${heroClass.skills
          .map(
            s => `
          <div class="p-2 rounded-xl bg-slate-950 border border-slate-800">
            <div class="text-xs font-bold text-white">${escapeHtml(s.name)}</div>
            <div class="text-[11px] text-slate-400">${escapeHtml(s.desc)}</div>
          </div>
        `
          )
          .join("")}
      </div>

      <!-- Що буде в інвентарі та спорядженні -->
      <div class="space-y-1.5">
        <div class="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">🎒 Початковий інвентар та спорядження:</div>
        <div class="grid grid-cols-2 gap-1.5">
          ${heroClass.inventory
            .slice(0, 6)
            .map(
              item => `
            <div class="p-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
              <div class="w-7 h-7 shrink-0 flex items-center justify-center">${renderItemArtwork(item, "w-6 h-6")}</div>
              <div class="min-w-0">
                <div class="text-[11px] font-bold text-white truncate">${escapeHtml(item.name)}</div>
                <div class="text-[9px] text-slate-400 truncate">x${item.qty || 1} • ${escapeHtml(item.bonus)}</div>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>

      <button
        onclick="confirmHeroClassSelection('${heroClass.id}')"
        class="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition"
      >
        ✓ Обрати клас «${escapeHtml(heroClass.className)}» та зберегти ім'я
      </button>
    </div>
  `;

  dlg.showModal();
}

function confirmHeroClassSelection(heroId) {
  const cartridge = getActiveCartridge();
  const player = getControlledPlayer();
  if (!player) return;

  const nameInput = document.getElementById("customHeroNameInput");
  const rawName = (nameInput?.value || "").trim().slice(0, 20);
  if (!rawName) {
    showToast("Введіть ім'я персонажа (від 1 до 20 символів)!");
    nameInput?.focus();
    return;
  }

  const takenByOther = AppState.players.find(
    p => p.heroId === heroId && p.id !== player.id
  );
  if (takenByOther) {
    showToast(`Клас вже зайнятий гравцем ${takenByOther.name}!`);
    return;
  }

  const hero = getHeroById(cartridge, heroId);
  player.heroId = hero.id;
  player.customHeroName = rawName;
  player.hp = hero.hp;
  player.maxHp = hero.maxHp;
  player.equipped = JSON.parse(JSON.stringify(hero.equipped));
  player.inventory = JSON.parse(JSON.stringify(hero.inventory));
  player.isDead = false;
  AppState.selectedInventoryItemId = player.inventory[0]?.id || null;

  document.getElementById("classPreviewDialog")?.close();
  showToast(`Обрано клас «${hero.className}» під ім'ям «${rawName}»!`);
  broadcastRoomState();
  renderApp();
}

function addFriendSlotToRoom() {
  if (AppState.players.length >= 4) {
    showToast("У кімнаті вже максимум 4 гравці!");
    return;
  }
  const cartridge = getActiveCartridge();
  const takenIds = new Set(AppState.players.map(p => p.heroId));
  const freeClass = cartridge.heroes.find(h => !takenIds.has(h.id)) || cartridge.heroes[0];
  const slotNum = AppState.players.length + 1;
  const newPlayer = {
    id: "friend_" + Date.now() + "_" + slotNum,
    name: "Друг " + slotNum,
    heroId: freeClass.id,
    customHeroName: `${freeClass.className.split("-")[0]} ${slotNum}`.slice(0, 20),
    hp: freeClass.hp,
    maxHp: freeClass.maxHp,
    gold: 245,
    equipped: JSON.parse(JSON.stringify(freeClass.equipped)),
    inventory: JSON.parse(JSON.stringify(freeClass.inventory)),
    isDead: false
  };
  AppState.players.push(newPlayer);
  AppState.activeControlPlayerId = newPlayer.id;
  broadcastRoomState();
  renderApp();
  // Одразу відкриваємо вікно вибору класу та введення імені для доданого слота
  openClassPreviewModal(freeClass.id);
}

function startGameSession() {
  const cartridge = getActiveCartridge();
  const act1 = cartridge.acts[0];
  AppState.screen = "game";
  AppState.currentActIndex = 0;
  AppState.activeBottomTab = "chat";
  AppState.chatChannel = "location";
  AppState.turnPlayerIndex = 0;
  AppState.activeControlPlayerId = AppState.players[0]?.id || AppState.myPlayerId;
  AppState.stageModeOverride = null;
  AppState.pendingCheck = null;
  AppState.gameStatus = "playing";

  const partyList = AppState.players
    .map(p => {
      const h = getHeroById(cartridge, p.heroId);
      return `${getPlayerHeroDisplayName(p, h)} (${h.className})`;
    })
    .join(", ");

  AppState.messages = [
    {
      id: "msg_intro_" + Date.now(),
      role: "gm",
      senderName: "Майстер Гри",
      badge: act1.title,
      text: `Вітаю у пригоді **«${cartridge.title}»**!\nЗагін: **${partyList}**.\n\n📍 **Локація:** ${act1.locationName}\n🎯 **Ціль:** ${act1.objective}\n\n💡 Внизу ви можете обрати режим **«💬 Сказати»** (для звичайних фраз і привітань кубик D20 кидати не потрібно!) або **«⚡ Дія»** (коли ви щось робите у світі). А у вкладці **«Чат Гравців та Майстра»** можна вільно спілкуватися будь-коли — просто напишіть слово **Майстер**, щоб отримати підказку!`,
      suggestions: act1.sandboxHints
    }
  ];

  AppState.partyMessages = [
    {
      id: "pmsg_welcome_" + Date.now(),
      role: "gm",
      senderName: "Майстер Гри",
      text: `👋 Це **Чат Гравців та Майстра**. Тут ви можете спілкуватися між собою без черги ходу! Якщо потрібна підказка або роз'яснення по сюжету — просто напишіть у повідомленні слово **Майстер**, і я відповім вам.`
    }
  ];

  broadcastRoomState();
  renderApp();
  scrollToBottom();
}

// ============================================================================
// МОДАЛЬНЕ ВІКНО ПРЕДМЕТА ІНВЕНТАРЮ ПОВЕРХ ЕКРАНА + ЗАПИС У ЗАГАЛЬНИЙ ЧАТ
// ============================================================================
let __itemTurntableInterval = null;

function stopItemTurntableAnimation() {
  if (__itemTurntableInterval) {
    clearInterval(__itemTurntableInterval);
    __itemTurntableInterval = null;
  }
}

function startSwordTurntableInModal() {
  stopItemTurntableAnimation();
  const imgEl = document.getElementById("modalTurntableImg");
  if (!imgEl) return;

  for (let i = 1; i <= 24; i++) {
    const preload = new Image();
    preload.src = `assets/items/sword_frames/frame_${String(i).padStart(3, "0")}.png`;
  }

  let frameIdx = 1;
  __itemTurntableInterval = setInterval(() => {
    const currentEl = document.getElementById("modalTurntableImg");
    const dlg = document.getElementById("itemDetailDialog");
    if (!currentEl || !dlg || !dlg.open) {
      stopItemTurntableAnimation();
      return;
    }
    frameIdx = (frameIdx % 24) + 1;
    currentEl.src = `assets/items/sword_frames/frame_${String(frameIdx).padStart(3, "0")}.png`;
  }, 75);
}

function openItemDetailModal(itemId) {
  const player = getControlledPlayer();
  if (!player) return;
  const item = player.inventory.find(i => i.id === itemId);
  if (!item) return;

  AppState.selectedInventoryItemId = itemId;
  AppState.modalUseQty = 1;
  renderApp();

  const dlg = document.getElementById("itemDetailDialog");
  const body = document.getElementById("itemDetailModalBody");
  if (!dlg || !body) return;
  setupDialogLightDismissFallback(dlg);

  body.innerHTML = renderItemCardInnerHtml(item, true);
  dlg.showModal();

  if (item.artKey === "sword") {
    startSwordTurntableInModal();
  } else {
    stopItemTurntableAnimation();
  }
}

function changeModalItemQty(delta, maxQty) {
  AppState.modalUseQty = Math.max(1, Math.min(maxQty || 1, (AppState.modalUseQty || 1) + delta));
  const player = getControlledPlayer();
  const item = player?.inventory.find(i => i.id === AppState.selectedInventoryItemId);
  const body = document.getElementById("itemDetailModalBody");
  if (item && body) {
    body.innerHTML = renderItemCardInnerHtml(item, true);
  }
}

function renderItemCardInnerHtml(item, isModal = false) {
  const isAnimated3dSword = isModal && item.artKey === "sword";
  const maxQty = item.qty || 1;
  const useQty = Math.min(AppState.modalUseQty || 1, maxQty);
  const isMyTurn = isControlledPlayerTurn();
  const turnPlayer = getCurrentTurnPlayer();

  let actionBtnLabel = "Використати";
  if (item.slot) {
    actionBtnLabel = item.equipped ? "Зняти спорядження" : "Вдягнути";
  } else if (maxQty > 1 && item.heal) {
    actionBtnLabel = `Використати (x${useQty})`;
  }

  return `
    <div class="relative">
      ${
        isModal
          ? `<button onclick="stopItemTurntableAnimation(); document.getElementById('itemDetailDialog').close()" class="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-base leading-none">×</button>`
          : ""
      }
      <div class="flex items-start gap-4">
        <div class="relative w-24 h-24 rounded-xl bg-gradient-to-b from-[#232f3e] to-[#121922] border-2 border-[#64748b]/60 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
          ${
            isAnimated3dSword
              ? `<img id="modalTurntableImg" src="assets/items/sword_frames/frame_001.png" alt="${escapeHtml(item.name)}" class="w-20 h-20 object-contain drop-shadow-[0_4px_12px_rgba(56,189,248,0.45)]" />
                 <span class="absolute top-1 left-1.5 px-1 py-0.2 rounded bg-sky-500/25 border border-sky-400/50 text-[8px] font-extrabold text-sky-300 uppercase tracking-wider">3D • 360°</span>`
              : `<div class="animate-item-float flex items-center justify-center">${renderItemArtwork(item, "w-16 h-16")}</div>`
          }
          ${
            item.starred || item.equipped
              ? `<span class="absolute bottom-1 left-1.5 text-sm drop-shadow">⭐</span>`
              : ""
          }
          <span class="absolute bottom-1 right-1.5 text-[11px] font-bold text-slate-200">x${maxQty}</span>
        </div>

        <div class="flex-1 min-w-0 pr-4">
          <h3 id="itemModalTitle" class="text-lg font-extrabold text-white leading-tight mb-0.5">
            ${escapeHtml(item.name)}
          </h3>
          <div class="text-xs font-medium text-amber-300/90 mb-2">
            ${escapeHtml(item.rarityLabel || "Звичайний предмет")}
            ${item.equipped ? `<span class="ml-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold">Вдягнено</span>` : ""}
          </div>
          <p class="text-xs text-slate-300/90 leading-relaxed">
            ${escapeHtml(item.lore || item.bonus || "Надійний предмет у пригоді.")}
          </p>
        </div>
      </div>

      ${
        !item.slot && maxQty > 1
          ? `
        <div class="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
          <span class="text-xs text-slate-300 font-bold">Кількість для використання:</span>
          <div class="flex items-center gap-2">
            <button onclick="changeModalItemQty(-1, ${maxQty})" class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black">−</button>
            <span class="text-xs font-mono font-extrabold text-amber-300 w-8 text-center">x${useQty}</span>
            <button onclick="changeModalItemQty(1, ${maxQty})" class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black">+</button>
          </div>
        </div>
      `
          : ""
      }

      <div class="my-3.5 border-t border-slate-800/90"></div>

      ${
        !isMyTurn
          ? `<div class="mb-2.5 p-2 rounded-xl bg-rose-950/60 border border-rose-500/40 text-[11px] text-rose-200 text-center font-semibold">
               ⏳ Зараз хід гравця <b>${escapeHtml(turnPlayer?.customHeroName || turnPlayer?.name || "")}</b>. Використовувати або знімати предмети можна лише у свій хід!
             </div>`
          : ""
      }

      <div class="flex justify-center">
        <button
          onclick="useOrEquipItem('${item.id}')"
          ${!isMyTurn ? "disabled" : ""}
          class="rpg-gold-btn px-8 py-2.5 rounded-lg font-bold text-sm tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ${actionBtnLabel}
        </button>
      </div>
    </div>
  `;
}

// ============================================================================
// ВКЛАДКА «ІНВЕНТАР» (СІТКА 4 В РЯД + КАТЕГОРІЇ)
// ============================================================================
function renderInventoryBox(player, hero) {
  const categories = [
    { id: "all", label: "Усі" },
    { id: "items", label: "Предмети" },
    { id: "materials", label: "Матеріали" },
    { id: "resources", label: "Ресурси" }
  ];

  const filteredItems = player.inventory.filter(item => {
    if (AppState.inventoryCategory === "all") return true;
    return item.category === AppState.inventoryCategory;
  });

  const slotsCount = Math.max(12, Math.ceil(filteredItems.length / 4) * 4);
  const selectedItem =
    player.inventory.find(i => i.id === AppState.selectedInventoryItemId) ||
    filteredItems[0] ||
    null;
  const heroDisplayName = getPlayerHeroDisplayName(player, hero);

  return `
    <div class="flex-1 overflow-y-auto p-3.5 bg-[#0e141d] text-slate-100 space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-xl drop-shadow">🎒</span>
          <div>
            <h2 class="text-sm font-extrabold tracking-wide text-[#f3e5c8]">Інвентар: ${escapeHtml(heroDisplayName)}</h2>
            <div class="text-[10px] text-slate-400">Усі дії з предметами записуються у Загальний чат у ваш хід</div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-2">
        ${categories
          .map(
            cat => `
          <button
            onclick="AppState.inventoryCategory='${cat.id}'; renderApp();"
            class="py-1.5 px-2 rounded-lg text-xs font-bold transition ${
              AppState.inventoryCategory === cat.id ? "inv-tab-active" : "inv-tab-inactive"
            }"
          >
            ${cat.label}
          </button>
        `
          )
          .join("")}
      </div>

      <div class="grid grid-cols-4 gap-2.5">
        ${Array.from({ length: slotsCount })
          .map((_, idx) => {
            const item = filteredItems[idx];
            if (!item) {
              return `<div class="inv-slot aspect-square opacity-40"></div>`;
            }
            const isSelected = selectedItem && selectedItem.id === item.id;
            return `
              <button
                onclick="openItemDetailModal('${item.id}')"
                class="inv-slot aspect-square flex items-center justify-center p-2 ${
                  isSelected ? "inv-slot-selected" : ""
                }"
              >
                ${renderItemArtwork(item, "w-12 h-12")}
                ${
                  item.equipped
                    ? `<span class="absolute top-1 left-1 px-1 rounded bg-emerald-500/80 text-slate-950 text-[8px] font-black uppercase">На собі</span>`
                    : item.starred
                    ? `<span class="absolute bottom-1 left-1.5 text-xs drop-shadow">⭐</span>`
                    : ""
                }
                <span class="absolute bottom-1 right-1.5 text-[11px] font-bold text-slate-100 drop-shadow">
                  x${item.qty || 1}
                </span>
              </button>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function appendInventoryActionToGeneralChat(player, hero, actionSummaryText, gmReactionText) {
  const heroDisplayName = getPlayerHeroDisplayName(player, hero);
  AppState.messages.push({
    id: "msg_inv_act_" + Date.now(),
    role: "player",
    msgMode: "act",
    heroName: heroDisplayName,
    heroClass: hero.className,
    heroEmoji: hero.avatarEmoji,
    text: actionSummaryText
  });
  AppState.messages.push({
    id: "msg_inv_gm_" + (Date.now() + 1),
    role: "gm",
    senderName: "Майстер Гри",
    badge: "🎒 Дія з інвентарем у свій хід",
    text: gmReactionText
  });
}

function useOrEquipItem(itemId) {
  if (!isControlledPlayerTurn()) {
    showToast("⏳ Зараз не ваш хід! Використовувати та вдягати предмети можна лише у свій хід.");
    return;
  }

  const player = getControlledPlayer();
  if (!player) return;
  const cartridge = getActiveCartridge();
  const hero = getHeroById(cartridge, player.heroId);
  const heroDisplayName = getPlayerHeroDisplayName(player, hero);
  const itemIdx = player.inventory.findIndex(i => i.id === itemId);
  if (itemIdx === -1) return;
  const item = player.inventory[itemIdx];
  const useQty = Math.max(1, Math.min(item.qty || 1, AppState.modalUseQty || 1));

  stopItemTurntableAnimation();
  document.getElementById("itemDetailDialog")?.close();
  triggerHeroStageActionBurst(player.id, 1800);

  // 1. Якщо це цілюще зілля або їжа
  if (item.heal) {
    const totalHeal = item.heal * useQty;
    const oldHp = player.hp;
    player.hp = Math.min(player.maxHp, player.hp + totalHeal);
    const actualHealed = player.hp - oldHp;
    player.isDead = false;

    if ((item.qty || 1) > useQty) {
      item.qty -= useQty;
    } else {
      player.inventory.splice(itemIdx, 1);
    }

    appendInventoryActionToGeneralChat(
      player,
      hero,
      `Використовую з інвентарю «${item.name}» (x${useQty})`,
      `🧪 **${heroDisplayName}** (${hero.className}) у свій хід використовує **«${item.name}» (x${useQty})** та відновлює **+${actualHealed > 0 ? actualHealed : totalHeal} HP** (тепер ❤️ **${player.hp}/${player.maxHp} HP**)!`
    );

    showToast(`${heroDisplayName}: використано «${item.name}» (x${useQty}), +${totalHeal} HP! (Записано в Загальний чат)`);
    broadcastRoomState();
    renderApp();
    scrollToBottom();
    return;
  }

  // 2. Якщо це екіпірування (зброя, броня, артефакт) — Вдягнути або Зняти!
  if (item.slot) {
    const slotLabels = {
      weapon: "Зброя",
      armor: "Обладунок",
      accessory: "Артефакт"
    };
    if (item.equipped) {
      // Знімаємо спорядження
      item.equipped = false;
      player.equipped[item.slot] = "Не надягнено";
      appendInventoryActionToGeneralChat(
        player,
        hero,
        `Знімаю з себе «${item.name}» (${slotLabels[item.slot] || "Спорядження"})`,
        `🛡️ **${heroDisplayName}** у свій хід знімає **«${item.name}»**. Слот «${slotLabels[item.slot] || item.slot}» тепер вільний.`
      );
      showToast(`Знято: ${item.name} (відображено в Загальному чаті)`);
    } else {
      // Вдягаємо спорядження
      player.inventory.forEach(i => {
        if (i.slot === item.slot) i.equipped = false;
      });
      item.equipped = true;
      player.equipped[item.slot] = `${item.name} (${item.bonus})`;
      appendInventoryActionToGeneralChat(
        player,
        hero,
        `Вдягаю «${item.name}» (${item.bonus})`,
        `⚔️ **${heroDisplayName}** у свій хід екіпірує **«${item.name}»** (${item.bonus})!`
      );
      showToast(`Вдягнено: ${item.name} (відображено в Загальному чаті)`);
    }
    broadcastRoomState();
    renderApp();
    scrollToBottom();
    return;
  }

  // 3. Якщо це сувій, кристал, трава чи дукати — одразу публікуємо використання в Загальний чат локації!
  if ((item.qty || 1) > useQty) {
    item.qty -= useQty;
  } else {
    player.inventory.splice(itemIdx, 1);
  }

  appendInventoryActionToGeneralChat(
    player,
    hero,
    `Застосовую предмет «${item.name}» (x${useQty}) — ${item.bonus}`,
    `✨ **${heroDisplayName}** у свій хід дістає з інвентарю та застосовує **«${item.name}» (x${useQty})** (${item.bonus}). Майстер Гри враховує цей ефект на локації!`
  );

  AppState.activeBottomTab = "chat";
  AppState.chatChannel = "location";
  showToast(`Використано «${item.name}» (x${useQty}) у Загальному чаті!`);
  broadcastRoomState();
  renderApp();
  scrollToBottom();
}

// ============================================================================
// РОЗУМНИЙ АНАЛІЗАТОР МОВИ («💬 СКАЗАТИ») ТА ДІЇ («⚡ ДІЯ») У ЗАГАЛЬНОМУ ЧАТІ
// ============================================================================
const STAT_LABELS = {
  str: "Сила ⚔️",
  agi: "Спритність 🗡️",
  int: "Розум 🔮",
  cha: "Харизма 🎭"
};

function classifyPlayerAction(actionText, hero, inputMode = "say") {
  const lower = actionText.toLowerCase().trim();

  // 1. Звичайне привітання або спілкування ("привіт", "добрий день", "як справи", "хто тут") — НІКОЛИ не потребує кубика!
  const isSimpleGreetingOrTalk =
    /^(привіт|вітаю|добрий|здоров|хей|алло|слухайте|друзі|хто тут|що тут|куди йдемо|як справи|доброго|слава|гей)/i.test(lower);

  const isCrowdProvocation =
    /(штовх|вдар.*люд|пограб|обікрас|наляка|погрож|ображаю|селян|масовк|відвідувач|натовп)/.test(lower);
  const isPredatorQuery =
    /(вовк|звір|хижак|монстр).*(дорог|спита|запита|підійт|поглад)|спитати.*вовк/.test(lower);

  if (isCrowdProvocation || isPredatorQuery) {
    const gmRoll = Math.floor(Math.random() * 20) + 1;
    const isAggressive = gmRoll >= 10;
    return {
      mode: "gm_npc_roll",
      gmRoll,
      isAggressive,
      targetLabel: isPredatorQuery ? "Зграя Сірих Вовків" : "Нейтральна масовка (люди)"
    };
  }

  // 2. Якщо обрано режим «💬 Сказати (Мова)»:
  // Звичайна мова у локації НЕ вимагає кидка кубика D20!
  // Кубик на Харизму в режимі мови потрібен ТІЛЬКИ якщо гравець явно блефує, дурить варту або кричить про пожежу.
  if (inputMode === "say") {
    const isDeceptionOrShout =
      /(обдур|обман|збрех|пожеж|тривог|підкуп|заляка|наказую|прикидаюс)/.test(lower);
    if (!isDeceptionOrShout || isSimpleGreetingOrTalk) {
      return { mode: "no_roll_needed", isSpeech: true };
    }
    return {
      mode: "player_roll_required",
      stat: "cha",
      statLabel: STAT_LABELS.cha,
      bonus: hero.stats.cha || 2,
      dc: 12,
      reason: "Переконання / Хитра промова"
    };
  }

  // 3. Якщо обрано режим «⚡ Дія (Зробити)»:
  // Спокійні дії (підійти, оглянути, зайти у відкриті двері, привітатися) — без кубика!
  const isPeacefulAction =
    isSimpleGreetingOrTalk ||
    (/^(підійти|зайти|оглянути|подивитись|роздивитись|запитати|спитати|поговорити|привітатись|сісти|стати)/.test(lower) &&
      !/(обман|обдур|вкрас|вікн|дах|труб|голуб|пожеж|атак|вдар|злам|люстр)/.test(lower));

  if (isPeacefulAction) {
    return { mode: "no_roll_needed", isSpeech: false };
  }

  let stat = "agi";
  let dc = 12;
  let reason = "Ризикована дія у світі пригоди";

  if (/(вікн|дах|труб|димар|переліз|прокрас|тінь|відмичк|замок|гак|люстр|прослизн)/.test(lower)) {
    stat = "agi";
    dc = 12;
    reason = "Спритність та проникнення";
  } else if (/(голуб|ворон|птах|записк|пастк|механізм|алхім|бомб|руни|шифр|магі|сувій|кристал)/.test(lower)) {
    stat = "int";
    dc = 11;
    reason = "Смекалка та знання";
  } else if (/(закрича|пожеж|обдур|обман|підкуп|перекона|блеф|вимани|грамот|дукат|монет)/.test(lower)) {
    stat = "cha";
    dc = 12;
    reason = "Хитрість та вплив";
  } else if (/(вдар|руба|шабл|меч|атак|вибити|зламати|щит|бій|стріля)/.test(lower)) {
    stat = "str";
    dc = 13;
    reason = "Силове зіткнення / Бій";
  } else {
    stat = Object.entries(hero.stats).sort((a, b) => b[1] - a[1])[0][0];
    dc = 12;
  }

  return {
    mode: "player_roll_required",
    stat,
    statLabel: STAT_LABELS[stat],
    bonus: hero.stats[stat] || 2,
    dc,
    reason
  };
}

async function callCloudOrLocalAI(systemPrompt, userPrompt) {
  const provider = AppState.aiConfig.provider;
  const apiKey = AppState.aiConfig.apiKey.trim();

  try {
    if (provider === "free_cloud") {
      const response = await fetch("https://text.pollinations.ai/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.8
        })
      });
      if (response.ok) {
        const data = await response.json();
        return data?.choices?.[0]?.message?.content || null;
      }
    } else if (provider === "gemini" && apiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nГравець: ${userPrompt}` }] }]
        })
      });
      if (response.ok) {
        const data = await response.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
      }
    }
  } catch (err) {
    console.warn("AI fallback:", err);
  }
  return null;
}

// ============================================================================
// ОБРОБКА ЗАГАЛЬНОГО ЧАТУ ЛОКАЦІЇ (ЗА ХОДАМИ + РЕЖИМИ «СКАЗАТИ» / «ДІЯ»)
// ============================================================================
async function handlePlayerSendAction(presetText, forcedMode) {
  if (AppState.pendingCheck || AppState.isAiTyping) return;

  if (!isControlledPlayerTurn()) {
    const turnP = getCurrentTurnPlayer();
    showToast(`⏳ Зараз хід гравця ${turnP?.customHeroName || turnP?.name}! Або пишіть у «Чат Гравців та Майстра» без черги.`);
    return;
  }

  const inputEl = document.getElementById("chatActionInput");
  const actionText = (presetText !== undefined ? presetText : inputEl?.value || "").trim();
  if (!actionText) return;
  if (inputEl && presetText === undefined) inputEl.value = "";

  const mode = forcedMode || AppState.locationInputMode || "say";
  const cartridge = getActiveCartridge();
  const currentAct = cartridge.acts[AppState.currentActIndex] || cartridge.acts[0];
  const player = getControlledPlayer();
  const hero = getHeroById(cartridge, player.heroId);
  const heroDisplayName = getPlayerHeroDisplayName(player, hero);

  // Якщо гравець виконує дію переміщення в іншу підлокацію (напр. один лізе на дах, інший у каналізацію),
  // автоматично переміщуємо його фігурку на відповідний піксельний екран!
  if (mode === "act") {
    triggerHeroStageActionBurst(player.id, 1900);
    const movedZoneTitle = detectAndApplyPlayerZoneMove(player, actionText);
    if (movedZoneTitle) {
      showToast(`📍 ${heroDisplayName} переміщується: ${movedZoneTitle}`);
    }
  }

  AppState.messages.push({
    id: "msg_p_" + Date.now(),
    role: "player",
    msgMode: mode,
    heroName: heroDisplayName,
    heroClass: hero.className,
    heroEmoji: hero.avatarEmoji,
    text: actionText
  });

  const decision = classifyPlayerAction(actionText, hero, mode);

  // Режим 1: Звичайна репліка («Сказати») або мирна дія — БЕЗ КИДКА КУБИКА D20!
  if (decision.mode === "no_roll_needed") {
    AppState.isAiTyping = true;
    if (/(підійти до корчми|зайти|люд|корчмар)/.test(actionText.toLowerCase())) {
      AppState.stageModeOverride = "split";
    }
    broadcastRoomState();
    renderApp();
    scrollToBottom();

    const sysPrompt = `Ти — Майстер Гри у пригоді "${cartridge.title}". Правила світу: ${cartridge.worldRulesForAI || ""}. Локація: "${currentAct.locationName}". Ціль: "${currentAct.objective}". Герой ${heroDisplayName} (${hero.className}) ${
      decision.isSpeech ? `каже вголос у локації: "${actionText}"` : `виконує спокійну дію: "${actionText}"`
    }. Кидок кубика НЕ потрібен. Відповідай живо, атмосферно, українською мовою (2-3 речення), підтримуючи сюжет та підказуючи, що герої бачать або чують у відповідь.`;
    const aiReply = await callCloudOrLocalAI(sysPrompt, actionText);

    const lowerAct = actionText.toLowerCase();
    let localAdaptiveSpeechOrAction = null;
    if (/(дах|сидіти|чекати|сховатися на даху)/.test(lowerAct)) {
      localAdaptiveSpeechOrAction = `**${heroDisplayName}** вибирається на мокрий черепичний дах над провулком і причаюється в тіні комина. Проте починається холодна злива, черепиця стає слизькою, а знизу вулицю перекривають факели Залізної Варти з арбалетами — сидіти тут вічно неможливо, але зверху ви чудово бачите відкритий люк до підземної каналізації!`;
    } else if (/(вліво|вправо|ліворуч|праворуч|іншу вулицю|обійти)/.test(lowerAct)) {
      localAdaptiveSpeechOrAction = `**${heroDisplayName}** звертає у бічний провулок, проте бачить, що сусідні квартали вже перекриті блокпостами короля-узурпатора. На щастя, цей маневр виводить вас прямо до старого чавунного люка каналізації, куди лицарі не наважуються спускатися!`;
    } else if (/(гавк|загавк|нявк|крикн|проспіва)/.test(lowerAct)) {
      localAdaptiveSpeechOrAction = `**${heroDisplayName}** несподівано видає гучний звук посеред локації **«${currentAct.locationName}»**! Оточуючі спантеличено переглядаються — на мить це збиває ворогів із пантелику, але головна ціль все ще попереду: **${currentAct.objective}**.`;
    }

    AppState.isAiTyping = false;
    AppState.messages.push({
      id: "msg_gm_" + Date.now(),
      role: "gm",
      senderName: "Майстер Гри",
      badge: decision.isSpeech ? "💬 Мова в локації • Без кубика" : "🚶 Спокійна дія • Без кубика",
      text:
        aiReply ||
        localAdaptiveSpeechOrAction ||
        (decision.isSpeech
          ? `**${heroDisplayName}** промовляє на локації **«${currentAct.locationName}»**: *«${actionText}»*.\n\nНавколо панує напружена тиша, проте ваші слова чують союзники ${
              currentAct.hasRightSideInteraction ? "та присутні поруч" : "серед темряви королівства"
            }. Попереду залишається головна задача: **${currentAct.objective}**.`
          : `**${heroDisplayName}** спокійно виконує дію на локації **«${currentAct.locationName}»** (кидок кубика D20 не потрібен). Ви уважно оглядаєте підступи та помічаєте шляхи для досягнення цілі: **${currentAct.objective}**.`),
      suggestions: currentAct.sandboxHints
    });

    broadcastRoomState();
    renderApp();
    scrollToBottom();
    return;
  }

  // Режим 2: Кидок Майстра Гри за реакцію масовки або хижаків
  if (decision.mode === "gm_npc_roll") {
    AppState.isAiTyping = true;
    AppState.stageModeOverride = "split";
    broadcastRoomState();
    renderApp();
    scrollToBottom();

    const { gmRoll, isAggressive, targetLabel } = decision;
    if (isAggressive) {
      player.hp = Math.max(0, player.hp - 5);
      if (player.hp === 0) player.isDead = true;
    }

    const sysPrompt = `Ти — Майстер Гри. Гравець ${heroDisplayName} спровокував "${targetLabel}" дією "${actionText}". Ти як Майстер кинув D20 за реакцію NPC і випало ${gmRoll}/20 (${isAggressive ? "Вони атакують у відповідь!" : "Вони злякалися і відступили"}). Опиши це українською (3 речення).`;
    const aiReply = await callCloudOrLocalAI(sysPrompt, `Опиши реакцію ${targetLabel}.`);

    AppState.isAiTyping = false;
    AppState.messages.push({
      id: "msg_gm_roll_" + Date.now(),
      role: "gm",
      senderName: "Майстер Гри",
      gmRollData: { roll: gmRoll, targetLabel, isAggressive },
      text:
        aiReply ||
        (isAggressive
          ? `🎲 **Майстер Гри кинув D20 за «${targetLabel}»: випало ${gmRoll}/20 (Агресія!)**\n\n${targetLabel} миттєво реагують на вашу провокацію! У сутичці **${heroDisplayName}** втрачає **5 HP** (залишилось ❤️ ${player.hp}/${player.maxHp} HP).`
          : `🎲 **Майстер Гри кинув D20 за «${targetLabel}»: випало ${gmRoll}/20 (Відступ!)**\n\n${targetLabel} вирішили не ризикувати і розступилися перед вашим загоном!`),
      suggestions: currentAct.sandboxHints
    });
    broadcastRoomState();
    renderApp();
    scrollToBottom();
    return;
  }

  // Режим 3: Ризикована дія у світі — потрібен кидок D20 гравця
  AppState.pendingCheck = {
    playerId: player.id,
    heroName: heroDisplayName,
    actionText,
    stat: decision.stat,
    statLabel: decision.statLabel,
    bonus: decision.bonus,
    dc: decision.dc,
    reason: decision.reason
  };

  AppState.messages.push({
    id: "msg_check_" + Date.now(),
    role: "gm",
    senderName: "Майстер Гри",
    badge: `🎲 Кидок D20 • Складність ${decision.dc}+`,
    text: `**${heroDisplayName}** виконує ризиковану дію: *«${actionText}»*.\n\nМайстер Гри призначає перевірку (**${decision.reason}**). Киньте кубик **D20** на **${decision.statLabel}** (бонус класу **+${decision.bonus}**, потрібно **${decision.dc}+**)!`
  });

  broadcastRoomState();
  renderApp();
  scrollToBottom();
}

// ============================================================================
// ОБРОБКА ВІЛЬНОГО ЧАТУ ГРАВЦІВ ТА МАЙСТРА (ПІДКРЕСЛЕННЯ СЛОВА «МАЙСТЕР»)
// ============================================================================
function hasMasterMention(text) {
  return /(^|[^\p{L}])(майст(ер|ре|ра|ру|ром)|master)([^\p{L}]|$)/iu.test(text);
}

function formatTextWithMasterHighlight(str) {
  const safe = formatMarkdownBold(str);
  return safe.replace(
    /(^|[^\p{L}])(майст(?:ер|ре|ра|ру|ром)|master)(?=[^\p{L}]|$)/giu,
    '$1<span class="underline decoration-2 decoration-amber-400 text-amber-300 font-extrabold bg-amber-500/15 px-1 rounded">$2</span>'
  );
}

async function handlePartyChatSend(presetText) {
  const inputEl = document.getElementById("partyChatInput");
  const text = (presetText !== undefined ? presetText : inputEl?.value || "").trim();
  if (!text) return;
  if (inputEl && presetText === undefined) inputEl.value = "";

  const cartridge = getActiveCartridge();
  const currentAct = cartridge.acts[AppState.currentActIndex] || cartridge.acts[0];
  const player = getControlledPlayer();
  const hero = getHeroById(cartridge, player.heroId);
  const heroDisplayName = getPlayerHeroDisplayName(player, hero);
  const mentionedMaster = hasMasterMention(text);

  AppState.partyMessages.push({
    id: "pmsg_p_" + Date.now(),
    role: "player",
    heroName: heroDisplayName,
    heroClass: hero.className,
    heroEmoji: hero.avatarEmoji,
    mentionedMaster,
    text
  });

  broadcastRoomState();
  renderApp();
  scrollToBottom();

  // Якщо гравець звернувся зі словом «Майстер» — ШІ-Майстер Гри відповідає і дає конкретну підказку!
  if (mentionedMaster) {
    AppState.isAiTyping = true;
    renderApp();
    scrollToBottom();

    const sysPrompt = `Ти — привітний та розумний Майстер Гри у пригоді "${cartridge.title}". Зараз загін на етапі "${currentAct.title}" (локація: "${currentAct.locationName}", головна ціль: "${currentAct.objective}"). Доступні варіанти дій на локації: ${currentAct.sandboxHints.join("; ")}.
Гравець ${heroDisplayName} (${hero.className}) звернувся до тебе у чаті команди: "${text}".
Дай конкретну, корисну підказку або роз'яснення по сюжету (2-4 речення українською мовою), щоб допомогти гравцям зрозуміти, що робити далі і як пройти цей етап. Жодних кидків кубика тут не вимагай.`;
    const aiHint = await callCloudOrLocalAI(sysPrompt, text);

    AppState.isAiTyping = false;
    const hintsList = currentAct.sandboxHints.map(h => `• *${h}*`).join("\n");
    AppState.partyMessages.push({
      id: "pmsg_gm_" + Date.now(),
      role: "gm",
      senderName: "Майстер Гри (Підказка)",
      text:
        aiHint ||
        `🧙‍♂️ **Відповідь Майстра для ${heroDisplayName}:**\nЗараз ви у локації **«${currentAct.locationName}»**, і ваша головна задача — **${currentAct.objective}**.\n\nКонкретна порада, як пройти далі (перейдіть у «Загальний чат» і оберіть режим **«⚡ Дія»**):\n${hintsList}`
    });

    broadcastRoomState();
    renderApp();
    scrollToBottom();
  }
}

async function executePlayerDiceRoll() {
  if (!AppState.pendingCheck || AppState.isAiTyping) return;
  const check = AppState.pendingCheck;
  const cartridge = getActiveCartridge();
  const player = AppState.players.find(p => p.id === check.playerId) || getControlledPlayer();
  const hero = getHeroById(cartridge, player.heroId);
  const heroDisplayName = getPlayerHeroDisplayName(player, hero);

  const rawRoll = Math.floor(Math.random() * 20) + 1;
  const total = rawRoll === 1 ? 1 : rawRoll + check.bonus;
  const isCritSuccess = rawRoll === 20;
  const isCritFail = rawRoll === 1;
  const isSuccess = isCritSuccess || (!isCritFail && total >= check.dc);

  triggerHeroStageActionBurst(player.id, 2200);
  await animateDiceOverlay(rawRoll, check.bonus, total, check.dc, isSuccess, isCritSuccess, isCritFail);

  AppState.pendingCheck = null;
  AppState.isAiTyping = true;
  renderApp();
  scrollToBottom();

  let rewardArtifact = null;
  const completedActIndex = AppState.currentActIndex;
  if (isSuccess) {
    if (AppState.currentActIndex < cartridge.acts.length - 1) {
      AppState.currentActIndex += 1;
      AppState.stageModeOverride = null;
    } else {
      AppState.gameStatus = "victory";
    }

    // Ключові сюжетні предмети історії «Корона Чорної Зірки» (усі 6 сюжетних трофеїв із новими піксельними іконками):
    if (completedActIndex === 0 && window.STORY_SHACKLES_TROPHY) {
      rewardArtifact = JSON.parse(JSON.stringify(window.STORY_SHACKLES_TROPHY));
      rewardArtifact.id = "art_shackles_" + Date.now();
    } else if (completedActIndex === 2 && window.STORY_COCKROACH_SEAL) {
      rewardArtifact = JSON.parse(JSON.stringify(window.STORY_COCKROACH_SEAL));
      rewardArtifact.id = "art_cockroach_seal_" + Date.now();
    } else if (completedActIndex === 3 && window.STORY_TOXIN_ARTIFACT) {
      rewardArtifact = JSON.parse(JSON.stringify(window.STORY_TOXIN_ARTIFACT));
      rewardArtifact.id = "art_toxin_" + Date.now();
    } else if (completedActIndex === 4 && window.STORY_KNIGHT_DISGUISE) {
      rewardArtifact = JSON.parse(JSON.stringify(window.STORY_KNIGHT_DISGUISE));
      rewardArtifact.id = "art_disguise_" + Date.now();
    } else if (completedActIndex === 5 && window.STORY_WIFE_CHARM) {
      rewardArtifact = JSON.parse(JSON.stringify(window.STORY_WIFE_CHARM));
      rewardArtifact.id = "art_wife_charm_" + Date.now();
    } else if (completedActIndex >= 6 && window.STORY_BROKEN_CROWN) {
      rewardArtifact = JSON.parse(JSON.stringify(window.STORY_BROKEN_CROWN));
      rewardArtifact.id = "art_broken_crown_" + Date.now();
    } else {
      const rewards = [
        {
          id: "art_" + Date.now(),
          name: "Клинок Срібного Полум'я",
          rarityLabel: "Легендарна зброя • +4 до Сили",
          category: "items",
          slot: "weapon",
          type: "weapon",
          qty: 1,
          starred: true,
          equipped: false,
          bonus: "+4 до Сили",
          artKey: "sword",
          lore: "Древній клинок, на лезі якого танцюють іскри святого вогню. Розсікає будь-яку темряву."
        },
        {
          id: "art_" + Date.now(),
          name: "Сапфіровий Кристал Часу",
          rarityLabel: "Рідкісний артефакт • +3 до Розуму",
          category: "resources",
          slot: "accessory",
          type: "artifact",
          qty: 1,
          starred: true,
          equipped: false,
          bonus: "+3 до Розуму",
          artKey: "crystal_blue",
          lore: "Усередині цього кристала застигла блискавка. Дає власнику дар передбачення небезпеки."
        }
      ];
      rewardArtifact = rewards[Math.floor(Math.random() * rewards.length)];
    }
    player.inventory.unshift(rewardArtifact);
  } else {
    const dmg = isCritFail ? 8 : 4;
    player.hp = Math.max(0, player.hp - dmg);
    if (player.hp === 0) player.isDead = true;
  }

  const nextAct = cartridge.acts[AppState.currentActIndex] || cartridge.acts[0];
  const sysPrompt = `Ти — Майстер Гри у пригоді "${cartridge.title}". Правила світу: ${cartridge.worldRulesForAI || ""}. Герой ${heroDisplayName} (${hero.className}) зробив дію "${check.actionText}" і викинув на D20 разом з бонусом ${total} проти складності ${check.dc} (${isSuccess ? "УСПІХ!" : "ПРОВАЛ!"}). Тепер локація: ${nextAct.locationName}, ціль: ${nextAct.objective}. Опиши результат українською мовою (3-4 речення).`;
  const aiText = await callCloudOrLocalAI(sysPrompt, "Опиши результат кидка.");

  AppState.isAiTyping = false;
  AppState.messages.push({
    id: "msg_res_" + Date.now(),
    role: "gm",
    senderName: "Майстер Гри",
    rollSummary: {
      heroName: heroDisplayName,
      rawRoll,
      bonus: check.bonus,
      total,
      dc: check.dc,
      isSuccess
    },
    text:
      (aiText ||
        (isSuccess
          ? `✅ **Успіх!** Дія *«${check.actionText}»* вдалася! Ви переходите до наступної сцени: **${nextAct.title}** (${nextAct.locationName}).\n🎯 **Нова ціль:** ${nextAct.objective}`
          : `⚠️ **Невдача!** Під час спроби виконати *«${check.actionText}»* вам трохи не вистачило (${total} проти ${check.dc}). **${heroDisplayName}** втрачає здоров'я (залишилось ❤️ ${player.hp}/${player.maxHp} HP), але ви можете спробувати інший підхід!`)) +
      (rewardArtifact ? `\n\n🎁 **Новий трофей в інвентарі ${heroDisplayName}:** ⭐ **${rewardArtifact.name}** (${rewardArtifact.bonus})` : ""),
    suggestions: nextAct.sandboxHints
  });

  // Після завершення дії з кубиком хід переходить наступному гравцю (якщо гравців > 1)
  if (AppState.players.length > 1) {
    AppState.turnPlayerIndex = (AppState.turnPlayerIndex + 1) % AppState.players.length;
    AppState.activeControlPlayerId = AppState.players[AppState.turnPlayerIndex].id;
  }

  broadcastRoomState();
  renderApp();
  scrollToBottom();
}

function triggerHeroSkillFromTab(skillIndex) {
  if (!isControlledPlayerTurn()) {
    showToast("⏳ Застосовувати вміння можна лише у свій хід!");
    return;
  }
  const player = getControlledPlayer();
  const cartridge = getActiveCartridge();
  const hero = getHeroById(cartridge, player.heroId);
  const skill = hero.skills[skillIndex];
  if (!skill) return;

  AppState.activeBottomTab = "chat";
  AppState.chatChannel = "location";
  AppState.locationInputMode = "act";
  renderApp();
  handlePlayerSendAction(`Застосовую вміння класу «${skill.name}» (${skill.desc})`, "act");
}

function toggleStagePositioningMode() {
  const cartridge = getActiveCartridge();
  const currentAct = cartridge.acts[AppState.currentActIndex] || cartridge.acts[0];
  const currentIsSplit =
    AppState.stageModeOverride === "split" ||
    (AppState.stageModeOverride === null && currentAct.hasRightSideInteraction);

  AppState.stageModeOverride = currentIsSplit ? "center" : "split";
  broadcastRoomState();
  renderApp();
}

function openGameMenuOverlay() {
  const dlg = document.getElementById("gameMenuDialog");
  const content = document.getElementById("gameMenuContent");
  if (!dlg || !content) return;
  setupDialogLightDismissFallback(dlg);

  const cartridge = getActiveCartridge();
  content.innerHTML = `
    <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
      <div class="flex items-center justify-between">
        <span class="text-slate-400">Пригода:</span>
        <span class="font-extrabold text-white">${escapeHtml(cartridge.title)}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-slate-400">Код кімнати для друзів:</span>
        <span class="font-mono font-extrabold text-amber-400">#${AppState.roomCode}</span>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-slate-400">Поточний етап:</span>
        <span class="font-bold text-emerald-400">Акт ${AppState.currentActIndex + 1} з ${cartridge.acts.length}</span>
      </div>
    </div>

    <div class="space-y-1.5">
      <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Перехід між актами (для тесту сцени):</div>
      <div class="grid grid-cols-2 gap-1.5">
        ${cartridge.acts
          .map(
            (act, idx) => `
          <button onclick="AppState.currentActIndex=${idx}; AppState.stageModeOverride=null; document.getElementById('gameMenuDialog').close(); renderApp();" class="p-2 rounded-xl border text-left text-[11px] font-bold ${
              idx === AppState.currentActIndex
                ? "bg-amber-500/20 border-amber-400 text-amber-300"
                : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
            }">
            <div>Акт ${act.actNumber}</div>
            <div class="text-[10px] font-normal text-slate-400 truncate">${
              act.hasRightSideInteraction ? "Герої зліва / NPC справа" : "Герої по центру"
            }</div>
          </button>
        `
          )
          .join("")}
      </div>
    </div>

    <div class="pt-1 space-y-2">
      <button onclick="document.getElementById('gameMenuDialog').close(); openAiSettingsModal();" class="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-between">
        <span>🤖 Налаштування ШІ-Майстра Гри</span>
        <span>→</span>
      </button>
      <button onclick="document.getElementById('gameMenuDialog').close(); AppState.screen='lobby'; renderApp();" class="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-between">
        <span>👥 Кімната та Зміна Класу / Імені</span>
        <span>→</span>
      </button>
      <button onclick="document.getElementById('gameMenuDialog').close(); AppState.screen='hub'; renderApp();" class="w-full py-2.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold flex items-center justify-between">
        <span>🏠 Вийти на Стартовий Екран</span>
        <span>→</span>
      </button>
    </div>
  `;

  dlg.showModal();
}

// ============================================================================
// СИСТЕМА РОЗДІЛЕННЯ ПЕРСОНАЖІВ НА 1–4 РІЗНІ ПІКСЕЛЬНІ ЛОКАЦІЇ ОДНОЧАСНО
// ============================================================================
const SPLIT_ZONES_CATALOG = [
  {
    id: "zone_tavern",
    shortTitle: "Таверна «Під Ліхтарем»",
    bgType: "scene_tavern_cellar",
    rightEntities: [{ name: "Залізна Варта", role: "Лицарі", emoji: "⚔️", type: "enemy" }]
  },
  {
    id: "zone_alley",
    shortTitle: "Дощовий Провулок та Люк",
    bgType: "scene_alley_manhole",
    rightEntities: [{ name: "Люк у Каналізацію", role: "Спуск", emoji: "🕳️", type: "object" }]
  },
  {
    id: "zone_roof",
    shortTitle: "Слизький Дах (Злива)",
    bgType: "scene_slippery_roof",
    rightEntities: [{ name: "Арбалетники", role: "Патруль", emoji: "🏹", type: "enemy" }]
  },
  {
    id: "zone_street",
    shortTitle: "Бруківка (Застава Короля)",
    bgType: "scene_guard_post_street",
    rightEntities: [{ name: "Варта з Кліткою", role: "Блокпост", emoji: "⚔️", type: "enemy" }]
  },
  {
    id: "zone_sewer",
    shortTitle: "Тунелі Каналізації",
    bgType: "scene_sewer_outpost",
    rightEntities: [{ name: "2 Таргани-Стражі", role: "Варта", emoji: "🪳", type: "enemy" }]
  },
  {
    id: "zone_pit",
    shortTitle: "Яма Тарганячого Короля",
    bgType: "scene_cockroach_pit",
    rightEntities: [{ name: "Тарганячий Король", role: "Монарх", emoji: "👑", type: "boss" }]
  },
  {
    id: "zone_stables",
    shortTitle: "Постій Конюха (Білі Коні)",
    bgType: "scene_stablemaster_yard",
    rightEntities: [{ name: "Білі Коні з Зіркою", role: "Порода", emoji: "🐎", type: "npc" }]
  },
  {
    id: "zone_gate",
    shortTitle: "Підйомний Міст Замку",
    bgType: "scene_castle_gate_bridge",
    rightEntities: [{ name: "Варта Воріт", role: "Перевірка", emoji: "🛡️", type: "enemy" }]
  },
  {
    id: "zone_feast",
    shortTitle: "Бенкет у Дворі Замку",
    bgType: "scene_castle_feast",
    rightEntities: [{ name: "Король та Іменинник", role: "Трон", emoji: "🤴", type: "boss" }]
  },
  {
    id: "zone_royal_stables",
    shortTitle: "Королівська Стайня Замку",
    bgType: "scene_royal_stables_backyard",
    rightEntities: [{ name: "Білі Коні Принца", role: "Стійла", emoji: "🐎", type: "npc" }]
  },
  {
    id: "zone_kitchen",
    shortTitle: "Замкова Кухня (Витяжка)",
    bgType: "scene_castle_kitchen_hood",
    rightEntities: [{ name: "Головна Витяжка", role: "Шахта", emoji: "💨", type: "object" }]
  },
  {
    id: "zone_plaza",
    shortTitle: "Площа перед Замком (Фінал)",
    bgType: "scene_castle_plaza_evac",
    rightEntities: [{ name: "Кухарі та Прислуга", role: "Врятовані", emoji: "👨‍🍳", type: "npc" }]
  }
];

function detectAndApplyPlayerZoneMove(player, actionText) {
  if (!player || !actionText) return null;
  const lower = actionText.toLowerCase();
  let newZoneId = null;

  if (/(дах|черепиц|ринв|комин)/.test(lower)) newZoneId = "zone_roof";
  else if (/(каналізац|люк|тунел|підземел)/.test(lower)) newZoneId = "zone_sewer";
  else if (/(яма|тарганяч.*корол)/.test(lower)) newZoneId = "zone_pit";
  else if (/(конюх|стайн|біл.*кон|обладунк)/.test(lower)) newZoneId = "zone_stables";
  else if (/(бенкет|іменин|принц|стіл корол)/.test(lower)) newZoneId = "zone_feast";
  else if (/(кухн|витяжк|вентиляц)/.test(lower)) newZoneId = "zone_kitchen";
  else if (/(площ|за ворота|за браму|еваку|блазн.*вистав)/.test(lower)) newZoneId = "zone_plaza";
  else if (/(таверн|паб)/.test(lower)) newZoneId = "zone_tavern";

  if (newZoneId && player.zoneId !== newZoneId) {
    player.zoneId = newZoneId;
    const z = SPLIT_ZONES_CATALOG.find(item => item.id === newZoneId);
    return z ? z.shortTitle : null;
  }
  return null;
}

function setSplitLocationsCountPreset(count) {
  const cartridge = getActiveCartridge();
  // Якщо гравець тестує сам, автоматично додаємо союзників до потрібної кількості (до 4), щоб показати поділ екрана на 2, 3 або 4 локації!
  while (AppState.players.length < count && AppState.players.length < 4) {
    const takenIds = new Set(AppState.players.map(p => p.heroId));
    const freeClass = cartridge.heroes.find(h => !takenIds.has(h.id)) || cartridge.heroes[AppState.players.length];
    const slotNum = AppState.players.length + 1;
    AppState.players.push({
      id: "friend_split_" + slotNum,
      name: "Друг " + slotNum,
      heroId: freeClass.id,
      customHeroName: `${freeClass.className.split("-")[0]} ${slotNum}`.slice(0, 20),
      hp: freeClass.hp,
      maxHp: freeClass.maxHp,
      gold: 245,
      equipped: JSON.parse(JSON.stringify(freeClass.equipped)),
      inventory: JSON.parse(JSON.stringify(freeClass.inventory)),
      isDead: false,
      zoneId: null
    });
  }

  if (count <= 1) {
    // Об'єднуємо всіх персонажів в 1 поточній локації акту
    AppState.players.forEach(p => {
      p.zoneId = null;
    });
    showToast("🤝 Усі персонажі об'єдналися на одній локації (1 екран)");
  } else {
    // Розподіляємо персонажів по різних паралельних локаціях історії (2, 3 або 4 одночасно)
    const presetZoneOrders = [
      "zone_sewer",   // Локація 1: Каналізація
      "zone_roof",    // Локація 2: Дах під зливою
      "zone_stables", // Локація 3: Постій Конюха (Білі коні)
      "zone_kitchen"  // Локація 4: Замкова кухня (Витяжка)
    ];
    AppState.players.forEach((p, idx) => {
      const bucketIdx = Math.min(idx, count - 1);
      p.zoneId = presetZoneOrders[bucketIdx];
    });
    showToast(`🔀 Екран розділено на ${count} одночасні піксельні локації!`);
  }

  broadcastRoomState();
  renderApp();
}

function assignPlayerToZone(playerId, zoneIdVal) {
  const p = AppState.players.find(item => item.id === playerId);
  if (!p) return;
  p.zoneId = zoneIdVal === "act_default" ? null : zoneIdVal;
  broadcastRoomState();
  renderApp();
  openSplitPartyModal();
}

function openSplitPartyModal() {
  const dlg = document.getElementById("splitPartyDialog");
  const body = document.getElementById("splitPartyModalBody");
  if (!dlg || !body) return;
  setupDialogLightDismissFallback(dlg);

  const cartridge = getActiveCartridge();
  const currentAct = cartridge.acts[AppState.currentActIndex] || cartridge.acts[0];
  const panels = getActiveLocationPanels(cartridge, currentAct);

  body.innerHTML = `
    <div class="space-y-3 max-h-[82dvh] overflow-y-auto">
      <div class="flex items-center justify-between border-b border-slate-800 pb-2">
        <div>
          <div class="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">Піксельний Мульти-Екран (1–4 Локації)</div>
          <h3 id="splitPartyModalTitle" class="text-sm font-black text-white">🔀 Розділення Персонажів по Локаціях</h3>
        </div>
        <button onclick="document.getElementById('splitPartyDialog').close()" class="w-7 h-7 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center">×</button>
      </div>

      <p class="text-[11px] text-slate-300 leading-relaxed">
        Коли гравці розходяться різними шляхами (наприклад, один лізе на дах, другий спускається в каналізацію, третій іде до конюха, а четвертий — до витяжки на кухні), верхній екран автоматично ділиться на <b>1, 2, 3 або 4 одночасні піксельні сцени</b>!
      </p>

      <!-- Швидкий вибір кількості локацій на екрані -->
      <div class="grid grid-cols-4 gap-1.5">
        ${[1, 2, 3, 4]
          .map(
            n => `
          <button
            onclick="setSplitLocationsCountPreset(${n}); openSplitPartyModal();"
            class="py-2 px-2 rounded-xl border font-extrabold text-[11px] transition ${
              panels.length === n
                ? "bg-amber-500 text-slate-950 border-amber-300 shadow"
                : "bg-slate-950 text-slate-300 border-slate-800 hover:border-amber-400/50"
            }"
          >
            ${n} ${n === 1 ? "Локація" : "Локації"}
          </button>
        `
          )
          .join("")}
      </div>

      <!-- Індивідуальне призначення локації кожному персонажу -->
      <div class="space-y-2 pt-1">
        <div class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Де зараз перебуває кожен персонаж:</div>
        ${AppState.players
          .map(p => {
            const h = getHeroById(cartridge, p.heroId);
            const charName = getPlayerHeroDisplayName(p, h);
            return `
              <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <div class="w-9 h-10 rounded-lg bg-slate-900 border flex items-center justify-center shrink-0" style="border-color: ${h.color}">
                    ${renderGeneratedHeroPortraitSvg(h, "w-8 h-9")}
                  </div>
                  <div class="min-w-0">
                    <div class="text-xs font-black text-white truncate">${escapeHtml(charName)}</div>
                    <div class="text-[10px] text-amber-300 truncate">${escapeHtml(h.className)}</div>
                  </div>
                </div>
                <select
                  onchange="assignPlayerToZone('${p.id}', this.value)"
                  class="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-bold text-amber-300 focus:outline-none focus:border-amber-400 max-w-[165px]"
                >
                  <option value="act_default" ${!p.zoneId ? "selected" : ""}>📍 Основна (${escapeHtml(currentAct.locationName.slice(0, 18))}...)</option>
                  ${SPLIT_ZONES_CATALOG.map(
                    z => `<option value="${z.id}" ${p.zoneId === z.id ? "selected" : ""}>📍 ${escapeHtml(z.shortTitle)}</option>`
                  ).join("")}
                </select>
              </div>
            `;
          })
          .join("")}
      </div>

      <div class="flex items-center justify-between gap-2 pt-1">
        ${
          AppState.players.length < 4
            ? `<button onclick="addFriendSlotToRoom(); openSplitPartyModal();" class="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-extrabold text-xs">
                 + Додати персонажа (${AppState.players.length}/4)
               </button>`
            : ""
        }
        <button onclick="document.getElementById('splitPartyDialog').close()" class="ml-auto px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs">
          Готово ✓
        </button>
      </div>
    </div>
  `;

  dlg.showModal();
}

function getActiveLocationPanels(cartridge, currentAct) {
  const defaultHasRight =
    AppState.stageModeOverride === "split"
      ? true
      : AppState.stageModeOverride === "center"
      ? false
      : Boolean(currentAct.hasRightSideInteraction);

  const defaultRightEntities =
    defaultHasRight && currentAct.rightEntities && currentAct.rightEntities.length > 0
      ? currentAct.rightEntities
      : defaultHasRight
      ? [{ name: "Залізна Варта", role: "Патруль", emoji: "⚔️", type: "enemy" }]
      : [];

  const groupsMap = new Map();

  AppState.players.forEach(p => {
    const zoneObj = p.zoneId ? SPLIT_ZONES_CATALOG.find(z => z.id === p.zoneId) : null;
    const key = zoneObj ? zoneObj.id : "act_default";
    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        key,
        locationName: zoneObj ? zoneObj.shortTitle : currentAct.locationName,
        bgType: zoneObj ? zoneObj.bgType : currentAct.bgType,
        hasRightSide: zoneObj ? true : defaultHasRight,
        rightEntities: zoneObj ? zoneObj.rightEntities : defaultRightEntities,
        players: []
      });
    }
    groupsMap.get(key).players.push(p);
  });

  return Array.from(groupsMap.values()).slice(0, 4);
}

// ============================================================================
// РЕНДЕР ЕКРАНА ГРИ (16-BIT PIXEL ART СЦЕНА + MULTI-SCREEN 1..4 ЛОКАЦІЙ)
// ============================================================================
function renderGameScreen() {
  const cartridge = getActiveCartridge();
  const currentAct = cartridge.acts[AppState.currentActIndex] || cartridge.acts[0];
  const controlledPlayer = getControlledPlayer();
  const controlledHero = getHeroById(cartridge, controlledPlayer.heroId);
  const controlledDisplayName = getPlayerHeroDisplayName(controlledPlayer, controlledHero);
  const turnPlayer = getCurrentTurnPlayer();
  const turnHero = turnPlayer ? getHeroById(cartridge, turnPlayer.heroId) : controlledHero;
  const turnDisplayName = getPlayerHeroDisplayName(turnPlayer, turnHero);
  const hpPct = Math.max(0, Math.round((controlledPlayer.hp / controlledPlayer.maxHp) * 100));

  const panels = getActiveLocationPanels(cartridge, currentAct);
  const panelCount = panels.length; // 1, 2, 3 або 4 одночасні локації!

  // Визначаємо сітку для 1, 2, 3 або 4 одночасних локацій
  let gridClass = "grid-cols-1 grid-rows-1";
  if (panelCount === 2) {
    gridClass = "grid-cols-2 grid-rows-1 gap-1.5";
  } else if (panelCount === 3 || panelCount === 4) {
    gridClass = "grid-cols-2 grid-rows-2 gap-1.5";
  }

  return `
    <div class="flex flex-col h-full bg-slate-900 p-2.5 gap-2 select-none">
      
      <!-- 1. ВЕРХНІЙ БЛОК: «ПІКСЕЛЬНЕ ЗОБРАЖЕННЯ ГРИ» (ПІДТРИМУЄ ВІД 1 ДО 4 ЛОКАЦІЙ ОДНОЧАСНО) -->
      <section class="relative h-[38%] min-h-[212px] rounded-2xl overflow-hidden border-2 border-amber-500/50 bg-slate-950 shadow-2xl flex flex-col">
        
        <!-- Верхня шапка сцени: Чий хід + Перемикач 1-4 Локацій (Розділення персонажів) + Життя вашого героя -->
        <div class="relative z-20 px-2 py-1.5 bg-slate-950/95 border-b border-slate-800 flex items-center justify-between gap-1">
          <div class="flex items-center gap-1 min-w-0">
            <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[9px] font-extrabold text-emerald-300 truncate">
              ⏳ ${escapeHtml(turnDisplayName)}
            </span>

            <!-- Кнопки миттєвого поділу екрана на 1, 2, 3 або 4 локації -->
            <div class="flex items-center gap-0.5 bg-slate-900 px-1 py-0.5 rounded-lg border border-slate-700" title="Розділення персонажів по локаціях (1–4 одночасно)">
              ${[1, 2, 3, 4]
                .map(
                  n => `
                <button
                  onclick="setSplitLocationsCountPreset(${n})"
                  class="px-1.5 py-0.5 rounded text-[9px] font-black transition ${
                    panelCount === n
                      ? "bg-amber-400 text-slate-950"
                      : "text-slate-400 hover:text-white"
                  }"
                >
                  ${n}л
                </button>
              `
                )
                .join("")}
              <button
                onclick="openSplitPartyModal()"
                class="px-1.5 py-0.5 rounded bg-indigo-500/30 hover:bg-indigo-500/50 text-indigo-200 text-[9px] font-extrabold ml-0.5"
              >
                🔀
              </button>
            </div>
          </div>

          <!-- Показник Життя вашого персонажа ЗВЕРХУ екрана гри -->
          <div class="px-2 py-0.5 rounded-lg bg-slate-900 border border-emerald-500/40 flex items-center gap-1.5 shrink-0">
            <span class="text-[9px] font-extrabold text-white truncate max-w-[70px]">${escapeHtml(controlledDisplayName)}</span>
            <span class="text-[9px] font-black text-emerald-400">❤️${controlledPlayer.hp}/${controlledPlayer.maxHp}</span>
            <div class="w-10 bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div class="${hpPct > 35 ? "bg-emerald-400" : "bg-rose-500"} h-full" style="width: ${hpPct}%"></div>
            </div>
          </div>
        </div>

        <!-- СІТКА ЛОКАЦІЙ (1, 2, 3 або 4 піксельні екрани одночасно) -->
        <div class="relative z-10 flex-1 grid ${gridClass} p-1 bg-[#090d16] min-h-0">
          ${panels
            .map((panel, pIdx) => {
              const isCompact = panelCount >= 2;
              const isThirdWide = panelCount === 3 && pIdx === 2;
              const spanClass = isThirdWide ? "col-span-2" : "";
              const spriteSize = panelCount >= 3 ? "w-9 h-10" : panelCount === 2 ? "w-11 h-12" : "w-14 h-16";

              return `
                <div
                  class="relative rounded-xl overflow-hidden border border-slate-700/90 pixel-Stage-border flex flex-col justify-between ${spanClass}"
                  style="${getStageBackgroundStyle(panel.bgType)}"
                >
                  ${renderStageBackdropDecor(panel.bgType, isCompact)}

                  <!-- Підпис конкретної локації у вікні -->
                  <div class="relative z-10 px-2 pt-1 flex items-center justify-between gap-1">
                    <span class="px-1.5 py-0.5 rounded bg-slate-950/85 border border-amber-400/40 text-[8px] pixel-font-tag font-extrabold text-amber-300 truncate">
                      📍 ${escapeHtml(panel.locationName)}
                    </span>
                    ${
                      panelCount > 1
                        ? `<span class="px-1 py-0.2 rounded bg-slate-950/80 text-[8px] font-bold text-slate-300">Екран ${pIdx + 1}/${panelCount}</span>`
                        : ""
                    }
                  </div>

                  <!-- Персонажі в цій локації (зліва/по центру) та NPC/Вороги цієї локації (справа) -->
                  <div class="relative z-10 flex-1 flex items-end px-2.5 pb-1.5 ${
                    panel.hasRightSide ? "justify-between" : "justify-center"
                  }">
                    <!-- ГЕРОЇ НА ЦІЙ ЛОКАЦІЇ -->
                    <div class="flex items-end ${isCompact ? "gap-1.5" : "gap-3"}">
                      ${panel.players
                        .map((p, idx) => {
                          const h = getHeroById(cartridge, p.heroId);
                          const isTurn = turnPlayer && turnPlayer.id === p.id;
                          const charName = getPlayerHeroDisplayName(p, h);
                          const isLunging =
                            AppState.heroActionBurstUntil &&
                            AppState.heroActionBurstUntil[p.id] > Date.now();
                          return `
                            <div
                              onclick="AppState.activeControlPlayerId='${p.id}'; renderApp();"
                              ondblclick="event.stopPropagation(); cycleHeroStagePose('${p.id}');"
                              title="Натисніть для вибору • Подвійний клік змінює ракурс (4 пози)"
                              class="cursor-pointer flex flex-col items-center group"
                            >
                              <div
                                class="mb-0.5 px-1.5 py-0.2 rounded bg-slate-950/90 border text-center shadow flex items-center gap-1"
                                style="border-color: ${h.color}; box-shadow: 0 0 6px ${h.color}66;"
                              >
                                <span class="${isCompact ? "text-[8px]" : "text-[9px]"} pixel-font-tag font-extrabold text-white whitespace-nowrap">
                                  ${escapeHtml(charName)}
                                </span>
                                <span
                                  onclick="event.stopPropagation(); cycleHeroStagePose('${p.id}');"
                                  title="Змінити позу спрайта (Спереду / 3/4 / Стійка / Атака)"
                                  class="text-[8px] text-amber-300 hover:text-white px-0.5 rounded bg-slate-900/90"
                                >🔄</span>
                              </div>

                              <div class="relative ${isLunging ? "animate-hero-lunge" : "animate-hero-idle"} flex flex-col items-center" style="animation-delay: ${idx * 0.3}s;">
                                <div
                                  class="relative p-0.5 rounded-lg bg-slate-950/45 border flex items-center justify-center"
                                  style="border-color: ${h.color}; box-shadow: 0 0 ${isTurn ? "12px" : "4px"} ${h.color}66;"
                                >
                                  ${p.isDead ? `<span class="text-base">💀</span>` : renderGeneratedHeroPortraitSvg(h, spriteSize, null, p.id)}
                                </div>
                              </div>
                            </div>
                          `;
                        })
                        .join("")}
                    </div>

                    <!-- СПРАВА: ПІКСЕЛЬНІ ВОРОГИ, БОСИ АБО NPC ЦІЄЇ ЛОКАЦІЇ -->
                    ${
                      panel.hasRightSide
                        ? `
                      <div class="flex items-end ${isCompact ? "gap-1" : "gap-2"}">
                        ${panel.rightEntities
                          .slice(0, isCompact ? 1 : 2)
                          .map(
                            (ent, idx) => `
                          <div onclick="interactWithRightEntity('${escapeQuotes(ent.name)}')" class="cursor-pointer flex flex-col items-center group">
                            <div class="mb-0.5 px-1.5 py-0.2 rounded bg-slate-950/90 border ${
                              ent.type === "boss" || ent.type === "enemy"
                                ? "border-rose-500/70 text-rose-200"
                                : "border-amber-400/70 text-amber-200"
                            } text-center">
                              <div class="${isCompact ? "text-[8px]" : "text-[9px]"} pixel-font-tag font-extrabold whitespace-nowrap">${escapeHtml(ent.name)}</div>
                            </div>

                            <div class="relative animate-npc-float flex flex-col items-center" style="animation-delay: ${idx * 0.4}s;">
                              <div class="p-0.5 rounded-lg bg-slate-950/45 border ${
                                ent.type === "boss" || ent.type === "enemy"
                                  ? "border-rose-500/60"
                                  : "border-amber-400/60"
                              } flex items-center justify-center group-hover:scale-105 transition">
                                ${renderPixelEntitySpriteSvg(ent, spriteSize)}
                              </div>
                            </div>
                          </div>
                        `
                          )
                          .join("")}
                      </div>
                    `
                        : ""
                    }
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </section>

      <!-- 2. СЕРЕДНІЙ БЛОК (ЧАТ / ПЕРСОНАЖ / ІНВЕНТАР) -->
      <section class="flex-1 min-h-0 rounded-2xl bg-slate-950 border-2 border-slate-800 flex flex-col overflow-hidden shadow-lg">
        ${
          AppState.activeBottomTab === "chat"
            ? renderDualChatBox(controlledPlayer, controlledHero)
            : AppState.activeBottomTab === "character"
            ? renderCharacterBox(controlledPlayer, controlledHero, cartridge)
            : renderInventoryBox(controlledPlayer, controlledHero)
        }
      </section>

      <!-- 3. НИЖНІЙ РЯД ІЗ 4 ОКРЕМИХ КНОПОК -->
      <nav class="grid grid-cols-4 gap-2 h-14">
        <button onclick="AppState.activeBottomTab='chat'; renderApp(); scrollToBottom();" class="rounded-xl border-2 font-extrabold text-xs flex flex-col items-center justify-center transition ${
          AppState.activeBottomTab === "chat"
            ? "bg-amber-500 text-slate-950 border-amber-300 shadow-md"
            : "bg-slate-950 text-slate-200 border-slate-800 hover:border-slate-700"
        }">
          <span>${t("chatTab")}</span>
        </button>

        <button onclick="AppState.activeBottomTab='character'; renderApp();" class="rounded-xl border-2 font-extrabold text-xs flex flex-col items-center justify-center transition ${
          AppState.activeBottomTab === "character"
            ? "bg-amber-500 text-slate-950 border-amber-300 shadow-md"
            : "bg-slate-950 text-slate-200 border-slate-800 hover:border-slate-700"
        }">
          <span>${t("charTab")}</span>
        </button>

        <button onclick="AppState.activeBottomTab='inventory'; renderApp();" class="rounded-xl border-2 font-extrabold text-xs flex flex-col items-center justify-center transition ${
          AppState.activeBottomTab === "inventory"
            ? "bg-amber-500 text-slate-950 border-amber-300 shadow-md"
            : "bg-slate-950 text-slate-200 border-slate-800 hover:border-slate-700"
        }">
          <span>${t("invTab")}</span>
        </button>

        <button onclick="openGameMenuOverlay()" class="rounded-xl border-2 bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-slate-600 font-extrabold text-xs flex flex-col items-center justify-center transition">
          <span>${t("menuTab")}</span>
        </button>
      </nav>

    </div>
  `;
}

// ============================================================================
// 12 РЕАЛЬНИХ 16-BIT JRPG ПІКСЕЛЬНИХ ФОНІВ ЛОКАЦІЙ + АНІМОВАНІ ЕФЕКТИ СЕРЕДОВИЩА
// ============================================================================
const STAGE_LOCATION_ART_MAP = {
  scene_tavern_cellar: {
    src: "assets/locations/loc_01_secret_tavern.jpg",
    fallbackColor: "#271912",
    fx: "embers"
  },
  tavern: {
    src: "assets/locations/loc_01_secret_tavern.jpg",
    fallbackColor: "#271912",
    fx: "embers"
  },
  scene_alley_manhole: {
    src: "assets/locations/loc_02_rainy_alley_manhole.jpg",
    fallbackColor: "#111b29",
    fx: "rain_vapor"
  },
  scene_slippery_roof: {
    src: "assets/locations/loc_03_slippery_roof_rain.jpg",
    fallbackColor: "#0d1726",
    fx: "rain"
  },
  scene_guard_post_street: {
    src: "assets/locations/loc_04_blockade_street.jpg",
    fallbackColor: "#1d2432",
    fx: "rain"
  },
  scene_sewer_outpost: {
    src: "assets/locations/loc_05_sewer_tunnels.jpg",
    fallbackColor: "#0f2922",
    fx: "vapor"
  },
  scene_cockroach_pit: {
    src: "assets/locations/loc_06_cockroach_king_pit.jpg",
    fallbackColor: "#1b1326",
    fx: "vapor"
  },
  boss: {
    src: "assets/locations/loc_06_cockroach_king_pit.jpg",
    fallbackColor: "#1b1326",
    fx: "vapor"
  },
  scene_stablemaster_yard: {
    src: "assets/locations/loc_07_stablemaster_yard.jpg",
    fallbackColor: "#293325",
    fx: "embers"
  },
  road: {
    src: "assets/locations/loc_07_stablemaster_yard.jpg",
    fallbackColor: "#293325",
    fx: "embers"
  },
  scene_castle_gate_bridge: {
    src: "assets/locations/loc_08_castle_drawbridge.jpg",
    fallbackColor: "#1e293b",
    fx: "embers"
  },
  scene_castle_feast: {
    src: "assets/locations/loc_09_castle_feast_courtyard.jpg",
    fallbackColor: "#2e151b",
    fx: "embers"
  },
  scene_royal_stables_backyard: {
    src: "assets/locations/loc_10_royal_stables_backyard.jpg",
    fallbackColor: "#2d2116",
    fx: "embers"
  },
  scene_castle_kitchen_hood: {
    src: "assets/locations/loc_11_castle_kitchen_hood.jpg",
    fallbackColor: "#241917",
    fx: "vapor"
  },
  scene_castle_plaza_evac: {
    src: "assets/locations/loc_12_castle_plaza_evac.jpg",
    fallbackColor: "#143326",
    fx: "vapor"
  }
};

function getStageBackgroundStyle(bgType) {
  const cfg = STAGE_LOCATION_ART_MAP[bgType] || STAGE_LOCATION_ART_MAP.scene_castle_plaza_evac;
  return `background-color: ${cfg.fallbackColor};`;
}

function renderStageBackdropDecor(bgType, isCompact = false) {
  const cfg = STAGE_LOCATION_ART_MAP[bgType] || STAGE_LOCATION_ART_MAP.scene_castle_plaza_evac;
  const fxType = cfg.fx || "embers";

  let fxOverlayHtml = "";
  if (fxType === "rain" || fxType === "rain_vapor") {
    const drops = isCompact ? [14, 38, 66, 86] : [10, 24, 39, 55, 71, 84, 93];
    fxOverlayHtml += drops
      .map(
        (leftPct, idx) =>
          `<div class="absolute top-0 w-[1.5px] h-5 bg-sky-300/65 animate-pixel-rain pointer-events-none" style="left:${leftPct}%; animation-delay:${(idx * 0.14).toFixed(2)}s;"></div>`
      )
      .join("");
  }

  if (fxType === "vapor" || fxType === "rain_vapor") {
    const plumes = isCompact ? [28, 72] : [20, 46, 74, 88];
    fxOverlayHtml += plumes
      .map(
        (leftPct, idx) =>
          `<div class="absolute bottom-3 w-2.5 h-2.5 rounded-full bg-emerald-400/55 blur-[1px] animate-toxin-vapor pointer-events-none" style="left:${leftPct}%; animation-delay:${(idx * 0.55).toFixed(2)}s;"></div>`
      )
      .join("");
  }

  if (fxType === "embers") {
    const sparks = isCompact ? [22, 68] : [16, 38, 64, 85];
    fxOverlayHtml += sparks
      .map(
        (leftPct, idx) =>
          `<div class="absolute bottom-4 w-1.5 h-1.5 rounded-full bg-amber-300/80 shadow-[0_0_6px_#fbbf24] animate-ember pointer-events-none" style="left:${leftPct}%; animation-delay:${(idx * 0.6).toFixed(2)}s;"></div>`
      )
      .join("");
  }

  return `
    <img
      src="${cfg.src}"
      alt=""
      class="absolute inset-0 w-full h-full object-cover pointer-events-none pixel-stage"
      style="image-rendering: pixelated; filter: contrast(1.04) saturate(1.06);"
    />
    <div class="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-slate-950/35 pointer-events-none"></div>
    ${fxOverlayHtml}
  `;
}

function interactWithRightEntity(entityName) {
  AppState.activeBottomTab = "chat";
  AppState.chatChannel = "location";
  AppState.locationInputMode = "act";
  renderApp();
  const input = document.getElementById("chatActionInput");
  if (input) {
    input.value = `Підходжу до «${entityName}» і взаємодію`;
    input.focus();
  }
}

// ============================================================================
// ДВОКАНАЛЬНИЙ БЛОК «ЧАТ»:
// 1) 🌍 Загальний чат локації (за ходами + перемикач [💬 Сказати] / [⚡ Дія])
// 2) 💬 Чат Гравців та Майстра (вільний будь-коли + підкреслення слова «Майстер»)
// ============================================================================
function renderDualChatBox(controlledPlayer, controlledHero) {
  const isLocationChat = AppState.chatChannel === "location";
  const heroDisplayName = getPlayerHeroDisplayName(controlledPlayer, controlledHero);
  const turnPlayer = getCurrentTurnPlayer();
  const isMyTurn = isControlledPlayerTurn();

  return `
    <div class="flex-1 min-h-0 flex flex-col">
      <!-- Перемикач між двома чатами + кнопка передачі ходу -->
      <div class="px-2.5 pt-2 pb-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-1.5">
        <div class="grid grid-cols-2 gap-1.5 flex-1">
          <button
            onclick="AppState.chatChannel='location'; renderApp(); scrollToBottom();"
            class="py-1.5 px-2 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 transition ${
              isLocationChat
                ? "bg-amber-500 text-slate-950 shadow"
                : "bg-slate-950 text-slate-400 border border-slate-800"
            }"
          >
            <span>🌍 Загальний (Локація)</span>
          </button>
          <button
            onclick="AppState.chatChannel='party'; renderApp(); scrollToBottom();"
            class="py-1.5 px-2 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 transition ${
              !isLocationChat
                ? "bg-indigo-500 text-white shadow"
                : "bg-slate-950 text-slate-400 border border-slate-800"
            }"
          >
            <span>💬 Гравці та Майстер</span>
          </button>
        </div>

        ${
          AppState.players.length > 1
            ? `<button onclick="advanceTurnToNextPlayer()" title="Передати хід наступному гравцю" class="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-bold text-amber-300 shrink-0">
                 Хід ⏭️
               </button>`
            : ""
        }
      </div>

      ${
        isLocationChat
          ? renderLocationChatBody(controlledPlayer, controlledHero, heroDisplayName, turnPlayer, isMyTurn)
          : renderPartyMasterChatBody(controlledPlayer, controlledHero, heroDisplayName)
      }
    </div>
  `;
}

function renderLocationChatBody(controlledPlayer, controlledHero, heroDisplayName, turnPlayer, isMyTurn) {
  const isSayMode = AppState.locationInputMode === "say";

  return `
    <div id="chatScrollContainer" class="flex-1 overflow-y-auto px-3 py-2.5 space-y-2.5">
      ${AppState.messages
        .map(m => {
          if (m.role === "player") {
            const modeBadge =
              m.msgMode === "act"
                ? `<span class="px-1.5 py-0.5 rounded bg-amber-500/30 border border-amber-400/50 text-amber-200 text-[9px] font-black uppercase">⚡ Дія</span>`
                : `<span class="px-1.5 py-0.5 rounded bg-sky-500/25 border border-sky-400/40 text-sky-200 text-[9px] font-black uppercase">💬 Сказав</span>`;
            return `
              <div class="flex flex-col items-end">
                <div class="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5 font-semibold">
                  ${modeBadge}
                  <span>${escapeHtml(m.heroName)}</span>
                </div>
                <div class="max-w-[85%] rounded-2xl rounded-tr-sm px-3 py-2 ${
                  m.msgMode === "act"
                    ? "bg-amber-500/20 border border-amber-500/45 text-amber-100"
                    : "bg-sky-500/15 border border-sky-500/35 text-slate-100"
                } text-xs">
                  ${escapeHtml(m.text)}
                </div>
              </div>
            `;
          }

          return `
            <div class="flex flex-col items-start">
              <div class="flex items-center gap-1.5 mb-1">
                <span class="text-[11px] font-extrabold text-amber-400">🧙‍♂️ ${escapeHtml(m.senderName || "Майстер Гри")}</span>
                ${
                  m.badge
                    ? `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-900 text-amber-300 border border-slate-700">${escapeHtml(m.badge)}</span>`
                    : ""
                }
              </div>

              <div class="w-full rounded-2xl rounded-tl-sm p-3 bg-slate-900 border border-slate-800 text-xs text-slate-200 leading-relaxed space-y-2">
                ${
                  m.gmRollData
                    ? `
                  <div class="p-2 rounded-xl border ${
                    m.gmRollData.isAggressive
                      ? "bg-rose-950/60 border-rose-500/50 text-rose-200"
                      : "bg-emerald-950/60 border-emerald-500/50 text-emerald-200"
                  } flex items-center justify-between">
                    <span class="text-[11px] font-bold">🎲 Кидок Майстра за «${escapeHtml(m.gmRollData.targetLabel)}»:</span>
                    <span class="text-sm font-extrabold px-2 py-0.5 rounded bg-black/40">${m.gmRollData.roll}/20</span>
                  </div>
                `
                    : ""
                }

                ${
                  m.rollSummary
                    ? `
                  <div class="p-2 rounded-xl border ${
                    m.rollSummary.isSuccess
                      ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-200"
                      : "bg-rose-950/50 border-rose-500/40 text-rose-200"
                  } flex items-center justify-between">
                    <span class="text-[11px] font-bold">🎲 Кидок ${escapeHtml(m.rollSummary.heroName)}: ${m.rollSummary.rawRoll} + ${m.rollSummary.bonus} = ${m.rollSummary.total} (ціль ${m.rollSummary.dc}+)</span>
                    <span class="text-xs font-extrabold">${m.rollSummary.isSuccess ? "УСПІХ" : "ПРОВАЛ"}</span>
                  </div>
                `
                    : ""
                }

                <div class="whitespace-pre-line">${formatMarkdownBold(m.text)}</div>

                ${
                  m.suggestions && m.suggestions.length > 0 && !AppState.pendingCheck
                    ? `
                  <div class="pt-1 flex flex-wrap gap-1.5">
                    ${m.suggestions
                      .map(
                        s => `
                      <button onclick="AppState.locationInputMode='act'; handlePlayerSendAction('${escapeQuotes(s)}', 'act')" class="text-left px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-[10px] text-amber-300 transition">
                        ⚡ ${escapeHtml(s)}
                      </button>
                    `
                      )
                      .join("")}
                  </div>
                `
                    : ""
                }
              </div>
            </div>
          `;
        })
        .join("")}

      ${
        AppState.isAiTyping
          ? `<div class="text-xs text-amber-300 animate-pulse px-2">🧙‍♂️ Майстер Гри описує подію...</div>`
          : ""
      }
    </div>

    ${
      AppState.pendingCheck
        ? `
      <div class="px-3 py-2 bg-amber-500/15 border-t border-amber-500/40 flex items-center justify-between gap-2">
        <div class="text-xs">
          <div class="font-extrabold text-amber-300">🎲 Потрібен кидок D20: ${escapeHtml(AppState.pendingCheck.statLabel)}</div>
          <div class="text-[11px] text-slate-300">Бонус +${AppState.pendingCheck.bonus} • Ціль: ${AppState.pendingCheck.dc}+</div>
        </div>
        <button onclick="executePlayerDiceRoll()" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg animate-bounce">
          🎲 Кинути D20
        </button>
      </div>
    `
        : ""
    }

    <!-- Нижня панель вводу в Загальний чат: перемикач [💬 Сказати] / [⚡ Дія] -->
    <div class="p-2 bg-slate-900/95 border-t border-slate-800 space-y-1.5">
      <div class="flex items-center justify-between gap-1.5">
        <div class="flex items-center gap-1">
          <button
            type="button"
            onclick="AppState.locationInputMode='say'; renderApp();"
            class="px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition ${
              isSayMode
                ? "bg-sky-500 text-slate-950 shadow"
                : "bg-slate-950 text-slate-400 border border-slate-800"
            }"
          >
            💬 Сказати (Мова • без кубика)
          </button>
          <button
            type="button"
            onclick="AppState.locationInputMode='act'; renderApp();"
            class="px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition ${
              !isSayMode
                ? "bg-amber-500 text-slate-950 shadow"
                : "bg-slate-950 text-slate-400 border border-slate-800"
            }"
          >
            ⚡ Дія (Зробити хід)
          </button>
        </div>
        <span class="text-[10px] text-slate-400 truncate">
          ${isMyTurn ? `Хід: ${escapeHtml(heroDisplayName)}` : `⏳ Хід: ${escapeHtml(turnPlayer?.customHeroName || "")}`}
        </span>
      </div>

      <form onsubmit="event.preventDefault(); handlePlayerSendAction();" class="flex items-center gap-2">
        <input
          id="chatActionInput"
          type="text"
          ${AppState.pendingCheck || !isMyTurn ? "disabled" : ""}
          placeholder="${
            AppState.pendingCheck
              ? "Киньте кубик D20 вище..."
              : !isMyTurn
              ? "Зараз хід іншого гравця (або пишіть у Чат Гравців)..."
              : isSayMode
              ? `💬 Сказати від імені ${heroDisplayName} (напр. «Привіт усім!») `
              : `⚡ Опишіть дію ${heroDisplayName} (напр. «Залізти у вікно»)...`
          }"
          class="flex-1 px-3 py-2 rounded-xl bg-slate-950 border ${
            isSayMode ? "border-sky-500/50 focus:border-sky-400" : "border-amber-500/50 focus:border-amber-400"
          } text-xs text-white placeholder-slate-400 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          ${AppState.pendingCheck || !isMyTurn ? "disabled" : ""}
          class="px-3.5 py-2 rounded-xl ${
            isSayMode ? "bg-sky-500 hover:bg-sky-400" : "bg-amber-500 hover:bg-amber-400"
          } disabled:opacity-40 text-slate-950 font-extrabold text-xs transition"
        >
          ${isSayMode ? "Сказати" : "Дія"}
        </button>
      </form>
    </div>
  `;
}

function renderPartyMasterChatBody(controlledPlayer, controlledHero, heroDisplayName) {
  return `
    <div id="chatScrollContainer" class="flex-1 overflow-y-auto px-3 py-2.5 space-y-2.5">
      <div class="p-2 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-200">
        💡 Вільно спілкуйтеся з друзями у будь-який момент! Щоб звернутися до ШІ по підказку, напишіть у повідомленні слово <span class="underline decoration-2 decoration-amber-400 text-amber-300 font-extrabold">Майстер</span>.
      </div>

      ${AppState.partyMessages
        .map(m => {
          if (m.role === "player") {
            return `
              <div class="flex flex-col items-end">
                <div class="text-[10px] text-slate-400 mb-0.5 font-semibold">
                  ${escapeHtml(m.heroName)} (${escapeHtml(m.heroClass || "")})
                </div>
                <div class="max-w-[85%] rounded-2xl rounded-tr-sm px-3 py-2 bg-indigo-500/20 border border-indigo-400/40 text-xs text-slate-100">
                  ${formatTextWithMasterHighlight(m.text)}
                </div>
              </div>
            `;
          }

          return `
            <div class="flex flex-col items-start">
              <div class="text-[11px] font-extrabold text-amber-400 mb-0.5">🧙‍♂️ ${escapeHtml(m.senderName || "Майстер Гри")}</div>
              <div class="w-full rounded-2xl rounded-tl-sm p-3 bg-slate-900 border border-amber-500/40 text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                ${formatTextWithMasterHighlight(m.text)}
              </div>
            </div>
          `;
        })
        .join("")}

      ${
        AppState.isAiTyping
          ? `<div class="text-xs text-amber-300 animate-pulse px-2">🧙‍♂️ Майстер Гри готує підказку...</div>`
          : ""
      }
    </div>

    <!-- Швидкі звернення до Майстра -->
    <div class="px-2.5 pt-1.5 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto">
      <button onclick="handlePartyChatSend('Майстер, дай підказку, що нам краще зробити на цій локації?')" class="px-2 py-1 rounded-lg bg-slate-950 border border-amber-500/40 text-[10px] text-amber-300 whitespace-nowrap">
        💡 <span class="underline">Майстер</span>, дай підказку!
      </button>
      <button onclick="handlePartyChatSend('Майстер, які деталі ми бачимо навколо себе?')" class="px-2 py-1 rounded-lg bg-slate-950 border border-amber-500/40 text-[10px] text-amber-300 whitespace-nowrap">
        🔍 <span class="underline">Майстер</span>, більше конкретики
      </button>
    </div>

    <form onsubmit="event.preventDefault(); handlePartyChatSend();" class="p-2 bg-slate-900 flex items-center gap-2">
      <input
        id="partyChatInput"
        type="text"
        placeholder="Напишіть друзям або зверніться: «Майстер, підкажи...»"
        class="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-indigo-500/50 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
      />
      <button type="submit" class="px-3.5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-xs">
        Надіслати
      </button>
    </form>
  `;
}

// ============================================================================
// ВКЛАДКА «ПЕРСОНАЖ» — СУТО ВАШ ПЕРСОНАЖ + КНОПКА ПЕРЕГЛЯДУ ІНШИХ (БЕЗ ІНВЕНТАРЮ)
// ============================================================================
function openAlliesModal() {
  const dlg = document.getElementById("alliesDialog");
  const body = document.getElementById("alliesModalBody");
  if (!dlg || !body) return;
  setupDialogLightDismissFallback(dlg);

  const cartridge = getActiveCartridge();
  const myPlayer = getControlledPlayer();
  const otherPlayers = AppState.players.filter(p => p.id !== myPlayer?.id);

  body.innerHTML = `
    <div class="space-y-3 max-h-[80dvh] overflow-y-auto">
      <div class="flex items-center justify-between border-b border-slate-800 pb-2">
        <div>
          <div class="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">Загін у кімнаті #${AppState.roomCode}</div>
          <h3 id="alliesModalTitle" class="text-sm font-black text-white">👥 Інші персонажі (без інвентарю)</h3>
        </div>
        <button onclick="document.getElementById('alliesDialog').close()" class="w-7 h-7 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center">×</button>
      </div>

      ${
        otherPlayers.length === 0
          ? `<div class="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
               <div class="text-xs text-slate-300">Поки що ви граєте самі в кімнаті.</div>
               <button onclick="document.getElementById('alliesDialog').close(); AppState.screen='lobby'; renderApp();" class="px-3.5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs">
                 + Додати друзів у кімнаті
               </button>
             </div>`
          : otherPlayers
              .map(p => {
                const h = getHeroById(cartridge, p.heroId);
                const dispName = getPlayerHeroDisplayName(p, h);
                const eq = p.equipped || h.equipped || {};
                return `
                  <div class="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2.5">
                        <div class="w-11 h-12 rounded-xl bg-slate-900 border flex items-center justify-center" style="border-color: ${h.color}">
                          ${renderGeneratedHeroPortraitSvg(h, "w-9 h-11")}
                        </div>
                        <div>
                          <div class="text-xs font-black text-white">${escapeHtml(dispName)}</div>
                          <div class="text-[11px] font-semibold text-amber-300">${escapeHtml(h.className)}</div>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="text-xs font-extrabold text-emerald-400">❤️ ${p.hp}/${p.maxHp} HP</div>
                        <div class="text-[11px] text-amber-300">🪙 ${p.gold} золота</div>
                      </div>
                    </div>

                    <div class="text-[11px] text-slate-300 space-y-0.5 bg-slate-900/70 p-2 rounded-xl">
                      <div>⚔️ <b>Зброя:</b> ${escapeHtml(eq.weapon || "Не надягнено")}</div>
                      <div>🛡️ <b>Броня:</b> ${escapeHtml(eq.armor || "Не надягнено")}</div>
                    </div>

                    <div class="space-y-1">
                      <div class="text-[10px] font-extrabold uppercase text-slate-400">⚡ Вміння союзника:</div>
                      ${h.skills
                        .map(
                          s => `<div class="text-[11px] text-slate-200">• <b>${escapeHtml(s.name)}:</b> ${escapeHtml(s.desc)}</div>`
                        )
                        .join("")}
                    </div>
                  </div>
                `;
              })
              .join("")
      }
    </div>
  `;

  dlg.showModal();
}

function renderCharacterBox(player, hero, cartridge) {
  const hpPct = Math.max(0, Math.round((player.hp / player.maxHp) * 100));
  const equipped = player.equipped || hero.equipped || {};
  const heroDisplayName = getPlayerHeroDisplayName(player, hero);
  const otherCount = Math.max(0, AppState.players.length - 1);

  return `
    <div class="flex-1 overflow-y-auto p-3.5 space-y-3">
      <!-- Шапка: Тільки Мій Персонаж + кнопка перегляду союзників -->
      <div class="flex items-center justify-between gap-2">
        <div class="text-xs font-extrabold uppercase tracking-wider text-amber-400">
          👤 Мій Персонаж
        </div>
        <button
          onclick="openAlliesModal()"
          class="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-extrabold text-sky-300 flex items-center gap-1.5 transition"
        >
          <span>👥 Переглянути союзників (${otherCount})</span>
        </button>
      </div>

      <!-- Картка вашого персонажа + Інтерактивний перемикач 4 ракурсів спрайта -->
      <div class="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-14 h-16 rounded-2xl bg-slate-950 border-2 flex items-center justify-center shrink-0 animate-hero-idle" style="border-color: ${hero.color}">
              ${renderGeneratedHeroPortraitSvg(hero, "w-12 h-14", null, player.id)}
            </div>
            <div>
              <div class="text-sm font-black text-white">${escapeHtml(heroDisplayName)}</div>
              <div class="text-xs text-amber-300 font-bold">${escapeHtml(hero.className)}</div>
              <div class="text-[10px] text-slate-400">${escapeHtml(hero.role)}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-xs font-extrabold text-emerald-400">❤️ ${player.hp} / ${player.maxHp} HP</div>
            <div class="text-[11px] text-amber-300 font-bold">🪙 ${player.gold} золота</div>
          </div>
        </div>

        <div class="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
          <div class="${hpPct > 35 ? "bg-emerald-500" : "bg-rose-500"} h-full transition-all" style="width: ${hpPct}%"></div>
        </div>

        <!-- Перемикач 4 бойових поз героя на сцені -->
        <div class="pt-1 border-t border-slate-800/80 space-y-1.5">
          <div class="flex items-center justify-between text-[10px] font-extrabold text-slate-400">
            <span>🎬 Ракурс і анімація фігурки на сцені:</span>
            <button onclick="AppState.heroManualPose['${player.id}']=null; renderApp();" class="text-amber-300 hover:underline">Авто-дихання</button>
          </div>
          <div class="grid grid-cols-4 gap-1.5">
            ${[
              { pose: "front", label: "Спереду" },
              { pose: "back", label: "3/4 Спина" },
              { pose: "idle", label: "Стійка" },
              { pose: "action", label: "Удар / Чари" }
            ]
              .map(pItem => {
                const isActive = (AppState.heroManualPose?.[player.id] || "") === pItem.pose;
                return `
                  <button
                    onclick="AppState.heroManualPose = AppState.heroManualPose || {}; AppState.heroManualPose['${player.id}']='${pItem.pose}'; renderApp();"
                    class="p-1.5 rounded-xl border flex flex-col items-center gap-0.5 transition ${
                      isActive
                        ? "bg-amber-500/20 border-amber-400 text-amber-300"
                        : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                    }"
                  >
                    <div class="w-9 h-10 flex items-center justify-center">
                      ${renderGeneratedHeroPortraitSvg(hero, "w-8 h-9", pItem.pose)}
                    </div>
                    <span class="text-[9px] font-bold">${pItem.label}</span>
                  </button>
                `;
              })
              .join("")}
          </div>
        </div>
      </div>

      <!-- Що зараз надягнене на персонажі (можна зняти/вдягнути у свій хід) -->
      <div class="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-extrabold uppercase tracking-wider text-amber-400">
            🛡️ Що зараз надягнене:
          </span>
          <span class="text-[10px] text-slate-400">Зміна — у свій хід через Інвентар</span>
        </div>
        <div class="space-y-1.5 text-xs">
          <div class="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span class="text-slate-400">⚔️ Зброя:</span>
            <span class="font-bold text-white">${escapeHtml(equipped.weapon || "Не надягнено")}</span>
          </div>
          <div class="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span class="text-slate-400">🦺 Обладунок:</span>
            <span class="font-bold text-white">${escapeHtml(equipped.armor || "Не надягнено")}</span>
          </div>
          <div class="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span class="text-slate-400">💍 Артефакт:</span>
            <span class="font-bold text-amber-300">${escapeHtml(equipped.accessory || "Не надягнено")}</span>
          </div>
        </div>
      </div>

      <!-- Унікальні вміння та характеристики -->
      <div class="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
        <div class="text-xs font-extrabold uppercase tracking-wider text-amber-400">
          ⚡ Мої вміння та характеристики:
        </div>
        <div class="grid grid-cols-4 gap-1.5 text-center pb-1">
          <div class="p-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <div class="text-[10px] text-slate-400">Сила</div>
            <div class="text-xs font-extrabold text-white">+${hero.stats.str}</div>
          </div>
          <div class="p-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <div class="text-[10px] text-slate-400">Спритн.</div>
            <div class="text-xs font-extrabold text-white">+${hero.stats.agi}</div>
          </div>
          <div class="p-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <div class="text-[10px] text-slate-400">Розум</div>
            <div class="text-xs font-extrabold text-white">+${hero.stats.int}</div>
          </div>
          <div class="p-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <div class="text-[10px] text-slate-400">Харизма</div>
            <div class="text-xs font-extrabold text-white">+${hero.stats.cha}</div>
          </div>
        </div>

        ${hero.skills
          .map(
            (s, idx) => `
          <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
            <div>
              <div class="text-xs font-bold text-white">⚡ ${escapeHtml(s.name)}</div>
              <div class="text-[11px] text-slate-400">${escapeHtml(s.desc)}</div>
            </div>
            <button onclick="triggerHeroSkillFromTab(${idx})" class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shrink-0">
              У хід
            </button>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}

// ============================================================================
// ДОПОМІЖНІ МОДАЛКИ ТА ПЕРЕМИКАЧ ЕКРАНІВ
// ============================================================================
function animateDiceOverlay(rawRoll, bonus, total, dc, isSuccess, isCritSuccess, isCritFail) {
  return new Promise(resolve => {
    const overlay = document.getElementById("diceRollOverlay");
    const numEl = document.getElementById("diceRollNumber");
    const statusEl = document.getElementById("diceRollStatus");
    const subEl = document.getElementById("diceRollMath");
    if (!overlay || !numEl) {
      resolve();
      return;
    }

    overlay.classList.remove("hidden");
    overlay.classList.add("flex");
    statusEl.textContent = "Кидаємо D20...";
    statusEl.className = "text-sm font-bold uppercase tracking-widest text-amber-400";
    subEl.textContent = `Потрібно набрати ${dc}+`;

    let ticks = 0;
    const timer = setInterval(() => {
      ticks++;
      numEl.textContent = Math.floor(Math.random() * 20) + 1;
      if (ticks >= 15) {
        clearInterval(timer);
        numEl.textContent = rawRoll;
        subEl.textContent = `Кубик: ${rawRoll} + Бонус: +${bonus} = ${total} (Складність: ${dc})`;
        statusEl.textContent = isCritSuccess
          ? "🌟 КРИТИЧНИЙ УСПІХ (20)!"
          : isCritFail
          ? "💀 КРИТИЧНИЙ ПРОВАЛ (1)!"
          : isSuccess
          ? "✅ УСПІХ!"
          : "⚠️ НЕВДАЧА";
        statusEl.className = `text-base font-extrabold uppercase tracking-wider ${
          isSuccess ? "text-emerald-400" : "text-rose-400"
        }`;
        setTimeout(() => {
          overlay.classList.add("hidden");
          overlay.classList.remove("flex");
          resolve();
        }, 1100);
      }
    }, 55);
  });
}

function setupDialogLightDismissFallback(dialogEl) {
  if (!dialogEl || dialogEl.dataset.fallbackBound) return;
  dialogEl.dataset.fallbackBound = "true";
  if (!("closedBy" in HTMLDialogElement.prototype)) {
    dialogEl.addEventListener("click", event => {
      if (event.target !== dialogEl) return;
      const rect = dialogEl.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (isDialogContent) return;
      dialogEl.close();
    });
  }
}

function openAiSettingsModal() {
  const dlg = document.getElementById("aiSettingsDialog");
  if (!dlg) return;
  setupDialogLightDismissFallback(dlg);
  dlg.showModal();
}

function saveAiSettingsFromModal() {
  const provider = document.getElementById("aiProviderSelect")?.value || "free_cloud";
  const key = document.getElementById("aiKeyInput")?.value || "";
  const ollamaModel = document.getElementById("ollamaModelInput")?.value || "llama3.2";
  AppState.aiConfig = { provider, apiKey: key, ollamaModel };
  localStorage.setItem("rpg_ai_provider", provider);
  localStorage.setItem("rpg_ai_key", key);
  localStorage.setItem("rpg_ollama_model", ollamaModel);
  document.getElementById("aiSettingsDialog")?.close();
  showToast("Налаштування ШІ збережено!");
  renderApp();
}

function openCustomCartridgeModal() {
  const dlg = document.getElementById("customCartridgeDialog");
  if (!dlg) return;
  setupDialogLightDismissFallback(dlg);
  dlg.showModal();
}

function createQuickCustomAdventure() {
  const title = document.getElementById("newAdvTitle")?.value?.trim();
  const subtitle = document.getElementById("newAdvSubtitle")?.value?.trim();
  const rules = document.getElementById("newAdvRules")?.value?.trim();
  if (!title) {
    showToast("Введіть назву нової пригоди!");
    return;
  }
  const baseHeroes = JSON.parse(JSON.stringify(window.ADVENTURE_CARTRIDGES[0].heroes));
  window.ADVENTURE_CARTRIDGES.unshift({
    id: "custom-" + Date.now(),
    type: "monthly",
    monthLabel: "ВАША АВТОРСЬКА ПРИГОДА",
    title,
    subtitle: subtitle || "Авторський сценарій із 6 класами на вибір",
    duration: "60 хв",
    playersRange: "1–4 гравці",
    difficulty: "Адаптивна",
    priceLabel: "Власний картридж",
    isUnlocked: true,
    accentColor: "#10b981",
    coverGradient: "linear-gradient(135deg, #064e3b 0%, #0f172a 60%, #1e1b4b 100%)",
    worldRulesForAI: rules || "Вільний світ. Підтримуй будь-які ідеї гравців.",
    acts: window.ADVENTURE_CARTRIDGES[0].acts,
    npcsAndEnemies: window.ADVENTURE_CARTRIDGES[0].npcsAndEnemies,
    heroes: baseHeroes
  });
  document.getElementById("customCartridgeDialog")?.close();
  renderApp();
}

function showToast(text) {
  const el = document.getElementById("toastBanner");
  if (!el) return;
  el.textContent = text;
  el.classList.remove("hidden");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.add("hidden"), 3200);
}

function scrollToBottom() {
  setTimeout(() => {
    const container = document.getElementById("chatScrollContainer");
    if (container) container.scrollTop = container.scrollHeight;
  }, 50);
}

function renderApp() {
  const root = document.getElementById("appRoot");
  if (!root) return;
  if (AppState.screen === "onboarding") root.innerHTML = renderOnboardingScreen();
  else if (AppState.screen === "hub") root.innerHTML = renderHubScreen();
  else if (AppState.screen === "lobby") root.innerHTML = renderLobbyScreen();
  else root.innerHTML = renderGameScreen();
}

// ============================================================================
// СТАРТОВИЙ ЕКРАН (ВІТРИНА) + ПОМІТНІ КНОПКИ «СТВОРИТИ / УВІЙТИ» + НИЖНЯ НАВІГАЦІЯ
// ============================================================================
function renderHubScreen() {
  const activeTab = AppState.hubBottomTab || "main";

  return `
    <div class="flex flex-col h-full bg-slate-950 text-slate-100 select-none">
      <!-- Шапка стартового екрана -->
      <header class="px-4 pt-3.5 pb-2.5 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <img src="assets/d20_emblem.png" onerror="this.style.display='none'" alt="D20" class="w-9 h-9 rounded-xl bg-slate-950 p-0.5 border border-amber-500/40" />
          <div>
            <div class="text-[10px] font-bold uppercase tracking-widest text-amber-400">${t("appSub")}</div>
            <h1 class="text-sm font-extrabold text-white">${t("appTitle")}</h1>
          </div>
        </div>
        <button
          onclick="AppState.hubBottomTab='settings'; renderApp();"
          class="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5"
        >
          <span>👤 ${escapeHtml(AppState.accountName)}</span>
          <span class="text-amber-400">${AppState.lang === "en" ? "🇬🇧" : "🇺🇦"}</span>
        </button>
      </header>

      <!-- Основний вміст залежно від обраної нижньої вкладки -->
      <div class="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        ${
          activeTab === "main"
            ? renderHubMainTabContent()
            : activeTab === "archive"
            ? renderHubArchiveSeasonsTabContent()
            : renderHubSettingsTabContent()
        }
      </div>

      <!-- Нижня панель навігації Стартового екрана: [Пригоди] [Архів і Сезони] [Налаштування] -->
      <nav class="grid grid-cols-3 gap-2 p-2.5 bg-slate-900 border-t border-slate-800">
        <button
          onclick="AppState.hubBottomTab='main'; renderApp();"
          class="py-2 px-2 rounded-xl border font-extrabold text-xs flex flex-col items-center justify-center gap-0.5 transition ${
            activeTab === "main"
              ? "bg-amber-500 text-slate-950 border-amber-300 shadow"
              : "bg-slate-950 text-slate-300 border-slate-800"
          }"
        >
          <span>🔥 ${t("hubNavMain")}</span>
        </button>
        <button
          onclick="AppState.hubBottomTab='archive'; renderApp();"
          class="py-2 px-2 rounded-xl border font-extrabold text-xs flex flex-col items-center justify-center gap-0.5 transition ${
            activeTab === "archive"
              ? "bg-amber-500 text-slate-950 border-amber-300 shadow"
              : "bg-slate-950 text-slate-300 border-slate-800"
          }"
        >
          <span>🏛️ ${t("hubNavArchive")}</span>
        </button>
        <button
          onclick="AppState.hubBottomTab='settings'; renderApp();"
          class="py-2 px-2 rounded-xl border font-extrabold text-xs flex flex-col items-center justify-center gap-0.5 transition ${
            activeTab === "settings"
              ? "bg-amber-500 text-slate-950 border-amber-300 shadow"
              : "bg-slate-950 text-slate-300 border-slate-800"
          }"
        >
          <span>⚙️ ${t("hubNavSettings")}</span>
        </button>
      </nav>
    </div>
  `;
}

function renderHubMainTabContent() {
  const mainCartridges = window.ADVENTURE_CARTRIDGES.filter(
    c => c.type === "monthly" || c.type === "dlc"
  );

  return `
    <!-- ВЕЛИКИЙ ПРИМІТНИЙ БЛОК: Створити свою кімнату або Приєднатися до існуючої -->
    <div class="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-900 border-2 border-amber-500/40 shadow-lg space-y-2.5">
      <div class="flex items-center justify-between">
        <span class="text-xs font-extrabold uppercase tracking-wider text-amber-400">🎮 Мережева Гра з Друзями (1–4 Гравці)</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button
          onclick="openAdventureLobby('${AppState.activeCartridgeId}')"
          class="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs text-center shadow-md transition"
        >
          ${t("createRoomBtn")}
        </button>
        <button
          onclick="openPlayModeModal('${AppState.activeCartridgeId}')"
          class="p-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border-2 border-emerald-400/60 text-emerald-300 font-black text-xs text-center transition"
        >
          ${t("joinRoomBtn")}
        </button>
      </div>
    </div>

    <div class="flex items-center justify-between pt-1">
      <span class="text-xs font-extrabold uppercase tracking-wider text-slate-400">Актуальні пригоди та DLC:</span>
      <button onclick="openCustomCartridgeModal()" class="px-2.5 py-1 rounded-xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-xs font-bold">+ Свій сценарій</button>
    </div>

    ${mainCartridges.map(c => renderCartridgeCardHtml(c)).join("")}
  `;
}

function renderHubArchiveSeasonsTabContent() {
  const archiveCartridges = window.ADVENTURE_CARTRIDGES.filter(
    c => c.type === "archive" || c.type === "seasonal"
  );

  return `
    <div class="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
      <div class="text-xs font-extrabold text-amber-400 uppercase tracking-wider">🏛️ Архівні та Сезонні Сценарії</div>
      <p class="text-[11px] text-slate-300">
        Тут зберігаються минулі пригоди місяця та особливі сезонні події. Зараз активна головна сюжетна кампанія — «Корона Чорної Зірки: Тіньовий Заколот».
      </p>
    </div>

    ${
      archiveCartridges.length > 0
        ? archiveCartridges.map(c => renderCartridgeCardHtml(c)).join("")
        : `
      <div class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 text-center space-y-2.5">
        <div class="text-2xl">📜</div>
        <div class="text-xs font-extrabold text-white">Зараз активна єдина головна історія</div>
        <p class="text-[11px] text-slate-400">
          Ми залишили в грі лише вашу основну кампанію «Корона Чорної Зірки: Тіньовий Заколот» (8 актів, 45–60 хв). Коли ми додамо наступні сезонні історії, вони з'являться у цьому розділі!
        </p>
        <button onclick="AppState.hubBottomTab='main'; renderApp();" class="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs">
          Перейти до «Корони Чорної Зірки» →
        </button>
      </div>
    `
    }
  `;
}

function renderCartridgeCardHtml(c) {
  return `
    <div class="rounded-2xl border border-slate-800 overflow-hidden shadow-lg" style="background: ${c.coverGradient};">
      <div class="p-4 bg-slate-950/65">
        <div class="flex items-center justify-between mb-1">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-black/50" style="color: ${c.accentColor}">${escapeHtml(c.monthLabel)}</span>
          <span class="text-xs text-slate-300">⏱️ ${escapeHtml(c.duration)}</span>
        </div>
        <h2 class="text-base font-extrabold text-white mb-1">${escapeHtml(c.title)}</h2>
        <p class="text-xs text-slate-300 mb-3">${escapeHtml(c.subtitle)}</p>
        <div class="flex items-center justify-between gap-2">
          <span class="text-[11px] text-amber-300 font-bold">6 Класів Персонажів</span>
          <button
            onclick="openPlayModeModal('${c.id}')"
            class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition"
          >
            ${t("playOrJoinBtn")} →
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderHubSettingsTabContent() {
  const isUk = AppState.lang === "uk";
  return `
    <div class="space-y-3">
      <!-- Профіль та Акаунт -->
      <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div class="text-xs font-extrabold uppercase tracking-wider text-amber-400">👤 Обліковий запис гравця</div>
        <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
          <div>
            <div class="text-xs font-bold text-white">${escapeHtml(AppState.accountName)}</div>
            <div class="text-[10px] text-emerald-400">● Авторизовано</div>
          </div>
          <button
            onclick="logoutAccountToOnboarding()"
            class="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold"
          >
            Вийти / Змінити акаунт
          </button>
        </div>
      </div>

      <!-- Вибір мови -->
      <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
        <div class="text-xs font-extrabold uppercase tracking-wider text-amber-400">🌐 Мова інтерфейсу (Language)</div>
        <div class="grid grid-cols-2 gap-2">
          <button
            onclick="setAppLanguage('uk')"
            class="py-2.5 px-3 rounded-xl border-2 font-extrabold text-xs flex items-center justify-center gap-2 ${
              isUk ? "bg-amber-500/20 border-amber-400 text-white" : "bg-slate-950 border-slate-800 text-slate-400"
            }"
          >
            <span>🇺🇦 Українська</span>
          </button>
          <button
            onclick="setAppLanguage('en')"
            class="py-2.5 px-3 rounded-xl border-2 font-extrabold text-xs flex items-center justify-center gap-2 ${
              !isUk ? "bg-amber-500/20 border-amber-400 text-white" : "bg-slate-950 border-slate-800 text-slate-400"
            }"
          >
            <span>🇬🇧 English</span>
          </button>
        </div>
      </div>

      <!-- Налаштування ШІ-Майстра Гри -->
      <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
        <div class="text-xs font-extrabold uppercase tracking-wider text-amber-400">🤖 Штучний Інтелект (Майстер Гри)</div>
        <p class="text-[11px] text-slate-400">
          Поточний рушій: <b class="text-white">${escapeHtml(AppState.aiConfig.provider)}</b>
        </p>
        <button
          onclick="openAiSettingsModal()"
          class="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-extrabold text-white"
        >
          Відкрити параметри ШІ-Майстра →
        </button>
      </div>
    </div>
  `;
}

// ============================================================================
// ЛОБІ ПРИГОДИ: ВИБІР ІЗ 6 КЛАСІВ ПЕРСОНАЖІВ (БЕЗ ФІКСОВАНИХ ІМЕН)
// Натискання на клас відкриває спливаюче вікно огляду класу + ввід імені до 20 симв.
// ============================================================================
function renderLobbyScreen() {
  const cartridge = getActiveCartridge();
  const controlledPlayer = getControlledPlayer();

  return `
    <div class="flex flex-col h-full bg-slate-950 text-slate-100 select-none">
      <header class="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <button onclick="AppState.screen='hub'; renderApp();" class="text-xs font-bold text-slate-300 bg-slate-800 px-2.5 py-1.5 rounded-xl">← Назад</button>
        <div class="text-center">
          <div class="text-[10px] text-slate-400 uppercase">Код кімнати для друзів</div>
          <div class="text-sm font-mono font-extrabold text-amber-400">#${AppState.roomCode}</div>
        </div>
        <button onclick="addFriendSlotToRoom()" class="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
          + Друг (${AppState.players.length}/4)
        </button>
      </header>

      <!-- Слоти гравців у кімнаті -->
      <div class="px-4 py-2 bg-slate-900/50 border-b border-slate-800 grid grid-cols-4 gap-2">
        ${[0, 1, 2, 3]
          .map(idx => {
            const p = AppState.players[idx];
            if (!p) {
              return `<button onclick="addFriendSlotToRoom()" class="p-2 rounded-xl border border-dashed border-slate-800 text-[10px] text-slate-500">+ Слот ${idx + 1}</button>`;
            }
            const h = p.heroId ? getHeroById(cartridge, p.heroId) : null;
            const dispName = getPlayerHeroDisplayName(p, h);
            return `
              <div onclick="AppState.activeControlPlayerId='${p.id}'; renderApp();" class="cursor-pointer p-1.5 rounded-xl border text-center ${
              p.id === AppState.activeControlPlayerId ? "bg-amber-500/15 border-amber-400" : "bg-slate-900 border-slate-800"
            }">
                <div class="text-sm">${h ? h.avatarEmoji : "❔"}</div>
                <div class="text-[10px] font-extrabold text-white truncate">${escapeHtml(dispName)}</div>
                <div class="text-[9px] text-amber-300 truncate">${h ? escapeHtml(h.className) : "Оберіть клас"}</div>
              </div>
            `;
          })
          .join("")}
      </div>

      <!-- Сітка 6 Класів Персонажів (без наперед заданих імен!) -->
      <div class="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        <div class="text-xs font-extrabold text-slate-200">
          Оберіть клас із 6 унікальних варіантів (натисніть на клас, щоб переглянути його вміння та дати персонажу ім'я до 20 символів):
        </div>
        <div class="grid grid-cols-2 gap-2.5">
          ${cartridge.heroes
            .map(h => {
              const owner = AppState.players.find(p => p.heroId === h.id);
              const isMine = owner && owner.id === AppState.activeControlPlayerId;
              const isTaken = owner && owner.id !== AppState.activeControlPlayerId;
              return `
                <button
                  onclick="openClassPreviewModal('${h.id}')"
                  class="text-left p-2.5 rounded-2xl border transition flex flex-col justify-between ${
                    isMine
                      ? "bg-amber-500/20 border-amber-400 shadow-md"
                      : isTaken
                      ? "bg-slate-900/40 border-rose-500/40 opacity-60 cursor-not-allowed"
                      : "bg-slate-900 border-slate-800 hover:border-amber-400/60"
                  }"
                >
                  <div class="flex items-center gap-2.5 mb-1.5">
                    <div class="w-11 h-13 rounded-xl bg-slate-950 border flex items-center justify-center shrink-0" style="border-color: ${h.color}">
                      ${renderGeneratedHeroPortraitSvg(h, "w-10 h-12")}
                    </div>
                    <div class="min-w-0">
                      <div class="text-xs font-black text-white leading-tight">${escapeHtml(h.className)}</div>
                      <div class="text-[10px] text-amber-300 truncate mt-0.5">${escapeHtml(h.role)}</div>
                    </div>
                  </div>
                  <div class="text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-1.5">
                    <span>❤️ ${h.hp} HP</span>
                    <span>⚔️${h.stats.str} 🗡️${h.stats.agi} 🔮${h.stats.int} 🎭${h.stats.cha}</span>
                  </div>
                  ${
                    owner
                      ? `<div class="mt-1 text-[10px] font-extrabold truncate ${isMine ? "text-amber-300" : "text-rose-400"}">${
                          isMine
                            ? `✓ Ваше ім'я: ${escapeHtml(owner.customHeroName || owner.name)} (Змінити)`
                            : `🔒 Зайнято: ${escapeHtml(owner.customHeroName || owner.name)}`
                        }</div>`
                      : `<div class="mt-1 text-[10px] font-bold text-sky-300">🔍 Натисніть для огляду та імені</div>`
                  }
                </button>
              `;
            })
            .join("")}
        </div>
      </div>

      <footer class="p-3.5 bg-slate-900 border-t border-slate-800">
        <button onclick="startGameSession()" class="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm shadow-lg">
          Почати Пригоду на Екрані Гри →
        </button>
      </footer>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeQuotes(str) {
  return String(str || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

function formatMarkdownBold(str) {
  const safe = escapeHtml(str);
  return safe
    .replace(/\*\*(.+?)\*\*/g, '<b class="text-white font-bold">$1</b>')
    .replace(/\*(.+?)\*/g, '<i class="text-amber-200/90">$1</i>');
}

window.addEventListener("DOMContentLoaded", () => {
  renderApp();
});
