// src/components/SipsGame.tsx
import React, { useState, useCallback } from 'react';

type Suit = '♠' | '♣' | '♥' | '♦';
type Value = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
type GameState = 'splash' | 'playing' | 'revealed' | 'finished';

interface Card {
  suit: Suit;
  value: Value;
  color: 'red' | 'black';
}

interface Rule {
  name: string;
  emoji: string;
  description: string;
}

const rules: Record<Value, Rule> = {
  A:   { name: 'Waterfall',       emoji: '⛲',  description: 'Todo mundo bebe! Quem puxou começa, e todos continuam bebendo até a pessoa à sua direita parar.' },
  '2': { name: 'You',             emoji: '🫵',  description: 'Escolhe alguém para beber 2 goles.' },
  '3': { name: 'Me',              emoji: '☝️',  description: 'Quem puxou bebe 3 goles.' },
  '4': { name: 'Question Master', emoji: '🔮',  description: 'Quem puxou vira o Question Master — qualquer pessoa que responder às suas perguntas deve beber. Dura até o próximo 4 ser puxado.' },
  '5': { name: 'Temporary Rule',  emoji: '⏳',  description: 'Cria uma regra nova que todos devem seguir até o próximo 5 ser puxado.' },
  '6': { name: 'Heaven',          emoji: '🪽',  description: 'Aponta pro céu! O último a apontar bebe 2 goles.' },
  '7': { name: 'Lucky Charm',     emoji: '🍀',  description: 'Escolhe um "drinking buddy" — quando você bebe, ele bebe. Quando ele bebe, você bebe.' },
  '8': { name: 'Rhyme',           emoji: '🎵',  description: 'Fala uma palavra, todos precisam rimar. O primeiro a errar bebe 2 goles.' },
  '9': { name: 'Categories',      emoji: '🗂️', description: 'Escolhe uma categoria, todos citam itens. O primeiro a falhar bebe 3 goles.' },
  '10':{ name: 'Permanent Rule',  emoji: '📜',  description: 'Cria uma regra nova que todos devem seguir até o fim do jogo.' },
  J:   { name: 'Gentlemen',       emoji: '🙋‍♂️', description: 'Todos os homens bebem um gole.' },
  Q:   { name: 'Ladies',          emoji: '🙋‍♀️', description: 'Todas as mulheres bebem um gole.' },
  K:   { name: "King's Cup",      emoji: '👑',  description: 'Coloca um pouco da sua bebida no King\'s Cup. Quem puxar o 4º Rei bebe o copo inteiro!' },
};

const suitEmoji: Record<Suit, string> = {
  '♥': '❤️', '♦': '♦️', '♠': '♠️', '♣': '♣️',
};

function buildDeck(): Card[] {
  const suits: Suit[] = ['♥', '♦', '♠', '♣'];
  const values: Value[] = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value, color: suit === '♥' || suit === '♦' ? 'red' : 'black' });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

export const SipsGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('splash');
  const [deck, setDeck] = useState<Card[]>([]);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [history, setHistory] = useState<Card[]>([]);
  const [kingsDrawn, setKingsDrawn] = useState(0);
  const [isKingsCup, setIsKingsCup] = useState(false);

  const startGame = useCallback(() => {
    setDeck(buildDeck());
    setHistory([]);
    setCurrentCard(null);
    setKingsDrawn(0);
    setIsKingsCup(false);
    setGameState('playing');
  }, []);

  const drawCard = useCallback(() => {
    if (deck.length === 0) {
      setGameState('finished');
      return;
    }
    const [card, ...rest] = deck;
    setDeck(rest);
    setCurrentCard(card);
    if (card.value === 'K') {
      const newCount = kingsDrawn + 1;
      setKingsDrawn(newCount);
      setIsKingsCup(newCount === 4);
    } else {
      setIsKingsCup(false);
    }
    setGameState('revealed');
  }, [deck, kingsDrawn]);

  const nextCard = useCallback(() => {
    if (currentCard) setHistory((h) => [currentCard, ...h].slice(0, 5));
    if (deck.length === 0) {
      setGameState('finished');
    } else {
      setGameState('playing');
    }
  }, [currentCard, deck.length]);

  const endGame = useCallback(() => {
    setGameState('splash');
  }, []);

  const bgGradient = 'linear-gradient(160deg, #4c1d95 0%, #7c3aed 30%, #db2777 70%, #f97316 100%)';

  // --- SPLASH ---
  if (gameState === 'splash') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 text-white" style={{ background: bgGradient }}>
        <div className="text-7xl mb-4">🥂</div>
        <h1 className="text-6xl font-black tracking-tight mb-2">Sips</h1>
        <p className="text-white/60 text-sm mb-16 tracking-wide">drinking game</p>
        <button
          onClick={startGame}
          className="flex items-center gap-3 px-10 py-4 rounded-full font-bold text-lg text-white transition-all hover:scale-105 active:scale-95 shadow-lg"
          style={{ background: 'linear-gradient(90deg, #f97316, #db2777)' }}
        >
          <span>▶</span> Começar o jogo!
        </button>
        <p className="mt-12 text-white/30 text-xs max-w-xs text-center">beba com responsabilidade. só para maiores de 18 anos.</p>
      </div>
    );
  }

  // --- FINISHED ---
  if (gameState === 'finished') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 text-white" style={{ background: bgGradient }}>
        <div className="text-6xl mb-6">🎉</div>
        <h2 className="text-3xl font-black mb-3">deck vazio!</h2>
        <p className="text-white/60 mb-12 text-center">todas as 52 cartas foram sacadas. espero que a festa tenha sido boa.</p>
        <button
          onClick={startGame}
          className="px-10 py-4 rounded-full font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-lg"
          style={{ background: 'linear-gradient(90deg, #f97316, #db2777)' }}
        >
          jogar de novo
        </button>
      </div>
    );
  }

  // --- REVEALED ---
  if (gameState === 'revealed' && currentCard) {
    const rule = rules[currentCard.value];
    const isRed = currentCard.color === 'red';

    return (
      <div className="min-h-screen flex flex-col" style={{ background: bgGradient }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-10 pb-4">
          <button onClick={endGame} className="flex items-center gap-1 text-white/70 hover:text-white text-sm transition-colors">
            <span>‹</span> Voltar
          </button>
          <span className="text-white/70 text-sm font-medium">Drinking Game</span>
          <div className="w-16" />
        </div>

        {/* Card */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-4">
          <div className="w-64 bg-white rounded-3xl shadow-2xl p-6 flex flex-col" style={{ minHeight: '360px' }}>
            {/* Top */}
            <div className={`flex flex-col items-start leading-none ${isRed ? 'text-red-500' : 'text-slate-800'}`}>
              <span className="text-3xl font-black">{currentCard.value}</span>
              <span className="text-xl">{suitEmoji[currentCard.suit]}</span>
            </div>

            {/* Center */}
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-4">
              {isKingsCup && (
                <div className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full mb-1">
                  4º REI — BEBA O COPO! 🏆
                </div>
              )}
              <div className="text-4xl">{rule.emoji}</div>
              <p className={`text-xl font-black ${isRed ? 'text-red-500' : 'text-slate-800'}`}>{rule.name}</p>
              <p className="text-slate-500 text-sm leading-relaxed">{rule.description}</p>
            </div>

            {/* Bottom (rotated) */}
            <div className={`flex flex-col items-end leading-none rotate-180 ${isRed ? 'text-red-500' : 'text-slate-800'}`}>
              <span className="text-3xl font-black">{currentCard.value}</span>
              <span className="text-xl">{suitEmoji[currentCard.suit]}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-10 flex flex-col gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-3">
            <span className="text-lg">🃏</span>
            <span className="text-white/80 text-sm">{deck.length} cartas restantes</span>
          </div>

          {history.length > 0 && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">🕐</span>
                <span className="text-white/60 text-xs">Cartas recentes</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {history.map((c, i) => (
                  <span key={i} className="bg-white/20 text-white text-xs px-2 py-1 rounded-lg">
                    {c.value}{suitEmoji[c.suit]}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={nextCard}
            className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all hover:scale-105 active:scale-95 shadow-lg"
            style={{ background: 'linear-gradient(90deg, #f97316, #db2777)' }}
          >
            {deck.length === 0 ? 'Finalizar Jogo' : 'Próxima carta'}
          </button>
        </div>
      </div>
    );
  }

  // --- PLAYING ---
  return (
    <div className="min-h-screen flex flex-col" style={{ background: bgGradient }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-10 pb-4">
        <button onClick={endGame} className="flex items-center gap-1 text-white/70 hover:text-white text-sm transition-colors">
          <span>‹</span> Voltar
        </button>
        <span className="text-white/70 text-sm font-medium">Drinking Game</span>
        <div className="w-16" />
      </div>

      {/* Draw area */}
      <div className="flex-1 flex items-center justify-center px-8">
        <button
          onClick={drawCard}
          className="w-full max-w-xs aspect-[2/3] rounded-3xl flex flex-col items-center justify-center gap-4 text-white transition-all hover:scale-105 active:scale-95"
          style={{ border: '2px dashed rgba(255,220,50,0.7)', background: 'rgba(255,255,255,0.05)' }}
        >
          <span className="text-5xl">🂠</span>
          <div className="text-center">
            <p className="font-bold text-xl">Clique para</p>
            <p className="font-bold text-xl">tirar uma carta</p>
          </div>
          <p className="text-white/40 text-sm">toque para sacar</p>
        </button>
      </div>

      {/* Footer */}
      <div className="px-6 pb-10 flex flex-col gap-3">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-lg">🃏</span>
          <span className="text-white/80 text-sm">{deck.length} cartas restantes</span>
        </div>

        {history.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🕐</span>
              <span className="text-white/60 text-xs">Cartas recentes</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {history.map((c, i) => (
                <span key={i} className="bg-white/20 text-white text-xs px-2 py-1 rounded-lg">
                  {c.value}{suitEmoji[c.suit]}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={endGame}
          className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all hover:opacity-80 active:scale-95 border border-white/20"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          Finalizar Jogo
        </button>
      </div>
    </div>
  );
};
