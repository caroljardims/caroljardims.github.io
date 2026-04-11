// src/components/SipsGame.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';

type Suit = '♠' | '♣' | '♥' | '♦';
type Value = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
type GameState = 'splash' | 'playing' | 'water' | 'revealed' | 'finished';

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
  A:    { name: 'Todos bebem',          emoji: '🍸',  description: 'Todo mundo bebe! Quem puxou começa, e todos continuam bebendo até a pessoa à sua direita parar.' },
  '2':  { name: 'Você',                 emoji: '🫵',  description: 'Escolha um parceiro para beber um gole com você.' },
  '3':  { name: 'Três mosqueteiros',    emoji: '🐭',  description: 'Escolha dois parceiros para beberem um gole com você.' },
  '4':  { name: 'Mestre das Perguntas', emoji: '🔮', description: 'Quem puxou vira o Mestre das Perguntas — qualquer pessoa que responder às suas perguntas deve beber. Dura até o próximo 4 ser puxado.' },
  '5':  { name: 'Regra Temporária',     emoji: '⏳',  description: 'Cria uma regra nova que todos devem seguir até o próximo 5 ser puxado.' },
  '6':  { name: 'Céu',                  emoji: '🪽',  description: 'A qualquer momento, aponte pro céu! O último a apontar bebe 2 goles.' },
  '7':  { name: 'Amuleto da Sorte',     emoji: '🍀',  description: 'Escolhe um parceiro de bebida — quando você bebe, ele bebe. Quando ele bebe, você bebe.' },
  '8':  { name: 'Rima',                 emoji: '🎵',  description: 'Fala uma palavra, todos precisam rimar. O primeiro a errar bebe 2 goles.' },
  '9':  { name: 'Categorias',           emoji: '🗂️', description: 'Escolhe uma categoria, todos citam itens. O primeiro a falhar bebe 3 goles.' },
  '10': { name: 'Regra Permanente',     emoji: '📜',  description: 'Cria uma regra nova que todos devem seguir até o fim do jogo.' },
  J:    { name: 'Rapazes',              emoji: '🙋‍♂️', description: 'Todos os homens bebem um gole.' },
  Q:    { name: 'Meninas',              emoji: '🙋‍♀️', description: 'Todas as mulheres bebem um gole.' },
  K:    { name: 'Cálice do Rei',        emoji: '👑',  description: 'Coloca um pouco da sua bebida no Cálice do Rei. Quem puxar o 4º Rei bebe o copo inteiro!' },
};

const suitEmoji: Record<Suit, string> = {
  '♥': '❤️', '♦': '♦️', '♠': '♠️', '♣': '♣️',
};

function buildDeck(): Card[] {
  const suits: Suit[] = ['♥', '♦', '♠', '♣'];
  const values: Value[] = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const deck: Card[] = [];
  for (const suit of suits)
    for (const value of values)
      deck.push({ suit, value, color: suit === '♥' || suit === '♦' ? 'red' : 'black' });
  return deck.sort(() => Math.random() - 0.5);
}

const bg = 'linear-gradient(160deg, #4c1d95 0%, #7c3aed 30%, #db2777 70%, #f97316 100%)';
const btnGrad = 'linear-gradient(90deg, #f97316, #db2777)';

const s = {
  page: {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    background: bg,
    fontFamily: "'Inter', system-ui, sans-serif",
    color: '#fff',
    boxSizing: 'border-box' as const,
    overflow: 'hidden',
    position: 'fixed' as const,
    inset: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '40px 24px 16px',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    width: '64px',
  },
  title: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
    fontWeight: 500,
  },
  center: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 32px',
  },
  footer: {
    padding: '0 24px 40px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  pill: {
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(8px)',
    borderRadius: '16px',
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    color: 'rgba(255,255,255,0.8)',
  },
  pillSmall: {
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(8px)',
    borderRadius: '16px',
    padding: '12px 20px',
  },
  chip: {
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '8px',
    padding: '4px 8px',
    fontSize: '12px',
    color: '#fff',
    display: 'inline-block',
    margin: '2px',
  },
  primaryBtn: {
    width: '100%',
    padding: '16px',
    borderRadius: '16px',
    border: 'none',
    background: btnGrad,
    color: '#fff',
    fontWeight: 700,
    fontSize: '16px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  ghostBtn: {
    width: '100%',
    padding: '16px',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontWeight: 700,
    fontSize: '16px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  card: {
    background: '#fff',
    borderRadius: '24px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    width: '256px',
    minHeight: '360px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
  },
  drawArea: {
    width: '100%',
    maxWidth: '280px',
    aspectRatio: '2/3',
    borderRadius: '24px',
    border: '2px dashed rgba(255,220,50,0.7)',
    background: 'rgba(255,255,255,0.05)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    cursor: 'pointer',
    color: '#fff',
    fontFamily: 'inherit',
  },
};

export const SipsGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('splash');
  const [deck, setDeck] = useState<Card[]>([]);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [history, setHistory] = useState<Card[]>([]);
  const [kingsDrawn, setKingsDrawn] = useState(0);
  const [isKingsCup, setIsKingsCup] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const [flyDir, setFlyDir] = useState({ x: 0, y: 0 });
  const [isEntering, setIsEntering] = useState(false);
  const [pendingCard, setPendingCard] = useState<Card | null>(null);
  const cardsSinceWater = useRef(0);
  const drawNextRef = useRef<() => void>(() => {});

  const startGame = useCallback(() => {
    setDeck(buildDeck());
    setHistory([]);
    setCurrentCard(null);
    setKingsDrawn(0);
    setIsKingsCup(false);
    cardsSinceWater.current = 0;
    setGameState('playing');
  }, []);

  const revealCard = useCallback((card: Card, rest: Card[], kings: number) => {
    setCurrentCard(card);
    if (card.value === 'K') {
      const n = kings + 1;
      setKingsDrawn(n);
      setIsKingsCup(n === 4);
    } else {
      setIsKingsCup(false);
    }
    setDragOffset({ x: 0, y: 0 });
    setIsEntering(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setIsEntering(false)));
    setGameState('revealed');
  }, []);

  const drawCard = useCallback(() => {
    if (deck.length === 0) { setGameState('finished'); return; }
    const [card, ...rest] = deck;
    setDeck(rest);
    cardsSinceWater.current += 1;
    const shouldShowWater = rest.length > 0 && cardsSinceWater.current >= 5 && Math.random() < 0.25;
    if (shouldShowWater) {
      cardsSinceWater.current = 0;
      setPendingCard(card);
      setIsEntering(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsEntering(false)));
      setGameState('water');
      return;
    }
    revealCard(card, rest, kingsDrawn);
  }, [deck, kingsDrawn, revealCard]);

  const dismissWater = useCallback(() => {
    if (!pendingCard) return;
    setPendingCard(null);
    revealCard(pendingCard, deck, kingsDrawn);
  }, [pendingCard, deck, kingsDrawn, revealCard]);

  const nextCard = useCallback(() => {
    if (currentCard) setHistory((h) => [currentCard, ...h].slice(0, 5));
    setGameState(deck.length === 0 ? 'finished' : 'playing');
  }, [currentCard, deck.length]);

  const drawNext = useCallback(() => {
    if (currentCard) setHistory((h) => [currentCard, ...h].slice(0, 5));
    if (deck.length === 0) { setGameState('finished'); return; }
    const [card, ...rest] = deck;
    setDeck(rest);
    cardsSinceWater.current += 1;
    const shouldShowWaterNext = rest.length > 0 && cardsSinceWater.current >= 5 && Math.random() < 0.25;
    if (shouldShowWaterNext) {
      cardsSinceWater.current = 0;
      setPendingCard(card);
      setIsEntering(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsEntering(false)));
      setGameState('water');
      return;
    }
    revealCard(card, rest, kingsDrawn);
  }, [currentCard, deck, kingsDrawn, revealCard]);

  const endGame = useCallback(() => setGameState('splash'), []);

  // keep ref always up to date
  drawNextRef.current = drawNext;

  const flyCard = useCallback((dx: number, dy: number) => {
    const dist = Math.sqrt(dx * dx + dy * dy);
    setFlyDir(dist < 10 ? { x: 0, y: -1 } : { x: dx / dist, y: dy / dist });
    setIsDragging(false);
    setIsFlying(true);
  }, []);

  useEffect(() => {
    if (!isFlying) return;
    const t = setTimeout(() => {
      setIsFlying(false);
      setDragOffset({ x: 0, y: 0 });
      drawNextRef.current();
    }, 350);
    return () => clearTimeout(t);
  }, [isFlying]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || gameState !== 'revealed') return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY };
      setIsDragging(true);
      setDragOffset({ x: 0, y: 0 });
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!touchStart.current) return;
      const t = e.touches[0];
      setDragOffset({ x: t.clientX - touchStart.current.x, y: t.clientY - touchStart.current.y });
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (!touchStart.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      touchStart.current = null;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 10 || dist > 40) flyCard(dx, dy);
      else { setIsDragging(false); setDragOffset({ x: 0, y: 0 }); }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [gameState, flyCard]);

  // SPLASH
  if (gameState === 'splash') return (
    <div style={{ ...s.page, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '32px' }}>
      <div style={{ fontSize: '72px', marginBottom: '16px' }}>🥂</div>
      <h1 style={{ fontSize: '64px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-2px' }}>Sips</h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '64px', letterSpacing: '2px' }}>drinking game</p>
      <button onClick={startGame} style={{ ...s.primaryBtn, width: 'auto', padding: '16px 40px', borderRadius: '9999px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span>▶</span> Começar o jogo!
      </button>
      <p style={{ marginTop: '48px', color: 'rgba(255,255,255,0.25)', fontSize: '12px', maxWidth: '280px' }}>
        beba com responsabilidade. só para maiores de 18 anos.
      </p>
    </div>
  );

  // FINISHED
  if (gameState === 'finished') return (
    <div style={{ ...s.page, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '32px' }}>
      <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎉</div>
      <h2 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '12px' }}>deck vazio!</h2>
      <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '48px', maxWidth: '280px' }}>todas as 52 cartas foram sacadas. espero que a festa tenha sido boa.</p>
      <button onClick={startGame} style={{ ...s.primaryBtn, width: 'auto', padding: '16px 40px', borderRadius: '9999px' }}>
        jogar de novo
      </button>
    </div>
  );

  // WATER CARD
  if (gameState === 'water') return (
    <div style={s.page}>
      <div style={s.center}>
        <div
          style={{
            ...s.card,
            cursor: 'grab',
            userSelect: 'none',
            background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)',
            transform: isEntering ? 'scale(0.85) translateY(40px)' : 'scale(1) translateY(0)',
            opacity: isEntering ? 0 : 1,
            transition: isEntering ? 'none' : 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease-out',
          }}
          onClick={dismissWater}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '12px' }}>
            <div style={{ fontSize: '56px' }}>💧</div>
            <p style={{ fontSize: '22px', fontWeight: 900, color: '#0369a1' }}>hora de hidratar!</p>
            <p style={{ fontSize: '13px', color: '#0284c7', lineHeight: 1.6 }}>beba um copo d'água antes de continuar. seu eu do amanhã agradece.</p>
            <p style={{ fontSize: '12px', color: '#7dd3fc', marginTop: '8px' }}>toque para continuar</p>
          </div>
        </div>
      </div>
      <div style={s.footer}>
        <div style={s.pill}>
          <span>🃏</span>
          <span>{deck.length} cartas restantes</span>
        </div>
      </div>
    </div>
  );

  // REVEALED
  if (gameState === 'revealed' && currentCard) {
    const rule = rules[currentCard.value];
    const isRed = currentCard.color === 'red';
    const cardColor = isRed ? '#ef4444' : '#1e293b';

    // Mouse events (desktop only — mobile handled via native listeners in useEffect)
    const handleMouseDown = (e: React.MouseEvent) => {
      touchStart.current = { x: e.clientX, y: e.clientY };
      setIsDragging(true);
      setDragOffset({ x: 0, y: 0 });
    };
    const handleMouseMove = (e: React.MouseEvent) => {
      if (!touchStart.current) return;
      setDragOffset({ x: e.clientX - touchStart.current.x, y: e.clientY - touchStart.current.y });
    };
    const handleMouseUp = (e: React.MouseEvent) => {
      if (!touchStart.current) return;
      const dx = e.clientX - touchStart.current.x;
      const dy = e.clientY - touchStart.current.y;
      touchStart.current = null;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 10 || dist > 40) flyCard(dx, dy);
      else { setIsDragging(false); setDragOffset({ x: 0, y: 0 }); }
    };

    return (
      <div style={s.page}>
        <div style={s.center}>
          <div
            style={{
              ...s.card,
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              touchAction: 'none',
              WebkitUserSelect: 'none',
              transform: isEntering
                ? 'scale(0.85) translateY(40px)'
                : isFlying
                ? `translate(${flyDir.x * 900}px, ${flyDir.y * 900}px) rotate(${flyDir.x * 25}deg)`
                : `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.05}deg)`,
              opacity: isEntering ? 0 : 1,
              transition: isEntering
                ? 'none'
                : isFlying
                ? 'transform 0.35s ease-in, opacity 0.35s ease-in'
                : isDragging
                ? 'none'
                : 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease-out',
            }}
            ref={cardRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Top corner */}
            <div style={{ color: cardColor, lineHeight: 1 }}>
              <div style={{ fontSize: '28px', fontWeight: 900 }}>{currentCard.value}</div>
              <div style={{ fontSize: '20px' }}>{suitEmoji[currentCard.suit]}</div>
            </div>

            {/* Center content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '10px', padding: '16px 0' }}>
              {isKingsCup && (
                <div style={{ background: '#fee2e2', color: '#dc2626', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '9999px', marginBottom: '4px' }}>
                  4º REI — BEBA O COPO! 🏆
                </div>
              )}
              <div style={{ fontSize: '40px' }}>{rule.emoji}</div>
              <p style={{ fontSize: '20px', fontWeight: 900, color: cardColor }}>{rule.name}</p>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>{rule.description}</p>
            </div>

            {/* Bottom corner (rotated) */}
            <div style={{ color: cardColor, lineHeight: 1, transform: 'rotate(180deg)', alignSelf: 'flex-end' }}>
              <div style={{ fontSize: '28px', fontWeight: 900 }}>{currentCard.value}</div>
              <div style={{ fontSize: '20px' }}>{suitEmoji[currentCard.suit]}</div>
            </div>
          </div>
        </div>

        <div style={s.footer}>
          <div style={s.pill}>
            <span>🃏</span>
            <span>{deck.length} cartas restantes</span>
          </div>

          {history.length > 0 && (
            <div style={s.pillSmall}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px' }}>🕐</span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Cartas recentes</span>
              </div>
              <div>{history.map((c, i) => <span key={i} style={s.chip}>{c.value}{suitEmoji[c.suit]}</span>)}</div>
            </div>
          )}

          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '13px', margin: '4px 0 0' }}>
            toque ou arraste a carta para continuar
          </p>
          {deck.length === 0 && (
            <button onClick={nextCard} style={s.primaryBtn}>Finalizar Jogo</button>
          )}
        </div>
      </div>
    );
  }

  // PLAYING
  return (
    <div style={s.page}>
      <div style={s.center}>
        <button onClick={drawCard} style={s.drawArea}>
          <span style={{ fontSize: '48px' }}>🂠</span>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: '20px', margin: 0 }}>Clique para</p>
            <p style={{ fontWeight: 700, fontSize: '20px', margin: 0 }}>tirar uma carta</p>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>toque para sacar</p>
        </button>
      </div>

      <div style={s.footer}>
        <div style={s.pill}>
          <span>🃏</span>
          <span>{deck.length} cartas restantes</span>
        </div>

        {history.length > 0 && (
          <div style={s.pillSmall}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px' }}>🕐</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Cartas recentes</span>
            </div>
            <div>{history.map((c, i) => <span key={i} style={s.chip}>{c.value}{suitEmoji[c.suit]}</span>)}</div>
          </div>
        )}

        <button onClick={endGame} style={s.ghostBtn}>Finalizar Jogo</button>
      </div>
    </div>
  );
};
