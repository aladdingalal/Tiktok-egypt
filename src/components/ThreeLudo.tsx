import React, { useState, useEffect, useCallback } from 'react';
import { LudoColor, LudoToken, LudoState, SupportedLanguage } from '../types';
import { sound } from '../utils/sound';
import { translations } from '../utils/translations';
import confetti from 'canvas-confetti';
import { RotateCw, Trophy, Sparkles, Flame, Zap } from 'lucide-react';

interface ThreeLudoProps {
  lang: SupportedLanguage;
  playMode: 'pass_play' | 'vs_ai' | 'tiktok_live';
  onVictory?: (winnerColor: string) => void;
  is3DView: boolean;
  activeTeamBonus?: string | null;
}

const COLORS: LudoColor[] = ['red', 'green', 'yellow', 'blue'];

const COLOR_MAP: Record<LudoColor, { bg: string; text: string; hex: string; ring: string; nameKey: string; border: string }> = {
  red: { bg: 'bg-rose-600', text: 'text-rose-400', hex: '#e11d48', ring: 'ring-rose-400', nameKey: 'red', border: 'border-rose-400' },
  green: { bg: 'bg-emerald-600', text: 'text-emerald-400', hex: '#059669', ring: 'ring-emerald-400', nameKey: 'green', border: 'border-emerald-400' },
  yellow: { bg: 'bg-amber-500', text: 'text-amber-300', hex: '#d97706', ring: 'ring-amber-300', nameKey: 'yellow', border: 'border-amber-400' },
  blue: { bg: 'bg-sky-600', text: 'text-sky-400', hex: '#0284c7', ring: 'ring-sky-400', nameKey: 'blue', border: 'border-sky-400' },
};

// Safe star cells on standard Ludo track
const SAFE_CELLS = [0, 8, 13, 21, 26, 34, 39, 47];

// Exact 52 cell coordinates [row, col] on a 15x15 board
const TRACK_COORDS: [number, number][] = [
  // Red outward (0 - 4)
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  // Green inward (5 - 10)
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  // Top crossover (11, 12)
  [0, 7], [0, 8],
  // Green outward (13 - 17) -> Cell 13 is Green start
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  // Yellow inward (18 - 23)
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  // Right crossover (24, 25)
  [7, 14], [8, 14],
  // Yellow outward (26 - 30) -> Cell 26 is Yellow start
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  // Blue inward (31 - 36)
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  // Bottom crossover (37, 38)
  [14, 7], [14, 6],
  // Blue outward (39 - 43) -> Cell 39 is Blue start
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  // Red inward (44 - 49)
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  // Left crossover (50, 51)
  [7, 0], [6, 0],
];

// Home stretch [row, col] for steps 52 to 57 + 58 (center)
const HOME_PATHS: Record<LudoColor, [number, number][]> = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6], [7, 7]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8], [7, 7]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7], [7, 7]],
};

// Yard positions inside colored bases
const YARD_COORDS: Record<LudoColor, [number, number][]> = {
  red: [[2, 2], [2, 3], [3, 2], [3, 3]],
  green: [[2, 11], [2, 12], [3, 11], [3, 12]],
  yellow: [[11, 11], [11, 12], [12, 11], [12, 12]],
  blue: [[11, 2], [11, 3], [12, 2], [12, 3]],
};

const START_OFFSETS: Record<LudoColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// 3D Dice Face Rotations for landing on specific number
const DICE_TARGET_ROTATIONS: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: 0, y: 180 },
  4: { x: 0, y: 90 },
  5: { x: 90, y: 0 },
  6: { x: -90, y: 0 },
};

export const ThreeLudo: React.FC<ThreeLudoProps> = ({
  lang,
  playMode,
  onVictory,
  is3DView,
  activeTeamBonus,
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

  const [diceRotation, setDiceRotation] = useState<{ x: number; y: number; z: number }>({ x: -90, y: 0, z: 0 });
  const [lastActionBanner, setLastActionBanner] = useState<{ text: string; type: 'knockout' | 'bonus' | 'six' } | null>(null);
  const [screenShake, setScreenShake] = useState<boolean>(false);

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

  // Trigger screen micro-shake
  const triggerShake = () => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 400);
  };

  // Roll 3D Dice
  const handleRollDice = () => {
    if (gameState.isRolling || gameState.hasRolled || gameState.winner) return;

    sound.playDiceRoll();

    setGameState((prev) => ({ ...prev, isRolling: true }));

    // Tumble rotation
    const spins = 3;
    setDiceRotation((prev) => ({
      x: prev.x + 360 * spins + (Math.random() > 0.5 ? 90 : -90),
      y: prev.y + 360 * spins + (Math.random() > 0.5 ? 90 : -90),
      z: prev.z + 180,
    }));

    setTimeout(() => {
      // Bonus chance from TikTok live
      const isBuffed = activeTeamBonus === gameState.currentTurn;
      let rolled = Math.floor(Math.random() * 6) + 1;
      if (isBuffed && Math.random() > 0.4) {
        rolled = 6;
      }

      const targetRot = DICE_TARGET_ROTATIONS[rolled];
      setDiceRotation({
        x: targetRot.x + 720,
        y: targetRot.y + 720,
        z: 0,
      });

      if (rolled === 6) {
        sound.playComboDing(3);
        setLastActionBanner({ text: 'رمية 6! رمية إضافية وفرصة خروج! 🎲', type: 'six' });
        setTimeout(() => setLastActionBanner(null), 2500);
      }

      setGameState((prev) => {
        const canMoveAny = prev.tokens[prev.currentTurn].some((tok) => {
          if (tok.step === -1) return rolled === 6;
          if (tok.step >= 58) return false;
          return tok.step + rolled <= 58;
        });

        // Auto pass if unable to move
        if (!canMoveAny) {
          setTimeout(() => {
            nextTurn(rolled === 6);
          }, 900);
        }

        return {
          ...prev,
          diceValue: rolled,
          isRolling: false,
          hasRolled: true,
        };
      });
    }, 650);
  };

  // Handle Token Click / Movement
  const handleTokenClick = (token: LudoToken) => {
    if (!gameState.hasRolled || gameState.isRolling || gameState.winner) return;
    if (token.color !== gameState.currentTurn) return;

    const dice = gameState.diceValue;

    // Moving from Yard into active track
    if (token.step === -1) {
      if (dice !== 6) return;
      sound.playTileClick();
      setGameState((prev) => {
        const startPos = START_OFFSETS[token.color];
        const updatedTokens = { ...prev.tokens };
        updatedTokens[token.color] = updatedTokens[token.color].map((t) =>
          t.id === token.id ? { ...t, step: 0, position: startPos } : t
        );
        return {
          ...prev,
          tokens: updatedTokens,
          hasRolled: false,
        };
      });
      return;
    }

    const newStep = token.step + dice;
    if (newStep > 58) return; // Cannot overshoot

    sound.playTileClick();

    setGameState((prev) => {
      const updatedTokens = { ...prev.tokens };
      let finalPosition = -1;
      let capturedEnemy: LudoColor | null = null;

      if (newStep < 52) {
        finalPosition = (START_OFFSETS[token.color] + newStep) % 52;

        // Check if captured enemy token on normal cells (non-safe)
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
        finalPosition = 100 + newStep;
      }

      updatedTokens[token.color] = updatedTokens[token.color].map((t) =>
        t.id === token.id ? { ...t, step: newStep, position: finalPosition } : t
      );

      // Knockout celebration!
      if (capturedEnemy) {
        sound.playDoubleSlam();
        triggerShake();
        setLastActionBanner({ text: `ضربة قاضية! تم طرد ${capturedEnemy} إلى القاعدة! 💥`, type: 'knockout' });
        setTimeout(() => setLastActionBanner(null), 3000);
      }

      // Check win
      const allHome = updatedTokens[token.color].every((tok) => tok.step >= 58);
      let winner = prev.winner;
      if (allHome) {
        winner = token.color;
        sound.playFanfare();
        confetti({ particleCount: 200, spread: 90 });
        onVictory?.(token.color);
      }

      const hasBonus = dice === 6 || capturedEnemy !== null;
      setTimeout(() => {
        if (!winner) {
          nextTurn(hasBonus);
        }
      }, 450);

      return {
        ...prev,
        tokens: updatedTokens,
        winner,
        hasRolled: false,
      };
    });
  };

  // AI Automated Play
  useEffect(() => {
    if (playMode === 'pass_play') return;
    if (gameState.winner) return;

    const isAiTurn = playMode === 'vs_ai' && gameState.currentTurn !== 'red';
    const isLiveAi = playMode === 'tiktok_live' && (gameState.currentTurn === 'yellow' || gameState.currentTurn === 'blue');

    if (isAiTurn || isLiveAi) {
      if (!gameState.hasRolled && !gameState.isRolling) {
        const timer = setTimeout(() => {
          handleRollDice();
        }, 750);
        return () => clearTimeout(timer);
      } else if (gameState.hasRolled && !gameState.isRolling) {
        const timer = setTimeout(() => {
          const currentTokens = gameState.tokens[gameState.currentTurn];
          const dice = gameState.diceValue;

          let chosenToken: LudoToken | null = null;

          // Priority 1: Enter piece from yard on 6
          if (dice === 6) {
            const inYard = currentTokens.find((t) => t.step === -1);
            if (inYard) chosenToken = inYard;
          }

          // Priority 2: Move token that can capture or is furthest along
          if (!chosenToken) {
            const movable = currentTokens.filter((t) => t.step >= 0 && t.step + dice <= 58);
            if (movable.length > 0) {
              chosenToken = movable.sort((a, b) => b.step - a.step)[0];
            }
          }

          if (chosenToken) {
            handleTokenClick(chosenToken);
          } else {
            nextTurn(dice === 6);
          }
        }, 850);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState.currentTurn, gameState.hasRolled, gameState.isRolling, gameState.winner, playMode, nextTurn]);

  // Calculate pixel coordinates for a token based on its state
  const getTokenGridPosition = (token: LudoToken): { topPercent: number; leftPercent: number } => {
    if (token.step === -1) {
      // In base yard
      const [r, c] = YARD_COORDS[token.color][token.id];
      return { topPercent: (r / 14) * 90 + 5, leftPercent: (c / 14) * 90 + 5 };
    }

    if (token.step >= 58) {
      // Reached center home!
      return { topPercent: 50, leftPercent: 50 };
    }

    if (token.step >= 52) {
      // In home stretch path
      const idx = token.step - 52;
      const [r, c] = HOME_PATHS[token.color][idx];
      return { topPercent: (r / 14) * 90 + 5, leftPercent: (c / 14) * 90 + 5 };
    }

    // On normal 52 track
    const trackIndex = (START_OFFSETS[token.color] + token.step) % 52;
    const [r, c] = TRACK_COORDS[trackIndex];
    return { topPercent: (r / 14) * 90 + 5, leftPercent: (c / 14) * 90 + 5 };
  };

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
    setLastActionBanner(null);
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col items-center justify-between p-2 select-none overflow-hidden transition-transform ${
        screenShake ? 'scale-[1.02] translate-x-1 animate-pulse' : ''
      }`}
    >
      {/* Top Turn & Status HUD */}
      <div className="w-full flex items-center justify-between bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-700/80 shadow-xl z-20">
        <div className="flex items-center gap-2">
          <div
            className={`w-4 h-4 rounded-full ${COLOR_MAP[gameState.currentTurn].bg} ring-2 ring-white animate-pulse shadow-lg`}
          />
          <span className="text-xs sm:text-sm font-black text-slate-100">
            {t[COLOR_MAP[gameState.currentTurn].nameKey as keyof typeof t]}:{' '}
            {gameState.hasRolled ? 'اختر قطعة للتحريك' : t.yourTurn}
          </span>
        </div>

        {/* Bonus Badge */}
        {activeTeamBonus && (
          <div className="flex items-center gap-1 text-[11px] font-black text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-400/40 animate-pulse">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>دعم مباشر!</span>
          </div>
        )}

        <button
          onClick={resetGame}
          id="btn-ludo-reset"
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title={t.playAgain}
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Action Banner (Knockout / 6 Bonus) */}
      {lastActionBanner && (
        <div className="absolute top-14 z-40 pointer-events-none animate-bounce">
          <div className="bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 text-white font-black text-xs sm:text-sm px-4 py-2 rounded-2xl shadow-2xl border-2 border-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-yellow-300 fill-current" />
            <span>{lastActionBanner.text}</span>
          </div>
        </div>
      )}

      {/* 3D Ludo Board Stage */}
      <div
        className={`relative w-full max-w-[420px] aspect-square my-auto transition-transform duration-700 ease-out flex items-center justify-center ${
          is3DView
            ? 'rotate-x-[28deg] rotate-z-[-2deg] scale-[0.93] shadow-2xl drop-shadow-[0_30px_50px_rgba(0,0,0,0.95)]'
            : ''
        }`}
        style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
      >
        {/* 15x15 Physical Board Base */}
        <div className="w-full h-full bg-slate-950 p-2.5 rounded-3xl border-4 border-amber-600/70 shadow-[0_0_35px_rgba(217,119,6,0.3)] grid grid-cols-15 grid-rows-15 gap-0.5 relative overflow-hidden">
          {/* Base Yard - Red (Top-Left 6x6) */}
          <div className="col-span-6 row-span-6 bg-gradient-to-br from-rose-600 via-rose-700 to-rose-900 rounded-2xl p-2.5 flex flex-col justify-between border-2 border-rose-400/60 shadow-inner">
            <span className="text-[10px] font-black uppercase text-white tracking-widest drop-shadow">
              {t.red}
            </span>
            <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-2.5 rounded-xl backdrop-blur-xs shadow-inner">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900/80 border-2 border-rose-500/40 flex items-center justify-center shadow-inner"
                />
              ))}
            </div>
          </div>

          {/* Top Track - Green Pathway (3x6) */}
          <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-0.5 bg-slate-900/90 rounded-t-xl p-0.5">
            {Array.from({ length: 18 }).map((_, i) => {
              const isGreenHome = i % 3 === 1 && i >= 3;
              const isStart = i === 4;
              return (
                <div
                  key={i}
                  className={`rounded-sm flex items-center justify-center text-[9px] font-black ${
                    isGreenHome
                      ? 'bg-emerald-600 text-emerald-100 shadow-inner'
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

          {/* Base Yard - Green (Top-Right 6x6) */}
          <div className="col-span-6 row-span-6 bg-gradient-to-bl from-emerald-600 via-emerald-700 to-emerald-900 rounded-2xl p-2.5 flex flex-col justify-between border-2 border-emerald-400/60 shadow-inner">
            <span className="text-[10px] font-black uppercase text-white tracking-widest drop-shadow">
              {t.green}
            </span>
            <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-2.5 rounded-xl backdrop-blur-xs shadow-inner">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900/80 border-2 border-emerald-500/40 flex items-center justify-center shadow-inner"
                />
              ))}
            </div>
          </div>

          {/* Left Track - Red Pathway (6x3) */}
          <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-0.5 bg-slate-900/90 rounded-l-xl p-0.5">
            {Array.from({ length: 18 }).map((_, i) => {
              const row = Math.floor(i / 6);
              const col = i % 6;
              const isRedHome = row === 1 && col > 0;
              const isStart = row === 0 && col === 1;
              return (
                <div
                  key={i}
                  className={`rounded-sm flex items-center justify-center text-[9px] font-black ${
                    isRedHome
                      ? 'bg-rose-600 text-rose-100 shadow-inner'
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

          {/* Center 3x3 Home Triangle */}
          <div className="col-span-3 row-span-3 bg-gradient-to-br from-amber-600 via-yellow-500 to-amber-700 rounded-xl p-1 flex items-center justify-center shadow-2xl relative border-2 border-amber-300">
            <div className="w-full h-full bg-slate-950/90 rounded-lg flex flex-col items-center justify-center p-1">
              <span className="text-[10px] font-black text-amber-300 tracking-wider">
                🏆 HOME
              </span>
              <div className="grid grid-cols-2 gap-1 mt-1">
                {COLORS.map((c) => {
                  const count = gameState.tokens[c].filter((t) => t.step >= 58).length;
                  return (
                    <span
                      key={c}
                      className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded-md ${COLOR_MAP[c].bg} text-white`}
                    >
                      {count}/4
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Track - Yellow Pathway (6x3) */}
          <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-0.5 bg-slate-900/90 rounded-r-xl p-0.5">
            {Array.from({ length: 18 }).map((_, i) => {
              const row = Math.floor(i / 6);
              const col = i % 6;
              const isYellowHome = row === 1 && col < 5;
              const isStart = row === 2 && col === 4;
              return (
                <div
                  key={i}
                  className={`rounded-sm flex items-center justify-center text-[9px] font-black ${
                    isYellowHome
                      ? 'bg-amber-500 text-amber-100 shadow-inner'
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

          {/* Base Yard - Blue (Bottom-Left 6x6) */}
          <div className="col-span-6 row-span-6 bg-gradient-to-tr from-sky-600 via-sky-700 to-sky-900 rounded-2xl p-2.5 flex flex-col justify-between border-2 border-sky-400/60 shadow-inner">
            <span className="text-[10px] font-black uppercase text-white tracking-widest drop-shadow">
              {t.blue}
            </span>
            <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-2.5 rounded-xl backdrop-blur-xs shadow-inner">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900/80 border-2 border-sky-500/40 flex items-center justify-center shadow-inner"
                />
              ))}
            </div>
          </div>

          {/* Bottom Track - Blue Pathway (3x6) */}
          <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-0.5 bg-slate-900/90 rounded-b-xl p-0.5">
            {Array.from({ length: 18 }).map((_, i) => {
              const isBlueHome = i % 3 === 1 && i < 15;
              const isStart = i === 13;
              return (
                <div
                  key={i}
                  className={`rounded-sm flex items-center justify-center text-[9px] font-black ${
                    isBlueHome
                      ? 'bg-sky-600 text-sky-100 shadow-inner'
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

          {/* Base Yard - Yellow (Bottom-Right 6x6) */}
          <div className="col-span-6 row-span-6 bg-gradient-to-tl from-amber-500 via-amber-600 to-amber-800 rounded-2xl p-2.5 flex flex-col justify-between border-2 border-amber-300/60 shadow-inner">
            <span className="text-[10px] font-black uppercase text-white tracking-widest drop-shadow">
              {t.yellow}
            </span>
            <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-2.5 rounded-xl backdrop-blur-xs shadow-inner">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900/80 border-2 border-amber-400/40 flex items-center justify-center shadow-inner"
                />
              ))}
            </div>
          </div>
        </div>

        {/* 3D Animated Tokens Floating & Stepping Accurately on the Grid */}
        <div className="absolute inset-0 pointer-events-none p-2.5">
          {COLORS.flatMap((color) =>
            gameState.tokens[color].map((token) => {
              const { topPercent, leftPercent } = getTokenGridPosition(token);
              const isCurrentPlayerToken = color === gameState.currentTurn && gameState.hasRolled;
              const canMove =
                isCurrentPlayerToken &&
                (token.step === -1 ? gameState.diceValue === 6 : token.step + gameState.diceValue <= 58);

              return (
                <button
                  key={`${color}-${token.id}`}
                  id={`tok-active-${color}-${token.id}`}
                  onClick={() => handleTokenClick(token)}
                  disabled={!canMove}
                  className={`pointer-events-auto absolute w-7 h-7 sm:w-8 sm:h-8 rounded-full flex flex-col items-center justify-center text-white font-black text-xs transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 ${
                    COLOR_MAP[color].bg
                  } border-2 border-white shadow-2xl ${
                    canMove
                      ? 'scale-120 ring-4 ring-amber-300 animate-bounce cursor-pointer z-40'
                      : 'cursor-default z-20'
                  }`}
                  style={{
                    top: `${topPercent}%`,
                    left: `${leftPercent}%`,
                  }}
                >
                  {/* 3D Pawn Crown / Ridge */}
                  <div className="w-3.5 h-3.5 rounded-full bg-white/90 shadow-inner flex items-center justify-center">
                    <span className="text-[8px] text-slate-900 font-extrabold">{token.id + 1}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Action / 3D Rolling Dice Dock */}
      <div className="w-full flex flex-col items-center gap-2 mt-2 z-20">
        <div className="flex items-center gap-4">
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
            {/* 3D Isometric Rolling Dice Box */}
            <div
              className={`w-10 h-10 rounded-xl bg-white text-slate-950 flex items-center justify-center text-2xl font-black shadow-2xl border-2 border-slate-300 transition-transform duration-500 ${
                gameState.isRolling ? 'animate-spin' : ''
              }`}
              style={{
                transform: `rotateX(${diceRotation.x}deg) rotateY(${diceRotation.y}deg)`,
              }}
            >
              {gameState.diceValue}
            </div>

            <span className="text-base font-extrabold">
              {gameState.isRolling ? t.rolling : gameState.hasRolled ? 'اختر قطعتك للتحريك' : t.rollDice}
            </span>
          </button>
        </div>

        {/* Winner Celebration Modal */}
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
