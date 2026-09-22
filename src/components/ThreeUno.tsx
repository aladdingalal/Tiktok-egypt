import React, { useState, useEffect, useMemo } from 'react';
import { UnoCard, UnoColor, UnoValue, SupportedLanguage } from '../types';
import { sound } from '../utils/sound';
import { translations } from '../utils/translations';
import confetti from 'canvas-confetti';
import { RotateCw, Trophy, Bell, AlertTriangle } from 'lucide-react';

interface ThreeUnoProps {
  lang: SupportedLanguage;
  playMode: 'pass_play' | 'vs_ai' | 'tiktok_live';
  onVictory?: (winner: string) => void;
  is3DView: boolean;
  activeTeamBonus?: string | null;
}

const COLORS: UnoColor[] = ['red', 'blue', 'green', 'yellow'];

const COLOR_MAP: Record<UnoColor, { bg: string; text: string; hex: string; ring: string }> = {
  red: { bg: 'bg-rose-600', text: 'text-rose-400', hex: '#e11d48', ring: 'ring-rose-400' },
  blue: { bg: 'bg-sky-600', text: 'text-sky-400', hex: '#0284c7', ring: 'ring-sky-400' },
  green: { bg: 'bg-emerald-600', text: 'text-emerald-400', hex: '#059669', ring: 'ring-emerald-400' },
  yellow: { bg: 'bg-amber-500', text: 'text-amber-300', hex: '#d97706', ring: 'ring-amber-300' },
  wild: { bg: 'bg-gradient-to-tr from-rose-500 via-yellow-400 to-sky-500', text: 'text-white', hex: '#8b5cf6', ring: 'ring-purple-400' },
};

function createUnoDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  let id = 0;

  COLORS.forEach((color) => {
    // One '0' per color
    deck.push({ id: `card-${id++}`, color, value: '0' });

    // Two '1'-'9' and actions
    const values: UnoValue[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];
    values.forEach((val) => {
      deck.push({ id: `card-${id++}`, color, value: val });
      deck.push({ id: `card-${id++}`, color, value: val });
    });
  });

  // 4 Wild and 4 Wild Draw 4
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `card-${id++}`, color: 'wild', value: 'wild' });
    deck.push({ id: `card-${id++}`, color: 'wild', value: 'wild4' });
  }

  return deck.sort(() => Math.random() - 0.5);
}

export const ThreeUno: React.FC<ThreeUnoProps> = ({
  lang,
  playMode,
  onVictory,
  is3DView,
  activeTeamBonus,
}) => {
  const t = translations[lang];

  const [deck, setDeck] = useState<UnoCard[]>([]);
  const [discardPile, setDiscardPile] = useState<UnoCard[]>([]);
  const [playerHand, setPlayerHand] = useState<UnoCard[]>([]);
  const [opponentHand, setOpponentHand] = useState<UnoCard[]>([]);
  const [currentTurn, setCurrentTurn] = useState<'player' | 'opponent'>('player');
  const [activeColor, setActiveColor] = useState<UnoColor>('red');
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [pendingWildCard, setPendingWildCard] = useState<UnoCard | null>(null);
  const [shoutedUno, setShoutedUno] = useState<{ player: boolean; opponent: boolean }>({ player: false, opponent: false });
  const [winner, setWinner] = useState<string | null>(null);
  const [gameMessage, setGameMessage] = useState<string>('');

  // Start new Uno Game
  const startUnoGame = () => {
    const fullDeck = createUnoDeck();
    const p1 = fullDeck.slice(0, 7);
    const p2 = fullDeck.slice(7, 14);

    // Initial discard card (find non-wild if possible)
    let firstCardIndex = 14;
    while (firstCardIndex < fullDeck.length && fullDeck[firstCardIndex].color === 'wild') {
      firstCardIndex++;
    }
    const firstDiscard = fullDeck[firstCardIndex] || fullDeck[14];
    const remainingDeck = fullDeck.filter((_, idx) => idx !== firstCardIndex && idx >= 14);

    setPlayerHand(p1);
    setOpponentHand(p2);
    setDeck(remainingDeck);
    setDiscardPile([firstDiscard]);
    setActiveColor(firstDiscard.color === 'wild' ? 'red' : firstDiscard.color);
    setCurrentTurn('player');
    setWinner(null);
    setShowColorPicker(false);
    setPendingWildCard(null);
    setShoutedUno({ player: false, opponent: false });
    setGameMessage('بدأت اللعبة! طابق اللون أو الرقم.');
  };

  useEffect(() => {
    startUnoGame();
  }, []);

  const topDiscard = discardPile[discardPile.length - 1];

  // Check if a card is valid to play
  const isCardPlayable = (card: UnoCard): boolean => {
    if (!topDiscard) return false;
    if (card.color === 'wild') return true;
    if (card.color === activeColor) return true;
    if (card.value === topDiscard.value) return true;
    return false;
  };

  // Play card
  const handlePlayCard = (card: UnoCard) => {
    if (currentTurn !== 'player' || !isCardPlayable(card) || winner) return;

    sound.playCardSwish();

    if (card.color === 'wild') {
      setPendingWildCard(card);
      setShowColorPicker(true);
      return;
    }

    applyCardPlay(card, card.color);
  };

  // Apply card effect and update turn
  const applyCardPlay = (card: UnoCard, chosenColor: UnoColor) => {
    const newHand = playerHand.filter((c) => c.id !== card.id);
    setPlayerHand(newHand);
    setDiscardPile((prev) => [...prev, card]);
    setActiveColor(chosenColor);
    setShowColorPicker(false);
    setPendingWildCard(null);

    // Check Win
    if (newHand.length === 0) {
      setWinner('player');
      sound.playFanfare();
      confetti({ particleCount: 150 });
      onVictory?.('player');
      return;
    }

    // Uno shout check
    if (newHand.length === 1 && !shoutedUno.player) {
      sound.playUnoShout();
      setGameMessage('⚠️ بطاقة واحدة متبقية! تذكر أن تصيح أونووو!');
    }

    // Action cards logic
    let nextTurnTarget: 'player' | 'opponent' = 'opponent';

    if (card.value === 'skip') {
      setGameMessage('🚫 تم منع دور الخصم! العب مجدداً!');
      nextTurnTarget = 'player';
    } else if (card.value === 'reverse') {
      setGameMessage('🔄 تم عكس الاتجاه! دورك مجدداً!');
      nextTurnTarget = 'player';
    } else if (card.value === 'draw2') {
      setGameMessage('📥 الخصم يسحب بطاقتين (+2)!');
      // Draw 2 for opponent
      drawCardsFor('opponent', 2);
      nextTurnTarget = 'player'; // Skip opponent
    } else if (card.value === 'wild4') {
      setGameMessage('💣 بطاقة +4 وتغيير لون! الخصم يسحب 4 بطاقات!');
      drawCardsFor('opponent', 4);
      nextTurnTarget = 'player';
    }

    setCurrentTurn(nextTurnTarget);
  };

  // Helper to draw N cards
  const drawCardsFor = (target: 'player' | 'opponent', count: number) => {
    sound.playCardSwish();
    setDeck((prevDeck) => {
      let currentD = [...prevDeck];
      if (currentD.length < count) {
        // Reshuffle discard pile
        currentD = [...currentD, ...createUnoDeck()];
      }
      const drawn = currentD.slice(0, count);
      const remaining = currentD.slice(count);

      if (target === 'player') {
        setPlayerHand((prev) => [...prev, ...drawn]);
      } else {
        setOpponentHand((prev) => [...prev, ...drawn]);
      }
      return remaining;
    });
  };

  // Player manual draw from deck
  const handlePlayerDraw = () => {
    if (currentTurn !== 'player' || winner) return;
    drawCardsFor('player', 1);
    setGameMessage('سحبت بطاقة من المجموعة 🃏');
    // Switch turn to opponent after drawing
    setTimeout(() => {
      setCurrentTurn('opponent');
    }, 500);
  };

  // Shout UNO button
  const handleShoutUno = () => {
    if (playerHand.length <= 2) {
      sound.playUnoShout();
      setShoutedUno((prev) => ({ ...prev, player: true }));
      setGameMessage('🔔 صرخت: أونوووو (UNO)!');
      confetti({ particleCount: 50, spread: 60 });
    }
  };

  // AI Opponent Turn
  useEffect(() => {
    if (currentTurn !== 'opponent' || winner) return;

    const timer = setTimeout(() => {
      // Find playable card in opponent hand
      const playable = opponentHand.find(isCardPlayable);

      if (playable) {
        sound.playCardSwish();
        const newOppHand = opponentHand.filter((c) => c.id !== playable.id);
        setOpponentHand(newOppHand);
        setDiscardPile((prev) => [...prev, playable]);

        let chosenCol: UnoColor = playable.color;
        if (playable.color === 'wild') {
          // AI picks color it has the most of
          const counts: Record<UnoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0, wild: 0 };
          newOppHand.forEach((c) => {
            if (c.color !== 'wild') counts[c.color]++;
          });
          chosenCol = (Object.keys(counts) as UnoColor[]).filter(c => c !== 'wild').sort((a, b) => counts[b] - counts[a])[0] || 'red';
        }

        setActiveColor(chosenCol);

        if (newOppHand.length === 0) {
          setWinner('opponent');
          return;
        }

        if (newOppHand.length === 1) {
          sound.playUnoShout();
          setGameMessage('🔔 الخصم صرخ: أونووو!');
        }

        let nextT: 'player' | 'opponent' = 'player';
        if (playable.value === 'skip') {
          setGameMessage('🚫 الخصم لعب منع! دور الخصم مجدداً');
          nextT = 'opponent';
        } else if (playable.value === 'reverse') {
          setGameMessage('🔄 الخصم عكس الاتجاه!');
          nextT = 'opponent';
        } else if (playable.value === 'draw2') {
          setGameMessage('📥 سحبت بطاقتين بسبب +2 من الخصم!');
          drawCardsFor('player', 2);
          nextT = 'opponent';
        } else if (playable.value === 'wild4') {
          setGameMessage('💣 الخصم لعب +4! سحبت 4 بطاقات!');
          drawCardsFor('player', 4);
          nextT = 'opponent';
        }

        setCurrentTurn(nextT);
      } else {
        // AI draws from deck
        drawCardsFor('opponent', 1);
        setGameMessage('الخصم سحب بطاقة!');
        setCurrentTurn('player');
      }
    }, 1100);

    return () => clearTimeout(timer);
  }, [currentTurn, opponentHand, topDiscard, activeColor, winner]);

  // Card Value label renderer
  const renderCardValue = (val: UnoValue) => {
    switch (val) {
      case 'skip':
        return '🚫';
      case 'reverse':
        return '🔄';
      case 'draw2':
        return '+2';
      case 'wild':
        return '🌈';
      case 'wild4':
        return '+4';
      default:
        return val;
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-2 select-none overflow-hidden">
      {/* Top Header Status */}
      <div className="w-full flex items-center justify-between bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-700/60 shadow-lg z-10">
        <div className="flex items-center gap-2">
          <div
            className={`w-3.5 h-3.5 rounded-full ${
              currentTurn === 'player' ? 'bg-amber-400 ring-2 ring-amber-300 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="text-xs sm:text-sm font-bold text-slate-200">
            {currentTurn === 'player' ? t.yourTurn : t.aiTurn}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <span className="bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
            🃏 كروت الخصم: {opponentHand.length}
          </span>
          <span className="bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
            📦 المتبقي: {deck.length}
          </span>
        </div>

        <button
          onClick={startUnoGame}
          id="btn-uno-restart"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title={t.playAgain}
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Opponent's Face-Down Cards Fan */}
      <div className="flex items-center justify-center gap-1 my-1">
        {opponentHand.map((_, idx) => (
          <div
            key={idx}
            className="w-6 h-10 sm:w-8 sm:h-12 rounded-lg bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 border border-rose-500/50 shadow-md transform -rotate-1"
          >
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[10px] font-black text-rose-500">UNO</span>
            </div>
          </div>
        ))}
      </div>

      {/* 3D Play Table / Discard & Deck Pile */}
      <div
        className={`relative w-full max-w-[420px] aspect-[4/3] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-3xl p-4 border-4 border-slate-800 shadow-[0_20px_45px_rgba(0,0,0,0.85)] flex items-center justify-center gap-6 my-auto transition-transform duration-500 ${
          is3DView ? 'rotate-x-[24deg] scale-[0.94] shadow-2xl' : ''
        }`}
        style={{ perspective: '1100px', transformStyle: 'preserve-3d' }}
      >
        {/* Draw Deck (3D stacked pile) */}
        <button
          onClick={handlePlayerDraw}
          id="btn-uno-draw-deck"
          disabled={currentTurn !== 'player' || !!winner}
          className={`relative group w-20 h-28 sm:w-24 sm:h-34 rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-black border-2 border-slate-600 shadow-2xl flex flex-col items-center justify-center p-2 transition-all transform active:scale-95 ${
            currentTurn === 'player' ? 'hover:-translate-y-2 ring-2 ring-amber-400/80 cursor-pointer' : 'cursor-not-allowed opacity-80'
          }`}
          style={{ transform: 'rotateY(10deg) translateZ(10px)' }}
        >
          <div className="w-full h-full rounded-xl border border-slate-700/80 bg-rose-600/20 flex flex-col items-center justify-center">
            <span className="text-xl sm:text-2xl font-black text-amber-400 tracking-wider">
              UNO
            </span>
            <span className="text-[10px] font-bold text-slate-300 mt-1">
              اسحب 🃏
            </span>
          </div>
        </button>

        {/* Center Discard Pile (Top 3D Card) */}
        {topDiscard && (
          <div
            className={`relative w-20 h-28 sm:w-24 sm:h-34 rounded-2xl ${
              COLOR_MAP[activeColor].bg
            } border-4 border-white shadow-2xl flex flex-col items-center justify-between p-2 transform rotate-2 transition-transform duration-300`}
            style={{ transform: 'rotateY(-10deg) translateZ(20px)' }}
          >
            {/* Top mini value */}
            <span className="self-start text-xs font-black text-white">
              {renderCardValue(topDiscard.value)}
            </span>

            {/* Center Ellipse with big value */}
            <div className="w-12 h-14 sm:w-16 sm:h-18 rounded-[50%] bg-white/95 shadow-inner flex items-center justify-center transform -rotate-12">
              <span
                className={`text-xl sm:text-2xl font-black ${
                  COLOR_MAP[activeColor].text
                }`}
              >
                {renderCardValue(topDiscard.value)}
              </span>
            </div>

            {/* Bottom mini value */}
            <span className="self-end text-xs font-black text-white transform rotate-180">
              {renderCardValue(topDiscard.value)}
            </span>
          </div>
        )}

        {/* Active Color Ring Indicator */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-900/90 px-3 py-1 rounded-full border border-slate-700">
          <div className={`w-3.5 h-3.5 rounded-full ${COLOR_MAP[activeColor].bg}`} />
          <span className="text-[11px] font-bold text-slate-200">
            اللون: {t[COLOR_MAP[activeColor].text.split('-')[1] as keyof typeof t] || activeColor}
          </span>
        </div>
      </div>

      {/* Wild Card Color Chooser Modal */}
      {showColorPicker && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4 z-40 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 p-5 rounded-3xl flex flex-col items-center gap-4 shadow-2xl max-w-xs w-full">
            <h3 className="text-base font-black text-amber-300">
              {t.wildSelectColor}
            </h3>
            <div className="grid grid-cols-2 gap-3 w-full">
              {COLORS.map((col) => (
                <button
                  key={col}
                  id={`btn-wild-color-${col}`}
                  onClick={() => pendingWildCard && applyCardPlay(pendingWildCard, col)}
                  className={`py-3 rounded-2xl ${COLOR_MAP[col].bg} text-white font-black text-sm shadow-lg hover:brightness-110 active:scale-95 cursor-pointer ring-2 ring-white/30`}
                >
                  {t[col as keyof typeof t]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Player's 3D Hand of Cards */}
      <div className="w-full flex flex-col items-center gap-2 z-20">
        <div className="w-full flex items-center justify-center gap-1 sm:gap-2 overflow-x-auto py-3 px-2 no-scrollbar">
          {playerHand.map((card, idx) => {
            const playable = currentTurn === 'player' && isCardPlayable(card);
            return (
              <button
                key={card.id}
                id={`uno-card-${card.id}`}
                onClick={() => handlePlayCard(card)}
                disabled={currentTurn !== 'player' || !playable}
                className={`relative flex-shrink-0 w-12 h-18 sm:w-14 sm:h-22 rounded-xl ${
                  COLOR_MAP[card.color].bg
                } border-2 border-white shadow-xl flex flex-col items-center justify-between p-1 transition-all duration-200 transform ${
                  playable
                    ? 'hover:-translate-y-4 ring-2 ring-white cursor-pointer shadow-amber-400/40'
                    : 'opacity-60 cursor-not-allowed'
                }`}
                style={{
                  transform: `rotate(${(idx - playerHand.length / 2) * 3}deg)`,
                }}
              >
                <span className="self-start text-[10px] font-black text-white">
                  {renderCardValue(card.value)}
                </span>

                <div className="w-7 h-9 sm:w-9 sm:h-11 rounded-[50%] bg-white/90 shadow-inner flex items-center justify-center transform -rotate-12">
                  <span
                    className={`text-xs sm:text-sm font-black ${
                      COLOR_MAP[card.color].text
                    }`}
                  >
                    {renderCardValue(card.value)}
                  </span>
                </div>

                <span className="self-end text-[10px] font-black text-white transform rotate-180">
                  {renderCardValue(card.value)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action Controls: Uno Shout Button + Feedback Message */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleShoutUno}
            id="btn-uno-shout"
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-black text-sm shadow-xl hover:brightness-110 active:scale-95 cursor-pointer ring-2 ring-amber-300 animate-pulse"
          >
            <Bell className="w-4 h-4" />
            <span>{t.unoShout}</span>
          </button>
        </div>

        {gameMessage && (
          <span className="text-[11px] font-semibold text-amber-300 bg-slate-900/80 px-3 py-0.5 rounded-full border border-amber-500/30">
            {gameMessage}
          </span>
        )}
      </div>

      {/* Winner Modal */}
      {winner && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-50 animate-fade-in">
          <Trophy className="w-16 h-16 text-amber-400 animate-bounce mb-3" />
          <h2 className="text-2xl font-black text-amber-300 mb-1">
            {winner === 'player' ? t.winner : 'فاز المنافس!'}
          </h2>
          <p className="text-sm text-slate-300 mb-4 font-bold">
            {winner === 'player' ? 'أنهيت جميع كروتك وفزت بالجولة! 🃏' : 'حظ أوفر في الجولة القادمة!'}
          </p>
          <button
            onClick={startUnoGame}
            id="btn-uno-play-again"
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-black text-sm shadow-xl hover:brightness-110 active:scale-95 cursor-pointer"
          >
            {t.playAgain}
          </button>
        </div>
      )}
    </div>
  );
};
