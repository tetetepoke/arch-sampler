/* =========================================================
   教科・分野・単元の一覧（画面に出す順番）
   ・問題がまだ無い単元は「準備中」と表示される
   ・ここに無い単元名の問題を追加しても、その分野の最後に自動で出てくる
   ・children がある単元は、さらに細かい単元（小単元）を選べる
   ・code は問題IDの頭につける記号（例：SOC-GEO-SEA-001 = 社会-地理-東南アジア-001）
   ・grade を省略した単元は全学年で表示される
   ========================================================= */
StudyData.catalog = [
  { subject: "数学", code: "MATH", color: "#2459c9", categories: [
    { name: "正の数・負の数", code: "INT", units: [
      { name: "正負の数・数直線・絶対値", code: "SIGN", grade: 1 },
      { name: "加法・減法", code: "ADD", grade: 1 },
      { name: "乗法・除法・累乗", code: "MUL", grade: 1 },
      { name: "四則の混じった計算", code: "MIX", grade: 1 },
      { name: "素数・素因数分解", code: "PRIME", grade: 1 } ] },
    { name: "文字と式", code: "EXP", units: [
      { name: "文字を使った式・積と商の表し方", code: "NOTE", grade: 1 },
      { name: "式の値", code: "VAL", grade: 1 },
      { name: "項・係数・一次式の計算", code: "LIN", grade: 1 },
      { name: "数量の関係を式に表す", code: "REL", grade: 1 } ] },
    { name: "方程式", code: "EQ", units: [
      { name: "等式と方程式・移項", code: "BASE", grade: 1 },
      { name: "一次方程式の解き方", code: "SOLVE", grade: 1 },
      { name: "比例式", code: "RATIO", grade: 1 },
      { name: "方程式の文章題（速さ・割合・過不足）", code: "WORD", grade: 1 } ] },
    { name: "比例・反比例", code: "FUN", units: [
      { name: "比例", code: "PROP", grade: 1 },
      { name: "反比例", code: "INV", grade: 1 },
      { name: "座標とグラフ", code: "GRAPH", grade: 1 } ] },
    { name: "平面図形", code: "PLN", units: [
      { name: "直線・角・垂直と平行", code: "LINE", grade: 1 },
      { name: "図形の移動", code: "MOVE", grade: 1 },
      { name: "作図", code: "CONST", grade: 1 },
      { name: "円とおうぎ形", code: "CIRC", grade: 1 } ] },
    { name: "空間図形", code: "SOL", units: [
      { name: "いろいろな立体", code: "SHAPE", grade: 1 },
      { name: "展開図・投影図", code: "VIEW", grade: 1 },
      { name: "表面積と体積", code: "AREA", grade: 1 } ] },
    { name: "データの活用", code: "DATA", units: [
      { name: "度数分布表・ヒストグラム・相対度数", code: "FREQ", grade: 1 },
      { name: "代表値と範囲", code: "AVG", grade: 1 } ] } ] },

  { subject: "英語", code: "ENG", color: "#7b3fc4", categories: [
    { name: "基本", code: "BAS", units: [
      { name: "アルファベット・単語", code: "WORD", grade: 1 },
      { name: "英文の語順", code: "ORDER", grade: 1 } ] },
    { name: "文法（学習順）", code: "GRM", units: [
      { name: "be動詞", code: "BE", grade: 1 },
      { name: "一般動詞", code: "VERB", grade: 1 },
      { name: "名詞の複数形", code: "PL", grade: 1 },
      { name: "代名詞", code: "PRON", grade: 1 },
      { name: "疑問詞", code: "WH", grade: 1 },
      { name: "can", code: "CAN", grade: 1 },
      { name: "命令文", code: "IMP", grade: 1 },
      { name: "現在進行形", code: "PROG", grade: 1 },
      { name: "過去形", code: "PAST", grade: 1 } ] } ] },

  { subject: "国語", code: "JPN", color: "#b8861b", categories: [
    { name: "漢字", code: "KAN", units: [
      { name: "漢字の読み", code: "READ", grade: 1 },
      { name: "漢字の書き", code: "WRITE", grade: 1 },
      { name: "同音異義語", code: "HOMO", grade: 1 },
      { name: "熟語・部首", code: "COMP", grade: 1 } ] },
    { name: "文法", code: "GRM", units: [
      { name: "言葉の単位（文節・単語）", code: "UNIT", grade: 1 },
      { name: "文の成分（主語・述語・修飾語など）", code: "PART", grade: 1 },
      { name: "品詞", code: "POS", grade: 1 } ] },
    { name: "語句", code: "VOC", units: [
      { name: "類義語・対義語", code: "SYN", grade: 1 },
      { name: "慣用句・ことわざ", code: "IDIOM", grade: 1 },
      { name: "四字熟語", code: "YOJI", grade: 1 } ] },
    { name: "読解", code: "RD", units: [
      { name: "説明的文章", code: "EXP", grade: 1 },
      { name: "文学的文章", code: "LIT", grade: 1 } ] },
    { name: "古典", code: "CLS", units: [
      { name: "歴史的仮名遣い", code: "KANA", grade: 1 },
      { name: "古文の基本", code: "KOBUN", grade: 1 },
      { name: "漢文の基本", code: "KANBUN", grade: 1 } ] } ] },

  { subject: "理科", code: "SCI", color: "#13895f", categories: [
    { name: "生物", code: "BIO", units: [
      { name: "身近な生物の観察", code: "OBS", grade: 1 },
      { name: "花のつくりとはたらき", code: "FLOWER", grade: 1 },
      { name: "根・茎・葉のつくり", code: "ROOT", grade: 1 },
      { name: "光合成・呼吸・蒸散", code: "PHOTO", grade: 1 },
      { name: "植物の分類", code: "PCLS", grade: 1 },
      { name: "動物の分類", code: "ACLS", grade: 1 } ] },
    { name: "化学", code: "CHEM", units: [
      { name: "身のまわりの物質（金属・有機物・密度）", code: "MAT", grade: 1 },
      { name: "気体の性質", code: "GAS", grade: 1 },
      { name: "水溶液", code: "SOL", grade: 1 },
      { name: "状態変化", code: "STATE", grade: 1 } ] },
    { name: "物理", code: "PHYS", units: [
      { name: "光", code: "LIGHT", grade: 1 },
      { name: "音", code: "SOUND", grade: 1 },
      { name: "力と圧力", code: "FORCE", grade: 1 } ] },
    { name: "地学", code: "EARTH", units: [
      { name: "火山", code: "VOLC", grade: 1 },
      { name: "地震", code: "QUAKE", grade: 1 },
      { name: "地層", code: "STRAT", grade: 1 } ] } ] },

  { subject: "社会", code: "SOC", color: "#d9482b", categories: [
    { name: "地理", code: "GEO", units: [
      { name: "世界の姿", grade: 1, children: [
        { name: "六大陸と三大洋・世界の国々", code: "WLD" },
        { name: "緯度と経度・地球儀と地図", code: "LATLON" },
        { name: "時差", code: "TIME" } ] },
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
      { name: "オセアニア州", code: "OCE", grade: 1 } ] },
    { name: "歴史", code: "HIS", units: [
      { name: "人類の誕生と旧石器・新石器時代", code: "HUMAN", grade: 1 },
      { name: "世界の古代文明", code: "ANC", grade: 1 },
      { name: "縄文時代", code: "JOMON", grade: 1 },
      { name: "弥生時代", code: "YAYOI", grade: 1 },
      { name: "古墳時代", code: "KOFUN", grade: 1 },
      { name: "飛鳥時代", code: "ASUKA", grade: 1 },
      { name: "奈良時代", code: "NARA", grade: 1 },
      { name: "平安時代", code: "HEIAN", grade: 1 },
      { name: "鎌倉時代", code: "KAMA", grade: 1 } ] } ] }
];
