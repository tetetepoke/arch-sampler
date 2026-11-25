/* =========================================================
   教科・分野・単元の一覧（画面に出す順番）
   ・問題がまだ無い単元は「準備中」と表示される
   ・ここに無い単元名の問題を追加しても、その分野の最後に自動で出てくる
   ・children がある単元は、さらに細かい単元（小単元）を選べる
   ・code は問題IDの頭につける記号（例：SOC-GEO-SEA-001）
   ========================================================= */
StudyData.catalog = [
  { subject: "社会", code: "SOC", color: "#d9482b", categories: [
    { name: "地理", code: "GEO", units: [
      { name: "世界の姿", code: "WLD", grade: 1 },
      { name: "世界各地の人々の生活と環境", code: "LIFE", grade: 1 },
      { name: "アジア州", grade: 1, children: [
        { name: "アジア州（総合）", code: "ASIA" },
        { name: "東アジア", code: "EA" },
        { name: "東南アジア", code: "SEA" },
        { name: "南アジア", code: "SA" },
        { name: "西アジア", code: "WA" },
        { name: "中央アジア", code: "CA" } ] },
      { name: "ヨーロッパ州", code: "EUR", grade: 1 },
      { name: "アフリカ州", code: "AFR", grade: 1 },
      { name: "北アメリカ州", code: "NAM", grade: 1 },
      { name: "南アメリカ州", code: "SAM", grade: 1 },
      { name: "オセアニア州", code: "OCE", grade: 1 },
      { name: "日本の姿", code: "JPN", grade: 2 },
      { name: "日本の諸地域", code: "JREG", grade: 2 } ] },
    { name: "歴史", code: "HIS", units: [
      { name: "古代文明", code: "ANC", grade: 1 },
      { name: "縄文時代", code: "JOMON", grade: 1 },
      { name: "弥生時代", code: "YAYOI", grade: 1 },
      { name: "古墳時代", code: "KOFUN", grade: 1 },
      { name: "飛鳥時代", code: "ASUKA", grade: 1 },
      { name: "奈良時代", code: "NARA", grade: 1 },
      { name: "平安時代", code: "HEIAN", grade: 1 },
      { name: "鎌倉時代", code: "KAMA", grade: 2 },
      { name: "室町時代", code: "MURO", grade: 2 },
      { name: "江戸時代", code: "EDO", grade: 2 },
      { name: "明治時代", code: "MEIJI", grade: 3 } ] },
    { name: "公民", code: "CIV", units: [
      { name: "現代社会", code: "MOD", grade: 3 },
      { name: "日本国憲法", code: "CONST", grade: 3 } ] } ] },

  { subject: "数学", code: "MATH", color: "#2459c9", categories: [
    { name: "数と式", code: "ALG", units: [
      { name: "正の数・負の数", code: "INT", grade: 1 },
      { name: "文字と式", code: "EXP", grade: 1 },
      { name: "一次方程式", code: "EQ", grade: 1 },
      { name: "連立方程式", code: "SIM", grade: 2 },
      { name: "平方根", code: "SQRT", grade: 3 } ] },
    { name: "関数", code: "FUN", units: [
      { name: "比例と反比例", code: "PROP", grade: 1 },
      { name: "一次関数", code: "LIN", grade: 2 } ] },
    { name: "図形", code: "GEO", units: [
      { name: "平面図形", code: "PLANE", grade: 1 },
      { name: "空間図形", code: "SOLID", grade: 1 } ] },
    { name: "データの活用", code: "DATA", units: [
      { name: "データの分布", code: "DIST", grade: 1 } ] } ] },

  { subject: "英語", code: "ENG", color: "#7b3fc4", categories: [
    { name: "文法", code: "GRM", units: [
      { name: "be動詞", code: "BE", grade: 1 },
      { name: "一般動詞", code: "VERB", grade: 1 },
      { name: "疑問詞", code: "WH", grade: 1 },
      { name: "名詞の複数形", code: "PL", grade: 1 },
      { name: "代名詞", code: "PRON", grade: 1 },
      { name: "命令文", code: "IMP", grade: 1 },
      { name: "can", code: "CAN", grade: 1 },
      { name: "現在進行形", code: "PROG", grade: 1 },
      { name: "過去形", code: "PAST", grade: 1 } ] },
    { name: "単語・熟語", code: "VOC", units: [
      { name: "中1の単語", code: "W1", grade: 1 } ] } ] },

  { subject: "理科", code: "SCI", color: "#13895f", categories: [
    { name: "生物", code: "BIO", units: [
      { name: "身近な生物の観察", code: "OBS", grade: 1 },
      { name: "植物のつくりとはたらき", code: "PLANT", grade: 1 },
      { name: "植物の分類", code: "PCLS", grade: 1 },
      { name: "動物の分類", code: "ACLS", grade: 1 } ] },
    { name: "化学", code: "CHEM", units: [
      { name: "身のまわりの物質", code: "MAT", grade: 1 },
      { name: "気体の性質", code: "GAS", grade: 1 },
      { name: "水溶液", code: "SOL", grade: 1 },
      { name: "状態変化", code: "STATE", grade: 1 } ] },
    { name: "物理", code: "PHYS", units: [
      { name: "光", code: "LIGHT", grade: 1 },
      { name: "音", code: "SOUND", grade: 1 },
      { name: "力", code: "FORCE", grade: 1 } ] },
    { name: "地学", code: "EARTH", units: [
      { name: "火山", code: "VOLC", grade: 1 },
      { name: "地震", code: "QUAKE", grade: 1 },
      { name: "地層", code: "STRAT", grade: 1 } ] } ] },

  { subject: "国語", code: "JPN", color: "#b8861b", categories: [
    { name: "漢字・語句", code: "KANJI", units: [
      { name: "漢字の読み書き", code: "RW", grade: 1 },
      { name: "ことわざ・慣用句", code: "IDIOM", grade: 1 } ] },
    { name: "文法", code: "GRM", units: [
      { name: "言葉の単位", code: "UNIT", grade: 1 },
      { name: "品詞", code: "POS", grade: 1 } ] },
    { name: "古典", code: "CLS", units: [
      { name: "歴史的仮名遣い", code: "KANA", grade: 1 },
      { name: "竹取物語", code: "TAKE", grade: 1 } ] } ] }
];
