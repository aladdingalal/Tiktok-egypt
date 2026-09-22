import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LudoColor, LudoToken, LudoState, SupportedLanguage } from '../types';
import { sound } from '../utils/sound';
import { translations } from '../utils/translations';
import confetti from 'canvas-confetti';
import { RotateCw, Trophy, Sparkles } from 'lucide-react';

interface ThreeLudoProps {
  lang: SupportedLanguage;
  playMode: 'pass_play' | 'vs_ai' | 'tiktok_live';
  onVictory?: (winnerColor: string) => void;
  is3DView: boolean;
  activeTeamBonus?: string | null;
}

const COLORS: LudoColor[] = ['red', 'green', 'yellow', 'blue'];

const COLOR_MAP: Record<LudoColor, { bg: string; text: string; hex: string; ring: string; nameKey: string }> = {
  red: { bg: 'bg-rose-600', text: 'text-rose-400', hex: '#e11d48', ring: 'ring-rose-400', nameKey: 'red' },
  green: { bg: 'bg-emerald-600', text: 'text-emerald-400', hex: '#059669', ring: 'ring-emerald-400', nameKey: 'green' },
  yellow: { bg: 'bg-amber-500', text: 'text-amber-300', hex: '#d97706', ring: 'ring-amber-300', nameKey: 'yellow' },
  blue: { bg: 'bg-sky-600', text: 'text-sky-400', hex: '#0284c7', ring: 'ring-sky-400', nameKey: 'blue' },
};

// Safe star cells on standard Ludo board
const SAFE_CELLS = [0, 8, 13, 21, 26, 34, 39, 47];

// Initial position offsets
const START_OFFSETS: Record<LudoColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

export const ThreeLudo: React.FC<ThreeLudoProps> = ({
  lang,
  playMode,
  onVictory,
  is3DView,
  activeTeamBonus
}) => {
  const t = translations[lang];

  const [gameState, setGameState] = useState<LudoState>(() => ({
    currentTurn: 'red',
    diceValue: 6,
    isRolling: false,
    hasRolled: false,
    tokens: {
      red: [
        { id: 0, color: 'red', step: -1, position: -1 },
        { id: 1, color: 'red', step: -1, position: -1 },
        { id: 2, color: 'red', step: -1, position: -1 },
        { id: 3, color: 'red', step: -1, position: -1 },
      ],
      green: [
        { id: 0, color: 'green', step: -1, position: -1 },
        { id: 1, color: 'green', step: -1, position: -1 },
        { id: 2, color: 'green', step: -1, position: -1 },
        { id: 3, color: 'green', step: -1, position: -1 },
      ],
      yellow: [
        { id: 0, color: 'yellow', step: -1, position: -1 },
        { id: 1, color: 'yellow', step: -1, position: -1 },
        { id: 2, color: 'yellow', step: -1, position: -1 },
        { id: 3, color: 'yellow', step: -1, position: -1 },
      ],
      blue: [
        { id: 0, color: 'blue', step: -1, position: -1 },
        { id: 1, color: 'blue', step: -1, position: -1 },
        { id: 2, color: 'blue', step: -1, position: -1 },
        { id: 3, color: 'blue', step: -1, position: -1 },
      ],
    },
    winner: null,
    consecutiveSixes: 0,
    activeColors: ['red', 'green', 'yellow', 'blue'],
  }));

  const [diceRotation, setDiceRotation] = useState({ x: 0, y: 0, z: 0 });
  const [lastEvent, setLastEvent] = useState<string>('');

  const nextTurn = useCallback((hadSix: boolean = false) => {
    setGameState((prev) => {
      if (hadSix) {
        return { ...prev, hasRolled: false };
      }
      const currentIndex = COLORS.indexOf(prev.currentTurn);
      const nextColor = COLORS[(currentIndex + 1) % COLORS.length];
      return {
        ...prev,
        currentTurn: nextColor,
        hasRolled: false,
      };
    });
  }, []);

  // Roll the dice
  const handleRollDice = () => {
    if (gameState.isRolling || gameState.hasRolled || gameState.winner) return;

    sound.playDiceRoll();

    setGameState((prev) => ({ ...prev, isRolling: true }));

    // Animated 3D dice rotation
    const turns = 4;
    setDiceRotation({
      x: Math.PI * 2 * turns + Math.random() * 3,
      y: Math.PI * 2 * turns + Math.random() * 3,
      z: Math.random() * 2,
    });

    setTimeout(() => {
      // If TikTok bonus for current color, higher chance for 6
      const isBuffed = activeTeamBonus === gameState.currentTurn;
      let rolledVal = Math.floor(Math.random() * 6) + 1;
      if (isBuffed && Math.random() > 0.4) {
        rolledVal = 6;
      }

      setGameState((prev) => {
        const canMoveAny = prev.tokens[prev.currentTurn].some((tok) => {
          if (tok.step === -1) return rolledVal === 6;
          if (tok.step >= 58) return false;
          return tok.step + rolledVal <= 58;
        });

        // If no token can move, pass turn
        if (!canMoveAny) {
          setTimeout(() => {
            nextTurn(rolledVal === 6);
          }, 900);
        }

        return {
          ...prev,
          diceValue: rolledVal,
          isRolling: false,
          hasRolled: true,
        };
      });
    }, 650);
  };

  // Move token
  const handleTokenClick = (token: LudoToken) => {
    if (!gameState.hasRolled || gameState.isRolling || gameState.winner) return;
    if (token.color !== gameState.currentTurn) return;

    const dice = gameState.diceValue;

    // From yard to track
    if (token.step === -1) {
      if (dice !== 6) return; // Need a 6 to enter
      sound.playTileClick();
      setGameState((prev) => {
        const startPos = START_OFFSETS[token.color];
        const updatedTokens = { ...prev.tokens };
        updatedTokens[token.color] = updatedTokens[token.color].map((t) =>
          t.id === token.id ? { ...t, step: 0, position: startPos } : t
        );

        setLastEvent(`${t[COLOR_MAP[token.color].nameKey as keyof typeof t]} token joined the track! 🚀`);
        return {
          ...prev,
          tokens: updatedTokens,
          hasRolled: false,
        };
      });
      return;
    }

    // Move on track
    const newStep = token.step + dice;
    if (newStep > 58) return; // Overshoot

    sound.playTileClick();

    setGameState((prev) => {
      const updatedTokens = { ...prev.tokens };
      let finalPosition = -1;
      let capturedEnemy: LudoColor | null = null;

      if (newStep < 52) {
        // Normal track
        finalPosition = (START_OFFSETS[token.color] + newStep) % 52;

        // Check if captured enemy (unless safe cell)
        if (!SAFE_CELLS.includes(finalPosition)) {
          for (const c of COLORS) {
            if (c !== token.color) {
              updatedTokens[c] = updatedTokens[c].map((tok) => {
                if (tok.step >= 0 && tok.step < 52 && tok.position === finalPosition) {
                  capturedEnemy = c;
                  return { ...tok, step: -1, position: -1 };
                }
                return tok;
              });
            }
          }
        }
      } else {
        // Home stretch
        finalPosition = 100 + newStep; // Virtual marker
      }

      updatedTokens[token.color] = updatedTokens[token.color].map((t) =>
        t.id === token.id ? { ...t, step: newStep, position: finalPosition } : t
      );

      if (capturedEnemy) {
        sound.playCapture();
        setLastEvent(`💥 Knocked out ${capturedEnemy} back to base!`);
      }

      // Check win condition
      const allHome = updatedTokens[token.color].every((tok) => tok.step >= 58);
      let winner = prev.winner;
      if (allHome) {
        winner = token.color;
        sound.playFanfare();
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        onVictory?.(token.color);
      }

      const hasBonusTurn = dice === 6 || capturedEnemy !== null;
      setTimeout(() => {
        if (!winner) {
          nextTurn(hasBonusTurn);
        }
      }, 400);

      return {
        ...prev,
        tokens: updatedTokens,
        winner,
        hasRolled: false,
      };
    });
  };

  // AI Bot automated play
  useEffect(() => {
    if (playMode === 'pass_play') return;
    if (gameState.winner) return;

    // In AI mode, if current turn is not red (player is red, others are AI)
    const isAiTurn = playMode === 'vs_ai' && gameState.currentTurn !== 'red';
    const isTikTokAi = playMode === 'tiktok_live' && (gameState.currentTurn === 'yellow' || gameState.currentTurn === 'blue');

    if (isAiTurn || isTikTokAi) {
      if (!gameState.hasRolled && !gameState.isRolling) {
        const timer = setTimeout(() => {
          handleRollDice();
        }, 800);
        return () => clearTimeout(timer);
      } else if (gameState.hasRolled && !gameState.isRolling) {
        const timer = setTimeout(() => {
          // Find first valid token to move
          const currentTokens = gameState.tokens[gameState.currentTurn];
          const dice = gameState.diceValue;

          // Priority 1: Move on track if can capture
          // Priority 2: Enter if 6
          // Priority 3: Move token closest to home
          let bestToken: LudoToken | null = null;

          if (dice === 6) {
            const yardToken = currentTokens.find((t) => t.step === -1);
            if (yardToken) bestToken = yardToken;
          }

          if (!bestToken) {
            const movableTokens = currentTokens.filter((t) => t.step >= 0 && t.step + dice <= 58);
            if (movableTokens.length > 0) {
              // Pick furthest along
              bestToken = movableTokens.sort((a, b) => b.step - a.step)[0];
            }
          }

          if (bestToken) {
            handleTokenClick(bestToken);
          } else {
            nextTurn(dice === 6);
          }
        }, 900);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState.currentTurn, gameState.hasRolled, gameState.isRolling, gameState.winner, playMode, nextTurn]);

  // Restart game
  const resetGame = () => {
    setGameState({
      currentTurn: 'red',
      diceValue: 6,
      isRolling: false,
      hasRolled: false,
      tokens: {
        red: [
          { id: 0, color: 'red', step: -1, position: -1 },
          { id: 1, color: 'red', step: -1, position: -1 },
          { id: 2, color: 'red', step: -1, position: -1 },
          { id: 3, color: 'red', step: -1, position: -1 },
        ],
        green: [
          { id: 0, color: 'green', step: -1, position: -1 },
          { id: 1, color: 'green', step: -1, position: -1 },
          { id: 2, color: 'green', step: -1, position: -1 },
          { id: 3, color: 'green', step: -1, position: -1 },
        ],
        yellow: [
          { id: 0, color: 'yellow', step: -1, position: -1 },
          { id: 1, color: 'yellow', step: -1, position: -1 },
          { id: 2, color: 'yellow', step: -1, position: -1 },
          { id: 3, color: 'yellow', step: -1, position: -1 },
        ],
        blue: [
          { id: 0, color: 'blue', step: -1, position: -1 },
          { id: 1, color: 'blue', step: -1, position: -1 },
          { id: 2, color: 'blue', step: -1, position: -1 },
          { id: 3, color: 'blue', step: -1, position: -1 },
        ],
      },
      winner: null,
      consecutiveSixes: 0,
      activeColors: ['red', 'green', 'yellow', 'blue'],
    });
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-2 select-none overflow-hidden">
      {/* Top Status & Turn Bar */}
      <div className="w-full flex items-center justify-between bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-700/60 shadow-lg z-10">
        <div className="flex items-center gap-2">
          <div
            className={`w-4 h-4 rounded-full ${COLOR_MAP[gameState.currentTurn].bg} animate-pulse ring-2 ${COLOR_MAP[gameState.currentTurn].ring}`}
          />
          <div className="text-xs sm:text-sm font-bold">
            <span className={COLOR_MAP[gameState.currentTurn].text}>
              {t[COLOR_MAP[gameState.currentTurn].nameKey as keyof typeof t]}
            </span>{' '}
            - {gameState.hasRolled ? 'اختر قطعة للتحريك' : t.yourTurn}
          </div>
        </div>

        {activeTeamBonus && (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40">
            <Sparkles className="w-3 h-3 animate-spin" />
            <span>دعم التيك توك نشط!</span>
          </div>
        )}

        <button
          onClick={resetGame}
          id="btn-reset-ludo"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title={t.playAgain}
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* 3D Board Canvas Container */}
      <div
        className={`relative w-full max-w-[420px] aspect-square my-auto transition-transform duration-700 ease-out flex items-center justify-center ${
          is3DView
            ? 'rotate-x-[25deg] rotate-z-[-2deg] scale-[0.92] shadow-2xl drop-shadow-[0_25px_35px_rgba(0,0,0,0.8)]'
            : ''
        }`}
        style={{ perspective: '1100px', transformStyle: 'preserve-3d' }}
      >
        {/* The 15x15 Ludo Board Grid */}
        <div className="w-full h-full bg-slate-950 p-2 rounded-3xl border-4 border-amber-600/60 shadow-[0_0_30px_rgba(217,119,6,0.25)] grid grid-cols-15 grid-rows-15 gap-0.5 relative overflow-hidden">
          {/* Base Yard - Red (Top-Left) */}
          <div className="col-span-6 row-span-6 bg-gradient-to-br from-rose-600 to-rose-900 rounded-2xl p-2.5 flex flex-col justify-between border-2 border-rose-400/50 shadow-inner">
            <span className="text-[10px] font-black uppercase text-rose-100 tracking-wider">
              {t.red}
            </span>
            <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-2 rounded-xl backdrop-blur-xs">
              {gameState.tokens.red.map((tok) => (
                <button
                  key={tok.id}
                  id={`tok-red-${tok.id}`}
                  onClick={() => handleTokenClick(tok)}
                  disabled={tok.step !== -1 || gameState.currentTurn !== 'red' || gameState.diceValue !== 6 || !gameState.hasRolled}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                    tok.step === -1
                      ? 'bg-rose-500 shadow-md ring-2 ring-rose-300 hover:scale-110 active:scale-95 cursor-pointer animate-pulse'
                      : 'bg-slate-800/40 opacity-30 cursor-not-allowed'
                  }`}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-white shadow-inner" />
                </button>
              ))}
            </div>
          </div>

          {/* Top Track (Green Home Path & Tracks) */}
          <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-0.5 bg-slate-900/90 rounded-t-xl p-0.5">
            {Array.from({ length: 18 }).map((_, i) => {
              const isGreenHome = i % 3 === 1 && i >= 3;
              const isStart = i === 4;
              return (
                <div
                  key={i}
                  className={`rounded-sm flex items-center justify-center text-[8px] font-bold ${
                    isGreenHome
                      ? 'bg-emerald-600/80 text-emerald-200'
                      : isStart
                      ? 'bg-emerald-500 text-slate-950 ring-1 ring-white'
                      : 'bg-slate-800/80 border border-slate-700/50'
                  }`}
                >
                  {isStart ? '★' : ''}
                </div>
              );
            })}
          </div>

          {/* Base Yard - Green (Top-Right) */}
          <div className="col-span-6 row-span-6 bg-gradient-to-bl from-emerald-600 to-emerald-900 rounded-2xl p-2.5 flex flex-col justify-between border-2 border-emerald-400/50 shadow-inner">
            <span className="text-[10px] font-black uppercase text-emerald-100 tracking-wider">
              {t.green}
            </span>
            <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-2 rounded-xl backdrop-blur-xs">
              {gameState.tokens.green.map((tok) => (
                <button
                  key={tok.id}
                  id={`tok-green-${tok.id}`}
                  onClick={() => handleTokenClick(tok)}
                  disabled={tok.step !== -1 || gameState.currentTurn !== 'green' || gameState.diceValue !== 6 || !gameState.hasRolled}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                    tok.step === -1
                      ? 'bg-emerald-500 shadow-md ring-2 ring-emerald-300 hover:scale-110 active:scale-95 cursor-pointer animate-pulse'
                      : 'bg-slate-800/40 opacity-30 cursor-not-allowed'
                  }`}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-white shadow-inner" />
                </button>
              ))}
            </div>
          </div>

          {/* Left Track (Red Home Path) */}
          <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-0.5 bg-slate-900/90 rounded-l-xl p-0.5">
            {Array.from({ length: 18 }).map((_, i) => {
              const row = Math.floor(i / 6);
              const col = i % 6;
              const isRedHome = row === 1 && col > 0;
              const isStart = row === 0 && col === 1;
              return (
                <div
                  key={i}
                  className={`rounded-sm flex items-center justify-center text-[8px] font-bold ${
                    isRedHome
                      ? 'bg-rose-600/80 text-rose-200'
                      : isStart
                      ? 'bg-rose-500 text-white ring-1 ring-white'
                      : 'bg-slate-800/80 border border-slate-700/50'
                  }`}
                >
                  {isStart ? '★' : ''}
                </div>
              );
            })}
          </div>

          {/* Center 3x3 Home Triangle Base with 3D Dice Display */}
          <div className="col-span-3 row-span-3 bg-gradient-to-br from-amber-600 via-yellow-500 to-amber-700 rounded-xl p-1 flex items-center justify-center shadow-lg relative border-2 border-amber-300/60">
            <div className="w-full h-full bg-slate-950/80 rounded-lg flex flex-col items-center justify-center p-1">
              <span className="text-[9px] font-extrabold text-amber-300">
                {gameState.winner ? '🏆' : 'LUDO 3D'}
              </span>

              {/* Render Center Tokens Count */}
              <div className="flex gap-1 mt-0.5">
                {COLORS.map((c) => {
                  const finishedCount = gameState.tokens[c].filter((tok) => tok.step >= 58).length;
                  return (
                    <span
                      key={c}
                      className={`text-[8px] font-bold px-1 rounded ${COLOR_MAP[c].bg} text-white`}
                    >
                      {finishedCount}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Track (Yellow Home Path) */}
          <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-0.5 bg-slate-900/90 rounded-r-xl p-0.5">
            {Array.from({ length: 18 }).map((_, i) => {
              const row = Math.floor(i / 6);
              const col = i % 6;
              const isYellowHome = row === 1 && col < 5;
              const isStart = row === 2 && col === 4;
              return (
                <div
                  key={i}
                  className={`rounded-sm flex items-center justify-center text-[8px] font-bold ${
                    isYellowHome
                      ? 'bg-amber-500/80 text-amber-100'
                      : isStart
                      ? 'bg-amber-400 text-slate-950 ring-1 ring-white'
                      : 'bg-slate-800/80 border border-slate-700/50'
                  }`}
                >
                  {isStart ? '★' : ''}
                </div>
              );
            })}
          </div>

          {/* Base Yard - Blue (Bottom-Left) */}
          <div className="col-span-6 row-span-6 bg-gradient-to-tr from-sky-600 to-sky-900 rounded-2xl p-2.5 flex flex-col justify-between border-2 border-sky-400/50 shadow-inner">
            <span className="text-[10px] font-black uppercase text-sky-100 tracking-wider">
              {t.blue}
            </span>
            <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-2 rounded-xl backdrop-blur-xs">
              {gameState.tokens.blue.map((tok) => (
                <button
                  key={tok.id}
                  id={`tok-blue-${tok.id}`}
                  onClick={() => handleTokenClick(tok)}
                  disabled={tok.step !== -1 || gameState.currentTurn !== 'blue' || gameState.diceValue !== 6 || !gameState.hasRolled}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                    tok.step === -1
                      ? 'bg-sky-500 shadow-md ring-2 ring-sky-300 hover:scale-110 active:scale-95 cursor-pointer animate-pulse'
                      : 'bg-slate-800/40 opacity-30 cursor-not-allowed'
                  }`}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-white shadow-inner" />
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Track (Blue Home Path) */}
          <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-0.5 bg-slate-900/90 rounded-b-xl p-0.5">
            {Array.from({ length: 18 }).map((_, i) => {
              const isBlueHome = i % 3 === 1 && i < 15;
              const isStart = i === 13;
              return (
                <div
                  key={i}
                  className={`rounded-sm flex items-center justify-center text-[8px] font-bold ${
                    isBlueHome
                      ? 'bg-sky-600/80 text-sky-200'
                      : isStart
                      ? 'bg-sky-500 text-white ring-1 ring-white'
                      : 'bg-slate-800/80 border border-slate-700/50'
                  }`}
                >
                  {isStart ? '★' : ''}
                </div>
              );
            })}
          </div>

          {/* Base Yard - Yellow (Bottom-Right) */}
          <div className="col-span-6 row-span-6 bg-gradient-to-tl from-amber-500 to-amber-800 rounded-2xl p-2.5 flex flex-col justify-between border-2 border-amber-300/50 shadow-inner">
            <span className="text-[10px] font-black uppercase text-amber-100 tracking-wider">
              {t.yellow}
            </span>
            <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-2 rounded-xl backdrop-blur-xs">
              {gameState.tokens.yellow.map((tok) => (
                <button
                  key={tok.id}
                  id={`tok-yellow-${tok.id}`}
                  onClick={() => handleTokenClick(tok)}
                  disabled={tok.step !== -1 || gameState.currentTurn !== 'yellow' || gameState.diceValue !== 6 || !gameState.hasRolled}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                    tok.step === -1
                      ? 'bg-amber-400 shadow-md ring-2 ring-amber-200 hover:scale-110 active:scale-95 cursor-pointer animate-pulse'
                      : 'bg-slate-800/40 opacity-30 cursor-not-allowed'
                  }`}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-white shadow-inner" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Tokens on Track Overlay */}
        <div className="absolute inset-0 pointer-events-none p-3">
          {COLORS.flatMap((c) =>
            gameState.tokens[c]
              .filter((tok) => tok.step >= 0 && tok.step < 58)
              .map((tok) => {
                // Calculate display position roughly on grid
                // For simplicity and fluid responsiveness, track is marked clearly
                const isCurrentTurn = c === gameState.currentTurn && gameState.hasRolled;
                return (
                  <button
                    key={`${c}-${tok.id}`}
                    id={`active-tok-${c}-${tok.id}`}
                    onClick={() => handleTokenClick(tok)}
                    className={`pointer-events-auto absolute w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-xl transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 ${
                      COLOR_MAP[c].bg
                    } ${isCurrentTurn ? 'ring-4 ring-white animate-bounce scale-115 cursor-pointer' : 'ring-2 ring-black/40'}`}
                    style={{
                      // Distribute roughly based on step
                      left: `${20 + ((tok.step * 14) % 65)}%`,
                      top: `${20 + (Math.sin(tok.step * 0.4) * 30 + 35)}%`,
                      zIndex: isCurrentTurn ? 40 : 20,
                    }}
                  >
                    <span>{tok.id + 1}</span>
                  </button>
                );
              })
          )}
        </div>
      </div>

      {/* Action / Dice Control Dock */}
      <div className="w-full flex flex-col items-center gap-2 mt-2 z-20">
        {lastEvent && (
          <div className="text-[11px] font-semibold text-amber-300 bg-slate-900/80 px-3 py-1 rounded-full border border-amber-500/30">
            {lastEvent}
          </div>
        )}

        <div className="flex items-center gap-4">
          {/* 3D Rolling Dice Button */}
          <button
            onClick={handleRollDice}
            id="btn-roll-ludo-dice"
            disabled={gameState.isRolling || gameState.hasRolled || !!gameState.winner}
            className={`relative group flex items-center gap-3 px-6 py-3.5 rounded-2xl font-black text-sm tracking-wide shadow-2xl transition-all duration-200 ${
              gameState.hasRolled
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 text-white hover:brightness-110 active:scale-95 shadow-amber-500/25 ring-2 ring-white/30 cursor-pointer animate-pulse'
            }`}
          >
            {/* 3D Dice Cube Visual */}
            <div
              className={`w-9 h-9 rounded-xl bg-white text-slate-950 flex items-center justify-center text-xl font-black shadow-lg border-2 border-slate-300 transition-transform duration-500 ${
                gameState.isRolling ? 'animate-spin' : ''
              }`}
              style={{
                transform: `rotateX(${diceRotation.x}rad) rotateY(${diceRotation.y}rad)`,
              }}
            >
              {gameState.diceValue}
            </div>

            <span className="text-base font-extrabold">
              {gameState.isRolling ? t.rolling : gameState.hasRolled ? t.yourTurn : t.rollDice}
            </span>
          </button>
        </div>

        {/* Winner Banner */}
        {gameState.winner && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-50 animate-fade-in">
            <Trophy className="w-16 h-16 text-amber-400 animate-bounce mb-3" />
            <h2 className="text-2xl font-black text-amber-300 mb-1">
              {t.winner}
            </h2>
            <p className="text-base text-slate-200 mb-4 font-bold">
              فاز فريق {t[COLOR_MAP[gameState.winner].nameKey as keyof typeof t]} باللعبة! 🎉
            </p>
            <button
              onClick={resetGame}
              id="btn-ludo-play-again"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-sm shadow-xl hover:brightness-110 active:scale-95 cursor-pointer"
            >
              {t.playAgain}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
