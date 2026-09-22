import React, { useState, useEffect } from 'react';
import { UnoCard, UnoColor, UnoValue, SupportedLanguage } from '../types';
import { sound } from '../utils/sound';
import { translations } from '../utils/translations';
import confetti from 'canvas-confetti';
import { RotateCw, Trophy, Bell, AlertTriangle, Flame, Sparkles } from 'lucide-react';

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
    deck.push({ id: `card-${id++}`, color, value: '0' });

    const values: UnoValue[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];
    values.forEach((val) => {
      deck.push({ id: `card-${id++}`, color, value: val });
      deck.push({ id: `card-${id++}`, color, value: val });
    });
  });

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
  const [shoutedUno, setShoutedUno] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [slamBanner, setSlamBanner] = useState<string | null>(null);
  const [screenShake, setScreenShake] = useState<boolean>(false);

  // Start new Uno Game
  const startUnoGame = () => {
    const fullDeck = createUnoDeck();
    const p1 = fullDeck.slice(0, 7);
    const p2 = fullDeck.slice(7, 14);

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
    setShoutedUno(false);
    setSlamBanner(null);
  };

  useEffect(() => {
    startUnoGame();
  }, []);

  const topDiscard = discardPile[discardPile.length - 1];

  const triggerSlam = (msg: string) => {
    sound.playDoubleSlam();
    setScreenShake(true);
    setSlamBanner(msg);
    setTimeout(() => setScreenShake(false), 350);
    setTimeout(() => setSlamBanner(null), 2500);
  };

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
      sound.playMagicSwoosh();
      setPendingWildCard(card);
      setShowColorPicker(true);
      return;
    }

    executePlayerCardPlay(card, card.color);
  };

  const handleSelectWildColor = (chosenColor: UnoColor) => {
    if (!pendingWildCard) return;
    setShowColorPicker(false);
    executePlayerCardPlay(pendingWildCard, chosenColor);
    setPendingWildCard(null);
  };

  const executePlayerCardPlay = (card: UnoCard, resolvedColor: UnoColor) => {
    const newHand = playerHand.filter((c) => c.id !== card.id);
    const newDiscard = [...discardPile, card];

    setPlayerHand(newHand);
    setDiscardPile(newDiscard);
    setActiveColor(resolvedColor);

    // Uno alert check
    if (newHand.length === 1 && !shoutedUno) {
      sound.playUnoShout();
      triggerSlam('باقي معك ورقة واحدة! اضغط صرخة أونووو! 🃏');
    }

    // Win check
    if (newHand.length === 0) {
      setWinner('player');
      sound.playFanfare();
      confetti({ particleCount: 200, spread: 80 });
      onVictory?.('player');
      return;
    }

    // Action cards logic
    let nextTurn: 'player' | 'opponent' = 'opponent';

    if (card.value === 'skip') {
      triggerSlam('تجاوزت دور الخصم! العب مجدداً! 🚫');
      nextTurn = 'player';
    } else if (card.value === 'reverse') {
      triggerSlam('عكست الاتجاه! 🔄');
      nextTurn = 'player';
    } else if (card.value === 'draw2') {
      triggerSlam('سحب الخصم ورقتين! +2 💥');
      applyDrawPenalty('opponent', 2);
      nextTurn = 'player';
    } else if (card.value === 'wild4') {
      triggerSlam('سحب الخصم 4 ورقات وغيرت اللون! +4 🚀');
      applyDrawPenalty('opponent', 4);
      nextTurn = 'player';
    }

    setCurrentTurn(nextTurn);
  };

  const applyDrawPenalty = (target: 'player' | 'opponent', count: number) => {
    let currentDeck = [...deck];
    if (currentDeck.length < count) {
      currentDeck = [...currentDeck, ...createUnoDeck()];
    }

    const drawn = currentDeck.slice(0, count);
    const remDeck = currentDeck.slice(count);

    setDeck(remDeck);
    if (target === 'player') {
      setPlayerHand((prev) => [...prev, ...drawn]);
    } else {
      setOpponentHand((prev) => [...prev, ...drawn]);
    }
  };

  // Draw card from deck
  const handleDrawCard = () => {
    if (currentTurn !== 'player' || winner) return;

    sound.playCardSwish();
    let currentDeck = [...deck];
    if (currentDeck.length === 0) {
      currentDeck = createUnoDeck();
    }

    const drawn = currentDeck[0];
    const rem = currentDeck.slice(1);

    setDeck(rem);
    setPlayerHand([...playerHand, drawn]);
    setCurrentTurn('opponent');
  };

  // AI Opponent Move
  useEffect(() => {
    if (currentTurn !== 'opponent' || winner) return;

    const timer = setTimeout(() => {
      const playableCard = opponentHand.find((c) => isCardPlayable(c));

      if (playableCard) {
        sound.playCardSwish();

        let resolvedColor = playableCard.color;
        if (playableCard.color === 'wild') {
          sound.playMagicSwoosh();
          // Pick most frequent color in AI hand
          const counts: Record<UnoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0, wild: 0 };
          opponentHand.forEach((c) => counts[c.color]++);
          resolvedColor = (['red', 'blue', 'green', 'yellow'] as UnoColor[]).sort(
            (a, b) => counts[b] - counts[a]
          )[0];
        }

        const newHand = opponentHand.filter((c) => c.id !== playableCard.id);
        const newDiscard = [...discardPile, playableCard];

        setOpponentHand(newHand);
        setDiscardPile(newDiscard);
        setActiveColor(resolvedColor);

        if (newHand.length === 0) {
          setWinner('opponent');
          sound.playDoubleSlam();
          return;
        }

        let nextTurn: 'player' | 'opponent' = 'player';

        if (playableCard.value === 'skip') {
          triggerSlam('الخصم تجاوز دورك! 🚫');
          nextTurn = 'opponent';
        } else if (playableCard.value === 'reverse') {
          triggerSlam('الخصم عكس الاتجاه! 🔄');
          nextTurn = 'opponent';
        } else if (playableCard.value === 'draw2') {
          triggerSlam('سحبت ورقتين بسبب الخصم! +2 💥');
          applyDrawPenalty('player', 2);
          nextTurn = 'opponent';
        } else if (playableCard.value === 'wild4') {
          triggerSlam('سحبت 4 ورقات بسبب بطاقة الخصم! +4 🚀');
          applyDrawPenalty('player', 4);
          nextTurn = 'opponent';
        }

        setCurrentTurn(nextTurn);
      } else {
        // AI Draws
        sound.playCardSwish();
        let currentDeck = [...deck];
        if (currentDeck.length === 0) {
          currentDeck = createUnoDeck();
        }
        const drawn = currentDeck[0];
        setDeck(currentDeck.slice(1));
        setOpponentHand((prev) => [...prev, drawn]);
        setCurrentTurn('player');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentTurn, opponentHand, discardPile, deck, winner, activeColor]);

  // Card Value Visual Label
  const getCardDisplayValue = (val: UnoValue) => {
    switch (val) {
      case 'skip':
        return '🚫';
      case 'reverse':
        return '🔄';
      case 'draw2':
        return '+2';
      case 'wild':
        return '★';
      case 'wild4':
        return '+4';
      default:
        return val;
    }
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col items-center justify-between p-2 select-none overflow-hidden transition-transform ${
        screenShake ? 'scale-[1.02] translate-y-1 animate-pulse' : ''
      }`}
    >
      {/* Top HUD */}
      <div className="w-full flex items-center justify-between bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-700/80 shadow-xl z-20">
        <div className="flex items-center gap-2">
          <div
            className={`w-3.5 h-3.5 rounded-full ${COLOR_MAP[activeColor].bg} ring-2 ring-white animate-pulse shadow-md`}
          />
          <span className="text-xs sm:text-sm font-black text-slate-100">
            اللون الحالي: {t[activeColor as keyof typeof t] || activeColor}
          </span>
        </div>

        {/* Opponent Cards Counter */}
        <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-bold">المنافس:</span>
          <div className="flex gap-0.5">
            {Array.from({ length: opponentHand.length }).map((_, i) => (
              <div key={i} className="w-2.5 h-5 bg-gradient-to-b from-rose-700 to-indigo-800 rounded-xs border border-white/40 shadow-xs" />
            ))}
          </div>
          <span className="text-xs font-black text-amber-300">({opponentHand.length})</span>
        </div>

        <button
          onClick={startUnoGame}
          id="btn-uno-restart"
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title={t.playAgain}
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Action Banner */}
      {slamBanner && (
        <div className="absolute top-14 z-40 pointer-events-none animate-bounce">
          <div className="bg-gradient-to-r from-rose-600 via-amber-500 to-sky-600 text-white font-black text-xs sm:text-sm px-4 py-2 rounded-2xl shadow-2xl border-2 border-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-yellow-300 fill-current" />
            <span>{slamBanner}</span>
          </div>
        </div>
      )}

      {/* 3D Uno Stage */}
      <div
        className={`relative w-full max-w-[420px] aspect-[4/3] my-auto transition-transform duration-700 ease-out flex items-center justify-center ${
          is3DView
            ? 'rotate-x-[26deg] rotate-z-[-1deg] scale-[0.95] drop-shadow-[0_30px_50px_rgba(0,0,0,0.95)]'
            : ''
        }`}
        style={{ perspective: '1100px', transformStyle: 'preserve-3d' }}
      >
        <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-4 rounded-3xl border-4 border-indigo-700/60 shadow-[0_0_40px_rgba(79,70,229,0.25)] flex items-center justify-around relative overflow-hidden">
          {/* Deck Pile to Draw */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">سحب ورقة</span>
            <button
              onClick={handleDrawCard}
              id="btn-uno-draw-deck"
              disabled={currentTurn !== 'player' || !!winner}
              className={`w-20 h-28 rounded-2xl bg-gradient-to-br from-slate-900 via-rose-900 to-indigo-950 border-3 border-white/60 shadow-2xl flex flex-col items-center justify-center transition-all ${
                currentTurn === 'player'
                  ? 'hover:scale-105 active:scale-95 ring-2 ring-amber-300 cursor-pointer animate-pulse'
                  : 'opacity-70 cursor-not-allowed'
              }`}
            >
              <div className="w-12 h-16 rounded-full bg-amber-400 rotate-12 flex items-center justify-center shadow-lg border border-white">
                <span className="text-slate-950 font-black text-sm italic tracking-tighter">UNO</span>
              </div>
              <span className="text-[9px] font-bold text-amber-200 mt-1">{deck.length} ورقة</span>
            </button>
          </div>

          {/* Active Discard Pile with Top Card */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">الورقة الحالية</span>
            {topDiscard && (
              <div
                className={`w-20 h-28 rounded-2xl ${COLOR_MAP[activeColor].bg} border-3 border-white shadow-2xl flex flex-col items-center justify-between p-2 transform rotate-2 transition-transform duration-300`}
              >
                <span className="text-xs font-black text-white self-start">
                  {getCardDisplayValue(topDiscard.value)}
                </span>
                <div className="w-12 h-16 rounded-full bg-white/90 shadow-inner flex items-center justify-center transform -rotate-12">
                  <span className="text-xl font-black text-slate-950">
                    {getCardDisplayValue(topDiscard.value)}
                  </span>
                </div>
                <span className="text-xs font-black text-white self-end">
                  {getCardDisplayValue(topDiscard.value)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Player's Fan of Cards Dock */}
      <div className="w-full flex flex-col items-center gap-2 z-20">
        {/* Urgent Uno Shout Button when 1 card left */}
        {playerHand.length === 1 && (
          <button
            onClick={() => {
              sound.playUnoShout();
              setShoutedUno(true);
              confetti({ particleCount: 100 });
              triggerSlam('أونوووووووووو! 📣🎉');
            }}
            id="btn-shout-uno"
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-black text-sm shadow-2xl border-2 border-white animate-bounce cursor-pointer flex items-center gap-2"
          >
            <Bell className="w-5 h-5 fill-current" />
            <span>صرخة أونووو! (UNO!)</span>
          </button>
        )}

        <div className="w-full flex items-center justify-center gap-1.5 overflow-x-auto no-scrollbar py-2 px-3 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl max-w-[420px]">
          {playerHand.map((card, idx) => {
            const playable = currentTurn === 'player' && isCardPlayable(card);
            return (
              <button
                key={card.id}
                id={`card-hand-${card.id}`}
                onClick={() => handlePlayCard(card)}
                disabled={!playable}
                className={`relative w-14 h-22 rounded-xl flex-shrink-0 flex flex-col items-center justify-between p-1.5 transition-all duration-200 select-none border-2 border-white ${
                  COLOR_MAP[card.color].bg
                } ${
                  playable
                    ? 'hover:-translate-y-3 hover:scale-110 active:scale-95 ring-2 ring-amber-300 cursor-pointer shadow-lg z-30'
                    : 'opacity-50 grayscale-20 cursor-default'
                }`}
                style={{
                  transform: `rotate(${(idx - playerHand.length / 2) * 3}deg)`,
                }}
              >
                <span className="text-[10px] font-black text-white self-start">
                  {getCardDisplayValue(card.value)}
                </span>
                <div className="w-8 h-11 rounded-full bg-white/90 shadow-inner flex items-center justify-center">
                  <span className="text-xs font-black text-slate-950">
                    {getCardDisplayValue(card.value)}
                  </span>
                </div>
                <span className="text-[10px] font-black text-white self-end">
                  {getCardDisplayValue(card.value)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Wild Color Selection Modal */}
      {showColorPicker && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xs rounded-3xl p-5 shadow-2xl flex flex-col items-center gap-3">
            <Sparkles className="w-8 h-8 text-amber-400 animate-spin" />
            <h3 className="text-base font-black text-white">اختر اللون الجديد للبطاقة:</h3>
            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              {(['red', 'blue', 'green', 'yellow'] as UnoColor[]).map((c) => (
                <button
                  key={c}
                  id={`btn-wild-color-${c}`}
                  onClick={() => handleSelectWildColor(c)}
                  className={`py-3 rounded-2xl font-black text-sm text-white ${COLOR_MAP[c].bg} shadow-xl hover:scale-105 active:scale-95 transition-transform cursor-pointer border border-white/60`}
                >
                  {t[c as keyof typeof t] || c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Winner Modal */}
      {winner && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-50 animate-fade-in">
          <Trophy className="w-16 h-16 text-amber-400 animate-bounce mb-3" />
          <h2 className="text-2xl font-black text-amber-300 mb-1">
            {winner === 'player' ? 'ألف مبروك الفوز بأونو! 🏆' : 'فاز المنافس بأونو! 🤖'}
          </h2>
          <button
            onClick={startUnoGame}
            id="btn-uno-play-again"
            className="mt-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-black text-sm shadow-xl hover:brightness-110 active:scale-95 cursor-pointer"
          >
            {t.playAgain}
          </button>
        </div>
      )}
    </div>
  );
};
