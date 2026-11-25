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

const TYPES = ["choice", "tf", "fill", "written", "oneword"];
const norm = s => String(s).normalize("NFKC").replace(/[\s　、。・,.?？!！「」『』（）()]/g, "");
const grams = s => { const n = norm(s), g = new Set(); for (let i = 0; i < n.length - 1; i++) g.add(n.slice(i, i + 2)); return g; };
const sim = (a, b) => { let x = 0; a.forEach(g => b.has(g) && x++); return x / (a.size + b.size - x || 1); };

const QS = SD.questions;
for (const q of QS) {
  const at = `${q.id}（${fileOf[q.id]}）`;
  if (!/^[A-Z]+(-[A-Z0-9]+)+-\d{3,}$/.test(q.id)) warns.push(`IDの形式が推奨と違います: ${at}  例: SOC-GEO-SEA-001`);
  const pre = codes[q.subject + "|" + q.unit];
  if (pre && !q.id.startsWith(pre + "-")) warns.push(`IDの頭が単元コード ${pre} と違います: ${at}`);
  if (!TYPES.includes(q.type)) errors.push(`type が不正です（${q.type}）: ${at}`);
  if (q.type === "choice") {
    if (q.choices.length !== 4) warns.push(`4択なのに選択肢が${q.choices.length}個です: ${at}`);
    if (new Set(q.choices).size !== q.choices.length) errors.push(`選択肢が重複しています: ${at}`);
  }
  if (q.type === "fill" && q.choices && !q.choices.includes(q.answer)) errors.push(`穴埋めの正解が選択肢にありません: ${at}`);
  if (q.type === "tf" && typeof q.answer !== "boolean") errors.push(`○×問題の answer は true / false にしてください: ${at}`);
  if (q.type === "written" && !(q.keywords && q.keywords.length)) warns.push(`記述問題に keywords がありません（自己採点の目安になります）: ${at}`);
  if (!q.explanation) warns.push(`解説がありません: ${at}`);
  if (!q.category) warns.push(`category（分野）がありません: ${at}`);
  if (q.variantOf && !QS.some(x => x.id === q.variantOf)) errors.push(`variantOf の問題IDが存在しません（${q.variantOf}）: ${at}`);
}
// 重複・類似問題
const G = QS.map(q => ({ q, g: grams(q.question), n: norm(q.question) }));
for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++) {
  const a = G[i], b = G[j];
  if (a.q.subject !== b.q.subject) continue;
  const linked = a.q.variantOf === b.q.id || b.q.variantOf === a.q.id;
  if (a.n === b.n) { (linked ? warns : errors).push(`同じ問題文: ${a.q.id} と ${b.q.id}`); continue; }
  const s = sim(a.g, b.g);
  if (s >= 0.6 && !linked) warns.push(`似ている問題（${Math.round(s * 100)}%）: ${a.q.id} と ${b.q.id}\n    「${a.q.question}」\n    「${b.q.question}」`);
}

// 結果
const by = {};
QS.forEach(q => { const k = `${q.subject} › ${q.category} › ${q.unit}`; by[k] = by[k] || { n: 0, types: {}, imp3: 0 }; by[k].n++; by[k].types[q.type] = (by[k].types[q.type] || 0) + 1; if (q.importance === 3) by[k].imp3++; });
console.log(`\n問題数 合計 ${QS.length}問（ファイル ${SD.files.length}個）`);
for (const k of Object.keys(by)) console.log(`  ${k}: ${by[k].n}問  [${Object.entries(by[k].types).map(([t, n]) => t + " " + n).join(", ")}]  頻出 ${by[k].imp3}`);
if (process.argv.includes("--next")) {
  const max = {};
  QS.forEach(q => { const m = q.id.match(/^(.*)-(\d+)$/); if (m) max[m[1]] = Math.max(max[m[1]] || 0, +m[2]); });
  console.log("\n次に使うID:");
  Object.keys(max).sort().forEach(p => console.log(`  ${p}-${String(max[p] + 1).padStart(3, "0")}`));
}
if (warns.length) console.log(`\n⚠ 警告 ${warns.length}件\n  ` + warns.join("\n  "));
if (errors.length) { console.log(`\n✖ エラー ${errors.length}件\n  ` + errors.join("\n  ")); process.exit(1); }
console.log("\n✔ エラーなし");
