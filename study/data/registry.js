/* =========================================================
   問題データの登録口（最初に読み込まれる。ふだんは触らない）
   問題ファイルは StudyData.add(共通項目, [問題, 問題, ...]) を呼ぶだけ。
   共通項目を省略して、1問ずつ subject / category / unit を書いてもよい：
     StudyData.add([ { subject:"社会", category:"地理", unit:"東南アジア", ... } ])
   ========================================================= */
window.StudyData = {
  catalog: [],     // data/catalog.js  … 教科・分野・単元の並び
  files: [],       // data/manifest.js … 読み込む問題ファイルの一覧
  questions: [],
  problems: [],    // 読み込み時に見つかった不備（コンソールに表示）
  add: function (defaults, list) {
    if (Array.isArray(defaults)) { list = defaults; defaults = {}; }
    var ids = this._ids || (this._ids = {});
    for (var i = 0; i < list.length; i++) {
      var q = Object.assign({ type: "choice", difficulty: 1, importance: 2, grade: 1, tags: [] }, defaults, list[i]);
      q.grade = Number(q.grade) || 1;
      q.difficulty = Math.min(3, Math.max(1, Number(q.difficulty) || 1));
      q.importance = Math.min(3, Math.max(1, Number(q.importance) || 2));
      var where = (q.id || "(IDなし)") + " / " + q.question;
      if (!q.id) { this.problems.push("IDがありません: " + where); continue; }
      if (ids[q.id]) { this.problems.push("IDが重複しています（後の方を無視）: " + q.id); continue; }
      if (!q.subject || !q.unit || !q.question || q.answer === undefined) { this.problems.push("必須項目が足りません: " + where); continue; }
      if (q.type === "choice" && (!q.choices || q.choices.indexOf(q.answer) < 0)) { this.problems.push("正解が選択肢にありません: " + where); continue; }
      ids[q.id] = true;
      this.questions.push(q);
    }
  }
};
