import React, { useState, useEffect, useMemo } from 'react';
import { SupportedLanguage, TawlaState, TawlaChecker } from '../types';
import { sound } from '../utils/sound';
import { translations } from '../utils/translations';
import confetti from 'canvas-confetti';
import { RotateCw, Trophy, Sparkles } from 'lucide-react';

interface ThreeTawlaProps {
  lang: SupportedLanguage;
  playMode: 'pass_play' | 'vs_ai' | 'tiktok_live';
  onVictory?: (winner: string) => void;
  is3DView: boolean;
  activeTeamBonus?: string | null;
}

// Setup standard starting checkers configuration for 24 points
function createInitialTawlaState(): TawlaState {
  // Initialize 24 empty points
  const points = Array.from({ length: 24 }, (_, i) => ({
    pointIndex: i,
    checkers: [] as TawlaChecker[],
  }));

  const addCheckers = (pointIdx: number, color: 'white' | 'black', count: number) => {
    for (let i = 0; i < count; i++) {
      points[pointIdx].checkers.push({ id: `${color}-${pointIdx}-${i}`, color });
    }
  };

  // Standard Backgammon Setup:
  // White moves from point 0 to point 23 (bearing off after 23)
  // Black moves from point 23 to point 0 (bearing off after 0)
  addCheckers(0, 'white', 2);
  addCheckers(11, 'white', 5);
  addCheckers(16, 'white', 3);
  addCheckers(18, 'white', 5);

  addCheckers(23, 'black', 2);
  addCheckers(12, 'black', 5);
  addCheckers(7, 'black', 3);
  addCheckers(5, 'black', 5);

  return {
    points,
    bar: { white: [], black: [] },
    borneOff: { white: [], black: [] },
    currentTurn: 'white',
    dice: [3, 5],
    usedDice: [false, false],
    isRolling: false,
    hasRolled: false,
    selectedPoint: null,
    validMoves: [],
    winner: null,
  };
}

export const ThreeTawla: React.FC<ThreeTawlaProps> = ({
  lang,
  playMode,
  onVictory,
  is3DView,
  activeTeamBonus,
}) => {
  const t = translations[lang];

  const [gameState, setGameState] = useState<TawlaState>(createInitialTawlaState);
  const [diceRotation, setDiceRotation] = useState({ x: 0, y: 0 });
  const [statusMessage, setStatusMessage] = useState<string>('');

  const { points, bar, borneOff, currentTurn, dice, usedDice, isRolling, hasRolled, selectedPoint, validMoves, winner } = gameState;

  // Roll the two dice
  const handleRollDice = () => {
    if (isRolling || hasRolled || winner) return;

    sound.playDiceRoll();
    setGameState((prev) => ({ ...prev, isRolling: true, selectedPoint: null, validMoves: [] }));

    setDiceRotation({
      x: Math.PI * 4 + Math.random() * 2,
      y: Math.PI * 4 + Math.random() * 2,
    });

    setTimeout(() => {
      let d1 = Math.floor(Math.random() * 6) + 1;
      let d2 = Math.floor(Math.random() * 6) + 1;

      // TikTok gift bonus: gives doubles!
      if (activeTeamBonus && Math.random() > 0.6) {
        d1 = 6;
        d2 = 6;
      }

      const isDoubles = d1 === d2;
      const diceList = isDoubles ? [d1, d1, d1, d1] : [d1, d2];
      const usedList = isDoubles ? [false, false, false, false] : [false, false];

      setGameState((prev) => ({
        ...prev,
        dice: diceList,
        usedDice: usedList,
        isRolling: false,
        hasRolled: true,
      }));

      setStatusMessage(isDoubles ? `دوش (${d1}-${d2})! أربع رميات كاملة!` : `رمية النرد: ${d1} و ${d2}`);
    }, 600);
  };

  // Check if all remaining checkers for a color are in home board
  const canBearOff = (color: 'white' | 'black'): boolean => {
    if (bar[color].length > 0) return false;
    if (color === 'white') {
      // White home board is 18 to 23
      return points.every((p) => p.pointIndex >= 18 || p.checkers.every((c) => c.color !== 'white'));
    } else {
      // Black home board is 0 to 5
      return points.every((p) => p.pointIndex <= 5 || p.checkers.every((c) => c.color !== 'black'));
    }
  };

  // Select point or checker on bar
  const handlePointClick = (pointIdx: number) => {
    if (!hasRolled || isRolling || winner || currentTurn !== 'white') return;

    // Check if player has checker on bar
    const hasBarCheckers = bar.white.length > 0;

    // If destination point was clicked
    if (selectedPoint !== null && validMoves.includes(pointIdx)) {
      executeMove(selectedPoint, pointIdx);
      return;
    }

    if (hasBarCheckers) {
      setStatusMessage('عليك إدخال القشاط المحبوس على البار أولاً!');
      return;
    }

    const clickedPoint = points[pointIdx];
    const hasWhiteChecker = clickedPoint.checkers.some((c) => c.color === 'white');

    if (!hasWhiteChecker) {
      setGameState((prev) => ({ ...prev, selectedPoint: null, validMoves: [] }));
      return;
    }

    // Calculate valid moves with remaining unused dice
    const targets: number[] = [];
    const availableDice = dice.filter((_, idx) => !usedDice[idx]);

    availableDice.forEach((d) => {
      const targetIdx = pointIdx + d;
      if (targetIdx <= 23) {
        const dest = points[targetIdx];
        const blackCheckers = dest.checkers.filter((c) => c.color === 'black');
        if (blackCheckers.length <= 1) {
          targets.push(targetIdx);
        }
      } else if (canBearOff('white')) {
        targets.push(99); // 99 means bear off
      }
    });

    setGameState((prev) => ({
      ...prev,
      selectedPoint: pointIdx,
      validMoves: targets,
    }));
  };

  // Handle re-entering from Bar
  const handleReEnterFromBar = () => {
    if (bar.white.length === 0 || !hasRolled || isRolling || winner) return;

    const availableDice = dice.filter((_, idx) => !usedDice[idx]);
    const validEntries: number[] = [];

    availableDice.forEach((d) => {
      const enterIdx = d - 1; // 0 to 5
      const blackCheckers = points[enterIdx].checkers.filter((c) => c.color === 'black');
      if (blackCheckers.length <= 1) {
        validEntries.push(enterIdx);
      }
    });

    setGameState((prev) => ({
      ...prev,
      selectedPoint: -1, // -1 denotes Bar
      validMoves: validEntries,
    }));
    setStatusMessage('اختر خانة الدخول من 1 إلى 6');
  };

  // Execute the move
  const executeMove = (fromIdx: number, toIdx: number) => {
    sound.playTileClick();

    setGameState((prev) => {
      const newPoints = prev.points.map((p) => ({ ...p, checkers: [...p.checkers] }));
      const newBar = { white: [...prev.bar.white], black: [...prev.bar.black] };
      const newBorneOff = { white: [...prev.borneOff.white], black: [...prev.borneOff.black] };
      const newUsedDice = [...prev.usedDice];

      // Determine which die was used
      let distance = 0;
      if (fromIdx === -1) {
        distance = toIdx + 1;
      } else if (toIdx === 99) {
        distance = 24 - fromIdx; // Bearing off
      } else {
        distance = toIdx - fromIdx;
      }

      // Mark the first available matching die as used
      let dieIdx = newUsedDice.findIndex((used, idx) => !used && prev.dice[idx] === distance);
      if (dieIdx === -1) {
        // Fallback: use any die that covers the distance
        dieIdx = newUsedDice.findIndex((used, idx) => !used && prev.dice[idx] >= distance);
      }
      if (dieIdx !== -1) {
        newUsedDice[dieIdx] = true;
      }

      // Move checker
      let movingChecker: TawlaChecker | undefined;

      if (fromIdx === -1) {
        movingChecker = newBar.white.pop();
      } else {
        movingChecker = newPoints[fromIdx].checkers.pop();
      }

      if (toIdx === 99) {
        // Borne off!
        if (movingChecker) newBorneOff.white.push(movingChecker);
        sound.playFanfare();
      } else if (movingChecker) {
        // Check if hitting enemy blot
        const enemyCheckers = newPoints[toIdx].checkers.filter((c) => c.color === 'black');
        if (enemyCheckers.length === 1) {
          const hitChecker = newPoints[toIdx].checkers.pop()!;
          newBar.black.push(hitChecker);
          sound.playCapture();
          setStatusMessage('💥 أكلت قشاط الخصم وأرسلته إلى البار!');
        }
        newPoints[toIdx].checkers.push(movingChecker);
      }

      // Check win
      let newWinner = prev.winner;
      if (newBorneOff.white.length === 15) {
        newWinner = 'white';
        sound.playFanfare();
        confetti({ particleCount: 150 });
        onVictory?.('white');
      }

      // Check if all dice used
      const allDiceUsed = newUsedDice.every((used) => used);

      return {
        ...prev,
        points: newPoints,
        bar: newBar,
        borneOff: newBorneOff,
        usedDice: newUsedDice,
        selectedPoint: null,
        validMoves: [],
        winner: newWinner,
        currentTurn: allDiceUsed && !newWinner ? 'black' : prev.currentTurn,
        hasRolled: !allDiceUsed,
      };
    });
  };

  // AI Opponent Turn (Black)
  useEffect(() => {
    if (currentTurn !== 'black' || winner) return;

    const timer = setTimeout(() => {
      // AI rolls dice
      sound.playDiceRoll();
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const isDoubles = d1 === d2;
      const aiDice = isDoubles ? [d1, d1, d1, d1] : [d1, d2];

      setTimeout(() => {
        sound.playTileClick();
        // Execute simple valid AI moves
        setGameState((prev) => {
          const newPoints = prev.points.map((p) => ({ ...p, checkers: [...p.checkers] }));
          const newBar = { white: [...prev.bar.white], black: [...prev.bar.black] };
          const newBorneOff = { white: [...prev.borneOff.white], black: [...prev.borneOff.black] };

          aiDice.forEach((d) => {
            // Priority: re-enter if on bar
            if (newBar.black.length > 0) {
              const enterIdx = 24 - d;
              const whiteOnPoint = newPoints[enterIdx].checkers.filter((c) => c.color === 'white');
              if (whiteOnPoint.length <= 1) {
                if (whiteOnPoint.length === 1) {
                  const hit = newPoints[enterIdx].checkers.pop()!;
                  newBar.white.push(hit);
                }
                const ch = newBar.black.pop()!;
                newPoints[enterIdx].checkers.push(ch);
              }
              return;
            }

            // Normal move from high to low
            for (let i = 23; i >= 0; i--) {
              const hasBlack = newPoints[i].checkers.some((c) => c.color === 'black');
              if (hasBlack) {
                const target = i - d;
                if (target >= 0) {
                  const whiteOnTarget = newPoints[target].checkers.filter((c) => c.color === 'white');
                  if (whiteOnTarget.length <= 1) {
                    if (whiteOnTarget.length === 1) {
                      const hit = newPoints[target].checkers.pop()!;
                      newBar.white.push(hit);
                    }
                    const ch = newPoints[i].checkers.pop()!;
                    newPoints[target].checkers.push(ch);
                    break;
                  }
                } else if (target < 0) {
                  // Bear off
                  const ch = newPoints[i].checkers.pop()!;
                  newBorneOff.black.push(ch);
                  break;
                }
              }
            }
          });

          // Check AI win
          let newWin = prev.winner;
          if (newBorneOff.black.length >= 15) {
            newWin = 'black';
          }

          return {
            ...prev,
            points: newPoints,
            bar: newBar,
            borneOff: newBorneOff,
            currentTurn: 'white',
            hasRolled: false,
            winner: newWin,
          };
        });
        setStatusMessage('المنافس لعب رميته!');
      }, 700);
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentTurn, winner]);

  const restartTawla = () => {
    setGameState(createInitialTawlaState());
    setStatusMessage('');
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-2 select-none overflow-hidden">
      {/* Header bar */}
      <div className="w-full flex items-center justify-between bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-700/60 shadow-lg z-10">
        <div className="flex items-center gap-2">
          <div
            className={`w-3.5 h-3.5 rounded-full ${
              currentTurn === 'white' ? 'bg-amber-100 ring-2 ring-amber-300' : 'bg-slate-900 ring-2 ring-slate-400'
            }`}
          />
          <span className="text-xs sm:text-sm font-bold text-slate-200">
            {currentTurn === 'white' ? t.yourTurn : t.aiTurn}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <span className="bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700">
            ⚪ أخرجت: {borneOff.white.length}
          </span>
          <span className="bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700">
            ⚫ الخصم: {borneOff.black.length}
          </span>
        </div>

        <button
          onClick={restartTawla}
          id="btn-tawla-restart"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title={t.playAgain}
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* 3D Handcrafted Inlaid Walnut Tawla Board */}
      <div
        className={`relative w-full max-w-[420px] aspect-[4/3] bg-gradient-to-br from-amber-950 via-stone-900 to-amber-950 rounded-3xl p-3 border-4 border-amber-600/70 shadow-[0_15px_40px_rgba(0,0,0,0.9)] flex flex-col justify-between my-auto transition-transform duration-500 ${
          is3DView ? 'rotate-x-[26deg] scale-[0.94] shadow-2xl' : ''
        }`}
        style={{ perspective: '1100px', transformStyle: 'preserve-3d' }}
      >
        {/* Top Half of Board (Points 12 to 23) */}
        <div className="w-full h-[45%] grid grid-cols-12 gap-0.5 relative border-b-4 border-amber-900/80 pb-1">
          {Array.from({ length: 12 }).map((_, i) => {
            const pointIdx = 12 + i;
            const isSelected = selectedPoint === pointIdx;
            const isValidTarget = validMoves.includes(pointIdx);
            const point = points[pointIdx];
            const isEven = i % 2 === 0;

            return (
              <button
                key={pointIdx}
                id={`tawla-point-${pointIdx}`}
                onClick={() => handlePointClick(pointIdx)}
                className={`relative w-full h-full flex flex-col items-center justify-start overflow-hidden rounded-b-lg transition-all ${
                  isValidTarget ? 'ring-2 ring-emerald-400 bg-emerald-500/20 animate-pulse' : ''
                } ${isSelected ? 'ring-2 ring-amber-400 bg-amber-500/30' : ''}`}
              >
                {/* Triangular Wood Marquetry Point */}
                <div
                  className={`w-full h-full clip-triangle-down ${
                    isEven
                      ? 'bg-gradient-to-b from-amber-800 to-amber-950 border-x border-amber-700/50'
                      : 'bg-gradient-to-b from-amber-200 to-amber-500/90 border-x border-amber-300/50'
                  }`}
                  style={{
                    clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)',
                  }}
                />

                {/* Stack of 3D Checkers on this point */}
                <div className="absolute top-1 flex flex-col items-center gap-0.5 pointer-events-none">
                  {point.checkers.slice(0, 5).map((checker, cIdx) => (
                    <div
                      key={cIdx}
                      className={`w-5 h-2.5 sm:w-6 sm:h-3 rounded-full border shadow-md ${
                        checker.color === 'white'
                          ? 'bg-gradient-to-br from-amber-50 via-white to-stone-200 border-amber-200 shadow-amber-900/30'
                          : 'bg-gradient-to-br from-stone-900 via-slate-950 to-stone-900 border-slate-700 shadow-black'
                      }`}
                    >
                      <div className="w-2 h-1 mx-auto my-0.5 rounded-full bg-black/10" />
                    </div>
                  ))}
                  {point.checkers.length > 5 && (
                    <span className="text-[8px] font-black text-amber-300 bg-slate-950/80 px-1 rounded">
                      +{point.checkers.length - 5}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Center Wooden Bar / Partition */}
        <div className="w-full h-7 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 border-y-2 border-amber-600/50 flex items-center justify-between px-3 shadow-inner my-0.5">
          {/* Checkers on Bar: White */}
          <button
            onClick={handleReEnterFromBar}
            disabled={bar.white.length === 0}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${
              bar.white.length > 0
                ? 'bg-amber-100 text-slate-950 animate-bounce cursor-pointer'
                : 'text-slate-400 opacity-50'
            }`}
          >
            <span>⚪ في الحبس: {bar.white.length}</span>
          </button>

          {/* Center Brass Logo */}
          <span className="text-[10px] font-black text-amber-400 tracking-wider">
            طاولة زهر الشرقية
          </span>

          {/* Checkers on Bar: Black */}
          <div className="text-[10px] font-bold text-slate-300">
            ⚫ الخصم: {bar.black.length}
          </div>
        </div>

        {/* Bottom Half of Board (Points 11 to 0) */}
        <div className="w-full h-[45%] grid grid-cols-12 gap-0.5 relative border-t-4 border-amber-900/80 pt-1">
          {Array.from({ length: 12 }).map((_, i) => {
            const pointIdx = 11 - i;
            const isSelected = selectedPoint === pointIdx;
            const isValidTarget = validMoves.includes(pointIdx);
            const point = points[pointIdx];
            const isEven = i % 2 === 0;

            return (
              <button
                key={pointIdx}
                id={`tawla-point-${pointIdx}`}
                onClick={() => handlePointClick(pointIdx)}
                className={`relative w-full h-full flex flex-col items-center justify-end overflow-hidden rounded-t-lg transition-all ${
                  isValidTarget ? 'ring-2 ring-emerald-400 bg-emerald-500/20 animate-pulse' : ''
                } ${isSelected ? 'ring-2 ring-amber-400 bg-amber-500/30' : ''}`}
              >
                {/* Triangular Wood Marquetry Point (Upwards) */}
                <div
                  className={`w-full h-full ${
                    isEven
                      ? 'bg-gradient-to-t from-amber-800 to-amber-950 border-x border-amber-700/50'
                      : 'bg-gradient-to-t from-amber-200 to-amber-500/90 border-x border-amber-300/50'
                  }`}
                  style={{
                    clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                  }}
                />

                {/* Stack of 3D Checkers on this point */}
                <div className="absolute bottom-1 flex flex-col-reverse items-center gap-0.5 pointer-events-none">
                  {point.checkers.slice(0, 5).map((checker, cIdx) => (
                    <div
                      key={cIdx}
                      className={`w-5 h-2.5 sm:w-6 sm:h-3 rounded-full border shadow-md ${
                        checker.color === 'white'
                          ? 'bg-gradient-to-br from-amber-50 via-white to-stone-200 border-amber-200 shadow-amber-900/30'
                          : 'bg-gradient-to-br from-stone-900 via-slate-950 to-stone-900 border-slate-700 shadow-black'
                      }`}
                    >
                      <div className="w-2 h-1 mx-auto my-0.5 rounded-full bg-black/10" />
                    </div>
                  ))}
                  {point.checkers.length > 5 && (
                    <span className="text-[8px] font-black text-amber-300 bg-slate-950/80 px-1 rounded">
                      +{point.checkers.length - 5}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Bearing Off Button / Indicator */}
        {validMoves.includes(99) && (
          <button
            onClick={() => executeMove(selectedPoint!, 99)}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-3 py-2 rounded-xl shadow-xl animate-bounce z-30"
          >
            إخراج القشاط 🎯
          </button>
        )}
      </div>

      {/* Control Dock & 3D Bone Dice Pair */}
      <div className="w-full flex flex-col items-center gap-2 mt-2 z-20">
        {statusMessage && (
          <div className="text-[11px] font-semibold text-amber-300 bg-slate-900/90 px-3 py-0.5 rounded-full border border-amber-500/30">
            {statusMessage}
          </div>
        )}

        <div className="flex items-center gap-4">
          {/* Pair of 3D Bone Dice */}
          <div className="flex items-center gap-2">
            {dice.map((d, idx) => (
              <div
                key={idx}
                className={`w-8 h-8 rounded-lg bg-gradient-to-br from-stone-50 to-amber-100 border-2 border-stone-300 flex items-center justify-center text-lg font-black text-slate-900 shadow-lg ${
                  usedDice[idx] ? 'opacity-30 line-through scale-90' : 'scale-100 ring-2 ring-amber-400/60'
                } ${isRolling ? 'animate-spin' : ''}`}
              >
                {d}
              </div>
            ))}
          </div>

          <button
            onClick={handleRollDice}
            id="btn-tawla-roll"
            disabled={isRolling || hasRolled || currentTurn !== 'white' || !!winner}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm shadow-xl transition-all ${
              hasRolled || currentTurn !== 'white'
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:brightness-110 active:scale-95 cursor-pointer ring-2 ring-amber-300 animate-pulse'
            }`}
          >
            <span>{isRolling ? t.rolling : hasRolled ? 'حرك القواشيط' : t.rollDice}</span>
          </button>
        </div>
      </div>

      {/* Winner Modal */}
      {winner && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-50 animate-fade-in">
          <Trophy className="w-16 h-16 text-amber-400 animate-bounce mb-3" />
          <h2 className="text-2xl font-black text-amber-300 mb-1">
            {winner === 'white' ? t.winner : 'فاز المنافس!'}
          </h2>
          <p className="text-sm text-slate-300 mb-4 font-bold">
            {winner === 'white' ? 'أخرجت جميع قواشيطك أولاً يا بطل الطاولة! 🪵' : 'جولة رائعة، حظ أوفر في القادمة!'}
          </p>
          <button
            onClick={restartTawla}
            id="btn-tawla-play-again"
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-sm shadow-xl hover:brightness-110 active:scale-95 cursor-pointer"
          >
            {t.playAgain}
          </button>
        </div>
      )}
    </div>
  );
};
