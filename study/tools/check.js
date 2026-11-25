#!/usr/bin/env node
/* =========================================================
   問題データのチェック（問題を追加したら必ず実行する）
     node study/tools/check.js            … チェックと単元別の問題数
     node study/tools/check.js --next     … 単元ごとの「次に使うID」も表示
   エラーがあると終了コード1。似ている問題は警告として表示。
   ========================================================= */
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "data");
const ctx = { window: {}, console };
vm.createContext(ctx);
const run = f => vm.runInContext(fs.readFileSync(f, "utf8"), ctx, { filename: f });
run(path.join(ROOT, "registry.js"));
ctx.StudyData = ctx.window.StudyData;
run(path.join(ROOT, "catalog.js"));
run(path.join(ROOT, "manifest.js"));
const SD = ctx.StudyData;
const errors = [], warns = [];
// 省略時の初期値に頼らず、difficulty / importance が明示されているかを確認するため元データを記録
const explicit = {};
const origAdd = SD.add;
SD.add = function (defaults, list) {
  const d = Array.isArray(defaults) ? {} : defaults, l = Array.isArray(defaults) ? defaults : list;
  l.forEach(q => { explicit[q.id] = { difficulty: "difficulty" in q || "difficulty" in d, importance: "importance" in q || "importance" in d }; });
  return origAdd.call(this, defaults, list);
};

// manifest と実ファイルの対応
const qdir = path.join(ROOT, "questions");
const onDisk = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : f.endsWith(".js") && onDisk.push(path.relative(qdir, p).split(path.sep).join("/")); } })(qdir);
const fileOf = {};
for (const f of SD.files) {
  const p = path.join(qdir, f);
  if (!fs.existsSync(p)) { errors.push(`manifest.js にあるファイルが見つかりません: ${f}`); continue; }
  const before = SD.questions.length;
  try { run(p); } catch (e) { errors.push(`文法エラー: ${f}\n    ${e.message}`); }
  SD.questions.slice(before).forEach(q => fileOf[q.id] = f);
}
onDisk.filter(f => !SD.files.includes(f)).forEach(f => warns.push(`manifest.js に書かれていないファイル（アプリに出ません）: ${f}`));
SD.problems.forEach(p => errors.push(p));

// catalog のコード表
const codes = {};
for (const s of SD.catalog) for (const c of s.categories) for (const u of c.units) {
  const put = (name, code) => { if (code) codes[s.subject + "|" + name] = `${s.code}-${c.code}-${code}`; };
  put(u.name, u.code); (u.children || []).forEach(ch => put(ch.name, ch.code));
}

const TYPES = ["choice", "tf", "fill", "written", "oneword", "order"];
// 数の答えを読む（−3、3/4、−0.5 など）
// π をふくむ答え（6π など）は、calc に係数（6）を書く決まり
const parseNum = a => { a = String(a).trim(); if (a === "π") a = "1"; else if (a.endsWith("π")) a = a.slice(0, -1); const m = String(a).replace(/[−–]/g, "-").replace(/\s/g, "").match(/^([+-]?\d+(?:\.\d+)?)(?:\/(\d+))?$/); return m ? (+m[1]) / (m[2] ? +m[2] : 1) : NaN; };
// calc（JavaScriptの式）を計算して answer と一致するか調べる
function checkCalc(q, at, list) {
  if (q.calc == null) return;
  let v; try { v = Function("return (" + q.calc + ")")(); } catch (e) { list.push(`calc の式がまちがっています（${q.calc}）: ${at}`); return; }
  const a = parseNum(q.calcAnswer != null ? q.calcAnswer : q.answer);
  if (isNaN(a) || Math.abs(a - v) > 1e-9) list.push(`計算結果が answer と一致しません（calc=${q.calc} → ${v}、answer=${q.answer}）: ${at}`);
}
// 選択肢・並べかえの形式チェック（自動生成問題の各回にも使う）
function checkShape(q, at, list) {
  if (q.type === "choice" || (q.type === "fill" && q.choices)) {
    if (!q.choices || q.choices.length < 2) list.push(`選択肢が足りません: ${at}`);
    else {
      if (!q.choices.includes(q.answer)) list.push(`正解が選択肢にありません（${q.answer}）: ${at}`);
      if (new Set(q.choices.map(String)).size !== q.choices.length) list.push(`選択肢が重複しています（${q.choices.join(" / ")}）: ${at}`);
    }
  }
  if (q.type === "order") {
    if (!Array.isArray(q.words) || q.words.length < 2) list.push(`並べかえの words がありません: ${at}`);
    else if (norm(q.words.join(" ")) .length !== norm(q.answer).length) list.push(`並べかえの words と answer の文字が合いません: ${at}`);
  }
  if (q.answer === undefined || q.answer === "") list.push(`answer がありません: ${at}`);
  if (!q.explanation) list.push(`explanation がありません: ${at}`);
}
// 比較用：空白や句読点のちがいは無視（数学で意味のある半角かっこ・記号は残す）
const norm = s => String(s).normalize("NFKC").replace(/[\s　、。・,?？!！「」『』]/g, "");
const grams = s => { const n = norm(s), g = new Set(); for (let i = 0; i < n.length - 1; i++) g.add(n.slice(i, i + 2)); return g; };
const sim = (a, b) => { let x = 0; a.forEach(g => b.has(g) && x++); return x / (a.size + b.size - x || 1); };

const QS = SD.questions;
let genRuns = 0;
for (const q of QS) {
  const at = `${q.id}（${fileOf[q.id]}）`;
  if (typeof q.gen === "function") {
    // 自動生成問題：300回つくって、毎回正しい形になっているか確認
    const errs = new Set(), qs = new Set();
    for (let k = 0; k < 300; k++) {
      let inst; try { inst = Object.assign({}, q, q.gen(SD.R)); } catch (e) { errs.add("gen がエラーになります: " + e.message); break; }
      const tmp = []; checkShape(inst, at, tmp); checkCalc(inst, at, tmp); tmp.forEach(t => errs.add(t)); qs.add(inst.question);
    }
    genRuns++;
    errs.forEach(e => errors.push("【自動生成】" + e));
    if (qs.size < 5) warns.push(`自動生成なのに問題のバリエーションが少なすぎます（${qs.size}種類）: ${at}`);
    if (!TYPES.includes(q.type)) errors.push(`type が不正です（${q.type}）: ${at}`);
    continue;
  }
  checkShape(q, at, errors); checkCalc(q, at, errors);
  if (!/^[A-Z]+(-[A-Z0-9]+)+-\d{3,}$/.test(q.id)) warns.push(`IDの形式が推奨と違います: ${at}  例: SOC-GEO-SEA-001`);
  const pre = codes[q.subject + "|" + q.unit];
  if (pre && !q.id.startsWith(pre + "-")) warns.push(`IDの頭が単元コード ${pre} と違います: ${at}`);
  if (!TYPES.includes(q.type)) errors.push(`type が不正です（${q.type}）: ${at}`);
  if (q.type === "choice" && q.choices.length !== 4 && !q.fewChoices) warns.push(`4択なのに選択肢が${q.choices.length}個です（意図どおりなら fewChoices: true）: ${at}`);
  if (q.type === "tf" && typeof q.answer !== "boolean") errors.push(`○×問題の answer は true / false にしてください: ${at}`);
  if (q.type === "written" && !(q.keywords && q.keywords.length)) warns.push(`記述問題に keywords がありません（自己採点の目安になります）: ${at}`);
  if (!explicit[q.id] || !explicit[q.id].difficulty) errors.push(`difficulty（難易度）が書かれていません: ${at}`);
  if (!explicit[q.id] || !explicit[q.id].importance) errors.push(`importance（重要度）が書かれていません: ${at}`);
  if (q.type === "fill" && !q.choices && !String(q.answer).trim()) errors.push(`穴埋めの正解が空です: ${at}`);
  if (q.image && !fs.existsSync(path.join(ROOT, "..", q.image))) errors.push(`画像ファイルが見つかりません（${q.image}）: ${at}`);
  if (!q.category) warns.push(`category（分野）がありません: ${at}`);
  if (q.variantOf && !QS.some(x => x.id === q.variantOf)) errors.push(`variantOf の問題IDが存在しません（${q.variantOf}）: ${at}`);
}
// 重複・類似問題
const G = QS.map(q => ({ q, g: grams(q.question), n: norm(q.question) }));
for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++) {
  const a = G[i], b = G[j];
  if (a.q.subject !== b.q.subject || a.q.gen || b.q.gen) continue;
  const linked = a.q.variantOf === b.q.id || b.q.variantOf === a.q.id;
  // 問題文も答えも同じ＝重複（「まちがいがある文はどれ？」のように聞き方だけ同じで中身がちがう問題は対象外）
  const sameAns = norm(a.q.answer) === norm(b.q.answer);
  if (a.n === b.n) { if (sameAns) (linked ? warns : errors).push(`同じ問題（問題文と答えが同じ）: ${a.q.id} と ${b.q.id}`); continue; }
  const s = sim(a.g, b.g);
  if (s >= 0.6 && sameAns && !linked) warns.push(`似ている問題（${Math.round(s * 100)}%）: ${a.q.id} と ${b.q.id}\n    「${a.q.question}」\n    「${b.q.question}」`);
}

// 結果
const by = {};
const dAll = [0, 0, 0, 0];
QS.forEach(q => { const k = `${q.subject} › ${q.category} › ${q.unit}`; by[k] = by[k] || { n: 0, types: {}, imp3: 0, d: [0, 0, 0, 0] }; by[k].n++; by[k].types[q.type] = (by[k].types[q.type] || 0) + 1; if (q.importance === 3) by[k].imp3++; by[k].d[q.difficulty]++; dAll[q.difficulty]++; });
const pc = (a, n) => Math.round(a / n * 100) + "%";
console.log(`\n問題数 合計 ${QS.length}問（ファイル ${SD.files.length}個）  難易度 ★${pc(dAll[1], QS.length)} ★★${pc(dAll[2], QS.length)} ★★★${pc(dAll[3], QS.length)}`);
for (const k of Object.keys(by)) console.log(`  ${k}: ${by[k].n}問  [${Object.entries(by[k].types).map(([t, n]) => t + " " + n).join(", ")}]  ★${by[k].d[1]} ★★${by[k].d[2]} ★★★${by[k].d[3]}  頻出 ${by[k].imp3}`);
if (process.argv.includes("--next")) {
  const max = {};
  QS.forEach(q => { const m = q.id.match(/^(.*)-(\d+)$/); if (m) max[m[1]] = Math.max(max[m[1]] || 0, +m[2]); });
  console.log("\n次に使うID:");
  Object.keys(max).sort().forEach(p => console.log(`  ${p}-${String(max[p] + 1).padStart(3, "0")}`));
}
if (warns.length) console.log(`\n⚠ 警告 ${warns.length}件\n  ` + warns.join("\n  "));
if (errors.length) { console.log(`\n✖ エラー ${errors.length}件\n  ` + errors.join("\n  ")); process.exit(1); }
console.log("\n✔ エラーなし");
