/**
 * Decifragem — lógica do jogo e Firebase Realtime Database
 */
import { firebaseConfig } from "./firebase-config.js";
import { sortearPrompt } from "./prompts.js";

const FIREBASE_VER = "11.1.0";
const BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VER}`;

const TIMER_MS = 90 * 1000;

/** Evita falha silenciosa: o SDK só carrega depois do primeiro await (página já renderizou). */
let db;
let serverOffset = 0;
let ref;
let set;
let get;
let onValue;
let update;
let push;
let serverTimestamp;
let runTransaction;

async function loadFirebase() {
  if (db) return;
  if (!firebaseConfig?.databaseURL) {
    throw new Error(
      "Em firebase-config.js falta `databaseURL`. Copia a URL em Firebase Console → Realtime Database."
    );
  }
  const { initializeApp } = await import(`${BASE}/firebase-app.js`);
  const mod = await import(`${BASE}/firebase-database.js`);
  ref = mod.ref;
  set = mod.set;
  get = mod.get;
  onValue = mod.onValue;
  update = mod.update;
  push = mod.push;
  serverTimestamp = mod.serverTimestamp;
  runTransaction = mod.runTransaction;
  const app = initializeApp(firebaseConfig);
  db = mod.getDatabase(app);
  onValue(ref(db, ".info/serverTimeOffset"), (snap) => {
    serverOffset = snap.val() || 0;
  });
}

function formatFirebaseError(err) {
  const msg = String(err?.code || err?.message || err || "");
  if (msg.includes("permission") || msg.includes("PERMISSION_DENIED")) {
    return "Permissão negada no Realtime Database. No Console Firebase → Realtime Database → Regras, use regras que permitam escrita (ex.: modo de teste) ou ajuste para o teu caso.";
  }
  if (msg.includes("network") || msg.includes("Failed to fetch") || msg.includes("Load failed")) {
    return "Não foi possível ligar ao Firebase (rede ou bloqueio). Confirma internet e que não estás a abrir o site como ficheiro (usa um servidor local, ex.: npx serve).";
  }
  if (msg.includes("database") && msg.includes("URL")) {
    return "databaseURL inválido. No Firebase Console → Realtime Database copia a URL exata para firebase-config.js.";
  }
  return err?.message || String(err);
}

function nowSynced() {
  return Date.now() + serverOffset;
}

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateRoomCode() {
  let s = "";
  for (let i = 0; i < 4; i++) {
    s += LETTERS[Math.floor(Math.random() * LETTERS.length)];
  }
  return s;
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function splitBalanced(ids, numGroups) {
  const shuffled = shuffleInPlace([...ids]);
  const n = shuffled.length;
  if (numGroups <= 1) return [shuffled];
  const base = Math.floor(n / numGroups);
  const extra = n % numGroups;
  const out = [];
  let idx = 0;
  for (let g = 0; g < numGroups; g++) {
    const sz = base + (g < extra ? 1 : 0);
    out.push(shuffled.slice(idx, idx + sz));
    idx += sz;
  }
  return out;
}

function roomRef(code) {
  return ref(db, `salas/${code}`);
}

const STORAGE_HOST = "decifragem:hostRoom";
const STORAGE_HOST_PLAYER = "decifragem:hostPlayer";
const STORAGE_PLAYER = "decifragem:player";

/** Embaralha letras até revelar o texto final (apenas encenador) */
export function runScrambleReveal(el, finalText, onDone) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÃÕÇabcdefghijklmnopqrstuvwxyz";
  let frame = 0;
  const totalFrames = 28;
  const interval = setInterval(() => {
    frame++;
    if (frame < totalFrames) {
      let noise = "";
      for (let i = 0; i < finalText.length; i++) {
        if (finalText[i] === " ") noise += " ";
        else noise += chars[Math.floor(Math.random() * chars.length)];
      }
      el.textContent = noise;
      el.classList.add("prompt-reveal--scramble");
    } else {
      clearInterval(interval);
      el.textContent = finalText;
      el.classList.remove("prompt-reveal--scramble");
      if (onDone) onDone();
    }
  }, 42);
}

function formatMs(ms) {
  if (ms <= 0) return "0:00";
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function elTimerState(timerEl, msLeft) {
  timerEl.classList.remove("timer--warn", "timer--crit");
  const sec = msLeft / 1000;
  if (sec <= 10) timerEl.classList.add("timer--crit");
  else if (sec <= 20) timerEl.classList.add("timer--warn");
}

/** ——— index ——— */
export async function initIndex() {
  const errHost = document.getElementById("err-host");
  const errJoin = document.getElementById("err-join");
  const btnHost = document.getElementById("btn-create-room");
  const hostNameInput = document.getElementById("host-name");
  const joinCode = document.getElementById("join-code");
  const joinName = document.getElementById("join-name");
  const btnJoin = document.getElementById("btn-join-room");

  try {
    await loadFirebase();
  } catch (err) {
    console.error(err);
    if (errHost) errHost.textContent = formatFirebaseError(err);
    return;
  }

  joinCode?.addEventListener("input", () => {
    joinCode.value = joinCode.value.toUpperCase().replace(/[^A-Z]/g, "");
  });

  btnHost?.addEventListener("click", async () => {
    errHost.textContent = "";
    const hostName = (hostNameInput?.value || "").trim().slice(0, 32);
    if (hostName.length < 1) {
      errHost.textContent = "Digite seu nome — você também entra num grupo.";
      return;
    }
    try {
      let code = generateRoomCode();
      let tries = 0;
      while (tries < 30) {
        const snap = await get(ref(db, `salas/${code}`));
        if (!snap.exists()) break;
        code = generateRoomCode();
        tries++;
      }
      if (tries >= 30) {
        errHost.textContent = "Não foi possível gerar código. Tente de novo.";
        return;
      }
      await set(ref(db, `salas/${code}/config`), {
        jogadoresPorGrupo: 3,
        pontosParaVencer: 10,
        status: "aguardando",
      });
      const jRef = push(ref(db, `salas/${code}/jogadores`));
      const hostPlayerId = jRef.key;
      await set(jRef, { nome: hostName, grupoId: null });
      localStorage.setItem(STORAGE_HOST, code);
      localStorage.setItem(
        STORAGE_HOST_PLAYER,
        JSON.stringify({ code, playerId: hostPlayerId, playerName: hostName })
      );
      window.location.href = `host.html?c=${code}`;
    } catch (err) {
      console.error(err);
      errHost.textContent = formatFirebaseError(err);
    }
  });

  btnJoin?.addEventListener("click", () => {
    errJoin.textContent = "";
    const raw = (joinCode?.value || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
    const name = (joinName?.value || "").trim().slice(0, 32);
    if (raw.length !== 4) {
      errJoin.textContent = "Use um código de 4 letras.";
      return;
    }
    if (name.length < 1) {
      errJoin.textContent = "Digite seu nome.";
      return;
    }
    localStorage.setItem(
      STORAGE_PLAYER,
      JSON.stringify({ pendingCode: raw, pendingName: name })
    );
    window.location.href = `player.html?c=${raw}`;
  });
}

/** ——— host ——— */
export async function initHost() {
  const params = new URLSearchParams(window.location.search);
  let code = params.get("c") || localStorage.getItem(STORAGE_HOST);
  if (!code) {
    window.location.href = "jogo.html";
    return;
  }
  code = code.toUpperCase();
  localStorage.setItem(STORAGE_HOST, code);

  try {
    await loadFirebase();
  } catch (err) {
    console.error(err);
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<p class="error-msg" style="padding:1rem;margin:1rem;border-radius:12px;background:#3f1d1d;color:#fecaca;">
        ${formatFirebaseError(err)}
      </p>`
    );
    return;
  }

  const roomCodeEl = document.getElementById("room-code-display");
  const listPlayers = document.getElementById("list-players");
  const inpPer = document.getElementById("input-jogadores-por-grupo");
  const inpPts = document.getElementById("input-pontos-vencer");
  const btnSortear = document.getElementById("btn-sortear-grupos");
  const phaseWait = document.getElementById("phase-waiting");
  const phaseSort = document.getElementById("phase-sorteio");
  const phaseGame = document.getElementById("phase-jogo");
  const phaseEnd = document.getElementById("phase-encerrado");
  const groupsPreview = document.getElementById("groups-preview");
  const btnReSort = document.getElementById("btn-sortear-novamente");
  const btnConfirmGroups = document.getElementById("btn-confirmar-grupos");
  const scoreboard = document.getElementById("scoreboard");
  const roundCat = document.getElementById("round-categoria");
  const roundPrompt = document.getElementById("round-prompt-host");
  const timerHost = document.getElementById("timer-host");
  const btnProxima = document.getElementById("btn-proxima-rodada");
  const pendingWinner = document.getElementById("pending-winner");
  const btnConfirmPonto = document.getElementById("btn-confirmar-ponto");
  const contestSelect = document.getElementById("contest-select");
  const btnContestar = document.getElementById("btn-contestar");
  const winnerName = document.getElementById("winner-name");
  const winBanner = document.getElementById("win-banner");
  const winTitle = document.getElementById("win-title");

  roomCodeEl.textContent = code;

  let hostPlayerId = null;
  let hostPlayerName = "";
  try {
    const hp = JSON.parse(localStorage.getItem(STORAGE_HOST_PLAYER) || "null");
    if (hp?.code === code && hp?.playerId) {
      hostPlayerId = hp.playerId;
      hostPlayerName = hp.playerName || "";
    }
  } catch {
    /* ignore */
  }

  const hostProfileEl = document.getElementById("host-profile");
  const hostProfileNameEl = document.getElementById("host-profile-name");
  const hostMyGroupEl = document.getElementById("host-my-group");
  const linkHostPlayer = document.getElementById("link-host-player");

  if (linkHostPlayer) linkHostPlayer.href = `player.html?c=${encodeURIComponent(code)}`;

  let state = {
    config: null,
    jogadores: {},
    grupos: {},
    rodada: null,
  };

  function renderHostSelf() {
    if (hostProfileEl) {
      if (hostPlayerId && hostPlayerName) {
        hostProfileEl.classList.remove("hidden");
        if (hostProfileNameEl) hostProfileNameEl.textContent = hostPlayerName;
      } else {
        hostProfileEl.classList.add("hidden");
      }
    }
    if (!hostMyGroupEl || !hostPlayerId) return;
    const gid = state.jogadores?.[hostPlayerId]?.grupoId;
    if (!gid || !state.grupos?.[gid]) {
      const st = state.config?.status;
      hostMyGroupEl.textContent =
        st === "aguardando"
          ? "Você entra num grupo no sorteio."
          : st === "sorteando"
            ? "Veja a composição abaixo."
            : "—";
      return;
    }
    hostMyGroupEl.textContent = `O teu grupo: ${state.grupos[gid].nome}`;
  }

  renderHostSelf();

  const unsubscribers = [];

  function listen(path, cb) {
    const r = ref(db, `salas/${code}/${path}`);
    const u = onValue(r, cb);
    unsubscribers.push(u);
  }

  function showPhases() {
    const st = state.config?.status;
    phaseWait.classList.toggle("hidden", st !== "aguardando");
    phaseSort.classList.toggle("hidden", st !== "sorteando");
    phaseGame.classList.toggle("hidden", st !== "jogando");
    phaseEnd.classList.toggle("hidden", st !== "encerrado");
    if (st === "encerrado") phaseGame.classList.add("hidden");
  }

  function renderPlayers() {
    const ids = Object.keys(state.jogadores || {});
    listPlayers.innerHTML = "";
    if (ids.length === 0) {
      listPlayers.innerHTML = "<li>Ninguém entrou ainda.</li>";
      return;
    }
    ids.forEach((id) => {
      const li = document.createElement("li");
      let label = state.jogadores[id].nome || id;
      if (hostPlayerId && id === hostPlayerId) label += " (mestre)";
      li.textContent = label;
      listPlayers.appendChild(li);
    });
  }

  function renderGroupsPreview() {
    const G = state.grupos || {};
    const keys = Object.keys(G).sort();
    groupsPreview.innerHTML = "";
    keys.forEach((gid) => {
      const g = G[gid];
      const card = document.createElement("div");
      card.className = "group-card";
      const names = (g.jogadores || [])
        .map((jid) => state.jogadores[jid]?.nome || jid)
        .join(", ");
      card.innerHTML = `<h4>${g.nome}</h4><p>${names || "—"}</p>`;
      groupsPreview.appendChild(card);
    });
  }

  function renderScoreboard() {
    const G = state.grupos || {};
    const keys = Object.keys(G).sort();
    let max = -1;
    keys.forEach((k) => {
      max = Math.max(max, G[k].pontos || 0);
    });
    scoreboard.innerHTML = "";
    keys.forEach((gid) => {
      const g = G[gid];
      const sc = document.createElement("div");
      sc.className = "score-card";
      if ((g.pontos || 0) === max && max > 0) sc.classList.add("score-card--lead");
      sc.innerHTML = `<div class="score-card__name">${g.nome}</div><div class="score-card__pts">${g.pontos ?? 0}</div>`;
      scoreboard.appendChild(sc);
    });
  }

  function renderRoundHost() {
    const r = state.rodada;
    if (!r) {
      roundCat.textContent = "—";
      roundPrompt.textContent = "Nenhuma rodada em andamento.";
      pendingWinner.classList.add("hidden");
      btnProxima.disabled = state.config?.status !== "jogando";
      if (btnProxima) btnProxima.textContent = "Iniciar rodada";
      return;
    }
    roundCat.innerHTML = `<span class="round-meta__emoji">${r.emoji || "🎭"}</span>${r.categoria || ""}`;
    // Host não vê o prompt para não vazar resposta durante a rodada.
    roundPrompt.textContent = "Prompt oculto (visível apenas para o encenador).";

    const canNext =
      state.config?.status === "jogando" &&
      (!r || r.status === "confirmando" || r.status === "encerrada");
    btnProxima.disabled = !canNext;

    if (r.status === "aguardando" || r.status === "encenando") {
      pendingWinner.classList.add("hidden");
    }
    if (r.status === "confirmando" && r.grupoAcertou) {
      pendingWinner.classList.remove("hidden");
      const g = state.grupos[r.grupoAcertou];
      winnerName.textContent = g ? g.nome : r.grupoAcertou;
      if (btnConfirmPonto) btnConfirmPonto.disabled = false;
    } else {
      pendingWinner.classList.add("hidden");
      if (btnConfirmPonto) btnConfirmPonto.disabled = true;
    }

    if (btnProxima) {
      btnProxima.textContent = !state.rodada ? "Iniciar rodada" : "Próxima rodada";
    }
  }

  let timerHandle = null;
  function tickTimer() {
    const r = state.rodada;
    if (!timerHost) return;
    if (!r || !r.timerInicio || r.status !== "encenando") {
      timerHost.textContent = "1:30";
      timerHost.classList.remove("timer--warn", "timer--crit");
      if (timerHandle) {
        clearInterval(timerHandle);
        timerHandle = null;
      }
      return;
    }
    const start = r.timerInicio;
    const end = start + TIMER_MS;
    const left = end - nowSynced();
    timerHost.textContent = formatMs(left);
    elTimerState(timerHost, left);
    if (!timerHandle) {
      timerHandle = setInterval(tickTimer, 200);
    }
    if (left <= 0) {
      timerHost.textContent = "0:00";
      timerHost.classList.add("timer--crit");
    }
  }

  listen("config", (snap) => {
    state.config = snap.val();
    if (state.config) {
      if (inpPer) inpPer.value = state.config.jogadoresPorGrupo ?? 3;
      if (inpPts) inpPts.value = state.config.pontosParaVencer ?? 10;
    }
    showPhases();
    // Recalcula estado dos controles da rodada quando status muda
    // (evita botão "Iniciar rodada" ficar desabilitado após refresh).
    renderRoundHost();
    if (state.config?.status === "encerrado" && state.grupos) {
      const keys = Object.keys(state.grupos).sort();
      let best = null;
      let bestPts = -1;
      keys.forEach((k) => {
        const p = state.grupos[k].pontos || 0;
        if (p > bestPts) {
          bestPts = p;
          best = state.grupos[k].nome;
        }
      });
      winTitle.textContent = best ? `${best} venceu!` : "Fim de jogo!";
      winBanner.classList.remove("hidden");
    } else {
      winBanner.classList.add("hidden");
    }
    renderHostSelf();
  });

  listen("jogadores", (snap) => {
    state.jogadores = snap.val() || {};
    renderPlayers();
    renderGroupsPreview();
    renderHostSelf();
  });

  listen("grupos", (snap) => {
    state.grupos = snap.val() || {};
    renderGroupsPreview();
    renderScoreboard();
    fillContestSelect();
    renderHostSelf();
  });

  listen("rodadaAtual", (snap) => {
    state.rodada = snap.val();
    renderRoundHost();
    fillContestSelect();
    tickTimer();
  });

  function fillContestSelect() {
    if (!contestSelect) return;
    contestSelect.innerHTML = "";
    const keys = Object.keys(state.grupos || {}).sort();
    const enc = state.rodada?.grupoEncenando;
    keys.forEach((gid) => {
      if (enc && gid === enc) return;
      const o = document.createElement("option");
      o.value = gid;
      o.textContent = state.grupos[gid].nome;
      contestSelect.appendChild(o);
    });
  }

  inpPer?.addEventListener("change", async () => {
    const v = Math.min(12, Math.max(2, parseInt(inpPer.value, 10) || 3));
    await update(ref(db, `salas/${code}/config`), { jogadoresPorGrupo: v });
  });

  inpPts?.addEventListener("change", async () => {
    const v = Math.min(20, Math.max(5, parseInt(inpPts.value, 10) || 10));
    await update(ref(db, `salas/${code}/config`), { pontosParaVencer: v });
  });

  async function doSortGroups() {
    const jogadores = state.jogadores || {};
    const ids = Object.keys(jogadores);
    const n = ids.length;
    if (n < 2) {
      alert("Precisa de pelo menos 2 jogadores.");
      return;
    }
    const per = Math.min(12, Math.max(2, parseInt(inpPer?.value, 10) || 3));
    const numGroups = Math.max(1, Math.round(n / per));
    if (numGroups < 2) {
      alert("Com esses números, só há um grupo. Ajuste jogadores por grupo ou espere mais gente.");
      return;
    }
    const chunks = splitBalanced(ids, numGroups);
    const grupos = {};
    chunks.forEach((chunk, i) => {
      const gid = `g${i + 1}`;
      grupos[gid] = {
        nome: `Grupo ${i + 1}`,
        pontos: 0,
        jogadores: chunk,
      };
    });
    const patch = { grupos, "config/status": "sorteando" };
    Object.keys(grupos).forEach((gid) => {
      grupos[gid].jogadores.forEach((jid) => {
        patch[`jogadores/${jid}/grupoId`] = gid;
      });
    });
    await update(ref(db, `salas/${code}`), patch);
  }

  btnSortear?.addEventListener("click", () => doSortGroups());
  btnReSort?.addEventListener("click", () => doSortGroups());

  btnConfirmGroups?.addEventListener("click", async () => {
    await update(ref(db, `salas/${code}/config`), { status: "jogando" });
  });

  async function startNextRound() {
    const grupos = state.grupos || {};
    const gKeys = Object.keys(grupos).sort();
    if (gKeys.length < 2) {
      alert("Grupos insuficientes.");
      return;
    }
    const prev = state.rodada?.numeroRodada || 0;
    const numeroRodada = prev + 1;
    const grupoEncenando = gKeys[(numeroRodada - 1) % gKeys.length];
    const jogadoresDoGrupo = grupos[grupoEncenando]?.jogadores || [];
    if (jogadoresDoGrupo.length === 0) {
      alert("O grupo que deveria encenar está sem jogadores.");
      return;
    }
    // Ciclo fixo por grupo: cada vez que o grupo volta a encenar,
    // passa para o próximo jogador da lista daquele grupo.
    const ciclosCompletos = Math.floor((numeroRodada - 1) / gKeys.length);
    const encenador = jogadoresDoGrupo[ciclosCompletos % jogadoresDoGrupo.length];
    const sort = sortearPrompt();
    await set(ref(db, `salas/${code}/rodadaAtual`), {
      numeroRodada,
      categoria: sort.categoria,
      categoriaId: sort.categoriaId,
      emoji: sort.emoji,
      prompt: sort.prompt,
      timerInicio: serverTimestamp(),
      encenador,
      grupoEncenando,
      grupoAcertou: null,
      status: "encenando",
    });
  }

  async function confirmRoundPoint() {
    const r = state.rodada;
    const gid = r?.grupoAcertou;
    if (!gid || !state.grupos?.[gid]) return null;
    const meta = state.config;
    const pontosParaVencer = meta?.pontosParaVencer ?? 10;

    await runTransaction(ref(db, `salas/${code}/grupos/${gid}/pontos`), (cur) => {
      return (cur || 0) + 1;
    });

    const ptsSnap = await get(ref(db, `salas/${code}/grupos/${gid}/pontos`));
    const newPts = ptsSnap.val() || 0;
    let newStatus = "jogando";
    if (newPts >= pontosParaVencer) {
      newStatus = "encerrado";
    }

    const histRef = push(ref(db, `salas/${code}/historico`));
    await set(histRef, {
      categoria: r.categoria,
      prompt: r.prompt,
      grupoVencedor: gid,
    });

    await update(ref(db, `salas/${code}`), {
      "rodadaAtual/status": "encerrada",
      "config/status": newStatus,
    });
    return newStatus;
  }

  btnProxima?.addEventListener("click", async () => {
    if (state.config?.status !== "jogando") return;
    const r = state.rodada;
    if (r?.status === "confirmando" && r?.grupoAcertou) {
      const statusAfterConfirm = await confirmRoundPoint();
      if (statusAfterConfirm === "encerrado") {
        return;
      }
      await startNextRound();
      return;
    }
    if (r && r.status !== "encerrada") {
      const ok = window.confirm(
        "A rodada ainda não foi encerrada no placar. Deseja forçar a próxima rodada mesmo assim?"
      );
      if (!ok) return;
    }
    await startNextRound();
  });

  btnConfirmPonto?.addEventListener("click", async () => {
    await confirmRoundPoint();
  });

  btnContestar?.addEventListener("click", async () => {
    const sel = contestSelect?.value;
    if (!sel) return;
    await update(ref(db, `salas/${code}/rodadaAtual`), { grupoAcertou: sel });
  });

  window.addEventListener("beforeunload", () => {
    unsubscribers.forEach((u) => u());
  });
}

/** ——— player ——— */
export async function initPlayer() {
  const params = new URLSearchParams(window.location.search);
  let code = params.get("c");
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_PLAYER) || "null");
  } catch {
    stored = null;
  }

  if (!code && stored?.pendingCode) code = stored.pendingCode;
  if (!code) {
    window.location.href = "jogo.html";
    return;
  }
  code = code.toUpperCase();

  let hostIdentity = null;
  try {
    hostIdentity = JSON.parse(localStorage.getItem(STORAGE_HOST_PLAYER) || "null");
  } catch {
    hostIdentity = null;
  }
  if (hostIdentity?.code === code && hostIdentity?.playerId) {
    stored = {
      ...(stored || {}),
      playerId: hostIdentity.playerId,
      playerName: hostIdentity.playerName,
      code,
    };
  }

  try {
    await loadFirebase();
  } catch (err) {
    console.error(err);
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<p class="error-msg" style="padding:1rem;margin:1rem;border-radius:12px;background:#3f1d1d;color:#fecaca;">
        ${formatFirebaseError(err)}
      </p>`
    );
    return;
  }

  const nameDisplay = document.getElementById("player-name");
  const lobbyList = document.getElementById("lobby-list");
  const phaseWait = document.getElementById("phase-waiting");
  const phaseSort = document.getElementById("phase-sorteio");
  const phaseGame = document.getElementById("phase-jogo");
  const phaseEnd = document.getElementById("phase-encerrado");
  const myGroupEl = document.getElementById("my-group");
  const matesEl = document.getElementById("group-mates");
  const scoreMini = document.getElementById("scoreboard-mini");
  const statusLine = document.getElementById("status-rodada");
  const timerPl = document.getElementById("timer-player");
  const btnSouEu = document.getElementById("btn-sou-eu");
  const actorPanel = document.getElementById("actor-panel");
  const actorTema = document.getElementById("actor-tema");
  const promptScramble = document.getElementById("prompt-scramble");
  const promptFinal = document.getElementById("prompt-final");
  const selectGroupWin = document.getElementById("select-grupo-acertou");
  const publicGuess = document.getElementById("public-guess");
  const winMsg = document.getElementById("player-win-msg");

  let playerId = stored?.playerId;
  let playerName = stored?.playerName || stored?.pendingName;
  let joining = false;

  const unsubscribers = [];

  function listen(path, cb) {
    const r = ref(db, `salas/${code}/${path}`);
    const u = onValue(r, cb);
    unsubscribers.push(u);
  }

  let state = { config: null, jogadores: {}, grupos: {}, rodada: null };

  async function ensurePlayer() {
    if (joining) return;
    if (playerId && state.jogadores[playerId]) return;
    if (!playerName && stored?.pendingName) playerName = stored.pendingName;
    if (!playerName) {
      playerName = window.prompt("Seu nome:")?.trim().slice(0, 32) || "Jogador";
    }
    joining = true;
    try {
      const roomSnap = await get(ref(db, `salas/${code}`));
      if (!roomSnap.exists()) {
        alert("Sala não encontrada. Verifique o código.");
        window.location.href = "jogo.html";
        return;
      }
      if (!playerId) {
        const newRef = push(ref(db, `salas/${code}/jogadores`));
        playerId = newRef.key;
        await set(newRef, { nome: playerName, grupoId: null });
      } else if (!state.jogadores[playerId]) {
        await set(ref(db, `salas/${code}/jogadores/${playerId}`), {
          nome: playerName,
          grupoId: null,
        });
      }
      const payload = { playerId, playerName, code };
      localStorage.setItem(STORAGE_PLAYER, JSON.stringify(payload));
      if (hostIdentity?.code === code && hostIdentity?.playerId === playerId) {
        localStorage.setItem(STORAGE_HOST_PLAYER, JSON.stringify(payload));
      }
    } finally {
      joining = false;
    }
  }

  listen("jogadores", async (snap) => {
    state.jogadores = snap.val() || {};
    if (!playerId || !state.jogadores[playerId]) {
      await ensurePlayer();
    }
    nameDisplay.textContent = state.jogadores[playerId]?.nome || playerName;
    lobbyList.innerHTML = "";
    Object.keys(state.jogadores).forEach((id) => {
      const li = document.createElement("li");
      li.textContent = state.jogadores[id].nome;
      lobbyList.appendChild(li);
    });
    renderPlayerView();
  });

  listen("config", (snap) => {
    state.config = snap.val();
    renderPlayerView();
  });

  listen("grupos", (snap) => {
    state.grupos = snap.val() || {};
    renderPlayerView();
  });

  listen("rodadaAtual", (snap) => {
    state.rodada = snap.val();
    renderPlayerView();
    tickPlayerTimer();
    handleActorUi();
  });

  function renderPlayerView() {
    const st = state.config?.status;
    phaseWait.classList.toggle("hidden", st !== "aguardando");
    phaseSort.classList.toggle("hidden", st !== "sorteando");
    phaseGame.classList.toggle("hidden", st !== "jogando");
    phaseEnd.classList.toggle("hidden", st !== "encerrado");
    if (st === "encerrado") {
      phaseGame.classList.add("hidden");
      const g = state.grupos;
      let best = null;
      let bp = -1;
      Object.keys(g).forEach((k) => {
        if ((g[k].pontos || 0) > bp) {
          bp = g[k].pontos;
          best = g[k].nome;
        }
      });
      winMsg.textContent = best ? `🏆 ${best} venceu!` : "Fim!";
      return;
    }

    if (st === "sorteando" || st === "jogando") {
      const gid = state.jogadores[playerId]?.grupoId;
      const g = gid ? state.grupos[gid] : null;
      myGroupEl.textContent = g ? g.nome : "—";
      matesEl.innerHTML = "";
      if (g?.jogadores) {
        g.jogadores.forEach((jid) => {
          if (jid === playerId) return;
          const li = document.createElement("li");
          li.textContent = state.jogadores[jid]?.nome || jid;
          matesEl.appendChild(li);
        });
      }
    }

    scoreMini.innerHTML = "";
    Object.keys(state.grupos || {})
      .sort()
      .forEach((gid) => {
        const g = state.grupos[gid];
        const row = document.createElement("div");
        row.className = "score-card";
        row.innerHTML = `<div class="score-card__name">${g.nome}</div><div class="score-card__pts">${g.pontos ?? 0}</div>`;
        scoreMini.appendChild(row);
      });

    const r = state.rodada;
    const imActor = r?.encenador === playerId;
    if (!r) {
      statusLine.textContent = "Aguardando o host iniciar a rodada.";
      publicGuess.classList.add("hidden");
      return;
    }

    if (r.status === "aguardando") {
      statusLine.textContent = "Rodada pronta.";
    } else if (r.status === "encenando") {
      statusLine.textContent = imActor
        ? "🎭 Você está encenando. Escolha o grupo que acertar."
        : "⏱️ Tempo correndo — adivinhem!";
    } else if (r.status === "confirmando") {
      const wg = r.grupoAcertou ? state.grupos[r.grupoAcertou] : null;
      statusLine.textContent = wg
        ? `Encenador marcou: ${wg.nome}. Host vai confirmar.`
        : "Confirmando pontos…";
      publicGuess.classList.remove("hidden");
      publicGuess.textContent = wg
        ? `Palpite oficial: ${wg.nome}`
        : "";
    } else if (r.status === "encerrada") {
      statusLine.textContent = "Rodada encerrada. Aguardando próxima.";
      publicGuess.classList.add("hidden");
    }
  }

  let timerInt = null;
  function tickPlayerTimer() {
    const r = state.rodada;
    if (!timerPl) return;
    if (!r?.timerInicio || r.status !== "encenando") {
      timerPl.textContent = "1:30";
      timerPl.classList.remove("timer--warn", "timer--crit");
      if (timerInt) clearInterval(timerInt);
      timerInt = null;
      return;
    }
    const left = r.timerInicio + TIMER_MS - nowSynced();
    timerPl.textContent = formatMs(left);
    elTimerState(timerPl, left);
    if (!timerInt) timerInt = setInterval(tickPlayerTimer, 250);
  }

  let lastScrambleKey = "";
  function handleActorUi() {
    const r = state.rodada;
    if (!r) {
      actorPanel.classList.add("hidden");
      return;
    }
    const myG = state.jogadores[playerId]?.grupoId;
    const isPerformingGroup = myG && r.grupoEncenando === myG;
    const imActor = r.encenador === playerId;

    if (!isPerformingGroup) {
      actorPanel.classList.add("hidden");
      btnSouEu.classList.add("hidden");
      actorTema.classList.add("hidden");
      return;
    }

    if (r.status === "encenando" && !imActor) {
      actorPanel.classList.add("hidden");
      btnSouEu.classList.add("hidden");
      actorTema.classList.add("hidden");
      return;
    }

    actorPanel.classList.remove("hidden");

    // Encenador agora é definido automaticamente em ciclo fixo.
    btnSouEu.classList.add("hidden");

    if (imActor) {
      actorTema.classList.remove("hidden");
      actorTema.textContent = `${r.emoji || "🎭"} ${r.categoria || "Tema"}`;
    } else {
      actorTema.classList.add("hidden");
      actorTema.textContent = "";
    }

    if (imActor && r.status === "encenando") {
      const key = `${r.numeroRodada}-${r.prompt}`;
      if (key !== lastScrambleKey) {
        lastScrambleKey = key;
        promptFinal.classList.add("hidden");
        promptScramble.classList.remove("hidden");
        runScrambleReveal(promptScramble, r.prompt, () => {
          promptScramble.classList.add("hidden");
          promptFinal.classList.remove("hidden");
          promptFinal.textContent = r.prompt;
        });
      }
    } else {
      promptScramble.textContent = "";
      promptFinal.textContent = "";
      promptScramble.classList.add("hidden");
      promptFinal.classList.add("hidden");
    }

    if (imActor && r.status === "encenando") {
      selectGroupWin.classList.remove("hidden");
      selectGroupWin.innerHTML = "";
      Object.keys(state.grupos || {})
        .sort()
        .forEach((gid) => {
          if (gid === r.grupoEncenando) return;
          const b = document.createElement("button");
          b.type = "button";
          b.className = "btn btn--ghost btn-block";
          b.style.marginBottom = "0.4rem";
          b.textContent = state.grupos[gid].nome;
          b.addEventListener("click", async () => {
            await update(ref(db, `salas/${code}/rodadaAtual`), {
              grupoAcertou: gid,
              status: "confirmando",
            });
          });
          selectGroupWin.appendChild(b);
        });
    } else {
      selectGroupWin.classList.add("hidden");
    }
  }

  btnSouEu?.addEventListener("click", () => {
    // Mantido só para compatibilidade visual; fluxo agora é automático.
  });

  window.addEventListener("beforeunload", () => {
    unsubscribers.forEach((u) => u());
  });
}
