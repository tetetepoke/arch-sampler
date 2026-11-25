/* =========================================================
   問題データの登録口（最初に読み込まれる。ふだんは触らない）
   問題ファイルは StudyData.add(共通項目, [問題, 問題, ...]) を呼ぶだけ。
   共通項目を省略して、1問ずつ subject / category / unit を書いてもよい：
     StudyData.add([ { subject:"社会", category:"地理", unit:"東南アジア", ... } ])
   不備のある問題はここで除外され、アプリには出ない（理由はコンソールに表示）。
   ========================================================= */
window.StudyData = {
  catalog: [],     // data/catalog.js  … 教科・分野・単元の並び
  files: [],       // data/manifest.js … 読み込む問題ファイルの一覧
  questions: [],
  problems: [],    // 読み込み時に見つかった不備
  add: function (defaults, list) {
    if (Array.isArray(defaults)) { list = defaults; defaults = {}; }
    var ids = this._ids || (this._ids = {});
    for (var i = 0; i < list.length; i++) {
      var raw = list[i];
      var q = Object.assign({ type: "choice", tags: [] }, defaults, raw);
      var where = (q.id || "(IDなし)") + " / " + q.question;
      var bad = null;
      if (!q.id) bad = "IDがありません";
      else if (ids[q.id]) bad = "IDが重複しています（後の方を無視）";
      else if (!q.subject || !q.category || !q.unit) bad = "subject / category / unit が足りません";
      else if (q.grade == null) bad = "grade がありません";
      else if (q.difficulty == null || q.importance == null) bad = "difficulty / importance がありません";
      else if (!q.question) bad = "question がありません";
      else if (typeof q.gen !== "function") {          // 自動生成問題は、表示のたびに gen で作るのでここでは調べない
        if (q.answer === undefined || q.answer === "") bad = "answer がありません";
        else if (!q.explanation) bad = "explanation がありません";
        else if ((q.type === "choice" || (q.type === "fill" && q.choices)) && (!q.choices || q.choices.indexOf(q.answer) < 0)) bad = "正解が選択肢にありません";
        else if (q.choices && new Set(q.choices).size !== q.choices.length) bad = "選択肢が重複しています";
      }
      if (bad) { this.problems.push(bad + ": " + where); continue; }
      q.grade = Number(q.grade);
      q.difficulty = Math.min(3, Math.max(1, Number(q.difficulty)));
      q.importance = Math.min(3, Math.max(1, Number(q.importance)));
      ids[q.id] = true;
      this.questions.push(q);
    }
  }
};

/* ---------- 自動生成問題（gen）で使える道具 ----------
   gen: function (R) { ... return { question, answer, choices, explanation }; }
   R.int(a, b)        a以上b以下の整数
   R.nz(a, b)         0以外の整数
   R.pick([..])       配列から1つ
   R.shuffle([..])    並べかえ
   R.choices(正解, [まちがい候補...])  正解＋重複しない3つ（足りなければ近い数で補う）
   R.sgn(n)           数を「+3」「−3」の形の文字列に（0は「0」）
   R.num(n)           負の数を「−3」の形の文字列に
   R.paren(n)         負の数だけかっこ付き「(−3)」  */
window.StudyData.R = {
  int: function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); },
  nz: function (a, b) { var n; do { n = this.int(a, b); } while (n === 0); return n; },
  pick: function (a) { return a[Math.floor(Math.random() * a.length)]; },
  shuffle: function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; },
  num: function (n) { return n < 0 ? "−" + (-n) : String(n); },
  sgn: function (n) { return n > 0 ? "+" + n : n < 0 ? "−" + (-n) : "0"; },
  paren: function (n) { return n < 0 ? "(−" + (-n) + ")" : String(n); },
  choices: function (answer, wrongs) {
    var out = [String(answer)], seen = {}; seen[String(answer)] = 1;
    (wrongs || []).forEach(function (w) { w = String(w); if (!seen[w] && out.length < 4) { seen[w] = 1; out.push(w); } });
    var base = parseInt(String(answer).replace("−", "-"), 10), k = 1;
    while (out.length < 4 && !isNaN(base)) { [base + k, base - k].forEach(function (v) { var s = v < 0 ? "−" + (-v) : String(v); if (!seen[s] && out.length < 4) { seen[s] = 1; out.push(s); } }); k++; }
    return out;
  }
};
