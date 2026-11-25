/* =========================================================
   テスト対策ドリル  アプリ本体
   問題は data/questions/ 以下のファイルにあり、ここは書き換えなくてよい。
   ========================================================= */
{
const SD = window.StudyData;
let QS = [];
const TYPE_LABEL = { choice: "4択", tf: "○×", fill: "穴埋め", written: "記述", oneword: "一問一答" };
const DIFF_LABEL = { 1: "基本", 2: "標準", 3: "応用" };
const WEAK_LABEL = { 1: "要復習", 2: "苦手", 3: "最重要復習" };
const MODE = {
  exam:   { name: "テスト直前", desc: "苦手・正答率が低い・テスト頻出を優先して15問", n: 15 },
  c10:    { name: "10問チャレンジ", desc: "ランダムに10問", n: 10 },
  c20:    { name: "20問チャレンジ", desc: "ランダムに20問", n: 20 },
  all:    { name: "全問題", desc: "すべての問題を順番に", n: 9999 },
  random: { name: "ランダム", desc: "すべての問題をシャッフル", n: 9999 },
  weak:   { name: "苦手問題だけ", desc: "間違えたことのある問題だけ", n: 9999 },
  retry:  { name: "間違い直し", desc: "", n: 9999 }
};
const XP_OK = 10, XP_NG = 3, XP_PERFECT = 30;
const CLEAR_STREAK = 2; // 苦手問題を何回連続で正解したら苦手度が1段階下がるか

/* ---------- 保存（localStorage） ---------- */
const KEY = "teststudy.v2", OLDKEY = "teststudy.v1";
const fresh = () => ({ v: 2, q: {}, log: [], daily: {}, dailyBest: {}, streak: 0, best: 0, xp: 0, goal: 20, perfect10: 0, grade: 1, last: null, diff: 0 });
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
const norm = s => String(s == null ? "" : s).normalize("NFKC").toLowerCase()
  .replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60)) // ひらがな→カタカナ
  .replace(/[\s　、。・,.\-ー（）()「」『』]/g, "");
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

/* ---------- 画面：ホーム（教科を選ぶ） ---------- */
function renderHome() {
  setTab("home"); route = () => renderHome();
  let html = statusBar();
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
  scrollTo(0, 0);
}

/* ---------- 画面：教科 → 分野・単元 ---------- */
function renderSubject(subject) {
  route = () => renderSubject(subject);
  const s = TREE.find(x => x.subject === subject);
  let html = head(true, subject, S.grade ? "中" + S.grade : "全学年");
  s.categories.forEach(c => {
    const units = c.units.filter(u => unitVisible(u) || qsFor([subject, c.name, u.name]).length);
    if (!units.length) return;
    const cq = qsFor([subject, c.name]);
    html += `<div class="cat"><h2>${esc(c.name)}</h2>${cq.length ? `<button class="mini" data-path="${esc(JSON.stringify([subject, c.name]))}">${esc(c.name)}をまとめて ›</button>` : ""}</div><div class="list">`;
    units.forEach(u => html += unitRow(u.name, [subject, c.name, u.name], qsFor([subject, c.name, u.name]), { kind: u.children ? "group" : "leaf" }));
    html += `</div>`;
  });
  app.innerHTML = html;
  $("#back").onclick = renderHome;
  bindRows(); setTab("home"); scrollTo(0, 0);
}

/* ---------- 画面：小単元（アジア州 → 東南アジア など） ---------- */
function renderGroup(path) {
  route = () => renderGroup(path);
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
  curPath = path; S.last = path; save(); route = () => renderModes(path);
  const all = qsFor(path), qs = all.filter(diffOk), s = statFor(all);
  const lvCount = l => all.filter(q => weakLv(q.id) === l).length;
  const weakN = qs.filter(q => weakLv(q.id)).length;
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
      ${m("weak", weakN)}
      ${m("random", qs.length)}${m("all", qs.length)}
    </div>`;
  $("#back").onclick = back;
  app.querySelectorAll("[data-diff]").forEach(b => b.onclick = () => { S.diff = +b.dataset.diff; save(); renderModes(path); });
  app.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => startQuiz(b.dataset.mode, pick(b.dataset.mode, qs)));
  setTab("home"); scrollTo(0, 0);
}

/* ---------- 出題の選び方 ---------- */
function weightedPick(pool, n) {
  pool = pool.slice(); const out = [];
  while (out.length < n && pool.length) {
    let t = Math.random() * pool.reduce((a, p) => a + p.w, 0), i = 0;
    while ((t -= pool[i].w) > 0 && i < pool.length - 1) i++;
    out.push(pool.splice(i, 1)[0].q);
  }
  return out;
}
function pick(mode, qs) {
  const n = MODE[mode].n;
  if (mode === "all") return qs.slice();
  if (mode === "random") return shuffle(qs);
  if (mode === "weak") return shuffle(qs.filter(q => weakLv(q.id))).sort((a, b) => weakLv(b.id) - weakLv(a.id));
  if (mode === "exam") {
    // テスト直前：苦手度・正答率の低さ・重要度(3=テスト頻出) を点数化して優先
    return weightedPick(qs.map(q => {
      const s = st(q.id), seen = s.c + s.w, acc = seen ? s.c / seen : null;
      let w = 0.3 + (s.lv || 0) * 3 + (acc == null ? 0.8 : (1 - acc) * 3) + (q.importance - 1) * 1.8;
      if (s.lv === 0 && seen && acc === 1 && q.importance < 3) w *= 0.4;
      return { q, w };
    }), n);
  }
  // 10問・20問チャレンジ：未回答と苦手を少しだけ優先したランダム
  return weightedPick(qs.map(q => { const s = st(q.id); return { q, w: 1 + (s.c + s.w ? 0 : 0.6) + (s.lv || 0) * 0.6 }; }), n);
}

/* ---------- 画面：問題 ---------- */
let Z = null;
function startQuiz(mode, list) {
  if (!list.length) return;
  Z = { mode, list, i: 0, ok: 0, wrong: [], answered: 0, combo: 0, xp: 0, lv: levelInfo(S.xp).lv };
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
  } else if (q.type === "fill" && !hasChoices) {
    body = `<form class="fillin" id="fillForm"><input id="fillIn" class="input" autocomplete="off" autocapitalize="off" enterkeyhint="done" placeholder="答えを入力"><button class="btn">答える</button></form>`;
  } else {
    body = `<div class="choices">${shuffle(q.choices).map((c, k) => `<button class="choice" data-a="${esc(c)}"><span class="k">${"ABCDEF"[k]}</span><span>${esc(c)}</span></button>`).join("")}</div>`;
  }
  app.innerHTML = `
    <div class="qtop"><button class="iconbtn" id="quit">やめる</button>
      <div class="bar"><i style="width:${Z.i / total * 100}%"></i></div>
      <span class="count">${Z.i + 1}/${total}</span></div>
    <div class="qcard">
      <div class="qmeta"><span class="tag type">${TYPE_LABEL[q.type] || "問題"}</span><span class="tag">${"★".repeat(q.difficulty)} ${DIFF_LABEL[q.difficulty]}</span>${q.importance === 3 ? `<span class="tag imp">テスト頻出</span>` : ""}${weakLv(q.id) ? `<span class="tag wk l${weakLv(q.id)}">${WEAK_LABEL[weakLv(q.id)]}</span>` : ""}${Z.combo >= 2 ? `<span class="tag combo">🔥 ${Z.combo}連続</span>` : ""}</div>
      <p class="qtext">${esc(q.question)}</p>
      <p class="qunit">${esc(q.subject)} › ${esc(q.unit)}</p>
    </div>
    <div id="ans">${body}</div>`;
  $("#quit").onclick = () => Z.answered ? finish() : exitQuiz();
  app.querySelectorAll("[data-a]").forEach(b => b.onclick = () => {
    const isAns = x => q.type === "tf" ? String(q.answer) === x.dataset.a : x.dataset.a === String(q.answer);
    app.querySelectorAll("[data-a]").forEach(x => { x.disabled = true; x.classList.add(isAns(x) ? "correct" : x === b ? "wrong" : "dim"); });
    answer(q, isAns(b));
  });
  const ff = $("#fillForm");
  if (ff) ff.onsubmit = e => {
    e.preventDefault();
    const v = norm($("#fillIn").value); if (!v) { $("#fillIn").focus(); return; }
    const right = [q.answer].concat(q.accept || []).some(x => norm(x) === v);
    $("#fillIn").disabled = true; ff.querySelector("button").disabled = true;
    $("#fillIn").classList.add(right ? "correct" : "wrong");
    $("#fillIn").blur();
    answer(q, right);
  };
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
    $("#sOk").onclick = () => { $(".pair").remove(); answer(q, true, true); };
    $("#sNg").onclick = () => { $(".pair").remove(); answer(q, false, true); };
  };
  const rv = $("#reveal");
  if (rv) rv.onclick = () => {
    $("#ans").innerHTML = `<div class="reveal">${esc(q.answer)}</div><div class="pair"><button class="btn red" id="sNg">まちがえた</button><button class="btn" id="sOk">答えられた</button></div>`;
    $("#sOk").onclick = () => { $(".pair").remove(); answer(q, true, true); };
    $("#sNg").onclick = () => { $(".pair").remove(); answer(q, false, true); };
  };
  scrollTo(0, 0);
}
function answer(q, right, self) {
  const before = weakLv(q.id);
  record(q, right);
  Z.answered++;
  if (right) { Z.ok++; Z.combo++; } else { Z.combo = 0; Z.wrong.push(q); }
  const after = weakLv(q.id), last = Z.i >= Z.list.length - 1;
  let note = "";
  if (right && before && after < before) note = after ? `苦手度が下がりました（${WEAK_LABEL[before]} → ${WEAK_LABEL[after]}）` : "苦手を克服しました！";
  else if (right && before) note = `あと${CLEAR_STREAK - st(q.id).st}回続けて正解すると苦手度が下がります`;
  else if (!right) note = `苦手問題に登録：${WEAK_LABEL[after]}`;
  const fb = $("#fb");
  fb.className = "fb " + (right ? "ok" : "ng");
  fb.innerHTML = `<div class="fbin">
    <div class="fbh"><span class="mark">${right ? "○" : "×"}</span><h3>${right ? "正解！" : "残念！"}</h3>${Z.combo >= 3 ? `<span class="fire">🔥 ${Z.combo}問連続正解！</span>` : ""}</div>
    ${!right && !self ? `<p class="ans"><span>正しい答え</span>${esc(ansText(q))}</p>` : ""}
    <p class="exp">${esc(q.explanation || "")}</p>
    ${note ? `<p class="note">${esc(note)}</p>` : ""}
    </div><button class="btn" id="next">${last ? "結果を見る" : "次の問題へ"}</button>`;
  fb.hidden = false;
  document.body.classList.add("fbopen");
  requestAnimationFrame(() => { app.style.paddingBottom = (fb.offsetHeight + 16) + "px"; });
  $("#next").onclick = () => { if (last) finish(); else { Z.i++; renderQ(); } };
  if (Z.combo && Z.combo % 5 === 0) toast(`🔥 ${Z.combo}問連続正解！`);
  const L = levelInfo(S.xp).lv; if (L > Z.lv) { Z.lv = L; toast("レベルアップ！ Lv." + L); }
  if ((S.daily[today()] || 0) === S.goal) toast("今日の目標達成！");
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
    s.w++; s.st = 0; s.lv = Math.min(3, (s.lv || 0) + 1); S.streak = 0;
  }
  s.last = Date.now(); S.q[q.id] = s;
  const g = right ? XP_OK : XP_NG; S.xp += g; Z.xp += g;
  S.daily[today()] = (S.daily[today()] || 0) + 1;
  S.log.push([q.id, right ? 1 : 0, Date.now(), Z.mode]);
  if (S.log.length > 5000) S.log = S.log.slice(-5000);
  save();
}
function exitQuiz() { closeFb(); Z = null; document.body.classList.remove("inquiz"); renderModes(curPath); }

/* ---------- 画面：結果 ---------- */
function finish() {
  closeFb(); document.body.classList.remove("inquiz");
  const n = Z.answered, score = pct(Z.ok, n) || 0, full = Z.answered === Z.list.length;
  const perfect10 = Z.mode === "c10" && full && Z.ok === 10;
  let msg = score === 100 ? "🎉 パーフェクト！" : score >= 80 ? "👏 よくできました！" : score >= 60 ? "👍 あと少し！" : "📚 間違えた問題を復習しよう！";
  if (perfect10) { msg = "🎉 10問全問正解！"; S.perfect10++; }
  if (score === 100 && n >= 5) { S.xp += XP_PERFECT; Z.xp += XP_PERFECT; }
  save();
  const wrongs = Z.wrong.filter((q, i, a) => a.indexOf(q) === i);
  app.innerHTML = `
    <h2 class="top">${esc(MODE[Z.mode].name)}の結果</h2>
    <div class="score">
      <div class="pt"><span class="${score === 100 ? "perfect" : ""}">${score}</span><small>点</small></div>
      <div class="msg">${msg}</div>
      <div class="sub">${n}問中 ${Z.ok}問正解 · +${Z.xp} XP${full ? "" : " · 途中で終了"}</div>
    </div>
    ${wrongs.length ? `<button class="btn red" id="retry">間違えた ${wrongs.length} 問だけもう一度解く</button>` : ""}
    <div class="pair mt"><button class="btn ghost" id="again">もう一度</button><button class="btn ghost" id="toModes">モード選択へ</button></div>
    ${wrongs.length ? `<h2>間違えた問題</h2><div class="wrongs">${wrongs.map(q => `<div class="wq"><b>${esc(q.question)}</b><span class="lab">正しい答え</span>${esc(ansText(q))}</div>`).join("")}</div>` : ""}`;
  const mode = Z.mode, list = Z.list;
  const r = $("#retry"); if (r) r.onclick = () => startQuiz("retry", shuffle(wrongs));
  $("#again").onclick = () => mode === "retry" ? startQuiz("retry", shuffle(list)) : startQuiz(mode, pick(mode, qsFor(curPath).filter(diffOk)));
  $("#toModes").onclick = () => { Z = null; renderModes(curPath); };
  scrollTo(0, 0);
}

/* ---------- 画面：成績 ---------- */
function renderStats() {
  setTab("stats"); route = () => renderStats();
  let c = 0, w = 0; QS.forEach(q => { const s = st(q.id); c += s.c; w += s.w; });
  const n = c + w, rate = pct(c, n), L = levelInfo(S.xp);
  const lv = l => QS.filter(q => weakLv(q.id) === l).length;
  const weakAll = lv(1) + lv(2) + lv(3);
  const learned = QS.filter(q => st(q.id).c + st(q.id).w).length;
  // 単元別（いちばん細かい単元ごと）
  const units = {};
  QS.forEach(q => { const k = q.subject + "|" + q.unit; (units[k] = units[k] || { subject: q.subject, cat: q.category, unit: q.unit, qs: [] }).qs.push(q); });
  const ulist = Object.values(units).map(u => Object.assign(u, { s: statFor(u.qs) }));
  const weakest = ulist.filter(u => u.s.n >= 3).sort((a, b) => a.s.rate - b.s.rate).slice(0, 3);
  const bar = (name, s, sub) => `<div class="sec"><div class="top"><span class="nm">${esc(name)}</span><span>${s.n ? `正答率 <b>${s.rate}%</b>` : "未回答"}</span></div>
    <div class="meter"><i style="width:${s.rate || 0}%;background:${rateCol(s.rate)}"></i></div><div class="small">${esc(sub)}</div></div>`;
  let html = `<h1>成績</h1><p class="muted lead">Lv.${L.lv} · 累計 ${S.xp} XP · 勉強した日数 ${Object.keys(S.daily).length}日</p>
    <div class="grid">
      <div class="stat big"><div class="ring" style="--p:${rate || 0}" data-v="${rateTxt(rate)}"></div>
        <div><div class="l0">正答率</div><div class="v">${c}<small>/ ${n}問</small></div><div class="l">正解数 / 総回答数</div></div></div>
      <div class="stat"><div class="v">${n}<small>問</small></div><div class="l">総回答数</div></div>
      <div class="stat"><div class="v">${c}<small>問</small></div><div class="l">正解数</div></div>
      <div class="stat"><div class="v">${S.daily[today()] || 0}<small>問</small></div><div class="l">今日解いた問題数</div></div>
      <div class="stat"><div class="v">${S.dailyBest[today()] || 0}</div><div class="l">今日の最高連続正解</div></div>
      <div class="stat"><div class="v">${S.streak}</div><div class="l">いまの連続正解</div></div>
      <div class="stat"><div class="v">${S.best}</div><div class="l">これまでの最高連続正解</div></div>
      <div class="stat"><div class="v">${learned}<small>/ ${QS.length}</small></div><div class="l">学習した問題数</div></div>
      <div class="stat"><div class="v">${S.perfect10}<small>回</small></div><div class="l">10問全問正解</div></div>
    </div>
    <h2>苦手問題 ${weakAll}問</h2>
    <div class="weak3">${[3, 2, 1].map(l => `<div class="wbox l${l}"><b>${lv(l)}</b><span>${WEAK_LABEL[l]}</span></div>`).join("")}</div>
    <p class="muted small2">1回間違い＝要復習、2回＝苦手、3回以上＝最重要復習。${CLEAR_STREAK}回続けて正解すると1段階下がります。</p>`;
  if (weakest.length) html += `<h2>苦手な単元</h2>` + weakest.map(u => bar(u.unit, u.s, `${u.subject} › ${u.cat} · 苦手問題 ${u.s.weak}`)).join("");
  html += `<h2>教科別の正答率</h2>` + TREE.filter(s => QS.some(q => q.subject === s.subject)).map(s => {
    const qs = QS.filter(q => q.subject === s.subject); return bar(s.subject, statFor(qs), `${statFor(qs).seen}/${qs.length}問に挑戦`);
  }).join("");
  html += `<h2>単元別の正答率</h2>` + ulist.map(u => bar(u.unit, u.s, `${u.subject} › ${u.cat} · ${u.s.seen}/${u.qs.length}問に挑戦 · 苦手 ${u.s.weak}`)).join("");
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
let route = () => renderHome();
function setTab(t) { document.querySelectorAll("#tabbar button").forEach(b => b.classList.toggle("on", b.dataset.tab === t)); }
document.querySelectorAll("#tabbar button").forEach(b => b.onclick = () => b.dataset.tab === "stats" ? renderStats() : renderHome());

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
