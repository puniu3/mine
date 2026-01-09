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
    }
};

export const strings = {};
Object.assign(strings, resources.ja);

export function initI18n() {
    const lang = (navigator.language || navigator.userLanguage || 'ja').split('-')[0];
    const target = resources[lang] || resources.ja;

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