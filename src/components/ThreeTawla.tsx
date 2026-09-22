import React, { useState, useEffect } from 'react';
import { SupportedLanguage, TawlaState, TawlaChecker } from '../types';
import { sound } from '../utils/sound';
import { translations } from '../utils/translations';
import confetti from 'canvas-confetti';
import { RotateCw, Trophy, Sparkles, Flame, ShieldAlert, ArrowUpRight } from 'lucide-react';

interface ThreeTawlaProps {
  lang: SupportedLanguage;
  playMode: 'pass_play' | 'vs_ai' | 'tiktok_live';
  onVictory?: (winner: string) => void;
  is3DView: boolean;
  activeTeamBonus?: string | null;
}

// Setup standard starting checkers configuration for 24 points
function createInitialTawlaState(): TawlaState {
  const points = Array.from({ length: 24 }, (_, i) => ({
    pointIndex: i,
    checkers: [] as TawlaChecker[],
  }));

  const addCheckers = (pointIdx: number, color: 'white' | 'black', count: number) => {
    for (let i = 0; i < count; i++) {
      points[pointIdx].checkers.push({ id: `${color}-${pointIdx}-${i}`, color });
    }
  };

  // Standard Backgammon Starting Layout
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
  const [screenShake, setScreenShake] = useState<boolean>(false);
  const [slamBanner, setSlamBanner] = useState<string | null>(null);

  const { points, bar, borneOff, currentTurn, dice, usedDice, isRolling, hasRolled, selectedPoint, validMoves, winner } = gameState;

  const triggerSlam = (msg: string) => {
    sound.playDoubleSlam();
    setScreenShake(true);
    setSlamBanner(msg);
    setTimeout(() => setScreenShake(false), 350);
    setTimeout(() => setSlamBanner(null), 2500);
  };

  // Roll the two 3D dice
  const handleRollDice = () => {
    if (isRolling || hasRolled || winner) return;

    sound.playDiceRoll();
    setGameState((prev) => ({ ...prev, isRolling: true, selectedPoint: null, validMoves: [] }));

    setTimeout(() => {
      let d1 = Math.floor(Math.random() * 6) + 1;
      let d2 = Math.floor(Math.random() * 6) + 1;

      if (activeTeamBonus && Math.random() > 0.5) {
        d1 = 6;
        d2 = 6;
      }

      const isDoubles = d1 === d2;
      const diceList = isDoubles ? [d1, d1, d1, d1] : [d1, d2];
      const usedList = isDoubles ? [false, false, false, false] : [false, false];

      if (isDoubles) {
        triggerSlam(`دوش (${d1}-${d2})! أربع حركات كاملة! 🔥`);
      }

      setGameState((prev) => ({
        ...prev,
        dice: diceList,
        usedDice: usedList,
        isRolling: false,
        hasRolled: true,
      }));
    }, 600);
  };

  // Check if all remaining checkers for a color are in home board
  const canBearOff = (color: 'white' | 'black'): boolean => {
    if (bar[color].length > 0) return false;
    if (color === 'white') {
      return points.every((p) => p.pointIndex >= 18 || p.checkers.every((c) => c.color !== 'white'));
    } else {
      return points.every((p) => p.pointIndex <= 5 || p.checkers.every((c) => c.color !== 'black'));
    }
  };

  // Select point or checker on bar
  const handlePointClick = (pointIdx: number) => {
    if (!hasRolled || isRolling || winner || currentTurn !== 'white') return;

    const hasBarCheckers = bar.white.length > 0;

    // Destination clicked
    if (selectedPoint !== null && validMoves.includes(pointIdx)) {
      executeMove(selectedPoint, pointIdx);
      return;
    }

    if (hasBarCheckers) {
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

  // Re-enter from Bar
  const handleReEnterFromBar = () => {
    if (bar.white.length === 0 || !hasRolled || isRolling || winner) return;

    const availableDice = dice.filter((_, idx) => !usedDice[idx]);
    const validEntries: number[] = [];

    availableDice.forEach((d) => {
      const enterIdx = d - 1;
      const blackCheckers = points[enterIdx].checkers.filter((c) => c.color === 'black');
      if (blackCheckers.length <= 1) {
        validEntries.push(enterIdx);
      }
    });

    setGameState((prev) => ({
      ...prev,
      selectedPoint: -1,
      validMoves: validEntries,
    }));
  };

  // Execute the move
  const executeMove = (fromIdx: number, toIdx: number) => {
    sound.playTileClick();

    setGameState((prev) => {
      const newPoints = prev.points.map((p) => ({ ...p, checkers: [...p.checkers] }));
      const newBar = { white: [...prev.bar.white], black: [...prev.bar.black] };
      const newBorneOff = { white: [...prev.borneOff.white], black: [...prev.borneOff.black] };
      const newUsedDice = [...prev.usedDice];

      let distance = 0;
      if (fromIdx === -1) {
        distance = toIdx + 1;
      } else if (toIdx === 99) {
        distance = 24 - fromIdx;
      } else {
        distance = toIdx - fromIdx;
      }

      let dieIdx = newUsedDice.findIndex((used, idx) => !used && prev.dice[idx] === distance);
      if (dieIdx === -1) {
        dieIdx = newUsedDice.findIndex((used, idx) => !used && prev.dice[idx] >= distance);
      }
      if (dieIdx !== -1) {
        newUsedDice[dieIdx] = true;
      }

      let movingChecker: TawlaChecker | undefined;

      if (fromIdx === -1) {
        movingChecker = newBar.white.pop();
      } else {
        movingChecker = newPoints[fromIdx].checkers.pop();
      }

      if (toIdx === 99) {
        if (movingChecker) newBorneOff.white.push(movingChecker);
        sound.playFanfare();
      } else if (movingChecker) {
        const dest = newPoints[toIdx];
        const blackCheckers = dest.checkers.filter((c) => c.color === 'black');
        if (blackCheckers.length === 1) {
          const hitChecker = dest.checkers.pop()!;
          newBar.black.push(hitChecker);
          triggerSlam('ضربة معلم! أكل القشاط الأسود إلى الحبس! 💥');
        }
        dest.checkers.push(movingChecker);
      }

      let winner = prev.winner;
      if (newBorneOff.white.length === 15) {
        winner = 'white';
        sound.playFanfare();
        confetti({ particleCount: 200, spread: 80 });
        onVictory?.('white');
      }

      const allUsed = newUsedDice.every((u) => u);

      return {
        ...prev,
        points: newPoints,
        bar: newBar,
        borneOff: newBorneOff,
        usedDice: newUsedDice,
        selectedPoint: null,
        validMoves: [],
        winner,
        currentTurn: allUsed ? 'black' : prev.currentTurn,
        hasRolled: allUsed ? false : prev.hasRolled,
      };
    });
  };

  // AI Opponent (Black) Move
  useEffect(() => {
    if (currentTurn !== 'black' || winner) return;

    if (!hasRolled && !isRolling) {
      const timer = setTimeout(() => {
        handleRollDice();
      }, 750);
      return () => clearTimeout(timer);
    }

    if (hasRolled && !isRolling) {
      const timer = setTimeout(() => {
        const unusedIdx = usedDice.findIndex((u) => !u);
        if (unusedIdx === -1) {
          setGameState((prev) => ({
            ...prev,
            currentTurn: 'white',
            hasRolled: false,
          }));
          return;
        }

        const dieVal = dice[unusedIdx];

        // 1. If AI has checkers on bar
        if (bar.black.length > 0) {
          const enterIdx = 24 - dieVal;
          const dest = points[enterIdx];
          const whiteCount = dest.checkers.filter((c) => c.color === 'white').length;
          if (whiteCount <= 1) {
            sound.playTileClick();
            setGameState((prev) => {
              const newPoints = prev.points.map((p) => ({ ...p, checkers: [...p.checkers] }));
              const newBar = { white: [...prev.bar.white], black: [...prev.bar.black] };
              const newUsed = [...prev.usedDice];
              newUsed[unusedIdx] = true;

              const c = newBar.black.pop()!;
              if (whiteCount === 1) {
                const hit = newPoints[enterIdx].checkers.pop()!;
                newBar.white.push(hit);
                triggerSlam('المنافس أكل قشاطك إلى الحبس! 💥');
              }
              newPoints[enterIdx].checkers.push(c);

              const allDone = newUsed.every((u) => u);
              return {
                ...prev,
                points: newPoints,
                bar: newBar,
                usedDice: newUsed,
                currentTurn: allDone ? 'white' : 'black',
                hasRolled: allDone ? false : prev.hasRolled,
              };
            });
            return;
          }
        }

        // 2. Otherwise find a valid black move from highest index down
        let moveMade = false;
        for (let pIdx = 23; pIdx >= 0; pIdx--) {
          const point = points[pIdx];
          if (point.checkers.some((c) => c.color === 'black')) {
            const targetIdx = pIdx - dieVal;
            if (targetIdx >= 0) {
              const dest = points[targetIdx];
              const whiteCount = dest.checkers.filter((c) => c.color === 'white').length;
              if (whiteCount <= 1) {
                sound.playTileClick();
                setGameState((prev) => {
                  const newPoints = prev.points.map((p) => ({ ...p, checkers: [...p.checkers] }));
                  const newBar = { white: [...prev.bar.white], black: [...prev.bar.black] };
                  const newUsed = [...prev.usedDice];
                  newUsed[unusedIdx] = true;

                  const c = newPoints[pIdx].checkers.pop()!;
                  if (whiteCount === 1) {
                    const hit = newPoints[targetIdx].checkers.pop()!;
                    newBar.white.push(hit);
                    triggerSlam('المنافس أكل قشاطك إلى الحبس! 💥');
                  }
                  newPoints[targetIdx].checkers.push(c);

                  const allDone = newUsed.every((u) => u);
                  return {
                    ...prev,
                    points: newPoints,
                    bar: newBar,
                    usedDice: newUsed,
                    currentTurn: allDone ? 'white' : 'black',
                    hasRolled: allDone ? false : prev.hasRolled,
                  };
                });
                moveMade = true;
                break;
              }
            } else if (canBearOff('black')) {
              sound.playFanfare();
              setGameState((prev) => {
                const newPoints = prev.points.map((p) => ({ ...p, checkers: [...p.checkers] }));
                const newBorne = { white: [...prev.borneOff.white], black: [...prev.borneOff.black] };
                const newUsed = [...prev.usedDice];
                newUsed[unusedIdx] = true;

                const c = newPoints[pIdx].checkers.pop()!;
                newBorne.black.push(c);

                const allDone = newUsed.every((u) => u);
                let win = prev.winner;
                if (newBorne.black.length === 15) {
                  win = 'black';
                  sound.playDoubleSlam();
                }

                return {
                  ...prev,
                  points: newPoints,
                  borneOff: newBorne,
                  usedDice: newUsed,
                  winner: win,
                  currentTurn: allDone ? 'white' : 'black',
                  hasRolled: allDone ? false : prev.hasRolled,
                };
              });
              moveMade = true;
              break;
            }
          }
        }

        if (!moveMade) {
          // Cannot use this die, mark as used and proceed
          setGameState((prev) => {
            const newUsed = [...prev.usedDice];
            newUsed[unusedIdx] = true;
            const allDone = newUsed.every((u) => u);
            return {
              ...prev,
              usedDice: newUsed,
              currentTurn: allDone ? 'white' : 'black',
              hasRolled: allDone ? false : prev.hasRolled,
            };
          });
        }
      }, 850);
      return () => clearTimeout(timer);
    }
  }, [currentTurn, hasRolled, isRolling, usedDice, dice, bar.black.length, points, winner]);

  // Render Stacked 3D Checkers
  const renderPointCheckers = (checkers: TawlaChecker[], isTop: boolean) => {
    return (
      <div
        className={`absolute inset-x-0 flex flex-col items-center gap-0.5 ${
          isTop ? 'top-1 flex-col' : 'bottom-1 flex-col-reverse'
        }`}
      >
        {checkers.slice(0, 5).map((checker, idx) => (
          <div
            key={checker.id}
            className={`w-6 h-6 rounded-full border-2 shadow-lg transition-transform ${
              checker.color === 'white'
                ? 'bg-gradient-to-br from-amber-50 via-slate-100 to-amber-200 border-amber-300 text-slate-800'
                : 'bg-gradient-to-br from-slate-900 via-stone-900 to-amber-950 border-amber-700 text-amber-200'
            } flex items-center justify-center`}
          >
            {/* Center engraved rosette */}
            <div className="w-2.5 h-2.5 rounded-full border border-current opacity-40" />
            {idx === 4 && checkers.length > 5 && (
              <span className="text-[9px] font-black absolute">+{checkers.length - 4}</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col items-center justify-between p-2 select-none overflow-hidden transition-transform ${
        screenShake ? 'scale-[1.02] translate-x-1 animate-pulse' : ''
      }`}
    >
      {/* Top HUD */}
      <div className="w-full flex items-center justify-between bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-700/80 shadow-xl z-20">
        <div className="flex items-center gap-2">
          <div
            className={`w-3.5 h-3.5 rounded-full ${
              currentTurn === 'white' ? 'bg-amber-100 ring-2 ring-amber-300' : 'bg-stone-900 ring-2 ring-stone-600'
            } animate-pulse`}
          />
          <span className="text-xs sm:text-sm font-black text-slate-100">
            {currentTurn === 'white' ? 'دورك (الأبيض)' : 'دور المنافس (الأسود) 🤖'}
          </span>
        </div>

        {/* Dice visual chips in HUD */}
        <div className="flex items-center gap-1.5">
          {dice.map((d, i) => (
            <div
              key={i}
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs border ${
                usedDice[i]
                  ? 'bg-slate-800 text-slate-500 border-slate-700 line-through opacity-50'
                  : 'bg-gradient-to-b from-amber-50 to-amber-200 text-slate-950 border-amber-400 shadow-md ring-1 ring-amber-300 animate-pulse'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        <button
          onClick={() => setGameState(createInitialTawlaState())}
          id="btn-tawla-restart"
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title={t.playAgain}
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Action Banner */}
      {slamBanner && (
        <div className="absolute top-14 z-40 pointer-events-none animate-bounce">
          <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 text-slate-950 font-black text-xs sm:text-sm px-4 py-2 rounded-2xl shadow-2xl border-2 border-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-600 fill-current" />
            <span>{slamBanner}</span>
          </div>
        </div>
      )}

      {/* 3D Oriental Marquetry Tawla Board */}
      <div
        className={`relative w-full max-w-[420px] aspect-[4/3] my-auto transition-transform duration-700 ease-out flex items-center justify-center ${
          is3DView
            ? 'rotate-x-[26deg] rotate-z-[-1deg] scale-[0.95] drop-shadow-[0_30px_50px_rgba(0,0,0,0.95)]'
            : ''
        }`}
        style={{ perspective: '1100px', transformStyle: 'preserve-3d' }}
      >
        <div className="w-full h-full bg-gradient-to-br from-amber-950 via-stone-900 to-amber-950 p-2.5 rounded-3xl border-4 border-amber-700/80 shadow-[0_0_40px_rgba(180,83,9,0.3)] flex justify-between relative overflow-hidden">
          {/* Left Table Quadrant (6 top points, 6 bottom points) */}
          <div className="flex-1 flex flex-col justify-between border-r-2 border-amber-900/60 pr-1">
            {/* Top Points 12 to 17 */}
            <div className="flex justify-between h-[45%]">
              {[12, 13, 14, 15, 16, 17].map((pIdx) => {
                const isSelected = selectedPoint === pIdx;
                const isValidTarget = validMoves.includes(pIdx);
                const isOdd = pIdx % 2 === 1;

                return (
                  <button
                    key={pIdx}
                    id={`pt-${pIdx}`}
                    onClick={() => handlePointClick(pIdx)}
                    className={`relative w-1/6 h-full flex flex-col items-center transition-colors ${
                      isSelected
                        ? 'bg-amber-400/30 ring-2 ring-amber-300'
                        : isValidTarget
                        ? 'bg-emerald-500/30 ring-2 ring-emerald-400 cursor-pointer animate-pulse'
                        : ''
                    }`}
                  >
                    {/* Inlaid Triangle */}
                    <div
                      className={`w-full h-full clip-triangle-down opacity-85 ${
                        isOdd ? 'bg-gradient-to-b from-amber-800 to-amber-950' : 'bg-gradient-to-b from-amber-100 to-amber-300'
                      }`}
                      style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
                    />
                    {renderPointCheckers(points[pIdx].checkers, true)}
                  </button>
                );
              })}
            </div>

            {/* Bottom Points 11 down to 6 */}
            <div className="flex justify-between h-[45%]">
              {[11, 10, 9, 8, 7, 6].map((pIdx) => {
                const isSelected = selectedPoint === pIdx;
                const isValidTarget = validMoves.includes(pIdx);
                const isOdd = pIdx % 2 === 1;

                return (
                  <button
                    key={pIdx}
                    id={`pt-${pIdx}`}
                    onClick={() => handlePointClick(pIdx)}
                    className={`relative w-1/6 h-full flex flex-col items-center transition-colors ${
                      isSelected
                        ? 'bg-amber-400/30 ring-2 ring-amber-300'
                        : isValidTarget
                        ? 'bg-emerald-500/30 ring-2 ring-emerald-400 cursor-pointer animate-pulse'
                        : ''
                    }`}
                  >
                    <div
                      className={`w-full h-full opacity-85 ${
                        isOdd ? 'bg-gradient-to-t from-amber-800 to-amber-950' : 'bg-gradient-to-t from-amber-100 to-amber-300'
                      }`}
                      style={{ clipPath: 'polygon(50% 0, 0 100%, 100% 100%)' }}
                    />
                    {renderPointCheckers(points[pIdx].checkers, false)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Central Bar (الحبس) & Dice Resting Zone */}
          <div className="w-12 bg-gradient-to-b from-amber-950 via-stone-900 to-amber-950 border-x-2 border-amber-700/60 flex flex-col items-center justify-between py-2 px-1 z-20">
            {/* White Checkers on Bar (Jail) */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[8px] font-black text-amber-200">البار</span>
              {bar.white.map((c, i) => (
                <button
                  key={i}
                  onClick={handleReEnterFromBar}
                  id={`bar-white-${i}`}
                  className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-50 to-amber-200 border-2 border-amber-400 flex items-center justify-center shadow-lg animate-bounce cursor-pointer"
                  title="اضغط لإدخال القشاط المحبوس"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                </button>
              ))}
            </div>

            {/* Black Checkers on Bar */}
            <div className="flex flex-col items-center gap-1">
              {bar.black.map((c, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full bg-gradient-to-br from-stone-900 to-amber-950 border-2 border-amber-700 flex items-center justify-center shadow-lg"
                >
                  <span className="text-[9px] text-amber-300 font-bold">ب</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Table Quadrant (6 top points, 6 bottom points) */}
          <div className="flex-1 flex flex-col justify-between pl-1">
            {/* Top Points 18 to 23 (White Home Board) */}
            <div className="flex justify-between h-[45%]">
              {[18, 19, 20, 21, 22, 23].map((pIdx) => {
                const isSelected = selectedPoint === pIdx;
                const isValidTarget = validMoves.includes(pIdx);
                const isOdd = pIdx % 2 === 1;

                return (
                  <button
                    key={pIdx}
                    id={`pt-${pIdx}`}
                    onClick={() => handlePointClick(pIdx)}
                    className={`relative w-1/6 h-full flex flex-col items-center transition-colors ${
                      isSelected
                        ? 'bg-amber-400/30 ring-2 ring-amber-300'
                        : isValidTarget
                        ? 'bg-emerald-500/30 ring-2 ring-emerald-400 cursor-pointer animate-pulse'
                        : ''
                    }`}
                  >
                    <div
                      className={`w-full h-full opacity-85 ${
                        isOdd ? 'bg-gradient-to-b from-amber-800 to-amber-950' : 'bg-gradient-to-b from-amber-100 to-amber-300'
                      }`}
                      style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
                    />
                    {renderPointCheckers(points[pIdx].checkers, true)}
                  </button>
                );
              })}
            </div>

            {/* Bottom Points 5 down to 0 (Black Home Board) */}
            <div className="flex justify-between h-[45%]">
              {[5, 4, 3, 2, 1, 0].map((pIdx) => {
                const isSelected = selectedPoint === pIdx;
                const isValidTarget = validMoves.includes(pIdx);
                const isOdd = pIdx % 2 === 1;

                return (
                  <button
                    key={pIdx}
                    id={`pt-${pIdx}`}
                    onClick={() => handlePointClick(pIdx)}
                    className={`relative w-1/6 h-full flex flex-col items-center transition-colors ${
                      isSelected
                        ? 'bg-amber-400/30 ring-2 ring-amber-300'
                        : isValidTarget
                        ? 'bg-emerald-500/30 ring-2 ring-emerald-400 cursor-pointer animate-pulse'
                        : ''
                    }`}
                  >
                    <div
                      className={`w-full h-full opacity-85 ${
                        isOdd ? 'bg-gradient-to-t from-amber-800 to-amber-950' : 'bg-gradient-to-t from-amber-100 to-amber-300'
                      }`}
                      style={{ clipPath: 'polygon(50% 0, 0 100%, 100% 100%)' }}
                    />
                    {renderPointCheckers(points[pIdx].checkers, false)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dedicated Bearing Off Slot (صندوق الإخراج) */}
        {validMoves.includes(99) && (
          <button
            onClick={() => executeMove(selectedPoint!, 99)}
            id="btn-bear-off-white"
            className="absolute -right-3 top-1/2 -translate-y-1/2 bg-gradient-to-b from-emerald-500 to-amber-500 text-slate-950 p-2.5 rounded-2xl shadow-2xl font-black text-xs border-2 border-white animate-bounce cursor-pointer flex flex-col items-center gap-1 z-40"
          >
            <ArrowUpRight className="w-5 h-5" />
            <span className="leading-tight">إخراج القشاط</span>
          </button>
        )}
      </div>

      {/* Action / Dice Shaker Dock */}
      <div className="w-full flex flex-col items-center gap-2 mt-2 z-20">
        <button
          onClick={handleRollDice}
          id="btn-roll-tawla-dice"
          disabled={isRolling || hasRolled || !!winner || currentTurn !== 'white'}
          className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl font-black text-sm tracking-wide shadow-2xl transition-all duration-200 ${
            hasRolled || currentTurn !== 'white'
              ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-slate-950 hover:brightness-110 active:scale-95 shadow-amber-500/25 ring-2 ring-white/30 cursor-pointer animate-pulse'
          }`}
        >
          <span className="text-xl">🎲</span>
          <span>{isRolling ? t.rolling : hasRolled ? 'اختر قشاطك للتحريك' : 'رمي حجري الزار (النرد)'}</span>
        </button>

        {/* Borne Off Counts */}
        <div className="flex items-center gap-4 text-xs font-bold text-slate-300">
          <span>قواشيطك المخرجة: {borneOff.white.length} / 15</span>
          <span>قواشيط المنافس المخرجة: {borneOff.black.length} / 15</span>
        </div>

        {/* Winner Celebration Modal */}
        {winner && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-50 animate-fade-in">
            <Trophy className="w-16 h-16 text-amber-400 animate-bounce mb-3" />
            <h2 className="text-2xl font-black text-amber-300 mb-1">
              {winner === 'white' ? 'ألف مبروك الفوز بالطاولة! 🏆' : 'فاز المنافس بالطاولة! 🤖'}
            </h2>
            <button
              onClick={() => setGameState(createInitialTawlaState())}
              id="btn-tawla-play-again"
              className="mt-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-sm shadow-xl hover:brightness-110 active:scale-95 cursor-pointer"
            >
              {t.playAgain}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
