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
        inst_climb_pc: "Title screen: Instruction. Click the player character to place a block at feet and climb up.",
        inst_mobile: "Title screen: Instruction header. Guide for touch controls.",
        inst_move_mobile: "Title screen: Instruction. Left/Right triangle buttons appear at bottom left; tap to move.",
        inst_jump_mobile: "Title screen: Instruction. Up triangle button appears at bottom right; tap to jump.",
        inst_action_mobile: "Title screen: Instruction. Tap tiles directly around the player character to break or place blocks.",
        inst_climb_mobile: "Title screen: Instruction. Tap the player character to place a block at feet and climb up.",
        inst_gamepad: "Title screen: Instruction header. Guide for gamepad controls.",
        inst_jump_gamepad: "Title screen: Instruction. A button to jump.",
        inst_place_gamepad: "Title screen: Instruction. LT button to place blocks.",
        inst_break_gamepad: "Title screen: Instruction. RT button to break (gather) blocks.",
        inst_climb_gamepad: "Title screen: Instruction. X button to place block at feet to climb.",
        inst_select_gamepad: "Title screen: Instruction. LB/RB buttons to select items.",        
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
        inst_climb_pc: "のぼる: キャラをクリック",
        inst_mobile: "スマホ",
        inst_move_mobile: "うごく: ← →",
        inst_jump_mobile: "とぶ: ↑",
        inst_action_mobile: "つくる・こわす: タップ",
        inst_climb_mobile: "のぼる: キャラをタップ",
        inst_gamepad: "コントローラー",
        inst_jump_gamepad: "とぶ: A",
        inst_place_gamepad: "つくる: LT",
        inst_break_gamepad: "こわす: RT",
        inst_climb_gamepad: "のぼる: X",
        inst_select_gamepad: "えらぶ: LB / RB",
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
        inst_action_pc: "Put / Break: Click",
        inst_climb_pc: "Climb: Click Player",
        inst_mobile: "Touch Controls",
        inst_move_mobile: "Move: ← →",
        inst_jump_mobile: "Jump: ↑",
        inst_action_mobile: "Put / Break: Tap",
        inst_climb_mobile: "Climb: Tap Player",
        inst_gamepad: "Controller",
        inst_jump_gamepad: "Jump: A",
        inst_place_gamepad: "Put: LT",
        inst_break_gamepad: "Break: RT",
        inst_climb_gamepad: "Climb: X",
        inst_select_gamepad: "Pick: LB / RB",
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
        inst_climb_pc: "爬高: 点击角色",
        inst_mobile: "手机怎么玩",
        inst_move_mobile: "移动: ← →",
        inst_jump_mobile: "跳: ↑",
        inst_action_mobile: "盖东西 / 拆方块: 点按",
        inst_climb_mobile: "爬高: 点按角色",
        inst_gamepad: "手柄怎么玩",
        inst_jump_gamepad: "跳: A",
        inst_place_gamepad: "盖东西: LT",
        inst_break_gamepad: "拆方块: RT",
        inst_climb_gamepad: "爬高: X",
        inst_select_gamepad: "选东西: LB / RB",
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
        inst_climb_pc: "爬高: 點擊角色",
        inst_mobile: "手機怎麼玩",
        inst_move_mobile: "移動: ← →",
        inst_jump_mobile: "跳: ↑",
        inst_action_mobile: "蓋東西 / 拆方塊: 點按",
        inst_climb_mobile: "爬高: 點按角色",
        inst_gamepad: "手把怎麼玩",
        inst_jump_gamepad: "跳: A",
        inst_place_gamepad: "蓋東西: LT",
        inst_break_gamepad: "拆方塊: RT",
        inst_climb_gamepad: "爬高: X",
        inst_select_gamepad: "選東西: LB / RB",
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
        inst_climb_pc: "Subir: Clic personaje",
        inst_mobile: "En móvil",
        inst_move_mobile: "Mover: ← →",
        inst_jump_mobile: "Saltar: ↑",
        inst_action_mobile: "Poner / Quitar: Tocar",
        inst_climb_mobile: "Subir: Tocar personaje",
        inst_gamepad: "Mando",
        inst_jump_gamepad: "Saltar: A",
        inst_place_gamepad: "Poner: LT",
        inst_break_gamepad: "Quitar: RT",
        inst_climb_gamepad: "Subir: X",
        inst_select_gamepad: "Elegir: LB / RB",
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
        inst_climb_pc: "Monter : Clic sur toi",
        inst_mobile: "Sur mobile",
        inst_move_mobile: "Bouger : ← →",
        inst_jump_mobile: "Sauter : ↑",
        inst_action_mobile: "Mettre / Casser : Toucher",
        inst_climb_mobile: "Monter : Touche sur toi",
        inst_gamepad: "Manette",
        inst_jump_gamepad: "Sauter : A",
        inst_place_gamepad: "Mettre : LT",
        inst_break_gamepad: "Casser : RT",
        inst_climb_gamepad: "Monter : X",
        inst_select_gamepad: "Choisir : LB / RB",
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
        inst_climb_pc: "Klettern: Klick auf dich",
        inst_mobile: "Am Handy",
        inst_move_mobile: "Laufen: ← →",
        inst_jump_mobile: "Hüpfen: ↑",
        inst_action_mobile: "Bauen / Abbauen: Tippen",
        inst_climb_mobile: "Klettern: Tipp auf dich",
        inst_gamepad: "Controller",
        inst_jump_gamepad: "Hüpfen: A",
        inst_place_gamepad: "Bauen: LT",
        inst_break_gamepad: "Abbauen: RT",
        inst_climb_gamepad: "Klettern: X",
        inst_select_gamepad: "Wählen: LB / RB",
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
        inst_climb_pc: "Sali: Clicca l'omino",
        inst_mobile: "Telefono",
        inst_move_mobile: "Muovi: ← →",
        inst_jump_mobile: "Salta: ↑",
        inst_action_mobile: "Metti / Rompi: Tocca",
        inst_climb_mobile: "Sali: Tocca l'omino",
        inst_gamepad: "Controller",
        inst_jump_gamepad: "Salta: A",
        inst_place_gamepad: "Metti: LT",
        inst_break_gamepad: "Rompi: RT",
        inst_climb_gamepad: "Sali: X",
        inst_select_gamepad: "Scegli: LB / RB",
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
        inst_climb_pc: "Subir: Clique no boneco",
        inst_mobile: "No Celular",
        inst_move_mobile: "Andar: ← →",
        inst_jump_mobile: "Pular: ↑",
        inst_action_mobile: "Pôr / Tirar: Toque",
        inst_climb_mobile: "Subir: Toque no boneco",
        inst_gamepad: "Controle",
        inst_jump_gamepad: "Pular: A",
        inst_place_gamepad: "Pôr: LT",
        inst_break_gamepad: "Tirar: RT",
        inst_climb_gamepad: "Subir: X",
        inst_select_gamepad: "Escolher: LB / RB",
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
        inst_climb_pc: "올라가기: 캐릭터 클릭",
        inst_mobile: "스마트폰",
        inst_move_mobile: "이동: ← →",
        inst_jump_mobile: "점프: ↑",
        inst_action_mobile: "놓기 / 부수기: 터치",
        inst_climb_mobile: "올라가기: 캐릭터 터치",
        inst_gamepad: "게임패드",
        inst_jump_gamepad: "점프: A",
        inst_place_gamepad: "놓기: LT",
        inst_break_gamepad: "부수기: RT",
        inst_climb_gamepad: "올라가기: X",
        inst_select_gamepad: "고르기: LB / RB",
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
        inst_climb_pc: "Лезть: Клик по герою",
        inst_mobile: "Телефон",
        inst_move_mobile: "Ходить: ← →",
        inst_jump_mobile: "Прыгать: ↑",
        inst_action_mobile: "Строить / Ломать: Нажми",
        inst_climb_mobile: "Лезть: Нажми на героя",
        inst_gamepad: "Геймпад",
        inst_jump_gamepad: "Прыгать: A",
        inst_place_gamepad: "Строить: LT",
        inst_break_gamepad: "Ломать: RT",
        inst_climb_gamepad: "Лезть: X",
        inst_select_gamepad: "Выбрать: LB / RB",
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
    },
    id: {
        continue_btn: "Lanjut",
        start_btn: "Main",
        reset_btn: "Mulai ulang",
        world_btn: "Dunia",
        inst_pc: "Komputer",
        inst_move_pc: "Gerak: Panah / WASD",
        inst_jump_pc: "Lompat: Spasi",
        inst_action_pc: "Buat / Pecahkan: Klik",
        inst_climb_pc: "Panjat: Klik karakter",
        inst_mobile: "HP",
        inst_move_mobile: "Gerak: ← →",
        inst_jump_mobile: "Lompat: ↑",
        inst_action_mobile: "Buat / Pecahkan: Sentuh",
        inst_climb_mobile: "Panjat: Sentuh karakter",
        inst_gamepad: "Stik",
        inst_jump_gamepad: "Lompat: A",
        inst_place_gamepad: "Buat: LT",
        inst_break_gamepad: "Pecahkan: RT",
        inst_climb_gamepad: "Panjat: X",
        inst_select_gamepad: "Pilih: LB / RB",
        world_modal_title: "Duniaku",
        world_export_title: "Simpan",
        world_export_desc: "Jadikan duniamu gambar.",
        world_export_btn: "Buat Gambar",
        world_import_title: "Buka",
        world_import_desc: "Main pakai gambar.",
        world_import_btn: "Buka Gambar",
        world_back_btn: "Kembali",

        craft_missing: "Barangnya kurang!",
        craft_done: "Jadi deh!",
        msg_import_err: "Gambar ini gak bisa dipakai."
    },
    pl: {
        continue_btn: "Graj dalej",
        start_btn: "Graj",
        reset_btn: "Od nowa",
        world_btn: "Świat",
        inst_pc: "Komputer",
        inst_move_pc: "Ruch: Strzałki / WASD",
        inst_jump_pc: "Skok: Spacja",
        inst_action_pc: "Buduj / Niszcz: Klik",
        inst_climb_pc: "Wspinaj się: Kliknij postać",
        inst_mobile: "Telefon",
        inst_move_mobile: "Ruch: ← →",
        inst_jump_mobile: "Skok: ↑",
        inst_action_mobile: "Buduj / Niszcz: Dotknij",
        inst_climb_mobile: "Wspinaj się: Dotknij postać",
        inst_gamepad: "Pad",
        inst_jump_gamepad: "Skok: A",
        inst_place_gamepad: "Buduj: LT",
        inst_break_gamepad: "Niszcz: RT",
        inst_climb_gamepad: "Wspinaj się: X",
        inst_select_gamepad: "Wybierz: LB / RB",
        world_modal_title: "Mój Świat",
        world_export_title: "Zapisz",
        world_export_desc: "Zrób obrazek ze świata.",
        world_export_btn: "Zrób obrazek",
        world_import_title: "Wczytaj",
        world_import_desc: "Użyj obrazka do gry.",
        world_import_btn: "Wczytaj obrazek",
        world_back_btn: "Wróć",

        craft_missing: "Brakuje rzeczy!",
        craft_done: "Gotowe!",
        msg_import_err: "Ten obrazek nie działa."
    },
    uk: {
        continue_btn: "Продовжити",
        start_btn: "Грати",
        reset_btn: "Спочатку",
        world_btn: "Світ",
        inst_pc: "Комп'ютер",
        inst_move_pc: "Рух: Стрілки / WASD",
        inst_jump_pc: "Стрибок: Пробіл",
        inst_action_pc: "Будувати / Ламати: Клік",
        inst_climb_pc: "Лізти: Клік по герою",
        inst_mobile: "Телефон",
        inst_move_mobile: "Рух: ← →",
        inst_jump_mobile: "Стрибок: ↑",
        inst_action_mobile: "Будувати / Ламати: Натисни",
        inst_climb_mobile: "Лізти: Натисни на героя",
        inst_gamepad: "Геймпад",
        inst_jump_gamepad: "Стрибок: A",
        inst_place_gamepad: "Будувати: LT",
        inst_break_gamepad: "Ламати: RT",
        inst_climb_gamepad: "Лізти: X",
        inst_select_gamepad: "Вибрати: LB / RB",
        world_modal_title: "Мій Світ",
        world_export_title: "Зберегти",
        world_export_desc: "Перетвори світ на картинку.",
        world_export_btn: "Зробити картинку",
        world_import_title: "Завантажити",
        world_import_desc: "Грай з картинки.",
        world_import_btn: "Взяти картинку",
        world_back_btn: "Назад",

        craft_missing: "Не вистачає речей!",
        craft_done: "Готово!",
        msg_import_err: "Ця картинка не працює."
    },
    tr: {
        continue_btn: "Devam Et",
        start_btn: "Oyna",
        reset_btn: "Baştan Başla",
        world_btn: "Dünya",
        inst_pc: "Bilgisayar",
        inst_move_pc: "Git: Oklar / WASD",
        inst_jump_pc: "Zıpla: Boşluk",
        inst_action_pc: "Koy / Kır: Tıkla",
        inst_climb_pc: "Tırman: Karaktere tıkla",
        inst_mobile: "Telefon",
        inst_move_mobile: "Git: ← →",
        inst_jump_mobile: "Zıpla: ↑",
        inst_action_mobile: "Koy / Kır: Dokun",
        inst_climb_mobile: "Tırman: Karaktere dokun",
        inst_gamepad: "Oyun Kolu",
        inst_jump_gamepad: "Zıpla: A",
        inst_place_gamepad: "Koy: LT",
        inst_break_gamepad: "Kır: RT",
        inst_climb_gamepad: "Tırman: X",
        inst_select_gamepad: "Seç: LB / RB",
        world_modal_title: "Dünyam",
        world_export_title: "Kaydet",
        world_export_desc: "Dünyanı resim yap.",
        world_export_btn: "Resim Yap",
        world_import_title: "Aç",
        world_import_desc: "Resimden oyun aç.",
        world_import_btn: "Resim Aç",
        world_back_btn: "Geri",

        craft_missing: "Malzeme eksik!",
        craft_done: "Oldu!",
        msg_import_err: "Bu resim çalışmıyor."
    },
    ms: {
        continue_btn: "Sambung",
        start_btn: "Mula",
        reset_btn: "Mula Semula",
        world_btn: "Dunia",
        inst_pc: "Komputer",
        inst_move_pc: "Gerak: Anak Panah / WASD",
        inst_jump_pc: "Lompat: Space",
        inst_action_pc: "Bina / Pecah: Klik",
        inst_climb_pc: "Panjat: Klik orang",
        inst_mobile: "Telefon",
        inst_move_mobile: "Gerak: ← →",
        inst_jump_mobile: "Lompat: ↑",
        inst_action_mobile: "Bina / Pecah: Sentuh",
        inst_climb_mobile: "Panjat: Sentuh orang",
        inst_gamepad: "Alat Kawalan",
        inst_jump_gamepad: "Lompat: A",
        inst_place_gamepad: "Bina: LT",
        inst_break_gamepad: "Pecah: RT",
        inst_climb_gamepad: "Panjat: X",
        inst_select_gamepad: "Pilih: LB / RB",
        world_modal_title: "Duniaku",
        world_export_title: "Simpan",
        world_export_desc: "Jadikan dunia gambar.",
        world_export_btn: "Buat Gambar",
        world_import_title: "Buka",
        world_import_desc: "Main guna gambar.",
        world_import_btn: "Buka Gambar",
        world_back_btn: "Kembali",

        craft_missing: "Barang tak cukup!",
        craft_done: "Siap!",
        msg_import_err: "Gambar ini tak boleh guna."
    }
};

export const strings = {};
Object.assign(strings, resources.en);

const LANG_STORAGE_KEY = 'pictoco_language';

// List of supported language codes
export const supportedLanguages = [
    'ja',
    'en',
    'zh',
    'zh-TW',
    'es',
    'fr',
    'de',
    'it',
    'pt',
    'ko',
    'ru',
    'id',
    'pl',
    'uk',
    'tr',
    'ms'
];

// Current language code
export let currentLanguage = 'en';

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
    const rawLang = navigator.language || navigator.userLanguage || 'en';
    const mainLang = rawLang.split('-')[0];

    if (resources[rawLang]) {
        return rawLang;
    }
    if (resources[mainLang]) {
        return mainLang;
    }

    // Priority 3: Fallback
    return 'en';
}

/**
 * Apply the given language to strings and DOM
 */
function applyLanguage(langCode) {
    const target = resources[langCode] || resources.en;
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