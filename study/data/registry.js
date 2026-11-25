/* =========================================================
   問題データの登録口（アプリ本体より先に読み込む）
   問題ファイルは StudyData.addUnit(単元情報, 問題の配列) を呼ぶだけ。
   ========================================================= */
window.StudyData = {
  // 学年・教科の表示順（問題がまだ無いものは「準備中」と表示される）
  grades: ["中学1年", "中学2年", "中学3年"],
  subjects: ["社会", "理科", "英語", "国語", "数学"],
  // 分野・単元・小単元の表示順（書いていないものは登録順）
  order: {
    "アジア州": ["アジア州全体", "東アジア", "東南アジア", "南アジア", "西アジア", "中央アジア"]
  },
  questions: [],
  addUnit: function (meta, list) {
    var seen = {};
    this.questions.forEach(function (q) { seen[q.id] = true; });
    list.forEach(function (q) {
      if (seen[q.id]) { console.warn("問題IDが重複しています:", q.id); return; }
      seen[q.id] = true;
      this.questions.push(Object.assign({
        grade: meta.grade, subject: meta.subject, field: meta.field,
        unit: meta.unit, section: meta.section || "",
        type: "choice", difficulty: 1, tags: []
      }, q));
    }, this);
  }
};
