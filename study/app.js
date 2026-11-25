/* =========================================================
   テスト対策ドリル  アプリ本体
   問題は data/questions/ 以下のファイルにあり、ここは書き換えなくてよい。
   ========================================================= */
{
const SD = window.StudyData;
let QS = [];
const TYPE_LABEL = { choice: "4択", tf: "○×", fill: "穴埋め", written: "記述", oneword: "一問一答", order: "並べかえ" };
const DIFF_LABEL = { 1: "基本", 2: "標準", 3: "応用" };
const WEAK_LABEL = { 1: "要復習", 2: "苦手", 3: "最重要復習" };
const MODE = {
  exam:   { name: "テスト直前", desc: "苦手・最近の間違い・テスト頻出を優先して15問", n: 15 },
  mock:   { name: "定期テスト模擬", desc: "20問。最後まで答えを見ずに解いて採点", n: 20 },
  c10:    { name: "10問チャレンジ", desc: "ランダムに10問", n: 10 },
  c20:    { name: "20問チャレンジ", desc: "ランダムに20問", n: 20 },
  weak:   { name: "苦手問題だけ", desc: "間違えた回数が多い順", n: 9999 },
  random: { name: "ランダム", desc: "すべての問題をシャッフル", n: 9999 },
  all:    { name: "全問題", desc: "すべての問題を順番に", n: 9999 },
  daily:  { name: "今日の10問", desc: "", n: 10 },
  mix:    { name: "5教科ミックス", desc: "", n: 10 },
  search: { name: "検索した問題", desc: "", n: 9999 },
  retry:  { name: "間違い直し", desc: "", n: 9999 }
};
const XP_OK = 10, XP_NG = 3, XP_PERFECT = 30;
const CLEAR_STREAK = 2; // 苦手問題を何回連続で正解したら苦手度が1段階下がるか
const DAY = 864e5;

/* ---------- 保存（localStorage） ---------- */
const KEY = "teststudy.v2", OLDKEY = "teststudy.v1";
const fresh = () => ({ v: 2, q: {}, log: [], daily: {}, dailyBest: {}, daily10: {}, streak: 0, best: 0, xp: 0, goal: 20, perfect10: 0, grade: 1, last: null, diff: 0 });
let S = fresh();
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { S = Object.assign(fresh(), JSON.parse(raw)); return; }
    const old = localStorage.getItem(OLDKEY);
    if (old) { S = migrate(JSON.parse(old)); save(); }
  } catch (e) {}
}
// 旧バージョン（v1）の記録を引き継ぐ：IDの付け替えと苦手度の変換
function migrate(o) {
  const n = fresh(), map = id => id.replace(/^j1-geo-(asia|sea|ea|sa|wa|ca)-(\d+)$/, (_, u, d) => `SOC-GEO-${u.toUpperCase()}-${d}`);
  for (const id in (o.q || {})) {
    const s = o.q[id];
    n.q[map(id)] = { c: s.c || 0, w: s.w || 0, st: s.st || 0, lv: s.status === "weak" ? Math.min(3, s.w || 1) : 0, last: s.last || 0 };
  }
  n.log = (o.log || []).map(l => [map(l[0])].concat(l.slice(1)));
  ["daily", "streak", "best", "xp", "goal"].forEach(k => { if (o[k] != null) n[k] = o[k]; });
  return n;
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

/* ---------- 便利関数 ---------- */
const $ = s => document.querySelector(s);
const app = $("#app");
const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pct = (c, n) => n ? Math.round(c / n * 100) : null;
const st = id => S.q[id] || { c: 0, w: 0, st: 0, lv: 0 };
const weakLv = id => st(id).lv || 0;
// 入力の答え合わせ用：全角半角・ひらがなカタカナ・空白・かっこ・マイナス記号のちがいを吸収
const norm = s => String(s == null ? "" : s).normalize("NFKC").toLowerCase()
  .replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60))
  .replace(/[−–―‐]/g, "-")
  .replace(/[\s　、。・,（）()「」『』]/g, "");
const ansText = q => q.type === "tf" ? (q.answer === true || q.answer === "true" ? "○" : "×") : String(q.answer);
function levelInfo(xp) { let lv = 1, need = 60, rest = xp; while (rest >= need) { rest -= need; lv++; need = 40 + lv * 20; } return { lv, rest, need }; }
function statFor(list) {
  let c = 0, w = 0, seen = 0, weak = 0;
  list.forEach(q => { const s = st(q.id); c += s.c; w += s.w; if (s.c + s.w) seen++; if (s.lv) weak++; });
  return { c, w, n: c + w, seen, weak, rate: pct(c, c + w) };
}
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2200); }
const rateTxt = r => r == null ? "—" : r + "%";
const rateCol = r => r == null ? "var(--line)" : r >= 80 ? "var(--ok)" : r >= 60 ? "var(--blue)" : "var(--red)";
// 日付で決まる乱数（今日の10問を1日のあいだ同じにする）
function seeded(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
// 自動生成問題（gen）はここで1問ぶんの具体的な問題にする
function instance(q) {
  if (typeof q.gen !== "function") return q;
  try { return Object.assign({}, q, q.gen(SD.R), { _gen: true }); } catch (e) { console.warn("gen error", q.id, e); return null; }
}

/* ---------- 教科・単元ツリー（catalog ＋ 問題データから自動で組み立て） ---------- */
let TREE = [];
function buildTree() {
  const tree = JSON.parse(JSON.stringify(SD.catalog || []));
  const findOrAdd = (arr, key, val, make) => arr.find(x => x[key] === val) || (arr.push(make()), arr[arr.length - 1]);
  QS.forEach(q => {
    const s = findOrAdd(tree, "subject", q.subject, () => ({ subject: q.subject, color: "#555", categories: [] }));
    const c = findOrAdd(s.categories, "name", q.category || "その他", () => ({ name: q.category || "その他", units: [] }));
    const known = c.units.some(u => u.name === q.unit || (u.children || []).some(ch => ch.name === q.unit));
    if (!known) c.units.push({ name: q.unit, grade: q.grade });
  });
  TREE = tree;
}
const gradeOk = q => !S.grade || q.grade === S.grade;
const GQ = () => QS.filter(gradeOk);
function unitNames(u) { return [u.name].concat((u.children || []).map(c => c.name)); }
function findUnit(path) {
  const s = TREE.find(x => x.subject === path[0]); if (!s || !path[1]) return { s };
  const c = s.categories.find(x => x.name === path[1]); if (!c || !path[2]) return { s, c };
  const u = c.units.find(x => x.name === path[2]); return { s, c, u };
}
function qsFor(path) {
  const { u } = findUnit(path);
  return QS.filter(q => gradeOk(q) && q.subject === path[0] && (!path[1] || q.category === path[1]) &&
    (path[3] ? q.unit === path[3] : !path[2] || (u ? unitNames(u) : [path[2]]).includes(q.unit)));
}
const unitVisible = u => !S.grade || !u.grade || u.grade === S.grade;
const pathName = p => p[p.length - 1];

/* ---------- 共通パーツ ---------- */
function statusBar() {
  const L = levelInfo(S.xp), t = S.daily[today()] || 0;
  return `<div class="status">
    <div class="lv"><small>Lv</small><b>${L.lv}</b></div>
    <div class="stx">
      <div class="xpline"><span>経験値 ${L.rest}/${L.need}</span><span>${S.streak >= 2 ? "🔥 " + S.streak + "問連続正解中" : "勉強した日数 " + Object.keys(S.daily).length + "日"}</span></div>
      <div class="xpbar"><i style="width:${Math.min(100, L.rest / L.need * 100)}%"></i></div>
      <button class="goal" id="goalBtn"><span>今日 <b>${t}</b> / ${S.goal}問</span><span class="goalbar"><i style="width:${Math.min(100, t / S.goal * 100)}%"></i></span>${t >= S.goal ? "<span class=ok>達成</span>" : ""}</button>
    </div></div>`;
}
function head(back, title, sub) {
  return `<div class="nav">${back ? `<button class="back" id="back" aria-label="戻る">‹ 戻る</button>` : ""}<span class="path">${esc(sub || "")}</span></div><h1>${esc(title)}</h1>`;
}
function unitRow(label, path, qs, opts = {}) {
  const s = statFor(qs);
  const meta = qs.length ? `<span class="n">${qs.length}問</span>${s.rate != null ? `<span class="r" style="color:${rateCol(s.rate)}">${s.rate}%</span>` : ""}${s.weak ? `<span class="w">苦手${s.weak}</span>` : ""}` : `<span class="n">準備中</span>`;
  return `<button class="row ${opts.cls || ""}" ${qs.length ? "" : "disabled"} data-path="${esc(JSON.stringify(path))}" data-kind="${opts.kind || "leaf"}">
    <span class="lbl">${esc(label)}</span><span class="meta">${meta}</span><span class="arrow">›</span></button>`;
}
function bindRows() {
  app.querySelectorAll("[data-path]").forEach(b => b.onclick = () => {
    const p = JSON.parse(b.dataset.path), k = b.dataset.kind;
    if (k === "group") renderGroup(p); else if (k === "subject") renderSubject(p[0]); else renderModes(p);
  });
}

/* ---------- 画面：ホーム ---------- */
function renderHome() {
  setTab("home");
  const d10 = S.daily10[today()];
  let html = statusBar();
  html += `<div class="quick">
    <button class="qk main" id="daily"><b>今日の10問</b><span>${d10 ? `完了 ${d10.ok}/10 · もう一度解く` : "5教科の重要問題から自動で出題"}</span></button>
    <button class="qk" id="mixBtn"><b>5教科ミックス</b><span>10・20・50問</span></button>
  </div>`;
  html += `<div class="seg" role="group" aria-label="学年">${[[1, "中1"], [2, "中2"], [3, "中3"], [0, "全学年"]].map(([g, l]) => `<button data-grade="${g}" class="${S.grade === g ? "on" : ""}">${l}</button>`).join("")}</div>`;
  if (S.last && qsFor(S.last).length) {
    html += `<button class="resume" id="resume"><span class="muted">前回の続き</span><b>${esc(pathName(S.last))}</b><span class="muted">${esc(S.last.slice(0, -1).join(" › "))}</span></button>`;
  }
  html += `<h2>教科を選ぶ</h2><div class="subjects">`;
  TREE.forEach(s => {
    const qs = qsFor([s.subject]), st2 = statFor(qs);
    html += `<button class="subj" data-path="${esc(JSON.stringify([s.subject]))}" data-kind="subject" style="--c:${esc(s.color || "#555")}">
      <span class="sname">${esc(s.subject)}</span>
      <span class="smeta">${qs.length ? qs.length + "問" + (st2.rate != null ? " · " + st2.rate + "%" : "") : "準備中"}</span></button>`;
  });
  html += `</div>`;
  app.innerHTML = html;
  bindRows();
  app.querySelectorAll("[data-grade]").forEach(b => b.onclick = () => { S.grade = +b.dataset.grade; save(); renderHome(); });
  const r = $("#resume"); if (r) r.onclick = () => renderModes(S.last);
  $("#goalBtn").onclick = openGoal;
  $("#daily").onclick = () => { curPath = null; startQuiz("daily", pickDaily()); };
  $("#mixBtn").onclick = openMix;
  scrollTo(0, 0);
}

/* ---------- 画面：教科 → 分野・単元 ---------- */
function renderSubject(subject) {
  const s = TREE.find(x => x.subject === subject);
  let html = head(true, subject, S.grade ? "中" + S.grade : "全学年");
  const sq = qsFor([subject]);
  if (sq.length) html += `<button class="row all" data-path="${esc(JSON.stringify([subject]))}"><span class="lbl">${esc(subject)}をまとめて</span><span class="meta"><span class="n">${sq.length}問</span></span><span class="arrow">›</span></button>`;
  s.categories.forEach(c => {
    const units = c.units.filter(u => unitVisible(u) || qsFor([subject, c.name, u.name]).length);
    if (!units.length) return;
    const cq = qsFor([subject, c.name]);
    html += `<div class="cat"><h2>${esc(c.name)}</h2>${cq.length ? `<button class="mini" data-path="${esc(JSON.stringify([subject, c.name]))}">まとめて ›</button>` : ""}</div><div class="list">`;
    units.forEach(u => html += unitRow(u.name, [subject, c.name, u.name], qsFor([subject, c.name, u.name]), { kind: u.children ? "group" : "leaf" }));
    html += `</div>`;
  });
  app.innerHTML = html;
  $("#back").onclick = renderHome;
  bindRows(); setTab("home"); scrollTo(0, 0);
}

/* ---------- 画面：小単元 ---------- */
function renderGroup(path) {
  const { u } = findUnit(path);
  let html = head(true, u.name, path.slice(0, 2).join(" › "));
  html += `<div class="list">${unitRow(u.name + "をまとめて", path, qsFor(path), { cls: "all" })}`;
  u.children.forEach(ch => html += unitRow(ch.name, path.concat(ch.name), qsFor(path.concat(ch.name))));
  html += `</div>`;
  app.innerHTML = html;
  $("#back").onclick = () => renderSubject(path[0]);
  bindRows(); setTab("home"); scrollTo(0, 0);
}

/* ---------- 画面：出題モード ---------- */
let curPath = [];
const diffOk = q => !S.diff || q.difficulty === S.diff;
function renderModes(path) {
  curPath = path; S.last = path; save();
  const all = qsFor(path), qs = all.filter(diffOk), s = statFor(all);
  const lvCount = l => all.filter(q => weakLv(q.id) === l).length;
  const weakN = qs.filter(q => weakLv(q.id)).length;
  const mockN = qs.filter(q => q.type !== "written" && q.type !== "oneword").length;
  const m = (k, n, cls = "") => `<button class="mode ${cls}" data-mode="${k}" ${n ? "" : "disabled"}>
    <span class="mt"><b>${MODE[k].name}</b><span>${MODE[k].desc}</span></span><span class="mn">${n ? Math.min(n, MODE[k].n) + "問" : "なし"}</span></button>`;
  const back = path.length >= 4 ? () => renderGroup(path.slice(0, 3)) : () => renderSubject(path[0]);
  app.innerHTML = head(true, pathName(path), path.slice(0, -1).join(" › ")) + `
    <div class="chips">
      <span class="chip">全 <b>${all.length}</b> 問</span>
      <span class="chip">正答率 <b>${rateTxt(s.rate)}</b></span>
      <span class="chip">挑戦 <b>${s.seen}</b>/${all.length}</span>
    </div>
    ${s.weak ? `<div class="weakline">${[3, 2, 1].map(l => lvCount(l) ? `<span class="wl l${l}">${WEAK_LABEL[l]} ${lvCount(l)}</span>` : "").join("")}</div>` : ""}
    <div class="seg diff" role="group" aria-label="難易度">${[[0, "すべて"], [1, "★ 基本"], [2, "★★ 標準"], [3, "★★★ 応用"]].map(([d, l]) => `<button data-diff="${d}" class="${S.diff === d ? "on" : ""}">${l}</button>`).join("")}</div>
    <div class="modes">
      ${m("exam", qs.length, "main")}
      ${m("c10", qs.length)}${m("c20", qs.length)}
      ${m("mock", mockN, "wide")}
      ${m("weak", weakN)}${m("random", qs.length)}
      ${m("all", qs.length)}
    </div>`;
  $("#back").onclick = back;
  app.querySelectorAll("[data-diff]").forEach(b => b.onclick = () => { S.diff = +b.dataset.diff; save(); renderModes(path); });
  app.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => startQuiz(b.dataset.mode, pick(b.dataset.mode, qs)));
  setTab("home"); scrollTo(0, 0);
}

/* ---------- 出題の選び方 ---------- */
function weightedPick(pool, n, rnd = Math.random) {
  pool = pool.filter(p => p.w > 0); const out = [];
  while (out.length < n && pool.length) {
    let t = rnd() * pool.reduce((a, p) => a + p.w, 0), i = 0;
    while ((t -= pool[i].w) > 0 && i < pool.length - 1) i++;
    out.push(pool.splice(i, 1)[0].q);
  }
  return out;
}
function unitRates(qs) {
  const r = {};
  qs.forEach(q => { const k = q.subject + "|" + q.unit, s = st(q.id); r[k] = r[k] || { c: 0, n: 0 }; r[k].c += s.c; r[k].n += s.c + s.w; });
  return k => r[k] && r[k].n >= 3 ? r[k].c / r[k].n : null;
}
// テスト直前の点数：①間違えた問題 ②正答率の低い単元 ③テスト頻出 ④最近間違えた問題
function examWeight(q, uRate) {
  const s = st(q.id), seen = s.c + s.w, acc = seen ? s.c / seen : null, ur = uRate(q.subject + "|" + q.unit);
  let w = 0.3 + (s.lv || 0) * 3 + (acc == null ? 0.8 : (1 - acc) * 2.5) + (q.importance - 1) * 1.8;
  if (ur != null) w += (1 - ur) * 2;
  if (s.lw) { const days = (Date.now() - s.lw) / DAY; if (days < 7) w += 2.5 * (1 - days / 7); }
  if (!s.lv && seen && acc === 1 && q.importance < 3) w *= 0.4;
  return w;
}
function pick(mode, qs) {
  const n = MODE[mode].n;
  if (mode === "all") return qs.slice();
  if (mode === "random") return shuffle(qs);
  if (mode === "weak") return shuffle(qs.filter(q => weakLv(q.id))).sort((a, b) => weakLv(b.id) - weakLv(a.id) || st(b.id).w - st(a.id).w);
  if (mode === "exam") { const ur = unitRates(qs); return weightedPick(qs.map(q => ({ q, w: examWeight(q, ur) })), n); }
  if (mode === "mock") return shuffle(qs.filter(q => q.type !== "written" && q.type !== "oneword")).slice(0, n);
  // 10問・20問チャレンジ：未回答と苦手を少しだけ優先したランダム
  return weightedPick(qs.map(q => { const s = st(q.id); return { q, w: 1 + (s.c + s.w ? 0 : 0.6) + (s.lv || 0) * 0.6 }; }), n);
}
// 教科ごとに順番に1問ずつ取り出して、かたよりなく混ぜる
function roundRobin(bySubj, n) {
  const keys = shuffle(Object.keys(bySubj)), out = [];
  while (out.length < n && keys.some(k => bySubj[k].length)) keys.forEach(k => { if (out.length < n && bySubj[k].length) out.push(bySubj[k].shift()); });
  return shuffle(out);
}
function pickDaily() {
  const rnd = seeded("daily-" + today()), ur = unitRates(GQ()), by = {};
  GQ().filter(q => q.type !== "written").forEach(q => (by[q.subject] = by[q.subject] || []).push(q));
  for (const k in by) by[k] = weightedPick(by[k].map(q => ({ q, w: examWeight(q, ur) + (q.importance === 3 ? 1 : 0) })), 10, rnd);
  return roundRobin(by, 10);
}
function pickMix(n) {
  const by = {};
  GQ().forEach(q => (by[q.subject] = by[q.subject] || []).push(q));
  for (const k in by) by[k] = shuffle(by[k]);
  return roundRobin(by, n);
}
function openMix() {
  const subs = [...new Set(GQ().map(q => q.subject))];
  openSheet(`<h3>5教科ミックス</h3><p class="muted">${subs.length ? esc(subs.join("・")) + " からランダムに出題します。" : "まだ問題がありません。"}</p>
    <div class="goalpick three">${[10, 20, 50].map(n => `<button data-mix="${n}">${n}問</button>`).join("")}</div>
    <button class="btn ghost" data-close>閉じる</button>`, () => {
    document.querySelectorAll("[data-mix]").forEach(b => b.onclick = () => { closeSheet(); curPath = null; startQuiz("mix", pickMix(+b.dataset.mix)); });
  });
}

/* ---------- 画面：問題 ---------- */
let Z = null;
function startQuiz(mode, list, from) {
  list = list.map(instance).filter(Boolean);
  if (!list.length) { toast("出題できる問題がありません"); return; }
  Z = { mode, list, i: 0, ok: 0, wrong: [], res: [], answered: 0, combo: 0, xp: 0, lv: levelInfo(S.xp).lv, mock: mode === "mock", from: from || null };
  document.body.classList.add("inquiz");
  renderQ();
}
function renderQ() {
  closeFb();
  const q = Z.list[Z.i], total = Z.list.length;
  let body = "";
  const hasChoices = q.choices && q.choices.length;
  if (q.type === "tf") {
    body = `<div class="choices tf"><button class="choice" data-a="true" aria-label="まる">○</button><button class="choice" data-a="false" aria-label="ばつ">×</button></div>`;
  } else if (q.type === "written") {
    body = `<textarea id="wIn" class="input" rows="4" placeholder="ここに答えを書く（書かずに答え合わせしてもOK）"></textarea><button class="btn" id="wCheck">答え合わせ</button>`;
  } else if (q.type === "oneword") {
    body = `<button class="btn" id="reveal">答えを見る</button>`;
  } else if (q.type === "order") {
    body = `<div class="ordans" id="ordAns" aria-label="並べた答え"><span class="muted">下のカードを順番にタップ</span></div>
      <div class="ordpool" id="ordPool">${shuffle(q.words.map((w, i) => ({ w, i }))).map(o => `<button class="ow" data-i="${o.i}">${esc(o.w)}</button>`).join("")}</div>
      <div class="pair"><button class="btn ghost" id="ordReset">やり直す</button><button class="btn" id="ordOk" disabled>答える</button></div>`;
  } else if (q.type === "fill" && !hasChoices) {
    body = `<form class="fillin" id="fillForm"><input id="fillIn" class="input" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="答えを入力"><button class="btn">答える</button></form>`;
  } else {
    body = `<div class="choices">${shuffle(q.choices).map((c, k) => `<button class="choice" data-a="${esc(c)}"><span class="k">${"ABCDEF"[k]}</span><span>${esc(c)}</span></button>`).join("")}</div>`;
  }
  const showSubj = !curPath || Z.mode === "search";
  app.innerHTML = `
    <div class="qtop"><button class="iconbtn" id="quit">やめる</button>
      <div class="bar"><i style="width:${Z.i / total * 100}%"></i></div>
      <span class="count">${Z.i + 1}/${total}</span></div>
    <div class="qcard">
      <div class="qmeta">${Z.mock ? `<span class="tag imp">模擬テスト</span>` : ""}<span class="tag type">${TYPE_LABEL[q.type] || "問題"}</span><span class="tag">${"★".repeat(q.difficulty)} ${DIFF_LABEL[q.difficulty]}</span>${q.importance === 3 && !Z.mock ? `<span class="tag imp">テスト頻出</span>` : ""}${weakLv(q.id) && !Z.mock ? `<span class="tag wk l${weakLv(q.id)}">${WEAK_LABEL[weakLv(q.id)]}</span>` : ""}${Z.combo >= 2 && !Z.mock ? `<span class="tag combo">🔥 ${Z.combo}連続</span>` : ""}</div>
      <p class="qtext">${esc(q.question)}</p>
      ${q.image ? `<img class="qimg" src="${esc(q.image)}" alt="${esc(q.imageAlt || "問題の図")}">` : ""}
      <p class="qunit">${esc(showSubj ? q.subject + " › " : "")}${esc(q.unit)}</p>
    </div>
    <div id="ans">${body}</div>`;
  $("#quit").onclick = () => Z.answered ? finish() : exitQuiz();
  app.querySelectorAll("[data-a]").forEach(b => b.onclick = () => {
    const isAns = x => q.type === "tf" ? String(q.answer) === x.dataset.a : x.dataset.a === String(q.answer);
    app.querySelectorAll("[data-a]").forEach(x => { x.disabled = true; if (Z.mock) { if (x === b) x.classList.add("picked"); } else x.classList.add(isAns(x) ? "correct" : x === b ? "wrong" : "dim"); });
    answer(q, isAns(b), false, q.type === "tf" ? (b.dataset.a === "true" ? "○" : "×") : b.dataset.a);
  });
  const ff = $("#fillForm");
  if (ff) ff.onsubmit = e => {
    e.preventDefault();
    const raw = $("#fillIn").value, v = norm(raw); if (!v) { $("#fillIn").focus(); return; }
    const right = [q.answer].concat(q.accept || []).some(x => norm(x) === v);
    $("#fillIn").disabled = true; ff.querySelector("button").disabled = true;
    if (!Z.mock) $("#fillIn").classList.add(right ? "correct" : "wrong");
    $("#fillIn").blur();
    answer(q, right, false, raw);
  };
  if (q.type === "order") {
    const picked = [];
    const draw = () => {
      $("#ordAns").innerHTML = picked.length ? picked.map(i => `<span class="ow on">${esc(q.words[i])}</span>`).join("") : `<span class="muted">下のカードを順番にタップ</span>`;
      app.querySelectorAll("#ordPool .ow").forEach(b => b.disabled = picked.includes(+b.dataset.i));
      $("#ordOk").disabled = picked.length !== q.words.length;
    };
    app.querySelectorAll("#ordPool .ow").forEach(b => b.onclick = () => { picked.push(+b.dataset.i); draw(); });
    $("#ordReset").onclick = () => { picked.length = 0; draw(); };
    $("#ordOk").onclick = () => {
      const made = picked.map(i => q.words[i]).join(" "), right = norm(made) === norm(q.answer) || (q.accept || []).some(a => norm(a) === norm(made));
      app.querySelectorAll("#ordPool .ow, #ordReset, #ordOk").forEach(b => b.disabled = true);
      if (!Z.mock) $("#ordAns").classList.add(right ? "correct" : "wrong");
      answer(q, right, false, made);
    };
  }
  const wc = $("#wCheck");
  if (wc) wc.onclick = () => {
    const txt = $("#wIn").value, n = norm(txt);
    const kws = (q.keywords || []).map(k => ({ label: k.split("|")[0], hit: k.split("|").some(a => n.includes(norm(a))) }));
    const allHit = kws.length && kws.every(k => k.hit);
    $("#wIn").disabled = true;
    $("#ans").innerHTML = `<div class="model"><div class="ml">あなたの答え</div><p>${txt.trim() ? esc(txt) : "<span class=muted>（未記入）</span>"}</p>
      <div class="ml">模範解答</div><p class="ma">${esc(q.answer)}</p>
      ${kws.length ? `<div class="ml">キーワード</div><div class="kws">${kws.map(k => `<span class="kw ${k.hit ? "hit" : ""}">${k.hit ? "✓" : "・"} ${esc(k.label)}</span>`).join("")}</div>` : ""}</div>
      <p class="muted center">模範解答とくらべて、自分で判定しよう${allHit ? "（キーワードは全部入っています）" : ""}</p>
      <div class="pair"><button class="btn red" id="sNg">まちがい</button><button class="btn" id="sOk">できた</button></div>`;
    $("#sOk").onclick = () => { $(".pair").remove(); answer(q, true, true, txt); };
    $("#sNg").onclick = () => { $(".pair").remove(); answer(q, false, true, txt); };
  };
  const rv = $("#reveal");
  if (rv) rv.onclick = () => {
    $("#ans").innerHTML = `<div class="reveal">${esc(q.answer)}</div><div class="pair"><button class="btn red" id="sNg">まちがえた</button><button class="btn" id="sOk">答えられた</button></div>`;
    $("#sOk").onclick = () => { $(".pair").remove(); answer(q, true, true); };
    $("#sNg").onclick = () => { $(".pair").remove(); answer(q, false, true); };
  };
  scrollTo(0, 0);
}
function answer(q, right, self, given) {
  const before = weakLv(q.id);
  record(q, right);
  Z.answered++;
  Z.res.push({ q, right, given });
  if (right) { Z.ok++; Z.combo++; } else { Z.combo = 0; Z.wrong.push(q); }
  const last = Z.i >= Z.list.length - 1;
  const go = () => { if (last) finish(); else { Z.i++; renderQ(); } };
  const fb = $("#fb");
  if (Z.mock) { // 模擬テスト：正誤を見せずに次へ
    fb.className = "fb mockfb";
    fb.innerHTML = `<button class="btn" id="next">${last ? "採点する" : "次の問題へ"}</button>`;
  } else {
    const after = weakLv(q.id);
    let note = "";
    if (right && before && after < before) note = after ? `苦手度が下がりました（${WEAK_LABEL[before]} → ${WEAK_LABEL[after]}）` : "苦手を克服しました！";
    else if (right && before) note = `あと${CLEAR_STREAK - st(q.id).st}回続けて正解すると苦手度が下がります`;
    else if (!right) note = `苦手問題に登録：${WEAK_LABEL[after]}`;
    fb.className = "fb " + (right ? "ok" : "ng");
    fb.innerHTML = `<div class="fbin">
      <div class="fbh"><span class="mark">${right ? "○" : "×"}</span><h3>${right ? "正解！" : "残念！"}</h3>${Z.combo >= 3 ? `<span class="fire">🔥 ${Z.combo}問連続正解！</span>` : ""}</div>
      ${!right && !self ? `<p class="ans"><span>正しい答え</span>${esc(ansText(q))}</p>` : ""}
      <p class="exp">${esc(q.explanation || "")}</p>
      ${note ? `<p class="note">${esc(note)}</p>` : ""}
      </div><button class="btn" id="next">${last ? "結果を見る" : "次の問題へ"}</button>`;
    if (Z.combo && Z.combo % 5 === 0) toast(`🔥 ${Z.combo}問連続正解！`);
    const L = levelInfo(S.xp).lv; if (L > Z.lv) { Z.lv = L; toast("レベルアップ！ Lv." + L); }
    if ((S.daily[today()] || 0) === S.goal) toast("今日の目標達成！");
  }
  fb.hidden = false;
  document.body.classList.add("fbopen");
  requestAnimationFrame(() => { app.style.paddingBottom = (fb.offsetHeight + 16) + "px"; });
  $("#next").onclick = go;
}
function closeFb() { const fb = $("#fb"); fb.hidden = true; fb.innerHTML = ""; document.body.classList.remove("fbopen"); app.style.paddingBottom = ""; }
function record(q, right) {
  const s = Object.assign({ c: 0, w: 0, st: 0, lv: 0 }, S.q[q.id]);
  if (right) {
    s.c++; s.st++;
    if (s.lv && s.st >= CLEAR_STREAK) { s.lv--; s.st = 0; }
    S.streak++; S.best = Math.max(S.best, S.streak);
    S.dailyBest[today()] = Math.max(S.dailyBest[today()] || 0, S.streak);
  } else {
    s.w++; s.st = 0; s.lv = Math.min(3, (s.lv || 0) + 1); s.lw = Date.now(); S.streak = 0;
  }
  s.last = Date.now(); S.q[q.id] = s;
  const g = right ? XP_OK : XP_NG; S.xp += g; Z.xp += g;
  S.daily[today()] = (S.daily[today()] || 0) + 1;
  S.log.push([q.id, right ? 1 : 0, Date.now(), Z.mode]);
  if (S.log.length > 5000) S.log = S.log.slice(-5000);
  save();
}
function backToOrigin() {
  const from = Z && Z.from; Z = null;
  if (from === "search") renderSearch(); else if (curPath) renderModes(curPath); else renderHome();
}
function exitQuiz() { closeFb(); document.body.classList.remove("inquiz"); backToOrigin(); }

/* ---------- 画面：結果 ---------- */
function finish() {
  closeFb(); document.body.classList.remove("inquiz");
  const n = Z.answered, score = pct(Z.ok, n) || 0, full = Z.answered === Z.list.length;
  const perfect10 = (Z.mode === "c10" || Z.mode === "daily" || (Z.mode === "mix" && Z.list.length === 10)) && full && Z.ok === 10;
  let msg = score === 100 ? "🎉 パーフェクト！" : score >= 80 ? "👏 よくできました！" : score >= 60 ? "👍 あと少し！" : "📚 間違えた問題を復習しよう！";
  if (perfect10) { msg = "🎉 10問全問正解！"; S.perfect10++; }
  if (score === 100 && n >= 5) { S.xp += XP_PERFECT; Z.xp += XP_PERFECT; }
  if (Z.mode === "daily") S.daily10[today()] = { ok: Z.ok, n };
  save();
  const wrongs = Z.wrong.filter((q, i, a) => a.indexOf(q) === i);
  // 模擬テスト：単元ごとの正答率（苦手単元）
  let unitHtml = "";
  if (Z.mock || Z.mode === "mix" || Z.mode === "daily") {
    const u = {};
    Z.res.forEach(r => { const k = r.q.subject + " › " + r.q.unit; u[k] = u[k] || { ok: 0, n: 0 }; u[k].n++; if (r.right) u[k].ok++; });
    const rows = Object.entries(u).map(([k, v]) => ({ k, v, r: Math.round(v.ok / v.n * 100) })).sort((a, b) => a.r - b.r);
    const weakU = rows.filter(x => x.r < 70);
    unitHtml = `<h2>${weakU.length ? "苦手単元" : "単元ごとの結果"}</h2>` + (weakU.length ? weakU : rows).map(x =>
      `<div class="sec"><div class="top"><span class="nm">${esc(x.k)}</span><span><b>${x.r}%</b>（${x.v.ok}/${x.v.n}）</span></div><div class="meter"><i style="width:${x.r}%;background:${rateCol(x.r)}"></i></div></div>`).join("");
  }
  const wrongList = Z.mock
    ? Z.res.filter(r => !r.right).map(r => `<div class="wq"><b>${esc(r.q.question)}</b><span class="lab">あなたの答え</span><span class="yours">${esc(r.given == null ? "—" : r.given)}</span><span class="lab">正しい答え</span>${esc(ansText(r.q))}<p class="wexp">${esc(r.q.explanation)}</p></div>`).join("")
    : wrongs.map(q => `<div class="wq"><b>${esc(q.question)}</b><span class="lab">正しい答え</span>${esc(ansText(q))}</div>`).join("");
  app.innerHTML = `
    <h2 class="top">${esc(MODE[Z.mode].name)}の結果</h2>
    <div class="score">
      <div class="pt"><span class="${score === 100 ? "perfect" : ""}">${score}</span><small>点</small></div>
      <div class="msg">${msg}</div>
      <div class="sub">${n}問中 ${Z.ok}問正解 · 正答率 ${score}% · +${Z.xp} XP${full ? "" : " · 途中で終了"}</div>
    </div>
    ${wrongs.length ? `<button class="btn red" id="retry">間違えた ${wrongs.length} 問だけもう一度解く</button>` : ""}
    <div class="pair mt"><button class="btn ghost" id="again">もう一度</button><button class="btn ghost" id="toBack">${curPath ? "モード選択へ" : Z.from === "search" ? "検索へ" : "ホームへ"}</button></div>
    ${unitHtml}
    ${wrongList ? `<h2>間違えた問題</h2><div class="wrongs">${wrongList}</div>` : ""}`;
  const mode = Z.mode, list = Z.list, from = Z.from;
  const r = $("#retry"); if (r) r.onclick = () => startQuiz("retry", shuffle(wrongs), from);
  $("#again").onclick = () => {
    if (mode === "retry" || mode === "search") startQuiz(mode, shuffle(list), from);
    else if (mode === "daily") startQuiz("daily", pickDaily());
    else if (mode === "mix") startQuiz("mix", pickMix(list.length));
    else startQuiz(mode, pick(mode, qsFor(curPath).filter(diffOk)));
  };
  $("#toBack").onclick = backToOrigin;
  scrollTo(0, 0);
}

/* ---------- 画面：検索 ---------- */
const SF = { subject: "", unit: "", diff: 0, kw: "", limit: 30 };
function renderSearch() {
  setTab("search");
  const subs = TREE.map(s => s.subject).filter(s => QS.some(q => q.subject === s));
  const units = SF.subject ? [...new Set(QS.filter(q => q.subject === SF.subject).map(q => q.unit))] : [];
  const kw = norm(SF.kw);
  const hits = QS.filter(q => (!SF.subject || q.subject === SF.subject) && (!SF.unit || q.unit === SF.unit) && (!SF.diff || q.difficulty === SF.diff) &&
    (!kw || norm([q.question, q.answer, (q.choices || []).join(" "), q.explanation, (q.tags || []).join(" ")].join(" ")).includes(kw)));
  const opt = (v, l, cur) => `<option value="${esc(v)}" ${v === cur ? "selected" : ""}>${esc(l)}</option>`;
  app.innerHTML = `<h1>問題を探す</h1>
    <div class="sform">
      <input id="sKw" class="input" type="search" placeholder="キーワード（例：季節風、ASEAN）" value="${esc(SF.kw)}" enterkeyhint="search" autocomplete="off">
      <div class="srow">
        <select id="sSub" class="input">${opt("", "すべての教科", SF.subject)}${subs.map(s => opt(s, s, SF.subject)).join("")}</select>
        <select id="sDiff" class="input">${[[0, "難易度すべて"], [1, "★ 基本"], [2, "★★ 標準"], [3, "★★★ 応用"]].map(([v, l]) => `<option value="${v}" ${SF.diff === v ? "selected" : ""}>${l}</option>`).join("")}</select>
      </div>
      ${SF.subject ? `<select id="sUnit" class="input">${opt("", "すべての単元", SF.unit)}${units.map(u => opt(u, u, SF.unit)).join("")}</select>` : ""}
    </div>
    <div class="shead"><span><b>${hits.length}</b>問</span>${hits.length ? `<button class="btn sm" id="sPlay">この${Math.min(hits.length, 50)}問を解く</button>` : ""}</div>
    <div class="slist">${hits.slice(0, SF.limit).map(q => `<details class="sitem"><summary><span class="sq">${esc(q.question)}</span><span class="sm2">${esc(q.subject)} › ${esc(q.unit)} · ${"★".repeat(q.difficulty)}${q.gen ? " · 数値が毎回変わる" : ""}</span></summary>
      ${q.gen ? `<p class="muted">解くたびに数値が変わる問題です。</p>` : `<p class="sa"><span>答え</span>${esc(ansText(q))}</p><p class="sx">${esc(q.explanation)}</p>`}</details>`).join("") || `<p class="empty">見つかりませんでした</p>`}</div>
    ${hits.length > SF.limit ? `<button class="btn ghost" id="sMore">さらに表示（残り${hits.length - SF.limit}問）</button>` : ""}`;
  const kwIn = $("#sKw");
  let t; kwIn.oninput = () => { clearTimeout(t); t = setTimeout(() => { SF.kw = kwIn.value; SF.limit = 30; const pos = kwIn.selectionStart; renderSearch(); const k = $("#sKw"); k.focus(); try { k.setSelectionRange(pos, pos); } catch (e) {} }, 350); };
  $("#sSub").onchange = e => { SF.subject = e.target.value; SF.unit = ""; SF.limit = 30; renderSearch(); };
  $("#sDiff").onchange = e => { SF.diff = +e.target.value; SF.limit = 30; renderSearch(); };
  const su = $("#sUnit"); if (su) su.onchange = e => { SF.unit = e.target.value; SF.limit = 30; renderSearch(); };
  const more = $("#sMore"); if (more) more.onclick = () => { SF.limit += 30; renderSearch(); };
  const play = $("#sPlay"); if (play) play.onclick = () => { curPath = null; startQuiz("search", shuffle(hits).slice(0, 50), "search"); };
}

/* ---------- 画面：成績 ---------- */
function renderStats() {
  setTab("stats");
  const G = GQ();
  let c = 0, w = 0; G.forEach(q => { const s = st(q.id); c += s.c; w += s.w; });
  const n = c + w, rate = pct(c, n), L = levelInfo(S.xp);
  const lv = l => G.filter(q => weakLv(q.id) === l).length;
  const weakAll = lv(1) + lv(2) + lv(3);
  const learned = G.filter(q => st(q.id).c + st(q.id).w).length;
  const units = {};
  G.forEach(q => { const k = q.subject + "|" + q.unit; (units[k] = units[k] || { subject: q.subject, cat: q.category, unit: q.unit, qs: [] }).qs.push(q); });
  const ulist = Object.values(units).map(u => Object.assign(u, { s: statFor(u.qs) }));
  const weakest = ulist.filter(u => u.s.n >= 3).sort((a, b) => a.s.rate - b.s.rate).slice(0, 3);
  const bar = (name, s, sub, cls = "") => `<div class="sec ${cls}"><div class="top"><span class="nm">${esc(name)}</span><span>${s.n ? `<b>${s.rate}%</b>` : "未回答"}</span></div>
    <div class="meter"><i style="width:${s.rate || 0}%;background:${rateCol(s.rate)}"></i></div>${sub ? `<div class="small">${esc(sub)}</div>` : ""}</div>`;
  let html = `<h1>成績</h1><p class="muted lead">Lv.${L.lv} · 累計 ${S.xp} XP · 勉強した日数 ${Object.keys(S.daily).length}日</p>
    <div class="grid">
      <div class="stat big"><div class="ring" style="--p:${rate || 0}" data-v="${rateTxt(rate)}"></div>
        <div><div class="l0">正答率</div><div class="v">${c}<small>/ ${n}問</small></div><div class="l">正解数 / 総回答数</div></div></div>
      <div class="stat"><div class="v">${S.daily[today()] || 0}<small>問</small></div><div class="l">今日解いた問題数</div></div>
      <div class="stat"><div class="v">${S.dailyBest[today()] || 0}</div><div class="l">今日の最高連続正解</div></div>
      <div class="stat"><div class="v">${S.best}</div><div class="l">最高連続正解</div></div>
      <div class="stat"><div class="v">${learned}<small>/ ${G.length}</small></div><div class="l">学習した問題数</div></div>
    </div>
    <h2>苦手問題 ${weakAll}問</h2>
    <div class="weak3">${[3, 2, 1].map(l => `<div class="wbox l${l}"><b>${lv(l)}</b><span>${WEAK_LABEL[l]}</span></div>`).join("")}</div>
    <p class="muted small2">1回間違い＝要復習、2回＝苦手、3回以上＝最重要復習。${CLEAR_STREAK}回続けて正解すると1段階下がります。</p>`;
  if (weakest.length) html += `<h2>苦手な単元</h2>` + weakest.map(u => bar(u.unit, u.s, `${u.subject} › ${u.cat} · 苦手問題 ${u.s.weak}`)).join("");
  // 教科 → 分野 → 単元 の正答率（タップで開く）
  html += `<h2>教科・分野・単元別の正答率</h2>`;
  TREE.forEach(s => {
    const sq = G.filter(q => q.subject === s.subject); if (!sq.length) return;
    const ss = statFor(sq);
    html += `<details class="tree"><summary>${bar(s.subject, ss, `${ss.seen}/${sq.length}問に挑戦 · 苦手 ${ss.weak}`, "subjbar")}</summary>`;
    s.categories.forEach(cat => {
      const cq = sq.filter(q => q.category === cat.name); if (!cq.length) return;
      html += `<div class="lv2">${bar(cat.name, statFor(cq), "", "catbar")}`;
      ulist.filter(u => u.subject === s.subject && u.cat === cat.name).forEach(u => html += `<div class="lv3">${bar(u.unit, u.s, `${u.s.seen}/${u.qs.length}問 · 苦手 ${u.s.weak}`, "unitbar")}</div>`);
      html += `</div>`;
    });
    html += `</details>`;
  });
  html += `<h2>データ</h2><p class="muted small2">記録はこのiPhoneのブラウザに保存されます。機種変更のときは「バックアップ」でコピーして、新しい端末で復元してください。</p>
    <div class="tools"><button class="btn ghost" id="backup">バックアップ・復元</button><button class="btn ghost danger" id="reset">記録をすべて消す</button></div>
    ${SD.problems.length ? `<p class="muted small2">問題データの不備 ${SD.problems.length}件（開発者向け：コンソールに表示）</p>` : ""}`;
  app.innerHTML = html;
  $("#backup").onclick = openBackup;
  $("#reset").onclick = () => openSheet(`<h3>記録をすべて消しますか？</h3><p class="muted">成績・苦手問題・レベル・経験値がすべて消えます。元に戻せません。</p>
    <div class="pair mt"><button class="btn ghost" data-close>やめる</button><button class="btn red" id="doReset">消す</button></div>`,
    () => { $("#doReset").onclick = () => { const g = S.goal, gr = S.grade; S = fresh(); S.goal = g; S.grade = gr; save(); closeSheet(); renderStats(); toast("記録を消しました"); }; });
  scrollTo(0, 0);
}

/* ---------- シート ---------- */
function openSheet(html, after) {
  const m = $("#modal"); m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`; m.hidden = false;
  m.onclick = e => { if (e.target === m || e.target.hasAttribute("data-close")) closeSheet(); };
  if (after) after();
}
function closeSheet() { $("#modal").hidden = true; }
function openGoal() {
  openSheet(`<h3>今日の目標</h3><p class="muted">1日に解く問題数を決めよう。</p>
    <div class="goalpick">${[10, 20, 30, 50].map(n => `<button data-g="${n}" class="${S.goal === n ? "on" : ""}">${n}</button>`).join("")}</div>
    <button class="btn ghost" data-close>閉じる</button>`, () => {
    document.querySelectorAll("[data-g]").forEach(b => b.onclick = () => { S.goal = +b.dataset.g; save(); closeSheet(); renderHome(); });
  });
}
function openBackup() {
  openSheet(`<h3>バックアップ・復元</h3><p class="muted">① コピーしてメモアプリなどに保存 → ② 新しい端末で貼り付けて「復元」。</p>
    <textarea id="bk" class="input">${esc(JSON.stringify(S))}</textarea>
    <div class="pair mt"><button class="btn" id="copyBk">コピー</button><button class="btn ghost" id="restoreBk">復元</button></div>
    <button class="btn ghost" data-close>閉じる</button>`, () => {
    $("#copyBk").onclick = () => {
      const ta = $("#bk"); ta.value = JSON.stringify(S);
      (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).then(() => toast("コピーしました"))
        .catch(() => { ta.select(); try { document.execCommand("copy"); toast("コピーしました"); } catch (e) { toast("長押しでコピーしてください"); } });
    };
    $("#restoreBk").onclick = () => {
      try { let d = JSON.parse($("#bk").value); if (!d || typeof d.q !== "object") throw 0; S = d.v === 2 ? Object.assign(fresh(), d) : migrate(d); save(); closeSheet(); toast("復元しました"); renderStats(); }
      catch (e) { toast("データの形式が正しくありません"); }
    };
  });
}

/* ---------- タブ ---------- */
function setTab(t) { document.querySelectorAll("#tabbar button").forEach(b => b.classList.toggle("on", b.dataset.tab === t)); }
document.querySelectorAll("#tabbar button").forEach(b => b.onclick = () => ({ stats: renderStats, search: renderSearch, home: renderHome })[b.dataset.tab]());

/* ---------- 起動：問題ファイルを読み込む ---------- */
function loadFile(f) {
  return new Promise(res => {
    const s = document.createElement("script");
    s.async = false; // 並行してダウンロードしつつ、実行は一覧の順番どおり
    s.src = "data/questions/" + f + "?v=" + Math.floor(Date.now() / 36e5); // 1時間ごとにキャッシュ更新
    s.onload = () => res(); s.onerror = () => { SD.problems.push("ファイルを読み込めません: " + f); res(); };
    document.body.appendChild(s);
  });
}
load();
app.innerHTML = `<p class="empty">問題を読み込んでいます…</p>`;
(async () => {
  await Promise.all(SD.files.map(loadFile));
  QS = SD.questions;
  if (SD.problems.length) console.warn("問題データの不備:\n" + SD.problems.join("\n"));
  buildTree();
  renderHome();
})();
}
