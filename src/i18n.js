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
        continue_btn: "▶ つづきから",
        start_btn: "▶ はじめる",
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
        continue_btn: "▶ Continue",
        start_btn: "▶ Start",
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
        continue_btn: "▶ 继续玩",
        start_btn: "▶ 开始玩",
        reset_btn: "重新开始",
        world_btn: "世界",
        inst_pc: "电脑怎么玩",
        inst_move_pc: "移动: 箭头 / WASD",
        inst_jump_pc: "跳: 空格键",
        inst_action_pc: "盖东西 / 拆方块: 点击",
        inst_mobile: "手机怎么玩",
        inst_move_mobile: "移动: ← →",
        inst_action_mobile: "盖东西 / 拆方块: 点击",
        hint_text: "★ 放在脚下就能爬上去哦！",
        world_modal_title: "我的世界",
        world_export_title: "保存",
        world_export_desc: "把世界变成一张画。",
        world_export_btn: "变成画",
        world_import_title: "读取",
        world_import_desc: "读取画来玩。",
        world_import_btn: "读取画",
        world_back_btn: "返回",

        craft_missing: "材料不够哦",
        craft_done: "做好了！",
        msg_import_err: "这张画不能用哦"
    },
    "zh-TW": {
        continue_btn: "▶ 繼續玩",
        start_btn: "▶ 開始玩",
        reset_btn: "重新開始",
        world_btn: "世界",
        inst_pc: "電腦怎麼玩",
        inst_move_pc: "移動: 箭頭 / WASD",
        inst_jump_pc: "跳: 空白鍵",
        inst_action_pc: "蓋東西 / 拆方塊: 點擊",
        inst_mobile: "手機怎麼玩",
        inst_move_mobile: "移動: ← →",
        inst_action_mobile: "蓋東西 / 拆方塊: 點擊",
        hint_text: "★ 放在腳下就能爬上去喔！",
        world_modal_title: "我的世界",
        world_export_title: "保存",
        world_export_desc: "把世界變成一張畫。",
        world_export_btn: "變成畫",
        world_import_title: "讀取",
        world_import_desc: "讀取畫來玩。",
        world_import_btn: "讀取畫",
        world_back_btn: "返回",

        craft_missing: "材料不夠喔",
        craft_done: "做好了！",
        msg_import_err: "這張畫不能用喔"
    }
};

export const strings = {};
Object.assign(strings, resources.ja);

export function initI18n() {
    const rawLang = navigator.language || navigator.userLanguage || 'ja';
    const mainLang = rawLang.split('-')[0];

    // Priority: Exact match (e.g., zh-TW) -> Main language (e.g., en, zh, ja) -> Fallback to ja
    const target = resources[rawLang] || resources[mainLang] || resources.ja;

    // Clear and update strings object
    Object.keys(strings).forEach(key => delete strings[key]);
    Object.assign(strings, target);

    // Update DOM elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (strings[key]) {
            el.innerText = strings[key];
        }
    });
}