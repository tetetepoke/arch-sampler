/* =========================================================
   テスト対策ドリル  アプリ本体
   問題データは data/*.js（StudyData）にあり、ここは書き換え不要。
   ========================================================= */
{
const QS = StudyData.questions;
const LEVELS = ["grade", "subject", "field", "unit", "section"];
const LEVEL_LABEL = ["学年", "教科", "分野", "単元", "小単元"];
const TYPE_LABEL = { choice: "4択", tf: "○×", fill: "穴埋め", oneword: "一問一答" };
const MODE = {
  basic:  { name: "基礎問題", desc: "やさしめの問題から10問", n: 10, scored: true },
  test:   { name: "テストモード", desc: "本番形式で20問・100点満点", n: 20, scored: true },
  speed:  { name: "一問一答", desc: "正解すると自動で次へ。テンポよく", n: 30, scored: false },
  review: { name: "間違い復習", desc: "間違えた問題だけを出題", n: 20, scored: true },
  weak:   { name: "苦手克服", desc: "正答率の低い分野を優先", n: 10, scored: true },
  random: { name: "ランダムテスト", desc: "範囲の全問題をシャッフル", n: 999, scored: true },
  retry:  { name: "間違い直し", desc: "", n: 999, scored: true }
};
const XP_OK = 10, XP_NG = 3, XP_PERFECT = 30;
const MASTER_STREAK = 2; // 間違えた後、何回連続正解で「習得」にするか

/* ---------- 保存 ---------- */
const KEY = "teststudy.v1";
const fresh = () => ({ q: {}, log: [], daily: {}, streak: 0, best: 0, xp: 0, goal: 20, lastScope: null });
let S = fresh();
try { const raw = localStorage.getItem(KEY); if (raw) S = Object.assign(fresh(), JSON.parse(raw)); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

/* ---------- 便利関数 ---------- */
const $ = s => document.querySelector(s);
const app = $("#app");
const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pct = (c, n) => n ? Math.round(c / n * 100) : null;
const pathOf = q => LEVELS.map(k => q[k] || "");
const inScope = (q, scope) => scope.every((v, i) => pathOf(q)[i] === v);
const secKey = q => pathOf(q).filter(Boolean).join(" / ");
const st = id => S.q[id] || { c: 0, w: 0, st: 0, status: "new" };
const isWeak = id => st(id).status === "weak";

function levelInfo(xp) {
  let lv = 1, need = 60, rest = xp;
  while (rest >= need) { rest -= need; lv++; need = 40 + lv * 20; }
  return { lv, rest, need };
}
function totals() {
  let c = 0, w = 0;
  for (const id in S.q) { c += S.q[id].c; w += S.q[id].w; }
  return { n: c + w, c, w };
}
function statFor(list) {
  let c = 0, w = 0, seen = 0;
  list.forEach(q => { const s = st(q.id); c += s.c; w += s.w; if (s.c + s.w) seen++; });
  return { c, w, n: c + w, seen, rate: pct(c, c + w) };
}
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2000);
}

/* ---------- 学習範囲ツリー ---------- */
function childrenAt(scope) {
  const depth = scope.length, names = [];
  QS.forEach(q => { if (inScope(q, scope)) { const v = pathOf(q)[depth]; if (v && !names.includes(v)) names.push(v); } });
  let order = depth === 0 ? StudyData.grades : depth === 1 ? StudyData.subjects : (StudyData.order[scope[depth - 1]] || []);
  const all = order.filter(n => depth <= 1 || names.includes(n)).concat(names.filter(n => !order.includes(n)));
  return all.map(name => {
    const sub = scope.concat(name), qs = QS.filter(q => inScope(q, sub));
    const leaf = depth >= 4 || !qs.some(q => pathOf(q)[depth + 1]);
    return { name, scope: sub, qs, leaf };
  });
}
const scopeQs = scope => QS.filter(q => inScope(q, scope));
const scopeName = scope => scope[scope.length - 1] || "すべて";

/* ---------- 画面：ホーム ---------- */
let navScope = [];
function statusBar() {
  const L = levelInfo(S.xp), t = S.daily[today()] || 0, days = Object.keys(S.daily).length;
  const done = t >= S.goal;
  return `<div class="status">
    <div class="lv"><div><small>Lv</small><b>${L.lv}</b></div></div>
    <div>
      <div class="muted" style="display:flex;justify-content:space-between;gap:8px"><span>経験値 ${L.rest} / ${L.need}</span><span>累計 ${S.xp} XP</span></div>
      <div class="xpbar"><i style="width:${Math.min(100, L.rest / L.need * 100)}%"></i></div>
      <div class="chips">
        <button class="chip" id="goalBtn">今日の目標 <b>${t}/${S.goal}</b>問${done ? " ✓" : ""}</button>
        <span class="chip">勉強した日数 <b>${days}</b>日</span>
        <span class="chip">連続正解 <b>${S.streak}</b></span>
      </div>
      <div class="goalbar"><i style="width:${Math.min(100, t / S.goal * 100)}%"></i></div>
    </div></div>`;
}
function renderHome() {
  setTab("home");
  const kids = childrenAt(navScope);
  const crumbs = ["テスト対策"].concat(navScope).map((n, i, a) =>
    i < a.length - 1 ? `<button data-crumb="${i}">${esc(n)}</button><span>›</span>` : `<span>${esc(n)}</span>`).join("");
  let html = statusBar();
  if (S.lastScope && !navScope.length && scopeQs(S.lastScope).length) {
    html += `<h2>前回の続き</h2><button class="row resume" id="resume">${esc(scopeName(S.lastScope))}<span class="meta">${esc(S.lastScope.slice(0, -1).join(" › "))}</span><span class="arrow">›</span></button>`;
  }
  html += `<div class="crumbs">${crumbs}</div><h1>${navScope.length ? esc(scopeName(navScope)) : "テスト対策"}</h1>
    <p class="muted" style="margin:0 0 12px">${LEVEL_LABEL[navScope.length] || ""}を選んでください</p><div class="list">`;
  if (navScope.length >= 3 && kids.length > 1) {
    const s = statFor(scopeQs(navScope));
    html += `<button class="row all" data-go="${esc(JSON.stringify(navScope))}" data-leaf="1">${esc(scopeName(navScope))}をまとめて<span class="meta">${scopeQs(navScope).length}問${s.rate != null ? " · " + s.rate + "%" : ""}</span><span class="arrow">›</span></button>`;
  }
  kids.forEach(k => {
    const s = statFor(k.qs);
    const meta = k.qs.length ? `${k.qs.length}問${s.rate != null ? " · 正答率" + s.rate + "%" : ""}` : "準備中";
    html += `<button class="row" ${k.qs.length ? "" : "disabled"} data-go="${esc(JSON.stringify(k.scope))}" data-leaf="${k.leaf ? 1 : ""}">${esc(k.name)}<span class="meta">${meta}</span><span class="arrow">›</span></button>`;
  });
  html += `</div>`;
  app.innerHTML = html;
  app.querySelectorAll("[data-crumb]").forEach(b => b.onclick = () => { navScope = navScope.slice(0, +b.dataset.crumb); renderHome(); });
  app.querySelectorAll("[data-go]").forEach(b => b.onclick = () => {
    const sc = JSON.parse(b.dataset.go);
    if (b.dataset.leaf) renderModes(sc); else { navScope = sc; renderHome(); }
  });
  const r = $("#resume"); if (r) r.onclick = () => { navScope = S.lastScope.slice(0, -1); renderModes(S.lastScope); };
  $("#goalBtn").onclick = openGoal;
  scrollTo(0, 0);
}

/* ---------- 画面：モード選択 ---------- */
let curScope = [];
function renderModes(scope) {
  curScope = scope; S.lastScope = scope; save();
  if (navScope.length > scope.length || navScope.some((v, i) => scope[i] !== v)) navScope = scope.slice(0, -1);
  const qs = scopeQs(scope), s = statFor(qs), weak = qs.filter(q => isWeak(q.id)).length;
  const mastered = qs.filter(q => st(q.id).status === "mastered").length;
  const m = (k, n, cls = "") => `<button class="mode ${cls}" data-mode="${k}" ${n ? "" : "disabled"}><b>${MODE[k].name}</b><span>${MODE[k].desc}</span><span class="n">${n ? Math.min(n, MODE[k].n) + "問" : "対象なし"}</span></button>`;
  app.innerHTML = `
    <div class="crumbs"><button id="back">‹ 戻る</button><span>${esc(scope.slice(0, -1).join(" › "))}</span></div>
    <h1>${esc(scopeName(scope))}</h1>
    <div class="chips" style="margin-bottom:6px">
      <span class="chip">全 <b>${qs.length}</b> 問</span>
      <span class="chip">正答率 <b>${s.rate == null ? "—" : s.rate + "%"}</b></span>
      <span class="chip">要復習 <b>${weak}</b></span>
      <span class="chip">習得 <b>${mastered}</b></span>
    </div>
    <h2>学習モード</h2>
    <div class="modes">
      ${m("test", qs.length, "main")}
      ${m("basic", qs.length)}${m("speed", qs.length)}
      ${m("review", weak)}${m("weak", s.seen ? qs.length : 0)}
      ${m("random", qs.length)}
    </div>
    ${s.seen ? "" : `<p class="muted" style="margin-top:14px">苦手克服は、一度問題を解くと使えるようになります。</p>`}`;
  $("#back").onclick = renderHome;
  app.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => startQuiz(b.dataset.mode, pick(b.dataset.mode, qs)));
  setTab("home"); scrollTo(0, 0);
}

/* ---------- 出題の選び方 ---------- */
function pick(mode, qs) {
  const n = MODE[mode].n;
  if (mode === "basic") {
    const easy = shuffle(qs.filter(q => q.difficulty <= 2)), hard = shuffle(qs.filter(q => q.difficulty > 2));
    return easy.concat(hard).slice(0, n);
  }
  if (mode === "review") {
    return qs.filter(q => isWeak(q.id)).sort((a, b) => st(b.id).w - st(a.id).w || Math.random() - .5).slice(0, n);
  }
  if (mode === "weak") {
    // 分野（小単元）とタグの正答率が低いほど、また問題自体の正答率が低いほど出やすくする
    const groupRate = {};
    const add = (k, s) => { groupRate[k] = groupRate[k] || { c: 0, n: 0 }; groupRate[k].c += s.c; groupRate[k].n += s.c + s.w; };
    qs.forEach(q => { const s = st(q.id); add("S:" + secKey(q), s); (q.tags || []).forEach(t => add("T:" + t, s)); });
    const r = k => groupRate[k] && groupRate[k].n ? groupRate[k].c / groupRate[k].n : 0.6;
    const pool = qs.map(q => {
      const s = st(q.id), qr = s.c + s.w ? s.c / (s.c + s.w) : 0.5;
      const tagR = (q.tags || []).length ? Math.min(...q.tags.map(t => r("T:" + t))) : 0.6;
      let w = 0.2 + (1 - qr) * 2 + (1 - r("S:" + secKey(q))) * 1.5 + (1 - tagR) * 1.5;
      if (s.status === "weak") w += 2; if (s.status === "mastered") w *= 0.4;
      return { q, w };
    });
    const out = [];
    while (out.length < n && pool.length) {
      let t = Math.random() * pool.reduce((a, p) => a + p.w, 0), i = 0;
      while ((t -= pool[i].w) > 0 && i < pool.length - 1) i++;
      out.push(pool.splice(i, 1)[0].q);
    }
    return out;
  }
  if (mode === "test" || mode === "speed") {
    // まだ解いていない問題・間違えやすい問題をやや優先しつつランダム
    return shuffle(qs).sort((a, b) => (st(a.id).c - st(a.id).w * 2) - (st(b.id).c - st(b.id).w * 2) + (Math.random() - .5) * 3).slice(0, n);
  }
  return shuffle(qs).slice(0, n);
}

/* ---------- 画面：クイズ ---------- */
let Z = null; // 進行中のセッション
function startQuiz(mode, list) {
  if (!list.length) return;
  Z = { mode, list, i: 0, ok: 0, wrong: [], answered: 0, combo: 0, xp: 0, lv: levelInfo(S.xp).lv };
  document.body.classList.add("inquiz");
  renderQ();
}
function renderQ() {
  const q = Z.list[Z.i], total = Z.list.length;
  let body = "";
  if (q.type === "tf") {
    body = `<div class="choices tf"><button class="choice" data-a="true" aria-label="まる">○</button><button class="choice" data-a="false" aria-label="ばつ">×</button></div>`;
  } else if (q.type === "oneword") {
    body = `<button class="btn" id="reveal">答えを見る</button>`;
  } else if (q.type === "fill" && !(q.choices && q.choices.length)) {
    body = `<form class="fillin" id="fillForm"><input id="fillIn" autocomplete="off" placeholder="答えを入力"><button class="btn sm" style="width:auto;margin:0;padding:0 18px">答える</button></form>`;
  } else {
    const ch = shuffle(q.choices);
    body = `<div class="choices">${ch.map((c, k) => `<button class="choice" data-a="${esc(c)}"><span class="k">${"ABCD"[k] || k + 1}</span><span>${esc(c)}</span></button>`).join("")}</div>`;
  }
  app.innerHTML = `
    <div class="qtop"><button class="iconbtn" id="quit">やめる</button>
      <div class="bar"><i style="width:${Z.i / total * 100}%"></i></div>
      <span class="count">${Z.i + 1}/${total}</span>${Z.combo >= 2 ? `<span class="combo">${Z.combo}連続</span>` : ""}</div>
    <div class="qcard">
      <div class="qmeta"><span class="tag type">${TYPE_LABEL[q.type] || "問題"}</span><span class="tag">${esc(q.section || q.unit)}</span>${"★".repeat(q.difficulty || 1) ? `<span class="tag">${"★".repeat(q.difficulty || 1)}</span>` : ""}</div>
      <p class="qtext">${esc(q.question)}</p>
    </div>
    <div id="ans">${body}</div><div id="fb"></div>`;
  $("#quit").onclick = () => Z.answered ? finish() : exitQuiz();
  app.querySelectorAll("[data-a]").forEach(b => b.onclick = () => {
    const a = b.dataset.a, right = q.type === "tf" ? String(q.answer) === a : a === q.answer;
    app.querySelectorAll("[data-a]").forEach(x => {
      x.disabled = true;
      const isAns = q.type === "tf" ? String(q.answer) === x.dataset.a : x.dataset.a === q.answer;
      if (isAns) x.classList.add("correct"); else if (x === b) x.classList.add("wrong"); else x.classList.add("dim");
    });
    answer(q, right);
  });
  const rv = $("#reveal");
  if (rv) rv.onclick = () => {
    $("#ans").innerHTML = `<div class="reveal">${esc(q.answer)}</div><p class="muted" style="text-align:center;margin:0 0 8px">答えられた？</p>
      <div class="pair"><button class="btn red" id="sNg">まちがえた</button><button class="btn" id="sOk">答えられた</button></div>`;
    $("#sOk").onclick = () => { $("#ans").innerHTML = `<div class="reveal">${esc(q.answer)}</div>`; answer(q, true, true); };
    $("#sNg").onclick = () => { $("#ans").innerHTML = `<div class="reveal">${esc(q.answer)}</div>`; answer(q, false, true); };
  };
  const ff = $("#fillForm");
  if (ff) ff.onsubmit = e => {
    e.preventDefault();
    const norm = s => String(s).normalize("NFKC").replace(/[\s（）()・]/g, "").toLowerCase();
    const v = norm($("#fillIn").value); if (!v) return;
    const right = [q.answer].concat(q.accept || []).some(x => norm(x) === v);
    $("#fillIn").disabled = true; ff.querySelector("button").disabled = true;
    answer(q, right);
  };
  scrollTo(0, 0);
}
function answer(q, right, self) {
  record(q, right);
  Z.answered++;
  if (right) { Z.ok++; Z.combo++; } else { Z.combo = 0; Z.wrong.push(q); }
  const showAns = !right && !self ? `<p class="ans">正解：${esc(q.type === "tf" ? (q.answer ? "○" : "×") : q.answer)}</p>` : "";
  const last = Z.i >= Z.list.length - 1;
  const auto = right && Z.mode === "speed" && !last;
  $("#fb").innerHTML = `<div class="fb ${right ? "ok" : "ng"}"><h3>${right ? "⭕ 正解！" : "❌ ちがいます"}</h3>${showAns}<p class="exp">${esc(q.explanation)}</p>${auto ? `<div class="auto"><i></i></div>` : ""}</div>
    <button class="btn" id="next">${last ? "結果を見る" : "次の問題へ"}</button>`;
  const go = () => { clearTimeout(Z.timer); if (last) finish(); else { Z.i++; renderQ(); } };
  $("#next").onclick = go;
  if (auto) Z.timer = setTimeout(go, 1800);
  const L = levelInfo(S.xp).lv;
  if (L > Z.lv) { Z.lv = L; toast("レベルアップ！ Lv." + L); }
  if ((S.daily[today()] || 0) === S.goal) toast("今日の目標達成！");
  $("#fb").scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function record(q, right) {
  const s = Object.assign({ c: 0, w: 0, st: 0, status: "new" }, S.q[q.id]);
  if (right) {
    s.c++; s.st++;
    if (s.status === "weak" && s.st >= MASTER_STREAK) s.status = "mastered";
    else if (s.status === "new") s.status = "ok";
    S.streak++; S.best = Math.max(S.best, S.streak);
  } else {
    s.w++; s.st = 0; s.status = "weak"; S.streak = 0;
  }
  s.last = Date.now();
  S.q[q.id] = s;
  const g = right ? XP_OK : XP_NG; S.xp += g; Z.xp += g;
  S.daily[today()] = (S.daily[today()] || 0) + 1;
  S.log.push([q.id, right ? 1 : 0, Date.now(), Z.mode]);
  if (S.log.length > 3000) S.log = S.log.slice(-3000);
  save();
}
function exitQuiz() {
  clearTimeout(Z && Z.timer); Z = null;
  document.body.classList.remove("inquiz");
  renderModes(curScope);
}

/* ---------- 画面：結果 ---------- */
function finish() {
  clearTimeout(Z.timer);
  document.body.classList.remove("inquiz");
  const n = Z.answered, score = pct(Z.ok, n) || 0;
  let msg = score === 100 ? "🎉 パーフェクト！" : score >= 80 ? "👏 よくできました！" : score >= 60 ? "👍 あと少し！" : "📚 間違えた問題を復習しよう！";
  if (score === 100 && n >= 5) { S.xp += XP_PERFECT; Z.xp += XP_PERFECT; save(); }
  const wrongs = Z.wrong.filter((q, i, a) => a.indexOf(q) === i);
  app.innerHTML = `
    <h2 style="margin-top:8px">${esc(MODE[Z.mode].name)}の結果</h2>
    <div class="score">
      ${MODE[Z.mode].scored ? `<div class="pt"><span class="${score === 100 ? "redcircle" : ""}">${score}</span><small>点</small></div>` : `<div class="pt">${Z.ok}<small>/ ${n}問</small></div>`}
      <div class="msg">${msg}</div>
      <div class="sub">${n}問中 ${Z.ok}問正解 · +${Z.xp} XP${Z.answered < Z.list.length ? " · 途中で終了" : ""}</div>
    </div>
    ${wrongs.length ? `<button class="btn red" id="retry">間違えた ${wrongs.length} 問だけもう一度解く</button>` : ""}
    <div class="pair" style="margin-top:10px"><button class="btn ghost sm" id="again">同じモードでもう一度</button><button class="btn ghost sm" id="toModes">モード選択へ</button></div>
    ${wrongs.length ? `<h2>間違えた問題</h2><div class="wrongs">${wrongs.map(q => `<div class="wq"><b>${esc(q.question)}</b>正解：<span>${esc(q.type === "tf" ? (q.answer ? "○" : "×") : q.answer)}</span></div>`).join("")}</div>` : ""}`;
  const mode = Z.mode, list = Z.list;
  const r = $("#retry"); if (r) r.onclick = () => startQuiz("retry", shuffle(wrongs));
  $("#again").onclick = () => mode === "retry" ? startQuiz("retry", shuffle(list)) : startQuiz(mode, pick(mode, scopeQs(curScope)));
  $("#toModes").onclick = () => { Z = null; renderModes(curScope); };
  scrollTo(0, 0);
}

/* ---------- 画面：成績 ---------- */
function renderStats() {
  setTab("stats");
  const t = totals(), rate = pct(t.c, t.n);
  const weak = Object.keys(S.q).filter(id => S.q[id].status === "weak" && QS.some(q => q.id === id)).length;
  const mastered = Object.values(S.q).filter(s => s.status === "mastered").length;
  const L = levelInfo(S.xp);
  // 単元別（小単元ごと）
  const groups = {};
  QS.forEach(q => { const k = secKey(q); (groups[k] = groups[k] || []).push(q); });
  const secs = Object.keys(groups).map(k => ({ k, name: groups[k][0].section || groups[k][0].unit, path: pathOf(groups[k][0]).slice(0, 4).filter(Boolean).join(" › "), qs: groups[k], s: statFor(groups[k]) }));
  const ord = x => { const q = x.qs[0], o = StudyData.order[q.unit] || []; const i = o.indexOf(q.section); return i < 0 ? 99 : i; };
  secs.sort((a, b) => a.path === b.path ? ord(a) - ord(b) : 0);
  const col = r => r == null ? "var(--line)" : r >= 80 ? "var(--ok)" : r >= 60 ? "var(--blue)" : "var(--red)";
  app.innerHTML = `
    <h1>成績</h1>
    <p class="muted" style="margin:0 0 12px">Lv.${L.lv} · 累計 ${S.xp} XP · 勉強した日数 ${Object.keys(S.daily).length}日</p>
    <div class="grid">
      <div class="stat big"><div class="ring" style="--p:${rate || 0}" data-v="${rate == null ? "—" : rate + "%"}"></div>
        <div><div class="l" style="margin:0">正答率</div><div class="v">${t.c}<small>/ ${t.n}問</small></div><div class="l">総正解数 / 総回答数</div></div></div>
      <div class="stat"><div class="v">${t.n}<small>問</small></div><div class="l">総回答数</div></div>
      <div class="stat"><div class="v">${t.c}<small>問</small></div><div class="l">総正解数</div></div>
      <div class="stat"><div class="v">${S.daily[today()] || 0}<small>問</small></div><div class="l">今日の回答数（目標 ${S.goal}）</div></div>
      <div class="stat"><div class="v">${S.streak}</div><div class="l">連続正解数</div></div>
      <div class="stat"><div class="v">${S.best}</div><div class="l">最高連続正解</div></div>
      <div class="stat"><div class="v" style="color:var(--red)">${weak}<small>問</small></div><div class="l">苦手問題（要復習）</div></div>
      <div class="stat"><div class="v" style="color:var(--ok)">${mastered}<small>問</small></div><div class="l">苦手から習得した問題</div></div>
      <div class="stat"><div class="v">${Object.keys(S.q).length}<small>/ ${QS.length}</small></div><div class="l">解いたことのある問題</div></div>
    </div>
    <h2>単元別の正答率</h2>
    ${secs.map(x => `<div class="sec"><div class="top"><span style="white-space:normal">${esc(x.name)}</span><span>${x.s.rate == null ? "未回答" : x.s.rate + "%"}</span></div>
      <div class="meter"><i style="width:${x.s.rate || 0}%;background:${col(x.s.rate)}"></i></div>
      <div class="small">${esc(x.path)} · ${x.s.seen}/${x.qs.length}問に挑戦 · 要復習 ${x.qs.filter(q => isWeak(q.id)).length}</div></div>`).join("")}
    <h2>データ</h2>
    <p class="muted" style="margin-top:0">記録はこの端末のブラウザに保存されます。機種変更やブラウザを変えるときは、バックアップをコピーして新しい端末で復元してください。</p>
    <div class="tools">
      <button class="btn ghost sm" id="backup">バックアップ・復元</button>
      <button class="btn ghost sm" id="reset" style="color:var(--red)">記録をすべて消す</button>
    </div>`;
  $("#backup").onclick = openBackup;
  $("#reset").onclick = () => openSheet(`<h3>記録をすべて消しますか？</h3><p class="muted">成績・間違えた問題・レベル・経験値がすべて消えます。元に戻せません。</p>
    <div class="pair" style="margin-top:14px"><button class="btn ghost sm" data-close>やめる</button><button class="btn red sm" id="doReset">消す</button></div>`,
    () => { $("#doReset").onclick = () => { const g = S.goal; S = fresh(); S.goal = g; save(); closeSheet(); renderStats(); toast("記録を消しました"); }; });
  scrollTo(0, 0);
}

/* ---------- シート（目標・バックアップ） ---------- */
function openSheet(html, after) {
  const m = $("#modal"); m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`; m.hidden = false;
  m.onclick = e => { if (e.target === m || e.target.hasAttribute("data-close")) closeSheet(); };
  if (after) after();
}
function closeSheet() { $("#modal").hidden = true; }
function openGoal() {
  openSheet(`<h3>今日の目標</h3><p class="muted" style="margin:0">1日に解く問題数を決めよう。</p>
    <div class="goalpick">${[10, 20, 30, 50].map(n => `<button data-g="${n}" class="${S.goal === n ? "on" : ""}">${n}</button>`).join("")}</div>
    <button class="btn ghost sm" data-close>閉じる</button>`, () => {
    document.querySelectorAll("[data-g]").forEach(b => b.onclick = () => { S.goal = +b.dataset.g; save(); closeSheet(); renderHome(); });
  });
}
function openBackup() {
  const data = JSON.stringify(S);
  openSheet(`<h3>バックアップ・復元</h3>
    <p class="muted" style="margin:0 0 8px">① コピーしてメモアプリなどに保存 → ② 新しい端末で貼り付けて「復元」。</p>
    <textarea id="bk">${esc(data)}</textarea>
    <div class="pair" style="margin-top:10px"><button class="btn sm" id="copyBk">コピー</button><button class="btn ghost sm" id="restoreBk">貼り付けた内容で復元</button></div>
    <button class="btn ghost sm" data-close>閉じる</button>`, () => {
    $("#copyBk").onclick = () => {
      const ta = $("#bk"); ta.value = JSON.stringify(S);
      (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).then(() => toast("コピーしました"))
        .catch(() => { ta.select(); try { document.execCommand("copy"); toast("コピーしました"); } catch (e) { toast("長押しでコピーしてください"); } });
    };
    $("#restoreBk").onclick = () => {
      try { const d = JSON.parse($("#bk").value); if (!d || typeof d.q !== "object") throw 0; S = Object.assign(fresh(), d); save(); closeSheet(); toast("復元しました"); renderStats(); }
      catch (e) { toast("データの形式が正しくありません"); }
    };
  });
}

/* ---------- タブ ---------- */
function setTab(t) { document.querySelectorAll("#tabbar button").forEach(b => b.classList.toggle("on", b.dataset.tab === t)); }
document.querySelectorAll("#tabbar button").forEach(b => b.onclick = () => b.dataset.tab === "stats" ? renderStats() : (navScope = navScope, renderHome()));

renderHome();
}
