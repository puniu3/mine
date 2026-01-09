export const resources = {
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
