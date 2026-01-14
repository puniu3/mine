export const resources = {
    semantics: {
        continue_btn: "Title screen: Continue button. Resumes from autosave (game saves to browser localStorage every 5 seconds).",
        start_btn: "Title screen: Start button. Displayed when no save data exists. Starts with new player data and world.",
        reset_btn: "Title screen: Restart button. Displayed when save data exists. Deletes current save and starts fresh.",
        world_btn: "Title screen: World button. Opens modal to export/import world data as images.",
        inst_pc: "Title screen: Instruction header. Guide for keyboard + mouse controls.",
        inst_move_pc: "Title screen: Instruction. A, D, Left, Right to move.",
        inst_jump_pc: "Title screen: Instruction. Space key, W, Up to jump.",
        inst_action_pc: "Title screen: Instruction. Click to place or break (gather) blocks.",
        inst_climb_pc: "Title screen: Instruction. S to place block at feet and climb.",
        inst_mobile: "Title screen: Instruction header. Guide for touch controls.",
        inst_move_mobile: "Title screen: Instruction. Left/Right triangle buttons appear at bottom left; tap to move.",
        inst_jump_mobile: "Title screen: Instruction. Up triangle button appears at bottom right; tap to jump.",
        inst_action_mobile: "Title screen: Instruction. Tap tiles directly around the player character to break or place blocks.",
        inst_climb_mobile: "Title screen: Instruction. Tap the player character to place a block at feet and climb up.",
        inst_gamepad: "Title screen: Instruction header. Guide for gamepad controls.",
        label_move: "Title screen: Gamepad instruction label. Indicates controls for character movement.",
        label_cursor: "Title screen: Gamepad instruction label. Indicates controls for cursor movement.",
        label_jump: "Title screen: Gamepad instruction label. Indicates the button for jumping.",
        label_make: "Title screen: Gamepad instruction label. Indicates the button for placing blocks.",
        label_break: "Title screen: Gamepad instruction label. Indicates the button for breaking blocks.",
        label_climb: "Title screen: Gamepad instruction label. Indicates the button to place a block at feet and climb up.",
        label_select: "Title screen: Gamepad instruction label. Indicates buttons to cycle through items in the hotbar (left/right).",
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
        inst_move_pc: "うごく: やじるし / A D",
        inst_jump_pc: "とぶ: スペース / W / ↑",
        inst_action_pc: "つくる・こわす: クリック",
        inst_climb_pc: "のぼる: S",
        inst_mobile: "スマホ",
        inst_move_mobile: "うごく: ← →",
        inst_jump_mobile: "とぶ: ↑",
        inst_action_mobile: "つくる・こわす: タップ",
        inst_climb_mobile: "のぼる: キャラをタップ",
        inst_gamepad: "コントローラー",
        label_move: "うごく",
        label_cursor: "カーソル",
        label_jump: "とぶ",
        label_make: "つくる",
        label_break: "こわす",
        label_climb: "のぼる",
        label_select: "えらぶ",
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
        inst_move_pc: "Move: Arrows / A D",
        inst_jump_pc: "Jump: Space / W / Up",
        inst_action_pc: "Put / Break: Click",
        inst_climb_pc: "Climb: S",
        inst_mobile: "Touch Controls",
        inst_move_mobile: "Move: ← →",
        inst_jump_mobile: "Jump: ↑",
        inst_action_mobile: "Put / Break: Tap",
        inst_climb_mobile: "Climb: Tap Player",
        inst_gamepad: "Controller",
        label_move: "Move",
        label_cursor: "Cursor",
        label_jump: "Jump",
        label_make: "Put",
        label_break: "Break",
        label_climb: "Climb",
        label_select: "Select",
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
        inst_move_pc: "移动: 箭头 / A D",
        inst_jump_pc: "跳: 空格键 / W / ↑",
        inst_action_pc: "盖东西 / 拆方块: 点击",
        inst_climb_pc: "爬高: S",
        inst_mobile: "手机怎么玩",
        inst_move_mobile: "移动: ← →",
        inst_jump_mobile: "跳: ↑",
        inst_action_mobile: "盖东西 / 拆方块: 点按",
        inst_climb_mobile: "爬高: 点按角色",
        inst_gamepad: "手柄怎么玩",
        label_move: "移动",
        label_cursor: "光标",
        label_jump: "跳",
        label_make: "盖",
        label_break: "拆",
        label_climb: "爬",
        label_select: "选",
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
        inst_move_pc: "移動: 箭頭 / A D",
        inst_jump_pc: "跳: 空白鍵 / W / ↑",
        inst_action_pc: "蓋東西 / 拆方塊: 點擊",
        inst_climb_pc: "爬高: S",
        inst_mobile: "手機怎麼玩",
        inst_move_mobile: "移動: ← →",
        inst_jump_mobile: "跳: ↑",
        inst_action_mobile: "蓋東西 / 拆方塊: 點按",
        inst_climb_mobile: "爬高: 點按角色",
        inst_gamepad: "手把怎麼玩",
        label_move: "移動",
        label_cursor: "游標",
        label_jump: "跳",
        label_make: "蓋",
        label_break: "拆",
        label_climb: "爬",
        label_select: "選",
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
        inst_move_pc: "Mover: Flechas / A D",
        inst_jump_pc: "Saltar: Espacio / W / ↑",
        inst_action_pc: "Poner / Quitar: Clic",
        inst_climb_pc: "Subir: S",
        inst_mobile: "En móvil",
        inst_move_mobile: "Mover: ← →",
        inst_jump_mobile: "Saltar: ↑",
        inst_action_mobile: "Poner / Quitar: Tocar",
        inst_climb_mobile: "Subir: Tocar personaje",
        inst_gamepad: "Mando",
        label_move: "Mover",
        label_cursor: "Cursor",
        label_jump: "Saltar",
        label_make: "Poner",
        label_break: "Quitar",
        label_climb: "Subir",
        label_select: "Elegir",
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
        inst_move_pc: "Bouger : Flèches / A D",
        inst_jump_pc: "Sauter : Espace / W / ↑",
        inst_action_pc: "Mettre / Casser : Clic",
        inst_climb_pc: "Monter : S",
        inst_mobile: "Sur mobile",
        inst_move_mobile: "Bouger : ← →",
        inst_jump_mobile: "Sauter : ↑",
        inst_action_mobile: "Mettre / Casser : Toucher",
        inst_climb_mobile: "Monter : Touche sur toi",
        inst_gamepad: "Manette",
        label_move: "Bouger",
        label_cursor: "Curseur",
        label_jump: "Sauter",
        label_make: "Mettre",
        label_break: "Casser",
        label_climb: "Monter",
        label_select: "Choisir",
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
        inst_move_pc: "Laufen: Pfeile / A D",
        inst_jump_pc: "Hüpfen: Leertaste / W / ↑",
        inst_action_pc: "Bauen / Abbauen: Klick",
        inst_climb_pc: "Klettern: S",
        inst_mobile: "Am Handy",
        inst_move_mobile: "Laufen: ← →",
        inst_jump_mobile: "Hüpfen: ↑",
        inst_action_mobile: "Bauen / Abbauen: Tippen",
        inst_climb_mobile: "Klettern: Tipp auf dich",
        inst_gamepad: "Controller",
        label_move: "Laufen",
        label_cursor: "Cursor",
        label_jump: "Hüpfen",
        label_make: "Bauen",
        label_break: "Abbauen",
        label_climb: "Klettern",
        label_select: "Wählen",
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
        inst_move_pc: "Muovi: Frecce / A D",
        inst_jump_pc: "Salta: Spazio / W / ↑",
        inst_action_pc: "Metti / Rompi: Clic",
        inst_climb_pc: "Sali: S",
        inst_mobile: "Telefono",
        inst_move_mobile: "Muovi: ← →",
        inst_jump_mobile: "Salta: ↑",
        inst_action_mobile: "Metti / Rompi: Tocca",
        inst_climb_mobile: "Sali: Tocca l'omino",
        inst_gamepad: "Controller",
        label_move: "Muovi",
        label_cursor: "Cursore",
        label_jump: "Salta",
        label_make: "Metti",
        label_break: "Rompi",
        label_climb: "Sali",
        label_select: "Scegli",
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
        inst_move_pc: "Andar: Setas / A D",
        inst_jump_pc: "Pular: Espaço / W / ↑",
        inst_action_pc: "Pôr / Tirar: Clique",
        inst_climb_pc: "Subir: S",
        inst_mobile: "No Celular",
        inst_move_mobile: "Andar: ← →",
        inst_jump_mobile: "Pular: ↑",
        inst_action_mobile: "Pôr / Tirar: Toque",
        inst_climb_mobile: "Subir: Toque no boneco",
        inst_gamepad: "Controle",
        label_move: "Andar",
        label_cursor: "Cursor",
        label_jump: "Pular",
        label_make: "Pôr",
        label_break: "Tirar",
        label_climb: "Subir",
        label_select: "Escolher",
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
        inst_move_pc: "이동: 화살표 / A D",
        inst_jump_pc: "점프: 스페이스바 / W / ↑",
        inst_action_pc: "놓기 / 부수기: 클릭",
        inst_climb_pc: "올라가기: S",
        inst_mobile: "스마트폰",
        inst_move_mobile: "이동: ← →",
        inst_jump_mobile: "점프: ↑",
        inst_action_mobile: "놓기 / 부수기: 터치",
        inst_climb_mobile: "올라가기: 캐릭터 터치",
        inst_gamepad: "게임패드",
        label_move: "이동",
        label_cursor: "커서",
        label_jump: "점프",
        label_make: "놓기",
        label_break: "부수기",
        label_climb: "올라가기",
        label_select: "선택",
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
        inst_move_pc: "Ходить: Стрелки / A D",
        inst_jump_pc: "Прыгать: Пробел / W / ↑",
        inst_action_pc: "Строить / Ломать: Клик",
        inst_climb_pc: "Лезть: S",
        inst_mobile: "Телефон",
        inst_move_mobile: "Ходить: ← →",
        inst_jump_mobile: "Прыгать: ↑",
        inst_action_mobile: "Строить / Ломать: Нажми",
        inst_climb_mobile: "Лезть: Нажми на героя",
        inst_gamepad: "Геймпад",
        label_move: "Ходить",
        label_cursor: "Курсор",
        label_jump: "Прыгать",
        label_make: "Строить",
        label_break: "Ломать",
        label_climb: "Лезть",
        label_select: "Выбрать",
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
        inst_move_pc: "Gerak: Panah / A D",
        inst_jump_pc: "Lompat: Spasi / W / ↑",
        inst_action_pc: "Buat / Pecahkan: Klik",
        inst_climb_pc: "Panjat: S",
        inst_mobile: "HP",
        inst_move_mobile: "Gerak: ← →",
        inst_jump_mobile: "Lompat: ↑",
        inst_action_mobile: "Buat / Pecahkan: Sentuh",
        inst_climb_mobile: "Panjat: Sentuh karakter",
        inst_gamepad: "Stik",
        label_move: "Gerak",
        label_cursor: "Kursor",
        label_jump: "Lompat",
        label_make: "Buat",
        label_break: "Pecahkan",
        label_climb: "Panjat",
        label_select: "Pilih",
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
        inst_move_pc: "Ruch: Strzałki / A D",
        inst_jump_pc: "Skok: Spacja / W / ↑",
        inst_action_pc: "Buduj / Niszcz: Klik",
        inst_climb_pc: "Wspinaj się: S",
        inst_mobile: "Telefon",
        inst_move_mobile: "Ruch: ← →",
        inst_jump_mobile: "Skok: ↑",
        inst_action_mobile: "Buduj / Niszcz: Dotknij",
        inst_climb_mobile: "Wspinaj się: Dotknij siebie",
        inst_gamepad: "Pad",
        label_move: "Ruch",
        label_cursor: "Kursor",
        label_jump: "Skok",
        label_make: "Buduj",
        label_break: "Niszcz",
        label_climb: "Wspinaj",
        label_select: "Wybierz",
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
        inst_move_pc: "Рух: Стрілки / A D",
        inst_jump_pc: "Стрибок: Пробіл / W / ↑",
        inst_action_pc: "Будувати / Ламати: Клік",
        inst_climb_pc: "Лізти: S",
        inst_mobile: "Телефон",
        inst_move_mobile: "Рух: ← →",
        inst_jump_mobile: "Стрибок: ↑",
        inst_action_mobile: "Будувати / Ламати: Натисни",
        inst_climb_mobile: "Лізти: Натисни на себе",
        inst_gamepad: "Геймпад",
        label_move: "Рух",
        label_cursor: "Курсор",
        label_jump: "Стрибок",
        label_make: "Будувати",
        label_break: "Ламати",
        label_climb: "Лізти",
        label_select: "Вибрати",
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
        inst_move_pc: "Git: Oklar / A D",
        inst_jump_pc: "Zıpla: Boşluk / W / ↑",
        inst_action_pc: "Koy / Kır: Tıkla",
        inst_climb_pc: "Tırman: S",
        inst_mobile: "Telefon",
        inst_move_mobile: "Git: ← →",
        inst_jump_mobile: "Zıpla: ↑",
        inst_action_mobile: "Koy / Kır: Dokun",
        inst_climb_mobile: "Tırman: Kendine dokun",
        inst_gamepad: "Oyun Kolu",
        label_move: "Git",
        label_cursor: "İmleç",
        label_jump: "Zıpla",
        label_make: "Koy",
        label_break: "Kır",
        label_climb: "Tırman",
        label_select: "Seç",
        world_modal_title: "Dünyam",
        world_export_title: "Kaydet",
        world_export_desc: "Dünyayı resme çevir.",
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
        inst_move_pc: "Gerak: Anak Panah / A D",
        inst_jump_pc: "Lompat: Space / W / ↑",
        inst_action_pc: "Bina / Pecah: Klik",
        inst_climb_pc: "Panjat: S",
        inst_mobile: "Telefon",
        inst_move_mobile: "Gerak: ← →",
        inst_jump_mobile: "Lompat: ↑",
        inst_action_mobile: "Bina / Pecah: Sentuh",
        inst_climb_mobile: "Panjat: Sentuh orang",
        inst_gamepad: "Alat Kawalan",
        label_move: "Gerak",
        label_cursor: "Kursor",
        label_jump: "Lompat",
        label_make: "Bina",
        label_break: "Pecah",
        label_climb: "Panjat",
        label_select: "Pilih",
        world_modal_title: "Duniaku",
        world_export_title: "Simpan",
        world_export_desc: "Tukar dunia jadi gambar.",
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

    // Notify service worker to cache language-specific fonts
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'CACHE_LANGUAGE_FONTS',
            lang: langCode
        });
    }
}

/**
 * Initialize i18n with priority: LocalStorage > Browser > Fallback
 */
export function initI18n() {
    const langCode = detectLanguage();
    applyLanguage(langCode);

    // Notify service worker to cache language-specific fonts
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'CACHE_LANGUAGE_FONTS',
            lang: langCode
        });
    }
}
