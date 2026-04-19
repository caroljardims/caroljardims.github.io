// src/components/ChaveioApp.tsx
import { useState, useCallback } from 'react';

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

type AppState =
  | { screen: 'setup' }
  | { screen: 'bye-select'; teams: Team[]; byeCount: number; groups: number; byeType: ByeType }
  | { screen: 'groups'; teams: Team[]; groups: Group[]; bracket: Round[]; byeTeams: Team[] }
  | { screen: 'bracket'; teams: Team[]; groups: Group[]; bracket: Round[] };

type Group = { name: string; teams: Team[] };

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
  const size = orderedTeams.length; // must be power of 2
  const totalRounds = Math.log2(size);
  const rounds: Round[] = [];

  // Round 1
  const firstMatches: Match[] = [];
  for (let i = 0; i < size; i += 2) {
    firstMatches.push({
      id: uid(),
      team1: orderedTeams[i],
      team2: orderedTeams[i + 1],
    });
  }
  rounds.push({ name: roundName(0, totalRounds), matches: firstMatches });

  // Auto-advance byes in round 1
  for (const match of rounds[0].matches) {
    if (match.team1 === 'BYE' && match.team2 !== 'BYE' && match.team2) {
      match.winner = match.team2 as Team;
    } else if (match.team2 === 'BYE' && match.team1 !== 'BYE' && match.team1) {
      match.winner = match.team1 as Team;
    }
  }

  // Subsequent rounds (placeholders)
  for (let r = 1; r < totalRounds; r++) {
    const prevMatches = rounds[r - 1].matches;
    const matches: Match[] = [];
    for (let i = 0; i < prevMatches.length; i += 2) {
      matches.push({
        id: uid(),
        team1: prevMatches[i].winner ?? null,
        team2: prevMatches[i + 1].winner ?? null,
      });
    }
    rounds.push({ name: roundName(r, totalRounds), matches });
  }

  return rounds;
}

function applyWinner(rounds: Round[], roundIdx: number, matchIdx: number, winner: Team): Round[] {
  const next = rounds.map((r) => ({ ...r, matches: r.matches.map((m) => ({ ...m })) }));
  next[roundIdx].matches[matchIdx].winner = winner;

  // Propagate into next round
  if (roundIdx + 1 < next.length) {
    const slotInNext = Math.floor(matchIdx / 2);
    const isTeam1 = matchIdx % 2 === 0;
    if (isTeam1) {
      next[roundIdx + 1].matches[slotInNext].team1 = winner;
    } else {
      next[roundIdx + 1].matches[slotInNext].team2 = winner;
    }
    // Clear downstream if winner changed
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
    // clear next round slot
    if (isTeam1) rounds[roundIdx + 1].matches[slotInNext].team1 = null;
    else rounds[roundIdx + 1].matches[slotInNext].team2 = null;
    rounds[roundIdx + 1].matches[slotInNext].winner = undefined;
    propagateClear(rounds, roundIdx + 1, slotInNext);
  }
}

/** Garante que o array de slots tenha tamanho potência de 2, preenchendo com BYEs corretamente pareados. */
function padSlots(teams: Team[]): (Team | 'BYE')[] {
  const p2 = nextPow2(teams.length);
  const extraByes = p2 - teams.length;
  const regulars = teams.slice(0, teams.length - extraByes);
  const withBye = teams.slice(teams.length - extraByes);
  return [
    ...regulars,
    ...withBye.flatMap((t): (Team | 'BYE')[] => [t, 'BYE']),
  ];
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

// ─── Bracket layout constants ────────────────────────────────────────────────

const ROW_H = 36;         // px — height of one team row (h-9)
const MATCH_H = ROW_H * 2; // 72px — one match card (2 rows)
const MATCH_GAP = 10;     // px — gap between match cards within a pair
const PAIR_H = 2 * MATCH_H + MATCH_GAP; // 154px — full height of one bracket pair
const PAIR_SEP = 33;      // px — gap between consecutive pairs
const COL_W = 188;        // px — width of each round column
const CONN_W = 36;        // px — width of the connector column between rounds
const HEADER_H = 32;      // px — round name header

/** Vertical center (in px) of match [matchIdx] in round [roundIdx], relative to bracket top. */
function matchCenterY(roundIdx: number, matchIdx: number): number {
  if (roundIdx === 0) {
    const pairIdx = Math.floor(matchIdx / 2);
    const posInPair = matchIdx % 2;
    return pairIdx * (PAIR_H + PAIR_SEP) + posInPair * (MATCH_H + MATCH_GAP) + ROW_H;
  }
  return (
    matchCenterY(roundIdx - 1, matchIdx * 2) +
    matchCenterY(roundIdx - 1, matchIdx * 2 + 1)
  ) / 2;
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
    <div className="bg-white dark:bg-slate-800 border border-peachy-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
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
              idx === 0 ? 'border-b border-peachy-100 dark:border-slate-700' : '',
              isWinner
                ? 'bg-peachy-100 dark:bg-slate-700 text-slate-900 dark:text-white font-semibold'
                : 'text-slate-600 dark:text-slate-300',
              canClick && !isWinner ? 'hover:bg-peachy-50 cursor-pointer' : 'cursor-default',
              isBye ? 'opacity-40 italic' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="text-sm truncate" style={{ maxWidth: COL_W - 40 }}>
              {isBye ? 'bye' : team ? team.name : <span className="opacity-40 italic text-xs">a definir</span>}
            </span>
            {isWinner && (
              <span className="text-peachy-500 dark:text-peachy-400 text-sm flex-shrink-0 ml-1">→</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Screens ─────────────────────────────────────────────────────────────────

function SetupScreen({ onConfirm }: { onConfirm: (groups: number, teams: Team[]) => void }) {
  const [groupsInput, setGroupsInput] = useState('');
  const [teamsInput, setTeamsInput] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const groups = groupsInput.trim() === '' ? 0 : parseInt(groupsInput, 10);
    if (isNaN(groups) || groups < 0) {
      setError('Número de grupos inválido.');
      return;
    }
    const names = teamsInput
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length < 2) {
      setError('Adicione pelo menos 2 equipes.');
      return;
    }
    const teams: Team[] = names.map((name) => ({ id: uid(), name }));
    setError('');
    onConfirm(groups, teams);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md w-full mx-auto px-6 py-12 flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1 tracking-tight">
          novo campeonato
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          configure os times e a estrutura da competição
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            quantos grupos?
          </label>
          <input
            type="number"
            min="0"
            value={groupsInput}
            onChange={(e) => setGroupsInput(e.target.value)}
            placeholder="0 = sem fase de grupos"
            className="w-full px-4 py-3 rounded-xl border border-peachy-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-peachy-400 dark:focus:ring-peachy-600 placeholder-slate-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            equipes <span className="text-slate-400 font-normal">(uma por linha)</span>
          </label>
          <textarea
            rows={8}
            value={teamsInput}
            onChange={(e) => setTeamsInput(e.target.value)}
            placeholder={'Inter\nGrêmio\nCaxias\nJuventude'}
            className="w-full px-4 py-3 rounded-xl border border-peachy-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-peachy-400 dark:focus:ring-peachy-600 placeholder-slate-400 resize-none font-mono"
          />
        </div>
      </div>

      {error && <p className="text-red-500 text-sm -mt-4">{error}</p>}

      <button
        type="submit"
        className="w-full py-3 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-full text-sm tracking-wide hover:scale-105 transition-transform shadow-sm"
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
}: {
  teams: Team[];
  byeCount: number;
  byeType: ByeType;
  onConfirm: (byeTeams: Team[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < byeCount) {
        next.add(id);
      }
      return next;
    });
  }

  const ready = selected.size === byeCount;

  const title = byeType === 'group'
    ? 'quem passa direto pras chaves?'
    : 'escolha os times com bye';

  const subtitle = byeType === 'group'
    ? `com ${teams.length} times, sobra ${byeCount === 1 ? '1 time' : `${byeCount} times`} na divisão dos grupos — ${byeCount === 1 ? 'esse time passa' : 'esses times passam'} direto pras chaves.`
    : `com ${teams.length} times, ${byeCount} ${byeCount === 1 ? 'time pula' : 'times pulam'} a primeira rodada. escolha ${byeCount === 1 ? 'qual' : 'quais'}.`;

  return (
    <div className="max-w-md w-full mx-auto px-6 py-12 flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1 tracking-tight">
          {title}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          {subtitle}
        </p>
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
                on
                  ? 'border-peachy-400 bg-peachy-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                  : blocked
                  ? 'border-peachy-100 dark:border-slate-700 text-slate-400 cursor-not-allowed opacity-50 bg-white dark:bg-slate-800'
                  : 'border-peachy-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-peachy-400 cursor-pointer',
              ].join(' ')}
            >
              <span className="flex items-center justify-between">
                {t.name}
                {on && <span className="text-peachy-600 dark:text-peachy-400 text-xs font-bold uppercase">bye</span>}
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
          ready
            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-105'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed',
        ].join(' ')}
      >
        confirmar ({selected.size}/{byeCount})
      </button>
    </div>
  );
}

function GroupsScreen({ groups, byeTeams, onNext }: { groups: Group[]; byeTeams: Team[]; onNext: () => void }) {
  return (
    <div className="max-w-2xl w-full mx-auto px-6 py-12 flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1 tracking-tight">
          fase de grupos
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          times sorteados nos grupos. quando a fase de grupos acabar, avance para as chaves.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {groups.map((g) => (
          <div
            key={g.name}
            className="bg-white dark:bg-slate-800 border border-peachy-200 dark:border-slate-700 rounded-xl p-5"
          >
            <h3 className="text-sm font-bold text-peachy-600 dark:text-peachy-400 uppercase tracking-widest mb-3">
              {g.name}
            </h3>
            <ul className="flex flex-col gap-2">
              {g.teams.map((t) => (
                <li
                  key={t.id}
                  className="text-sm text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg bg-peachy-50 dark:bg-slate-700"
                >
                  {t.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {byeTeams.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-dashed border-peachy-300 dark:border-slate-600 rounded-xl p-5">
          <h3 className="text-sm font-bold text-peachy-600 dark:text-peachy-400 uppercase tracking-widest mb-3">
            bye — passam direto pras chaves
          </h3>
          <ul className="flex flex-wrap gap-2">
            {byeTeams.map((t) => (
              <li
                key={t.id}
                className="text-sm text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg bg-peachy-50 dark:bg-slate-700"
              >
                {t.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onNext}
        className="self-start py-3 px-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-full text-sm tracking-wide hover:scale-105 transition-transform shadow-sm"
      >
        ir para as chaves →
      </button>
    </div>
  );
}

function BracketScreen({ bracket, onWinner }: { bracket: Round[]; onWinner: (ri: number, mi: number, t: Team) => void }) {
  const champion = bracket[bracket.length - 1]?.matches[0]?.winner;
  const round0Count = bracket[0]?.matches.length ?? 2;
  const bh = bracketHeight(round0Count);

  // SVG color tokens (can't use Tailwind inside SVG stroke attr)
  const stroke = 'rgb(252,213,206)'; // peachy-200 approx

  return (
    <div className="px-6 py-12 flex flex-col gap-8 min-w-0">
      {champion && (
        <div className="max-w-2xl mx-auto w-full bg-peachy-100 dark:bg-slate-700 border border-peachy-300 dark:border-peachy-600 rounded-2xl px-8 py-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-peachy-600 dark:text-peachy-400 mb-1">
            campeão
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{champion.name}</p>
        </div>
      )}

      {/* Let the page scroll; no inner scrollbar */}
      <div className="flex min-w-max">
        {bracket.map((round, ri) => (
          <div key={ri} className="flex flex-shrink-0 items-start">

            {/* ── Round column ── */}
            <div style={{ width: COL_W }}>
              <div
                className="flex items-center justify-center text-xs font-bold uppercase tracking-widest text-peachy-600 dark:text-peachy-400"
                style={{ height: HEADER_H, marginBottom: 12 }}
              >
                {round.name}
              </div>

              <div className="relative" style={{ height: bh }}>
                {round.matches.map((match, mi) => (
                  <div
                    key={match.id}
                    style={{ position: 'absolute', top: matchTopY(ri, mi), width: '100%' }}
                  >
                    <MatchCard
                      match={match}
                      onSelectWinner={(team) => onWinner(ri, mi, team)}
                      disabled={!match.team1 || !match.team2 || match.team1 === 'BYE' || match.team2 === 'BYE'}
                    />
                  </div>
                ))}

                {/* Dashed separators between pair groups */}
                {round.matches.length > 2 &&
                  Array.from({ length: Math.floor(round.matches.length / 2) - 1 }).map((_, si) => {
                    const afterBottom = matchTopY(ri, si * 2 + 1) + MATCH_H;
                    const beforeTop = matchTopY(ri, (si + 1) * 2);
                    const sepY = (afterBottom + beforeTop) / 2;
                    return (
                      <div
                        key={`sep-${si}`}
                        style={{ position: 'absolute', top: sepY, width: '100%' }}
                        className="border-t border-dashed border-peachy-200 dark:border-slate-700"
                      />
                    );
                  })}
              </div>
            </div>

            {/* ── SVG connector ── */}
            {ri < bracket.length - 1 && (() => {
              const pairCount = Math.ceil(round.matches.length / 2);
              const R = 6; // corner radius
              return (
                <svg
                  width={CONN_W}
                  height={bh}
                  style={{ marginTop: HEADER_H + 12, flexShrink: 0 }}
                  overflow="visible"
                >
                  {Array.from({ length: pairCount }).map((_, pi) => {
                    const y0 = matchCenterY(ri, pi * 2);
                    const y1 = matchCenterY(ri, pi * 2 + 1);
                    const mid = (y0 + y1) / 2;
                    const x0 = 0;           // left edge (touches match cards)
                    const xMid = CONN_W / 2; // vertical spine
                    const x1 = CONN_W;       // right edge (touches next round)

                    // Path: } bracket shape
                    // top arm: left → spine, then down to mid, then right → exit
                    // bottom arm: left → spine, then up to mid (meets top)
                    const d = [
                      // top horizontal arm
                      `M ${x0} ${y0}`,
                      `H ${xMid - R}`,
                      `Q ${xMid} ${y0} ${xMid} ${y0 + R}`,
                      // top vertical down to mid
                      `V ${mid - R}`,
                      `Q ${xMid} ${mid} ${xMid + R} ${mid}`,
                      // mid horizontal out to right
                      `H ${x1}`,
                      // back to spine for bottom arm
                      `M ${xMid + R} ${mid}`,
                      `Q ${xMid} ${mid} ${xMid} ${mid + R}`,
                      // bottom vertical down to y1
                      `V ${y1 - R}`,
                      `Q ${xMid} ${y1} ${xMid - R} ${y1}`,
                      // bottom horizontal arm back to left
                      `H ${x0}`,
                    ].join(' ');

                    return (
                      <path
                        key={pi}
                        d={d}
                        fill="none"
                        stroke={stroke}
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    );
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
  const [state, setState] = useState<AppState>({ screen: 'setup' });

  const handleSetup = useCallback((groupCount: number, teams: Team[]) => {
    const shuffled = shuffle(teams);

    if (groupCount > 0) {
      const remainder = shuffled.length % groupCount;
      const p2 = nextPow2(shuffled.length);
      const bracketByes = p2 - shuffled.length;

      if (remainder > 0) {
        // Times sobram na divisão por grupos → passam direto pras chaves
        setState({ screen: 'bye-select', teams: shuffled, byeCount: remainder, groups: groupCount, byeType: 'group' });
      } else if (bracketByes > 0) {
        // Divisão perfeita, mas bracket precisa de potência de 2 → bye de chave
        setState({ screen: 'bye-select', teams: shuffled, byeCount: bracketByes, groups: groupCount, byeType: 'bracket' });
      } else {
        const groups = makeGroups(shuffled, groupCount);
        const bracket = buildBracket(padSlots(shuffle(shuffled)));
        setState({ screen: 'groups', teams: shuffled, groups, bracket, byeTeams: [] });
      }
    } else {
      const p2 = nextPow2(shuffled.length);
      const byeCount = p2 - shuffled.length;
      if (byeCount > 0) {
        setState({ screen: 'bye-select', teams: shuffled, byeCount, groups: 0, byeType: 'bracket' });
      } else {
        const bracket = buildBracket(shuffle(shuffled));
        setState({ screen: 'bracket', teams: shuffled, groups: [], bracket });
      }
    }
  }, []);

  const handleByeConfirm = useCallback(
    (selectedByes: Team[]) => {
      if (state.screen !== 'bye-select') return;
      const { teams, groups: groupCount, byeType } = state;
      const byeIds = new Set(selectedByes.map((t) => t.id));
      const regulars = teams.filter((t) => !byeIds.has(t.id));

      if (groupCount > 0) {
        if (byeType === 'group') {
          // Times com bye pulam os grupos e vão direto pras chaves
          const groups = makeGroups(regulars, groupCount);
          const bracket = buildBracket(padSlots(shuffle(regulars)));
          setState({ screen: 'groups', teams, groups, bracket, byeTeams: selectedByes });
        } else {
          // Bye de bracket com grupos: apenas regulars entram nos grupos, byes pulam round 1
          const groups = makeGroups(regulars, groupCount);
          const slots: (Team | 'BYE')[] = [
            ...shuffle(regulars),
            ...shuffle(selectedByes).flatMap((t): (Team | 'BYE')[] => [t, 'BYE']),
          ];
          const bracket = buildBracket(slots);
          setState({ screen: 'groups', teams, groups, bracket, byeTeams: selectedByes });
        }
      } else {
        // Sem grupos: bye de bracket
        const slots: (Team | 'BYE')[] = [
          ...shuffle(regulars),
          ...shuffle(selectedByes).flatMap((t): (Team | 'BYE')[] => [t, 'BYE']),
        ];
        const bracket = buildBracket(slots);
        setState({ screen: 'bracket', teams, groups: [], bracket });
      }
    },
    [state]
  );

  const handleGroupsNext = useCallback(() => {
    if (state.screen !== 'groups') return;
    setState({ screen: 'bracket', teams: state.teams, groups: state.groups, bracket: state.bracket });
  }, [state]);

  const handleWinner = useCallback(
    (ri: number, mi: number, team: Team) => {
      if (state.screen !== 'bracket') return;
      const newBracket = applyWinner(state.bracket, ri, mi, team);
      setState({ ...state, bracket: newBracket });
    },
    [state]
  );

  const reset = () => setState({ screen: 'setup' });

  // ── Render ──

  const showBack = state.screen !== 'setup';

  return (
    <div className="min-h-screen bg-peachy-50 dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-peachy-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a
            href="/"
            className="text-slate-500 dark:text-slate-400 hover:text-peachy-600 dark:hover:text-peachy-400 transition-colors text-sm font-medium"
          >
            ← voltar
          </a>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">chaveio</h1>
        </div>
        {showBack && (
          <button
            onClick={reset}
            className="text-xs text-slate-400 hover:text-peachy-600 dark:hover:text-peachy-400 transition-colors font-medium"
          >
            novo campeonato
          </button>
        )}
      </header>

      {/* Screens */}
      <main className="flex-1 flex flex-col items-center">
        {state.screen === 'setup' && <SetupScreen onConfirm={handleSetup} />}

        {state.screen === 'bye-select' && (
          <ByeSelectScreen
            teams={state.teams}
            byeCount={state.byeCount}
            byeType={state.byeType}
            onConfirm={handleByeConfirm}
          />
        )}

        {state.screen === 'groups' && (
          <GroupsScreen groups={state.groups} byeTeams={state.byeTeams} onNext={handleGroupsNext} />
        )}

        {state.screen === 'bracket' && (
          <BracketScreen bracket={state.bracket} onWinner={handleWinner} />
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-peachy-100 dark:border-slate-800 flex flex-col items-center gap-4">
        <p className="text-slate-400 dark:text-slate-600 text-sm">
          gostou?{' '}
          <a
            href="/pix"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 dark:text-slate-400 font-semibold underline hover:text-peachy-600 dark:hover:text-peachy-400 transition-colors"
          >
            me pague a pipoca da próxima partida
          </a>
          {' '}ou
        </p>
        <a
          href="https://buymeacoffee.com/caroljardims"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-peachy-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold hover:border-peachy-400 hover:text-peachy-600 dark:hover:text-peachy-400 transition-all"
        >
          ☕ buy me a coffee
        </a>
        <p className="text-slate-400 dark:text-slate-600 text-xs">© 2026 Carol Jardim · feito com carinho</p>
      </footer>
    </div>
  );
}
