// src/components/ChaveioApp.tsx
import { useState, useCallback, useEffect } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Team = { id: string; name: string };

type Match = {
  id: string;
  team1: Team | 'BYE' | null;
  team2: Team | 'BYE' | null;
  winner?: Team;
};

type Round = { name: string; matches: Match[] };

type ByeType = 'group' | 'bracket';

type SetupPrefill = { name: string; teamsText: string; groupsText: string };

type AppState =
  | { screen: 'list' }
  | { screen: 'setup'; prefill?: SetupPrefill }
  | { screen: 'bye-select'; teams: Team[]; byeCount: number; groups: number; byeType: ByeType }
  | { screen: 'groups'; teams: Team[]; groups: Group[]; bracket: Round[]; byeTeams: Team[] }
  | { screen: 'standings'; teams: Team[]; groups: Group[]; byeTeams: Team[] }
  | { screen: 'bracket'; teams: Team[]; groups: Group[]; bracket: Round[] };

type Group = { name: string; teams: Team[] };

type SavedChampionship = {
  id: string;
  name: string;
  savedAt: string;
  state: AppState;
  champName: string;
};

// ─── Storage ─────────────────────────────────────────────────────────────────

const SAVED_KEY = 'chaveio:saved';
const CURRENT_KEY = 'chaveio:current';
const CONSENT_KEY = 'chaveio:consent';

type CurrentSession = { state: AppState; champName: string; editingId: string | null; history: AppState[] };

function loadSaved(): SavedChampionship[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]'); }
  catch { return []; }
}

function persistSaved(list: SavedChampionship[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(list));
}

function loadCurrent(): CurrentSession | null {
  try {
    const raw = localStorage.getItem(CURRENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function persistCurrent(session: CurrentSession) {
  if (session.state.screen === 'list') {
    localStorage.removeItem(CURRENT_KEY);
  } else {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(session));
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function roundName(roundIndex: number, totalRounds: number): string {
  const fromEnd = totalRounds - 1 - roundIndex;
  if (fromEnd === 0) return 'Final';
  if (fromEnd === 1) return 'Semifinal';
  if (fromEnd === 2) return 'Quartas de Final';
  if (fromEnd === 3) return 'Oitavas de Final';
  return `Rodada ${roundIndex + 1}`;
}

function buildBracket(orderedTeams: (Team | 'BYE')[]): Round[] {
  const size = orderedTeams.length;
  const totalRounds = Math.log2(size);
  const rounds: Round[] = [];

  const firstMatches: Match[] = [];
  for (let i = 0; i < size; i += 2) {
    firstMatches.push({ id: uid(), team1: orderedTeams[i], team2: orderedTeams[i + 1] });
  }
  rounds.push({ name: roundName(0, totalRounds), matches: firstMatches });

  for (const match of rounds[0].matches) {
    if (match.team1 === 'BYE' && match.team2 !== 'BYE' && match.team2) match.winner = match.team2 as Team;
    else if (match.team2 === 'BYE' && match.team1 !== 'BYE' && match.team1) match.winner = match.team1 as Team;
  }

  for (let r = 1; r < totalRounds; r++) {
    const prevMatches = rounds[r - 1].matches;
    const matches: Match[] = [];
    for (let i = 0; i < prevMatches.length; i += 2) {
      matches.push({ id: uid(), team1: prevMatches[i].winner ?? null, team2: prevMatches[i + 1].winner ?? null });
    }
    rounds.push({ name: roundName(r, totalRounds), matches });
  }

  return rounds;
}

function applyWinner(rounds: Round[], roundIdx: number, matchIdx: number, winner: Team): Round[] {
  const next = rounds.map((r) => ({ ...r, matches: r.matches.map((m) => ({ ...m })) }));
  next[roundIdx].matches[matchIdx].winner = winner;

  if (roundIdx + 1 < next.length) {
    const slotInNext = Math.floor(matchIdx / 2);
    const isTeam1 = matchIdx % 2 === 0;
    if (isTeam1) next[roundIdx + 1].matches[slotInNext].team1 = winner;
    else next[roundIdx + 1].matches[slotInNext].team2 = winner;
    next[roundIdx + 1].matches[slotInNext].winner = undefined;
    propagateClear(next, roundIdx + 1, slotInNext);
  }

  return next;
}

function propagateClear(rounds: Round[], roundIdx: number, matchIdx: number) {
  if (roundIdx + 1 >= rounds.length) return;
  const slotInNext = Math.floor(matchIdx / 2);
  const isTeam1 = matchIdx % 2 === 0;
  const prev = rounds[roundIdx].matches[matchIdx].winner;
  if (!prev) {
    if (isTeam1) rounds[roundIdx + 1].matches[slotInNext].team1 = null;
    else rounds[roundIdx + 1].matches[slotInNext].team2 = null;
    rounds[roundIdx + 1].matches[slotInNext].winner = undefined;
    propagateClear(rounds, roundIdx + 1, slotInNext);
  }
}

function padSlots(teams: Team[]): (Team | 'BYE')[] {
  const p2 = nextPow2(teams.length);
  const extraByes = p2 - teams.length;
  const regulars = teams.slice(0, teams.length - extraByes);
  const withBye = teams.slice(teams.length - extraByes);
  return [...regulars, ...withBye.flatMap((t): (Team | 'BYE')[] => [t, 'BYE'])];
}

function makeGroups(teams: Team[], count: number): Group[] {
  const shuffled = shuffle(teams);
  const groups: Group[] = Array.from({ length: count }, (_, i) => ({
    name: `Grupo ${String.fromCharCode(65 + i)}`,
    teams: [],
  }));
  shuffled.forEach((t, i) => groups[i % count].teams.push(t));
  return groups;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function screenLabel(screen: AppState['screen']): string {
  const labels: Record<string, string> = {
    setup: 'configuração',
    'bye-select': 'seleção de byes',
    groups: 'fase de grupos',
    standings: 'classificação',
    bracket: 'chaves',
    list: '',
  };
  return labels[screen] ?? screen;
}

function extractPrefill(champ: SavedChampionship): SetupPrefill {
  const s = champ.state;
  let teams: Team[] = [];
  let groupCount = 0;
  if ('teams' in s && Array.isArray(s.teams)) teams = s.teams;
  if ('groups' in s && Array.isArray(s.groups)) groupCount = s.groups.length;
  return {
    name: champ.champName,
    teamsText: teams.map((t) => t.name).join('\n'),
    groupsText: groupCount > 0 ? String(groupCount) : '',
  };
}

// ─── Bracket layout constants ────────────────────────────────────────────────

const ROW_H = 36;
const MATCH_H = ROW_H * 2;
const MATCH_GAP = 10;
const PAIR_H = 2 * MATCH_H + MATCH_GAP;
const PAIR_SEP = 33;
const COL_W = 188;
const CONN_W = 36;
const HEADER_H = 32;

function matchCenterY(roundIdx: number, matchIdx: number): number {
  if (roundIdx === 0) {
    const pairIdx = Math.floor(matchIdx / 2);
    const posInPair = matchIdx % 2;
    return pairIdx * (PAIR_H + PAIR_SEP) + posInPair * (MATCH_H + MATCH_GAP) + ROW_H;
  }
  return (matchCenterY(roundIdx - 1, matchIdx * 2) + matchCenterY(roundIdx - 1, matchIdx * 2 + 1)) / 2;
}

function matchTopY(roundIdx: number, matchIdx: number): number {
  return matchCenterY(roundIdx, matchIdx) - ROW_H;
}

function bracketHeight(round0MatchCount: number): number {
  const pairs = round0MatchCount / 2;
  return pairs * PAIR_H + (pairs - 1) * PAIR_SEP;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MatchCard({
  match,
  onSelectWinner,
  disabled,
}: {
  match: Match;
  onSelectWinner?: (team: Team) => void;
  disabled?: boolean;
}) {
  const teams: (Team | 'BYE' | null)[] = [match.team1, match.team2];

  return (
    <div className="bg-chaveio-700 border border-chaveio-500/40 rounded-xl overflow-hidden shadow-sm">
      {teams.map((t, idx) => {
        const isBye = t === 'BYE';
        const team = isBye ? null : (t as Team | null);
        const isWinner = match.winner && team && match.winner.id === team.id;
        const canClick = !disabled && !isBye && team && match.team1 !== 'BYE' && match.team2 !== 'BYE';

        return (
          <button
            key={idx}
            onClick={() => canClick && team && onSelectWinner?.(team)}
            disabled={!canClick}
            style={{ height: ROW_H }}
            className={[
              'w-full text-left px-3 flex items-center justify-between transition-colors',
              idx === 0 ? 'border-b border-chaveio-700' : '',
              isWinner ? 'bg-chaveio-500/20 text-white font-semibold' : 'text-chaveio-50/80',
              canClick && !isWinner ? 'hover:bg-chaveio-50/10 cursor-pointer' : 'cursor-default',
              isBye ? 'opacity-40 italic' : '',
            ].filter(Boolean).join(' ')}
          >
            <span className="text-sm truncate" style={{ maxWidth: COL_W - 40 }}>
              {isBye ? 'bye' : team ? team.name : <span className="opacity-40 italic text-xs">a definir</span>}
            </span>
            {isWinner && <span className="text-chaveio-100 text-sm flex-shrink-0 ml-1">→</span>}
          </button>
        );
      })}
    </div>
  );
}

// ─── Screens ─────────────────────────────────────────────────────────────────

function ListScreen({
  saved,
  hasCurrentSession,
  onNew,
  onResumeCurrent,
  onContinue,
  onEdit,
  onDelete,
  onExport,
  onImport,
}: {
  saved: SavedChampionship[];
  hasCurrentSession: boolean;
  onNew: () => void;
  onResumeCurrent: () => void;
  onContinue: (champ: SavedChampionship) => void;
  onEdit: (champ: SavedChampionship) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [importError, setImportError] = useState('');

  function handleDelete(id: string) {
    if (confirmDelete === id) {
      onDelete(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
    }
  }

  const [showHelp, setShowHelp] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    onImport(file);
    e.target.value = '';
  }

  return (
    <div className="max-w-lg w-full mx-auto px-6 py-12 flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">campeonatos</h2>
        <p className="text-chaveio-100/70 text-sm">seus campeonatos salvos aparecem aqui.</p>
      </div>

      <div className="flex items-center justify-between gap-3 bg-chaveio-700/50 border border-chaveio-500/20 rounded-xl px-4 py-3">
        <button
          onClick={() => setShowHelp(true)}
          className="text-xs text-chaveio-100/60 hover:text-chaveio-100 transition-colors text-left underline underline-offset-2 decoration-dotted"
        >
          usar em outro dispositivo?
        </button>
        <div className="flex gap-2 flex-shrink-0">
          {saved.length > 0 && (
            <button
              onClick={onExport}
              className="py-1.5 px-3 border border-chaveio-500/40 text-chaveio-100/60 text-xs font-semibold rounded-full hover:border-chaveio-100 hover:text-white transition-all"
            >
              exportar
            </button>
          )}
          <label className="py-1.5 px-3 border border-chaveio-500/40 text-chaveio-100/60 text-xs font-semibold rounded-full hover:border-chaveio-100 hover:text-white transition-all cursor-pointer">
            importar
            <input type="file" accept=".json" onChange={handleFileChange} className="sr-only" />
          </label>
        </div>
      </div>
      {importError && <p className="text-red-400 text-xs -mt-4">{importError}</p>}

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
          <div
            className="bg-chaveio-900 border border-chaveio-500/40 rounded-2xl p-6 max-w-sm w-full flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">importar e exportar</h3>
              <button onClick={() => setShowHelp(false)} className="text-chaveio-100/50 hover:text-white text-lg leading-none transition-colors">×</button>
            </div>
            <div className="flex flex-col gap-4 text-sm text-chaveio-100/70">
              <div>
                <p className="text-chaveio-50 font-semibold mb-1">exportar</p>
                <p>Baixa um arquivo <span className="font-mono text-chaveio-100">.json</span> com todos os seus campeonatos salvos. Use para fazer backup ou para levar seus dados para outro dispositivo ou navegador.</p>
              </div>
              <div>
                <p className="text-chaveio-50 font-semibold mb-1">importar</p>
                <p>Selecione um arquivo <span className="font-mono text-chaveio-100">.json</span> exportado anteriormente. Os campeonatos serão adicionados à sua lista — campeonatos já existentes não serão duplicados.</p>
              </div>
              <div className="border-t border-chaveio-700 pt-4">
                <p className="text-chaveio-100/50 text-xs">Os dados ficam salvos apenas no navegador. Exportar é a única forma de não perdê-los ao limpar o histórico ou trocar de dispositivo.</p>
              </div>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2.5 px-4 bg-chaveio-500 text-chaveio-900 font-semibold rounded-full text-sm hover:scale-105 transition-transform"
            >
              entendi
            </button>
          </div>
        </div>
      )}

      {hasCurrentSession && (
        <div className="bg-chaveio-500/10 border border-chaveio-500/40 rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-chaveio-50 uppercase tracking-widest mb-0.5">em andamento</p>
            <p className="text-sm text-chaveio-100/70">você tem uma sessão não salva ativa</p>
          </div>
          <button
            onClick={onResumeCurrent}
            className="flex-shrink-0 py-2 px-5 bg-chaveio-500 text-chaveio-900 font-semibold rounded-full text-sm hover:scale-105 transition-transform"
          >
            continuar
          </button>
        </div>
      )}

      <button
        onClick={onNew}
        className="w-full py-3 px-6 bg-chaveio-500 text-chaveio-900 font-semibold rounded-full text-sm tracking-wide hover:scale-105 transition-transform shadow-sm"
      >
        + novo campeonato
      </button>

      {saved.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold text-chaveio-50/60 uppercase tracking-widest">salvos</p>
          {saved.map((champ) => (
            <div
              key={champ.id}
              className="bg-chaveio-700 border border-chaveio-500/40 rounded-xl p-5 flex flex-col gap-3"
            >
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{champ.name || 'sem nome'}</p>
                  <p className="text-xs text-chaveio-100/50 mt-0.5">
                    {screenLabel(champ.state.screen)} · {formatDate(champ.savedAt)}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(champ.id)}
                  className={[
                    'py-1 px-2.5 text-xs font-semibold rounded-full border transition-all flex-shrink-0',
                    confirmDelete === champ.id
                      ? 'bg-red-500/20 border-red-400 text-red-300'
                      : 'border-chaveio-700 text-chaveio-100/40 hover:text-red-400 hover:border-red-400/50',
                  ].join(' ')}
                >
                  {confirmDelete === champ.id ? 'confirmar' : '×'}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onContinue(champ)}
                  className="flex-1 py-2 px-4 border border-chaveio-500/40 text-chaveio-50/80 text-xs font-semibold rounded-full hover:border-chaveio-100 hover:text-white transition-all text-center"
                >
                  continuar de onde parou
                </button>
                <button
                  onClick={() => onEdit(champ)}
                  className="flex-1 py-2 px-4 border border-chaveio-500/40 text-chaveio-50/80 text-xs font-semibold rounded-full hover:border-chaveio-100 hover:text-white transition-all text-center"
                >
                  editar do início
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {saved.length === 0 && !hasCurrentSession && (
        <p className="text-center text-chaveio-100/40 text-sm py-8">nenhum campeonato salvo ainda.</p>
      )}
    </div>
  );
}

function SetupScreen({
  prefill,
  onConfirm,
  onBack,
}: {
  prefill?: SetupPrefill;
  onConfirm: (name: string, groupsText: string, teamsText: string, groupCount: number, teams: Team[]) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState(prefill?.name ?? '');
  const [groupsInput, setGroupsInput] = useState(prefill?.groupsText ?? '');
  const [teamsInput, setTeamsInput] = useState(prefill?.teamsText ?? '');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const groups = groupsInput.trim() === '' ? 0 : parseInt(groupsInput, 10);
    if (isNaN(groups) || groups < 0) { setError('Número de grupos inválido.'); return; }
    const names = teamsInput.split('\n').map((s) => s.trim()).filter(Boolean);
    if (names.length < 2) { setError('Adicione pelo menos 2 equipes.'); return; }
    const teams: Team[] = names.map((n) => ({ id: uid(), name: n }));
    setError('');
    onConfirm(name, groupsInput, teamsInput, groups, teams);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md w-full mx-auto px-6 py-12 flex flex-col gap-8">
      <div>
        <button type="button" onClick={onBack} className="text-chaveio-100/50 hover:text-chaveio-100 text-sm mb-4 transition-colors">
          ← voltar
        </button>
        <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">novo campeonato</h2>
        <p className="text-chaveio-100/70 text-sm">configure os times e a estrutura da competição</p>
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <label className="block text-sm font-medium text-chaveio-50/80 mb-2">
            nome do campeonato <span className="text-chaveio-100/50 font-normal">(opcional)</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Campeonato do Bairro 2026"
            className="w-full px-4 py-3 rounded-xl border border-chaveio-500/40 bg-chaveio-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-chaveio-500 placeholder-slate-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-chaveio-50/80 mb-2">quantos grupos?</label>
          <input
            type="number"
            min="0"
            value={groupsInput}
            onChange={(e) => setGroupsInput(e.target.value)}
            placeholder="0 = sem fase de grupos"
            className="w-full px-4 py-3 rounded-xl border border-chaveio-500/40 bg-chaveio-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-chaveio-500 placeholder-slate-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-chaveio-50/80 mb-2">
            equipes <span className="text-chaveio-100/50 font-normal">(uma por linha)</span>
          </label>
          <textarea
            rows={8}
            value={teamsInput}
            onChange={(e) => setTeamsInput(e.target.value)}
            placeholder={'Inter\nGrêmio\nCaxias\nJuventude'}
            className="w-full px-4 py-3 rounded-xl border border-chaveio-500/40 bg-chaveio-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-chaveio-500 placeholder-slate-400 resize-none font-mono"
          />
        </div>
      </div>

      {error && <p className="text-red-500 text-sm -mt-4">{error}</p>}

      <button
        type="submit"
        className="w-full py-3 px-6 bg-chaveio-500 text-chaveio-900 font-semibold rounded-full text-sm tracking-wide hover:scale-105 transition-transform shadow-sm"
      >
        montar campeonato
      </button>
    </form>
  );
}

function ByeSelectScreen({
  teams,
  byeCount,
  byeType,
  onConfirm,
  onBack,
}: {
  teams: Team[];
  byeCount: number;
  byeType: ByeType;
  onConfirm: (byeTeams: Team[]) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < byeCount) next.add(id);
      return next;
    });
  }

  const ready = selected.size === byeCount;

  const title = byeType === 'group' ? 'quem passa direto pras chaves?' : 'escolha os times com bye';
  const subtitle = byeType === 'group'
    ? `com ${teams.length} times, sobra ${byeCount === 1 ? '1 time' : `${byeCount} times`} na divisão dos grupos — ${byeCount === 1 ? 'esse time passa' : 'esses times passam'} direto pras chaves.`
    : `com ${teams.length} times, ${byeCount} ${byeCount === 1 ? 'time pula' : 'times pulam'} a primeira rodada. escolha ${byeCount === 1 ? 'qual' : 'quais'}.`;

  return (
    <div className="max-w-md w-full mx-auto px-6 py-12 flex flex-col gap-8">
      <div>
        <button type="button" onClick={onBack} className="text-chaveio-100/50 hover:text-chaveio-100 text-sm mb-4 transition-colors">
          ← voltar
        </button>
        <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">{title}</h2>
        <p className="text-chaveio-100/70 text-sm">{subtitle}</p>
      </div>

      <div className="flex flex-col gap-2">
        {teams.map((t) => {
          const on = selected.has(t.id);
          const blocked = !on && selected.size >= byeCount;
          return (
            <button
              key={t.id}
              onClick={() => toggle(t.id)}
              disabled={blocked}
              className={[
                'w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all',
                on ? 'border-chaveio-100 bg-chaveio-500/20 text-white'
                  : blocked ? 'border-chaveio-700 text-chaveio-100/50 cursor-not-allowed opacity-50 bg-chaveio-700'
                  : 'border-chaveio-500/40 bg-chaveio-700 text-chaveio-50/80 hover:border-chaveio-100 cursor-pointer',
              ].join(' ')}
            >
              <span className="flex items-center justify-between">
                {t.name}
                {on && <span className="text-chaveio-50 text-xs font-bold uppercase">bye</span>}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => ready && onConfirm(teams.filter((t) => selected.has(t.id)))}
        disabled={!ready}
        className={[
          'w-full py-3 px-6 font-semibold rounded-full text-sm tracking-wide transition-all shadow-sm',
          ready ? 'bg-chaveio-500 text-chaveio-900 hover:scale-105' : 'bg-chaveio-700/50 text-chaveio-100/50 cursor-not-allowed',
        ].join(' ')}
      >
        confirmar ({selected.size}/{byeCount})
      </button>
    </div>
  );
}

function GroupsScreen({
  groups,
  byeTeams,
  onNext,
  onBack,
  onReshuffle,
}: {
  groups: Group[];
  byeTeams: Team[];
  onNext: () => void;
  onBack: () => void;
  onReshuffle: () => void;
}) {
  return (
    <div className="max-w-2xl w-full mx-auto px-6 py-12 flex flex-col gap-8">
      <div>
        <button type="button" onClick={onBack} className="text-chaveio-100/50 hover:text-chaveio-100 text-sm mb-4 transition-colors">
          ← voltar
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">fase de grupos</h2>
            <p className="text-chaveio-100/70 text-sm">
              times sorteados nos grupos. quando a fase de grupos acabar, avance para as chaves.
            </p>
          </div>
          <button
            type="button"
            onClick={onReshuffle}
            className="flex-shrink-0 py-2 px-4 border border-chaveio-500/40 text-chaveio-100/70 text-xs font-semibold rounded-full hover:border-chaveio-100 hover:text-white transition-all"
          >
            novo sorteio
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {groups.map((g) => (
          <div key={g.name} className="bg-chaveio-700 border border-chaveio-500/40 rounded-xl p-5">
            <h3 className="text-sm font-bold text-chaveio-50 uppercase tracking-widest mb-3">{g.name}</h3>
            <ul className="flex flex-col gap-2">
              {g.teams.map((t) => (
                <li key={t.id} className="text-sm text-chaveio-50/80 px-3 py-2 rounded-lg bg-chaveio-700/60">{t.name}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {byeTeams.length > 0 && (
        <div className="bg-chaveio-700 border border-dashed border-chaveio-500/40 rounded-xl p-5">
          <h3 className="text-sm font-bold text-chaveio-50 uppercase tracking-widest mb-3">
            bye — passam direto pras chaves
          </h3>
          <ul className="flex flex-wrap gap-2">
            {byeTeams.map((t) => (
              <li key={t.id} className="text-sm text-chaveio-50/80 px-3 py-2 rounded-lg bg-chaveio-700/60">{t.name}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onNext}
        className="self-start py-3 px-8 bg-chaveio-500 text-chaveio-900 font-semibold rounded-full text-sm tracking-wide hover:scale-105 transition-transform shadow-sm"
      >
        registrar pontuação →
      </button>
    </div>
  );
}

function StandingsScreen({
  groups,
  byeTeams,
  onConfirm,
  onBack,
}: {
  groups: Group[];
  byeTeams: Team[];
  onConfirm: (advancing: Team[]) => void;
  onBack: () => void;
}) {
  const ADVANCE = 2;
  const [pts, setPts] = useState<Record<number, Record<string, string>>>({});
  const [tieChoice, setTieChoice] = useState<Record<number, Set<string>>>({});

  function getPoints(gi: number, teamId: string): number {
    return parseInt(pts[gi]?.[teamId] ?? '0', 10) || 0;
  }

  function setPoint(gi: number, teamId: string, val: string) {
    setPts((prev) => ({ ...prev, [gi]: { ...prev[gi], [teamId]: val } }));
    setTieChoice((prev) => { const next = { ...prev }; delete next[gi]; return next; });
  }

  function toggleTie(gi: number, teamId: string, spotsAtCut: number) {
    setTieChoice((prev) => {
      const cur = new Set(prev[gi] ?? []);
      if (cur.has(teamId)) cur.delete(teamId);
      else if (cur.size < spotsAtCut) cur.add(teamId);
      return { ...prev, [gi]: cur };
    });
  }

  function getGroupResult(gi: number, group: Group) {
    const advance = Math.min(ADVANCE, group.teams.length);
    const sorted = [...group.teams].sort((a, b) => getPoints(gi, b.id) - getPoints(gi, a.id));
    if (sorted.length <= advance) return { sorted, advancing: sorted, atCut: [], spotsAtCut: 0, hasTie: false, resolved: true };

    const cutScore = getPoints(gi, sorted[advance - 1].id);
    const aboveCut = sorted.filter((t) => getPoints(gi, t.id) > cutScore);
    const atCut = sorted.filter((t) => getPoints(gi, t.id) === cutScore);
    const spotsAtCut = advance - aboveCut.length;
    const hasTie = atCut.length > spotsAtCut;

    const choices = tieChoice[gi] ?? new Set<string>();
    const fromTie = atCut.filter((t) => choices.has(t.id));
    const advancing = hasTie ? [...aboveCut, ...fromTie] : sorted.slice(0, advance);
    const resolved = !hasTie || fromTie.length === spotsAtCut;

    return { sorted, advancing, atCut, spotsAtCut, hasTie, resolved };
  }

  const results = groups.map((g, gi) => getGroupResult(gi, g));
  const allResolved = results.every((r) => r.resolved);

  return (
    <div className="max-w-2xl w-full mx-auto px-6 py-12 flex flex-col gap-8">
      <div>
        <button type="button" onClick={onBack} className="text-chaveio-100/50 hover:text-chaveio-100 text-sm mb-4 transition-colors">
          ← voltar
        </button>
        <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">classificação dos grupos</h2>
        <p className="text-chaveio-100/70 text-sm">insira os pontos de cada time. os 2 melhores de cada grupo avançam.</p>
      </div>

      {groups.map((group, gi) => {
        const { sorted, advancing, atCut, spotsAtCut, hasTie } = results[gi];
        const advancingIds = new Set(advancing.map((t) => t.id));
        const choices = tieChoice[gi] ?? new Set<string>();

        return (
          <div key={gi} className="bg-chaveio-700 border border-chaveio-500/40 rounded-xl p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-chaveio-50 uppercase tracking-widest">{group.name}</h3>

            <div className="flex flex-col gap-2">
              {sorted.map((team) => {
                const isAdvancing = advancingIds.has(team.id);
                return (
                  <div key={team.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isAdvancing ? 'bg-chaveio-500/20' : 'bg-chaveio-700/50'}`}>
                    <span className={`flex-1 text-sm font-medium ${isAdvancing ? 'text-white' : 'text-chaveio-100/70'}`}>
                      {isAdvancing && <span className="text-chaveio-100 mr-1">→</span>}
                      {team.name}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={pts[gi]?.[team.id] ?? ''}
                      onChange={(e) => setPoint(gi, team.id, e.target.value)}
                      placeholder="0"
                      className="w-16 text-center px-2 py-1 rounded-lg border border-chaveio-500/40 bg-chaveio-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-chaveio-500"
                    />
                    <span className="text-xs text-chaveio-100/50 w-3">pts</span>
                  </div>
                );
              })}
            </div>

            {hasTie && (
              <div className="border-t border-chaveio-700 pt-4 flex flex-col gap-2">
                <p className="text-xs font-semibold text-chaveio-100/70">
                  empate — escolha {spotsAtCut === 1 ? 'qual time avança' : `quais ${spotsAtCut} times avançam`} ({choices.size}/{spotsAtCut})
                </p>
                <div className="flex flex-col gap-1">
                  {atCut.map((team) => {
                    const on = choices.has(team.id);
                    const blocked = !on && choices.size >= spotsAtCut;
                    return (
                      <button
                        key={team.id}
                        onClick={() => toggleTie(gi, team.id, spotsAtCut)}
                        disabled={blocked}
                        className={[
                          'w-full text-left px-3 py-2 rounded-lg border text-sm font-medium transition-all',
                          on ? 'border-chaveio-100 bg-chaveio-500/20 text-white'
                            : blocked ? 'border-chaveio-700 text-chaveio-100/50 opacity-50 cursor-not-allowed bg-chaveio-700'
                            : 'border-chaveio-500/40 bg-chaveio-700 text-chaveio-50/80 hover:border-chaveio-100 cursor-pointer',
                        ].join(' ')}
                      >
                        {team.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {byeTeams.length > 0 && (
        <div className="bg-chaveio-700 border border-dashed border-chaveio-500/40 rounded-xl px-5 py-4 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-chaveio-50 uppercase tracking-widest">bye</span>
          {byeTeams.map((t) => (
            <span key={t.id} className="text-sm text-chaveio-50/80 px-3 py-1 rounded-lg bg-chaveio-700/60">{t.name}</span>
          ))}
        </div>
      )}

      <button
        onClick={() => allResolved && onConfirm(results.flatMap((r) => r.advancing))}
        disabled={!allResolved}
        className={[
          'self-start py-3 px-8 font-semibold rounded-full text-sm tracking-wide transition-all shadow-sm',
          allResolved ? 'bg-chaveio-500 text-chaveio-900 hover:scale-105' : 'bg-chaveio-700/50 text-chaveio-100/50 cursor-not-allowed',
        ].join(' ')}
      >
        ir para as chaves →
      </button>
    </div>
  );
}

function BracketScreen({
  bracket,
  onWinner,
  onBack,
  onReshuffle,
}: {
  bracket: Round[];
  onWinner: (ri: number, mi: number, t: Team) => void;
  onBack: () => void;
  onReshuffle: () => void;
}) {
  const champion = bracket[bracket.length - 1]?.matches[0]?.winner;
  const round0Count = bracket[0]?.matches.length ?? 2;
  const bh = bracketHeight(round0Count);
  const stroke = 'rgb(5,155,154)';

  return (
    <div className="px-6 py-12 flex flex-col gap-8 min-w-0">
      <div className="flex items-center gap-4">
        <button type="button" onClick={onBack} className="text-chaveio-100/50 hover:text-chaveio-100 text-sm transition-colors">
          ← voltar
        </button>
        <button
          type="button"
          onClick={onReshuffle}
          className="ml-auto py-2 px-4 border border-chaveio-500/40 text-chaveio-100/70 text-xs font-semibold rounded-full hover:border-chaveio-100 hover:text-white transition-all"
        >
          novo sorteio
        </button>
      </div>

      {champion && (
        <div className="max-w-2xl mx-auto w-full bg-chaveio-500/20 border border-chaveio-100/50 rounded-2xl px-8 py-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-chaveio-50 mb-1">campeão</p>
          <p className="text-2xl font-bold text-white">{champion.name}</p>
        </div>
      )}

      <div className="flex min-w-max">
        {bracket.map((round, ri) => (
          <div key={ri} className="flex flex-shrink-0 items-start">
            <div style={{ width: COL_W }}>
              <div
                className="flex items-center justify-center text-xs font-bold uppercase tracking-widest text-chaveio-50"
                style={{ height: HEADER_H, marginBottom: 12 }}
              >
                {round.name}
              </div>

              <div className="relative" style={{ height: bh }}>
                {round.matches.map((match, mi) => (
                  <div key={match.id} style={{ position: 'absolute', top: matchTopY(ri, mi), width: '100%' }}>
                    <MatchCard
                      match={match}
                      onSelectWinner={(team) => onWinner(ri, mi, team)}
                      disabled={!match.team1 || !match.team2 || match.team1 === 'BYE' || match.team2 === 'BYE'}
                    />
                  </div>
                ))}

                {round.matches.length > 2 &&
                  Array.from({ length: Math.floor(round.matches.length / 2) - 1 }).map((_, si) => {
                    const afterBottom = matchTopY(ri, si * 2 + 1) + MATCH_H;
                    const beforeTop = matchTopY(ri, (si + 1) * 2);
                    const sepY = (afterBottom + beforeTop) / 2;
                    return (
                      <div
                        key={`sep-${si}`}
                        style={{ position: 'absolute', top: sepY, width: '100%' }}
                        className="border-t border-dashed border-chaveio-500/40"
                      />
                    );
                  })}
              </div>
            </div>

            {ri < bracket.length - 1 && (() => {
              const pairCount = Math.ceil(round.matches.length / 2);
              const R = 6;
              return (
                <svg width={CONN_W} height={bh} style={{ marginTop: HEADER_H + 12, flexShrink: 0 }} overflow="visible">
                  {Array.from({ length: pairCount }).map((_, pi) => {
                    const y0 = matchCenterY(ri, pi * 2);
                    const y1 = matchCenterY(ri, pi * 2 + 1);
                    const mid = (y0 + y1) / 2;
                    const x0 = 0;
                    const xMid = CONN_W / 2;
                    const x1 = CONN_W;
                    const d = [
                      `M ${x0} ${y0}`, `H ${xMid - R}`, `Q ${xMid} ${y0} ${xMid} ${y0 + R}`,
                      `V ${mid - R}`, `Q ${xMid} ${mid} ${xMid + R} ${mid}`, `H ${x1}`,
                      `M ${xMid + R} ${mid}`, `Q ${xMid} ${mid} ${xMid} ${mid + R}`,
                      `V ${y1 - R}`, `Q ${xMid} ${y1} ${xMid - R} ${y1}`, `H ${x0}`,
                    ].join(' ');
                    return <path key={pi} d={d} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />;
                  })}
                </svg>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export function ChaveioApp() {
  const [state, setState] = useState<AppState>(() => loadCurrent()?.state ?? { screen: 'list' });
  const [champName, setChampName] = useState(() => loadCurrent()?.champName ?? '');
  const [editingId, setEditingId] = useState<string | null>(() => loadCurrent()?.editingId ?? null);
  const [history, setHistory] = useState<AppState[]>(() => loadCurrent()?.history ?? []);
  const [saved, setSaved] = useState<SavedChampionship[]>(loadSaved);
  const [saveFlash, setSaveFlash] = useState(false);
  const [consentGiven, setConsentGiven] = useState<boolean>(() => localStorage.getItem(CONSENT_KEY) === 'yes');

  function acceptConsent() {
    localStorage.setItem(CONSENT_KEY, 'yes');
    setConsentGiven(true);
  }

  // Auto-persist current session
  useEffect(() => {
    persistCurrent({ state, champName, editingId, history });
  }, [state, champName, editingId, history]);

  function goTo(next: AppState, currentOverride?: AppState) {
    setHistory((h) => [...h, currentOverride ?? state]);
    setState(next);
  }

  function goBack() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setState(prev);
      return h.slice(0, -1);
    });
  }

  function goToList() {
    setState({ screen: 'list' });
    setHistory([]);
  }

  function handleSave() {
    const championship: SavedChampionship = {
      id: editingId ?? uid(),
      name: champName || 'sem nome',
      savedAt: new Date().toISOString(),
      state,
      champName,
    };
    setSaved((prev) => {
      const next = editingId
        ? prev.map((s) => (s.id === editingId ? championship : s))
        : [championship, ...prev];
      persistSaved(next);
      return next;
    });
    setEditingId(championship.id);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  }

  function handleDelete(id: string) {
    setSaved((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persistSaved(next);
      return next;
    });
    if (editingId === id) setEditingId(null);
  }


  // ── Handlers ──

  const handleSetup = useCallback((name: string, groupsText: string, teamsText: string, groupCount: number, teams: Team[]) => {
    setChampName(name);
    const prefill: SetupPrefill = { name, teamsText, groupsText };
    const shuffled = shuffle(teams);

    if (groupCount > 0) {
      const remainder = shuffled.length % groupCount;
      const p2 = nextPow2(shuffled.length);
      const bracketByes = p2 - shuffled.length;

      if (remainder > 0) {
        goTo({ screen: 'bye-select', teams: shuffled, byeCount: remainder, groups: groupCount, byeType: 'group' },
          { screen: 'setup', prefill });
      } else if (bracketByes > 0) {
        goTo({ screen: 'bye-select', teams: shuffled, byeCount: bracketByes, groups: groupCount, byeType: 'bracket' },
          { screen: 'setup', prefill });
      } else {
        const groups = makeGroups(shuffled, groupCount);
        const bracket = buildBracket(padSlots(shuffle(shuffled)));
        goTo({ screen: 'groups', teams: shuffled, groups, bracket, byeTeams: [] },
          { screen: 'setup', prefill });
      }
    } else {
      const p2 = nextPow2(shuffled.length);
      const byeCount = p2 - shuffled.length;
      if (byeCount > 0) {
        goTo({ screen: 'bye-select', teams: shuffled, byeCount, groups: 0, byeType: 'bracket' },
          { screen: 'setup', prefill });
      } else {
        const bracket = buildBracket(shuffle(shuffled));
        goTo({ screen: 'bracket', teams: shuffled, groups: [], bracket },
          { screen: 'setup', prefill });
      }
    }
  }, [state, history]);

  const handleByeConfirm = useCallback((selectedByes: Team[]) => {
    if (state.screen !== 'bye-select') return;
    const { teams, groups: groupCount, byeType } = state;
    const byeIds = new Set(selectedByes.map((t) => t.id));
    const regulars = teams.filter((t) => !byeIds.has(t.id));

    if (groupCount > 0) {
      if (byeType === 'group') {
        const groups = makeGroups(regulars, groupCount);
        const bracket = buildBracket(padSlots(shuffle(regulars)));
        goTo({ screen: 'groups', teams, groups, bracket, byeTeams: selectedByes });
      } else {
        const groups = makeGroups(regulars, groupCount);
        const slots: (Team | 'BYE')[] = [
          ...shuffle(regulars),
          ...shuffle(selectedByes).flatMap((t): (Team | 'BYE')[] => [t, 'BYE']),
        ];
        const bracket = buildBracket(slots);
        goTo({ screen: 'groups', teams, groups, bracket, byeTeams: selectedByes });
      }
    } else {
      const slots: (Team | 'BYE')[] = [
        ...shuffle(regulars),
        ...shuffle(selectedByes).flatMap((t): (Team | 'BYE')[] => [t, 'BYE']),
      ];
      const bracket = buildBracket(slots);
      goTo({ screen: 'bracket', teams, groups: [], bracket });
    }
  }, [state, history]);

  const handleGroupsNext = useCallback(() => {
    if (state.screen !== 'groups') return;
    goTo({ screen: 'standings', teams: state.teams, groups: state.groups, byeTeams: state.byeTeams });
  }, [state, history]);

  const handleStandingsConfirm = useCallback((advancing: Team[]) => {
    if (state.screen !== 'standings') return;
    const { teams, groups, byeTeams } = state;
    const slots = padSlots(shuffle([...advancing, ...byeTeams]));
    const bracket = buildBracket(slots);
    goTo({ screen: 'bracket', teams, groups, bracket });
  }, [state, history]);

  const handleWinner = useCallback((ri: number, mi: number, team: Team) => {
    if (state.screen !== 'bracket') return;
    setState({ ...state, bracket: applyWinner(state.bracket, ri, mi, team) });
  }, [state]);

  const handleReshuffleGroups = useCallback(() => {
    if (state.screen !== 'groups') return;
    const regularTeams = state.groups.flatMap((g) => g.teams);
    const newGroups = makeGroups(regularTeams, state.groups.length);
    setState({ ...state, groups: newGroups });
  }, [state]);

  const handleReshuffleBracket = useCallback(() => {
    if (state.screen !== 'bracket') return;
    const firstRound = state.bracket[0];
    const allTeams: Team[] = [];
    const byeTeamIds = new Set<string>();
    for (const match of firstRound.matches) {
      if (match.team1 && match.team1 !== 'BYE') allTeams.push(match.team1 as Team);
      if (match.team2 && match.team2 !== 'BYE') allTeams.push(match.team2 as Team);
      if (match.team1 === 'BYE' && match.team2 && match.team2 !== 'BYE') byeTeamIds.add((match.team2 as Team).id);
      if (match.team2 === 'BYE' && match.team1 && match.team1 !== 'BYE') byeTeamIds.add((match.team1 as Team).id);
    }
    const byeTeams = allTeams.filter((t) => byeTeamIds.has(t.id));
    const regulars = allTeams.filter((t) => !byeTeamIds.has(t.id));
    const slots: (Team | 'BYE')[] = byeTeams.length > 0
      ? [...shuffle(regulars), ...shuffle(byeTeams).flatMap((t): (Team | 'BYE')[] => [t, 'BYE'])]
      : shuffle(allTeams);
    setState({ ...state, bracket: buildBracket(slots) });
  }, [state]);

  function handleContinue(champ: SavedChampionship) {
    setState(champ.state);
    setChampName(champ.champName);
    setEditingId(champ.id);
    setHistory([{ screen: 'list' }]);
  }

  function handleEditFromStart(champ: SavedChampionship) {
    const prefill = extractPrefill(champ);
    setState({ screen: 'setup', prefill });
    setChampName(champ.champName);
    setEditingId(champ.id);
    setHistory([{ screen: 'list' }]);
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(saved, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chaveio-campeonatos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!Array.isArray(data)) throw new Error('formato inválido');
        const imported: SavedChampionship[] = data.map((item: SavedChampionship) => ({
          ...item,
          id: item.id ?? uid(),
        }));
        setSaved((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const merged = [...prev, ...imported.filter((i) => !existingIds.has(i.id))];
          persistSaved(merged);
          return merged;
        });
      } catch {
        // silently ignore malformed files — UI shows nothing changed
      }
    };
    reader.readAsText(file);
  }

  // ── Render ──

  const isActive = state.screen !== 'list';
  const canGoBack = history.length > 0;

  return (
    <div className="min-h-screen bg-chaveio-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-chaveio-900/90 backdrop-blur-md border-b border-chaveio-500/40 px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <a href="/" className="text-chaveio-100/70 hover:text-chaveio-100 transition-colors text-sm font-medium flex-shrink-0">
            ← início
          </a>
          {isActive && champName && (
            <span className="text-white font-semibold text-sm truncate">{champName}</span>
          )}
          {isActive && !champName && (
            <span className="text-chaveio-100/40 text-sm italic truncate">sem nome</span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {isActive && (
            <button
              onClick={handleSave}
              className={[
                'py-1.5 px-4 text-xs font-semibold rounded-full border transition-all',
                saveFlash
                  ? 'bg-chaveio-500/30 border-chaveio-100 text-white'
                  : 'border-chaveio-500/40 text-chaveio-100/70 hover:border-chaveio-100 hover:text-white',
              ].join(' ')}
            >
              {saveFlash ? 'salvo ✓' : 'salvar'}
            </button>
          )}
          {isActive && (
            <button
              onClick={goToList}
              className="text-xs text-chaveio-100/50 hover:text-chaveio-100 transition-colors font-medium"
            >
              meus campeonatos
            </button>
          )}
        </div>
      </header>

      {/* Consent banner */}
      {!consentGiven && (
        <div className="bg-chaveio-700/80 border-b border-chaveio-500/40 px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 text-sm text-chaveio-100/80">
          <span className="flex-1">
            🍪 Este app salva seus campeonatos <strong className="text-chaveio-100">no cache do seu navegador</strong> (localStorage) para que você possa continuar de onde parou. Nenhum dado é enviado para servidores.
          </span>
          <button
            onClick={acceptConsent}
            className="flex-shrink-0 bg-chaveio-500 hover:bg-chaveio-400 text-chaveio-900 font-semibold text-xs px-4 py-1.5 rounded-full transition-colors"
          >
            Entendi, pode salvar
          </button>
        </div>
      )}

      {/* Screens */}
      <main className="flex-1 flex flex-col items-center">
        {state.screen === 'list' && (
          <ListScreen
            saved={saved}
            hasCurrentSession={false}
            onNew={() => goTo({ screen: 'setup' })}
            onResumeCurrent={() => {}}
            onContinue={handleContinue}
            onEdit={handleEditFromStart}
            onDelete={handleDelete}
            onExport={handleExport}
            onImport={handleImport}
          />
        )}

        {state.screen === 'setup' && (
          <SetupScreen
            prefill={state.prefill}
            onConfirm={handleSetup}
            onBack={canGoBack ? goBack : goToList}
          />
        )}

        {state.screen === 'bye-select' && (
          <ByeSelectScreen
            teams={state.teams}
            byeCount={state.byeCount}
            byeType={state.byeType}
            onConfirm={handleByeConfirm}
            onBack={goBack}
          />
        )}

        {state.screen === 'groups' && (
          <GroupsScreen
            groups={state.groups}
            byeTeams={state.byeTeams}
            onNext={handleGroupsNext}
            onBack={goBack}
            onReshuffle={handleReshuffleGroups}
          />
        )}

        {state.screen === 'standings' && (
          <StandingsScreen
            groups={state.groups}
            byeTeams={state.byeTeams}
            onConfirm={handleStandingsConfirm}
            onBack={goBack}
          />
        )}

        {state.screen === 'bracket' && (
          <BracketScreen
            bracket={state.bracket}
            onWinner={handleWinner}
            onBack={goBack}
            onReshuffle={handleReshuffleBracket}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-chaveio-700 flex flex-col items-center gap-4">
        <p className="text-chaveio-500/60 text-sm">
          gostou?{' '}
          <a
            href="/pix"
            target="_blank"
            rel="noopener noreferrer"
            className="text-chaveio-100/70 font-semibold underline hover:text-chaveio-100 transition-colors"
          >
            me pague a pipoca da próxima partida
          </a>
          {' '}ou
        </p>
        <a
          href="https://buymeacoffee.com/caroljardims"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-chaveio-500/40 bg-chaveio-700 text-chaveio-100/70 text-xs font-semibold hover:border-chaveio-100 hover:text-chaveio-100 transition-all"
        >
          ☕ buy me a coffee
        </a>
        <p className="text-chaveio-500/60 text-xs">© 2026 Carol Jardim · feito com carinho</p>
      </footer>
    </div>
  );
}
