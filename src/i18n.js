export const resources = {
    semantics: {
        continue_btn: "Title screen: Continue button. Resumes from autosave (game saves to browser localStorage every 5 seconds).",
        start_btn: "Title screen: Start button. Displayed when no save data exists. Starts with new player data and world.",
        reset_btn: "Title screen: Restart button. Displayed when save data exists. Deletes current save and starts fresh.",
        world_btn: "Title screen: World button. Opens modal to export/import world data as images.",
        inst_pc: "Title screen: Instruction header. Guide for keyboard + mouse controls.",
        inst_move_pc: "Title screen: Instruction. A, D, Left, Right to move. W to jump. S to place block at feet and climb. Concise text due to limited space.",
        inst_jump_pc: "Title screen: Instruction. Space key to jump.",
        inst_action_pc: "Title screen: Instruction. Click to place or break (gather) blocks.",
        inst_mobile: "Title screen: Instruction header. Guide for touch controls.",
        inst_move_mobile: "Title screen: Instruction. Left/Right triangle buttons appear at bottom left; tap to move.",
        inst_action_mobile: "Title screen: Instruction. Tap tiles directly around the player character to break or place blocks.",
        hint_text: "Title screen: Instruction. Explains that placing a block on the player's body position places it at their feet, allowing them to climb up.",
        world_modal_title: "Modal window title for reading/writing world data.",
        world_export_title: "Header for the export section.",
        world_export_desc: "Export world data as a PNG image. 1 tile converts to 1 pixel, allowing the world to be viewed directly as an image.",
        world_export_btn: "Button to execute export.",
        world_import_title: "Header for the import section.",
        world_import_desc: "Imports an image, converts it to world data, and starts the game. Keeps existing player data. Forces closest-color matching for any uploaded image.",
        world_import_btn: "Button to execute import.",
        world_back_btn: "Button to close the window.",

        craft_missing: "Crafting screen message. Displayed when selecting an item at workbench but inventory lacks required materials.",
        craft_done: "Crafting screen message. Displayed when an item is successfully created.",

        msg_import_err: "World window alert message. Displayed when the try-catch block fails during image loading/world generation."
    },
    style: {
        target_audience: "6-year-olds",
        tone: "Carefree, colloquial, and friendly",
        context: "Children playing independently without adult supervision",
        vocabulary: "Simple, easy-to-understand words; strictly avoid technical jargon"
    },
    ja: {
        continue_btn: "つづきから",
        start_btn: "はじめる",
        reset_btn: "はじめから",
        world_btn: "ワールド",
        inst_pc: "パソコン",
        inst_move_pc: "うごく: やじるし / WASD",
        inst_jump_pc: "とぶ: スペース",
        inst_action_pc: "つくる・こわす: クリック",
        inst_mobile: "スマホ",
        inst_move_mobile: "うごく: ← →",
        inst_action_mobile: "つくる・こわす: タップ",
        hint_text: "★ あしもとに おくと のぼれるよ！",
        world_modal_title: "ワールド",
        world_export_title: "のこす",
        world_export_desc: "つくった せかいを えにする",
        world_export_btn: "えにする",
        world_import_title: "よみこむ",
        world_import_desc: "えを よみこんで あそぶ",
        world_import_btn: "よみこむ",
        world_back_btn: "もどる",

        craft_missing: "ざいりょうがたりないよ",
        craft_done: "できたよ！",
        msg_import_err: "この えでは ワールドを つくれないよ"
    },
    en: {
        continue_btn: "Continue",
        start_btn: "Start",
        reset_btn: "Start Over",
        world_btn: "World",
        inst_pc: "PC Controls",
        inst_move_pc: "Move: Arrows / WASD",
        inst_jump_pc: "Jump: Space",
        inst_action_pc: "Make / Break: Click",
        inst_mobile: "Touch Controls",
        inst_move_mobile: "Move: ← →",
        inst_action_mobile: "Make / Break: Tap",
        hint_text: "★ Put blocks at your feet to climb!",
        world_modal_title: "My World",
        world_export_title: "Save",
        world_export_desc: "Turn your world into a picture.",
        world_export_btn: "Make Picture",
        world_import_title: "Load",
        world_import_desc: "Load a picture to play.",
        world_import_btn: "Load Picture",
        world_back_btn: "Back",

        craft_missing: "Need more items!",
        craft_done: "Done!",
        msg_import_err: "Can't use this picture."
    },
    zh: {
        continue_btn: "继续玩",
        start_btn: "开始玩",
        reset_btn: "重新开始",
        world_btn: "世界",
        inst_pc: "电脑怎么玩",
        inst_move_pc: "移动: 箭头 / WASD",
        inst_jump_pc: "跳: 空格键",
        inst_action_pc: "盖东西 / 拆方块: 点击",
        inst_mobile: "手机怎么玩",
        inst_move_mobile: "移动: ← →",
        inst_action_mobile: "盖东西 / 拆方块: 点按",
        hint_text: "★ 放在脚下就能爬上去哦！",
        world_modal_title: "我的世界",
        world_export_title: "保存",
        world_export_desc: "把世界变成一张画",
        world_export_btn: "变成画",
        world_import_title: "读取",
        world_import_desc: "读取画来玩",
        world_import_btn: "读取画",
        world_back_btn: "返回",

        craft_missing: "材料不够哦",
        craft_done: "做好了！",
        msg_import_err: "这张画不能用哦"
    },
    "zh-TW": {
        continue_btn: "繼續玩",
        start_btn: "開始玩",
        reset_btn: "重新開始",
        world_btn: "世界",
        inst_pc: "電腦怎麼玩",
        inst_move_pc: "移動: 箭頭 / WASD",
        inst_jump_pc: "跳: 空白鍵",
        inst_action_pc: "蓋東西 / 拆方塊: 點擊",
        inst_mobile: "手機怎麼玩",
        inst_move_mobile: "移動: ← →",
        inst_action_mobile: "蓋東西 / 拆方塊: 點按",
        hint_text: "★ 放在腳下就能爬上去喔！",
        world_modal_title: "我的世界",
        world_export_title: "保存",
        world_export_desc: "把世界變成一張畫",
        world_export_btn: "變成畫",
        world_import_title: "讀取",
        world_import_desc: "讀取畫來玩",
        world_import_btn: "讀取畫",
        world_back_btn: "返回",

        craft_missing: "材料不夠喔",
        craft_done: "做好了！",
        msg_import_err: "這張畫不能用喔"
    },
    es: {
        continue_btn: "Seguir",
        start_btn: "Jugar",
        reset_btn: "Desde cero",
        world_btn: "Mundo",
        inst_pc: "En PC",
        inst_move_pc: "Mover: Flechas / WASD",
        inst_jump_pc: "Saltar: Espacio",
        inst_action_pc: "Poner / Quitar: Clic",
        inst_mobile: "En móvil",
        inst_move_mobile: "Mover: ← →",
        inst_action_mobile: "Poner / Quitar: Tocar",
        hint_text: "★ ¡Pon bloques bajo tus pies para subir!",
        world_modal_title: "Mi Mundo",
        world_export_title: "Guardar",
        world_export_desc: "Convierte tu mundo en un dibujo.",
        world_export_btn: "Hacer dibujo",
        world_import_title: "Cargar",
        world_import_desc: "Usa un dibujo para jugar.",
        world_import_btn: "Usar dibujo",
        world_back_btn: "Volver",

        craft_missing: "¡Te faltan cosas!",
        craft_done: "¡Listo!",
        msg_import_err: "No puedo usar este dibujo."
    },
    fr: {
        continue_btn: "Continuer",
        start_btn: "Jouer",
        reset_btn: "Recommencer",
        world_btn: "Monde",
        inst_pc: "Sur ordi",
        inst_move_pc: "Bouger : Flèches / WASD",
        inst_jump_pc: "Sauter : Espace",
        inst_action_pc: "Mettre / Casser : Clic",
        inst_mobile: "Sur mobile",
        inst_move_mobile: "Bouger : ← →",
        inst_action_mobile: "Mettre / Casser : Toucher",
        hint_text: "★ Mets des blocs sous tes pieds pour monter !",
        world_modal_title: "Mon Monde",
        world_export_title: "Garder",
        world_export_desc: "Transforme ton monde en image.",
        world_export_btn: "Faire une image",
        world_import_title: "Ouvrir",
        world_import_desc: "Ouvre une image pour jouer.",
        world_import_btn: "Ouvrir une image",
        world_back_btn: "Retour",

        craft_missing: "Il te manque des trucs !",
        craft_done: "C'est fait !",
        msg_import_err: "Je ne peux pas utiliser cette image."
    },
    de: {
        continue_btn: "Weiter",
        start_btn: "Starten",
        reset_btn: "Neustart",
        world_btn: "Welt",
        inst_pc: "Am Computer",
        inst_move_pc: "Laufen: Pfeile / WASD",
        inst_jump_pc: "Hüpfen: Leertaste",
        inst_action_pc: "Bauen / Abbauen: Klick",
        inst_mobile: "Am Handy",
        inst_move_mobile: "Laufen: ← →",
        inst_action_mobile: "Bauen / Abbauen: Tippen",
        hint_text: "★ Bau unter dir, um hochzukommen!",
        world_modal_title: "Meine Welt",
        world_export_title: "Speichern",
        world_export_desc: "Mach ein Bild aus deiner Welt.",
        world_export_btn: "Bild machen",
        world_import_title: "Laden",
        world_import_desc: "Lade ein Bild zum Spielen.",
        world_import_btn: "Bild laden",
        world_back_btn: "Zurück",

        craft_missing: "Dir fehlen Sachen!",
        craft_done: "Fertig!",
        msg_import_err: "Das Bild geht nicht."
    },
    it: {
        continue_btn: "Continua",
        start_btn: "Gioca",
        reset_btn: "Ricomincia",
        world_btn: "Mondo",
        inst_pc: "Computer",
        inst_move_pc: "Muovi: Frecce / WASD",
        inst_jump_pc: "Salta: Spazio",
        inst_action_pc: "Metti / Rompi: Clic",
        inst_mobile: "Telefono",
        inst_move_mobile: "Muovi: ← →",
        inst_action_mobile: "Metti / Rompi: Tocca",
        hint_text: "★ Metti blocchi sotto i piedi per salire!",
        world_modal_title: "Mio Mondo",
        world_export_title: "Salva",
        world_export_desc: "Trasforma il mondo in una foto.",
        world_export_btn: "Fai una foto",
        world_import_title: "Carica",
        world_import_desc: "Usa una foto per giocare.",
        world_import_btn: "Usa foto",
        world_back_btn: "Indietro",

        craft_missing: "Mancano oggetti!",
        craft_done: "Fatto!",
        msg_import_err: "Non posso usare questa foto."
    },
    pt: {
        continue_btn: "Continuar",
        start_btn: "Jogar",
        reset_btn: "Do começo",
        world_btn: "Mundo",
        inst_pc: "No PC",
        inst_move_pc: "Andar: Setas / WASD",
        inst_jump_pc: "Pular: Espaço",
        inst_action_pc: "Pôr / Tirar: Clique",
        inst_mobile: "No Celular",
        inst_move_mobile: "Andar: ← →",
        inst_action_mobile: "Pôr / Tirar: Toque",
        hint_text: "★ Coloque blocos no pé para subir!",
        world_modal_title: "Meu Mundo",
        world_export_title: "Salvar",
        world_export_desc: "Vira uma foto do seu mundo.",
        world_export_btn: "Criar foto",
        world_import_title: "Abrir",
        world_import_desc: "Use uma foto para jogar.",
        world_import_btn: "Abrir foto",
        world_back_btn: "Voltar",

        craft_missing: "Falta coisa!",
        craft_done: "Pronto!",
        msg_import_err: "Não dá pra usar essa foto."
    },
    ko: {
        continue_btn: "이어하기",
        start_btn: "시작하기",
        reset_btn: "처음부터",
        world_btn: "월드",
        inst_pc: "컴퓨터",
        inst_move_pc: "이동: 화살표 / WASD",
        inst_jump_pc: "점프: 스페이스바",
        inst_action_pc: "놓기 / 부수기: 클릭",
        inst_mobile: "스마트폰",
        inst_move_mobile: "이동: ← →",
        inst_action_mobile: "놓기 / 부수기: 터치",
        hint_text: "★ 발밑에 놓으면 올라갈 수 있어!",
        world_modal_title: "나의 월드",
        world_export_title: "저장",
        world_export_desc: "월드를 그림으로 만들기.",
        world_export_btn: "그림 만들기",
        world_import_title: "불러오기",
        world_import_desc: "그림을 불러와서 놀기.",
        world_import_btn: "그림 가져오기",
        world_back_btn: "돌아가기",

        craft_missing: "재료가 부족해!",
        craft_done: "다 만들었어!",
        msg_import_err: "이 그림은 쓸 수 없어."
    },
    ru: {
        continue_btn: "Продолжить",
        start_btn: "Играть",
        reset_btn: "С начала",
        world_btn: "Мир",
        inst_pc: "Компьютер",
        inst_move_pc: "Ходить: Стрелки / WASD",
        inst_jump_pc: "Прыгать: Пробел",
        inst_action_pc: "Строить / Ломать: Клик",
        inst_mobile: "Телефон",
        inst_move_mobile: "Ходить: ← →",
        inst_action_mobile: "Строить / Ломать: Нажми",
        hint_text: "★ Ставь блоки под ноги, чтобы залезть!",
        world_modal_title: "Мой мир",
        world_export_title: "Сохранить",
        world_export_desc: "Превратить мир в картинку.",
        world_export_btn: "Сделать картинку",
        world_import_title: "Загрузить",
        world_import_desc: "Загрузить картинку и играть.",
        world_import_btn: "Загрузить",
        world_back_btn: "Назад",

        craft_missing: "Не хватает вещей!",
        craft_done: "Готово!",
        msg_import_err: "Эта картинка не работает."
    }
};

export const strings = {};
Object.assign(strings, resources.ja);

const LANG_STORAGE_KEY = 'pictoco_language';

// Language to flag emoji mapping
export const languageFlags = {
    ja: '🇯🇵',
    en: '🇺🇸',
    zh: '🇨🇳',
    'zh-TW': '🇹🇼',
    es: '🇪🇸',
    fr: '🇫🇷',
    de: '🇩🇪',
    it: '🇮🇹',
    pt: '🇧🇷',
    ko: '🇰🇷',
    ru: '🇷🇺'
};

// Get list of supported language codes
export const supportedLanguages = Object.keys(languageFlags);

// Current language code
export let currentLanguage = 'ja';

/**
 * Get the detected language based on priority:
 * 1. LocalStorage (user selection)
 * 2. Browser settings
 * 3. Fallback (ja)
 */
function detectLanguage() {
    // Priority 1: LocalStorage
    const storedLang = localStorage.getItem(LANG_STORAGE_KEY);
    if (storedLang && resources[storedLang]) {
        return storedLang;
    }

    // Priority 2: Browser settings
    const rawLang = navigator.language || navigator.userLanguage || 'ja';
    const mainLang = rawLang.split('-')[0];

    if (resources[rawLang]) {
        return rawLang;
    }
    if (resources[mainLang]) {
        return mainLang;
    }

    // Priority 3: Fallback
    return 'ja';
}

/**
 * Apply the given language to strings and DOM
 */
function applyLanguage(langCode) {
    const target = resources[langCode] || resources.ja;
    currentLanguage = langCode;

    // Clear and update strings object
    Object.keys(strings).forEach(key => delete strings[key]);
    Object.assign(strings, target);

    // Update DOM elements
    document.documentElement.lang = langCode;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (strings[key]) {
            el.innerText = strings[key];
        }
    });
}

/**
 * Set language and save to LocalStorage
 */
export function setLanguage(langCode) {
    if (!resources[langCode]) {
        console.warn(`Language '${langCode}' not supported`);
        return;
    }
    localStorage.setItem(LANG_STORAGE_KEY, langCode);
    applyLanguage(langCode);
}

/**
 * Initialize i18n with priority: LocalStorage > Browser > Fallback
 */
export function initI18n() {
    const langCode = detectLanguage();
    applyLanguage(langCode);
}