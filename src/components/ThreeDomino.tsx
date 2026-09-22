import React, { useState, useEffect, useMemo } from 'react';
import { DominoTile, PlacedDomino, SupportedLanguage } from '../types';
import { sound } from '../utils/sound';
import { translations } from '../utils/translations';
import confetti from 'canvas-confetti';
import { RotateCw, Trophy, Layers, ChevronRight, ChevronLeft, Flame, Sparkles } from 'lucide-react';

interface ThreeDominoProps {
  lang: SupportedLanguage;
  playMode: 'pass_play' | 'vs_ai' | 'tiktok_live';
  onVictory?: (winner: string) => void;
  is3DView: boolean;
  activeTeamBonus?: string | null;
}

// Generate the 28 standard Double-Six domino tiles
function generateDominoSet(): DominoTile[] {
  const tiles: DominoTile[] = [];
  let id = 0;
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      tiles.push({ id: id++, left: i, right: j });
    }
  }
  return tiles.sort(() => Math.random() - 0.5);
}

// Dot positions for standard domino pips
const PIP_COORDS: Record<number, number[][]> = {
  0: [],
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};

export const ThreeDomino: React.FC<ThreeDominoProps> = ({
  lang,
  playMode,
  onVictory,
  is3DView,
}) => {
  const t = translations[lang];

  // Initialize game
  const [playerHand, setPlayerHand] = useState<DominoTile[]>([]);
  const [opponentHand, setOpponentHand] = useState<DominoTile[]>([]);
  const [boneyard, setBoneyard] = useState<DominoTile[]>([]);
  const [boardTiles, setBoardTiles] = useState<PlacedDomino[]>([]);
  const [leftEnd, setLeftEnd] = useState<number | null>(null);
  const [rightEnd, setRightEnd] = useState<number | null>(null);
  const [currentTurn, setCurrentTurn] = useState<'player' | 'opponent'>('player');
  const [winner, setWinner] = useState<string | null>(null);
  const [blockedGameInfo, setBlockedGameInfo] = useState<{ p1Score: number; p2Score: number } | null>(null);
  const [selectedHandTile, setSelectedHandTile] = useState<DominoTile | null>(null);
  const [slamBanner, setSlamBanner] = useState<string | null>(null);
  const [screenShake, setScreenShake] = useState<boolean>(false);

  // Setup round
  const startNewGame = () => {
    const fullSet = generateDominoSet();
    const p1 = fullSet.slice(0, 7);
    const p2 = fullSet.slice(7, 14);
    const yard = fullSet.slice(14);

    // Find highest double to start
    let highestDouble = -1;
    let starter: 'player' | 'opponent' = 'player';
    let startingTile: DominoTile | null = null;

    p1.forEach((tile) => {
      if (tile.left === tile.right && tile.left > highestDouble) {
        highestDouble = tile.left;
        starter = 'player';
        startingTile = tile;
      }
    });

    p2.forEach((tile) => {
      if (tile.left === tile.right && tile.left > highestDouble) {
        highestDouble = tile.left;
        starter = 'opponent';
        startingTile = tile;
      }
    });

    if (startingTile) {
      const activeStartTile: DominoTile = startingTile;
      if (starter === 'player') {
        setPlayerHand(p1.filter((t) => t.id !== activeStartTile.id));
        setOpponentHand(p2);
      } else {
        setOpponentHand(p2.filter((t) => t.id !== activeStartTile.id));
        setPlayerHand(p1);
      }

      setBoardTiles([{ tile: activeStartTile, end: 'left' }]);
      setLeftEnd(activeStartTile.left);
      setRightEnd(activeStartTile.right);
      setCurrentTurn(starter === 'player' ? 'opponent' : 'player');
      triggerSlam(`ضربة البداية بالدوش (${activeStartTile.left}-${activeStartTile.right})! 🔥`);
    } else {
      const firstTile = p1[0];
      setPlayerHand(p1.slice(1));
      setOpponentHand(p2);
      setBoardTiles([{ tile: firstTile, end: 'left' }]);
      setLeftEnd(firstTile.left);
      setRightEnd(firstTile.right);
      setCurrentTurn('opponent');
    }

    setBoneyard(yard);
    setWinner(null);
    setBlockedGameInfo(null);
    setSelectedHandTile(null);
  };

  useEffect(() => {
    startNewGame();
  }, []);

  const triggerSlam = (msg: string) => {
    sound.playDoubleSlam();
    setScreenShake(true);
    setSlamBanner(msg);
    setTimeout(() => setScreenShake(false), 350);
    setTimeout(() => setSlamBanner(null), 2500);
  };

  // Check valid moves for current hand
  const validTilesForPlayer = useMemo(() => {
    if (leftEnd === null || rightEnd === null) return [];
    return playerHand.filter(
      (tile) =>
        tile.left === leftEnd ||
        tile.right === leftEnd ||
        tile.left === rightEnd ||
        tile.right === rightEnd
    );
  }, [playerHand, leftEnd, rightEnd]);

  // Handle tile placement
  const placeTile = (tile: DominoTile, targetEnd: 'left' | 'right') => {
    if (winner || currentTurn !== 'player') return;
    if (leftEnd === null || rightEnd === null) return;

    let newLeft = leftEnd;
    let newRight = rightEnd;
    let valid = false;

    if (targetEnd === 'left') {
      if (tile.right === leftEnd) {
        newLeft = tile.left;
        valid = true;
      } else if (tile.left === leftEnd) {
        newLeft = tile.right;
        valid = true;
      }
    } else {
      if (tile.left === rightEnd) {
        newRight = tile.right;
        valid = true;
      } else if (tile.right === rightEnd) {
        newRight = tile.left;
        valid = true;
      }
    }

    if (!valid) return;

    const isDouble = tile.left === tile.right;
    if (isDouble) {
      triggerSlam(`دوش (${tile.left}-${tile.right}) على الطاولة! 🔥`);
    } else {
      sound.playTileClick();
    }

    const newBoard = [...boardTiles];
    if (targetEnd === 'left') {
      newBoard.unshift({ tile, end: 'left' });
    } else {
      newBoard.push({ tile, end: 'right' });
    }

    const newHand = playerHand.filter((t) => t.id !== tile.id);
    setPlayerHand(newHand);
    setBoardTiles(newBoard);
    setLeftEnd(newLeft);
    setRightEnd(newRight);
    setSelectedHandTile(null);

    // Win check
    if (newHand.length === 0) {
      setWinner('player');
      sound.playFanfare();
      confetti({ particleCount: 200, spread: 80 });
      onVictory?.('player');
      return;
    }

    setCurrentTurn('opponent');
  };

  // Draw tile from boneyard
  const drawFromBoneyard = () => {
    if (boneyard.length === 0 || currentTurn !== 'player' || winner) return;

    sound.playTileClick();
    const nextTile = boneyard[0];
    setBoneyard(boneyard.slice(1));
    setPlayerHand([...playerHand, nextTile]);
  };

  // Pass turn if no moves and boneyard empty
  const passTurn = () => {
    if (currentTurn !== 'player' || validTilesForPlayer.length > 0 || boneyard.length > 0) return;
    setCurrentTurn('opponent');
  };

  // Check Blocked Game ("قفلة")
  useEffect(() => {
    if (winner || leftEnd === null || rightEnd === null) return;

    if (boneyard.length === 0) {
      const p1CanMove = playerHand.some(
        (t) => t.left === leftEnd || t.right === leftEnd || t.left === rightEnd || t.right === rightEnd
      );
      const p2CanMove = opponentHand.some(
        (t) => t.left === leftEnd || t.right === leftEnd || t.left === rightEnd || t.right === rightEnd
      );

      if (!p1CanMove && !p2CanMove) {
        // Blocked game! Calculate points
        const p1Score = playerHand.reduce((acc, t) => acc + t.left + t.right, 0);
        const p2Score = opponentHand.reduce((acc, t) => acc + t.left + t.right, 0);

        setBlockedGameInfo({ p1Score, p2Score });

        if (p1Score < p2Score) {
          setWinner('player');
          sound.playFanfare();
          confetti({ particleCount: 150 });
          onVictory?.('player');
        } else if (p2Score < p1Score) {
          setWinner('opponent');
          sound.playDoubleSlam();
        } else {
          setWinner('tie');
        }
      }
    }
  }, [playerHand, opponentHand, boneyard, leftEnd, rightEnd, winner, onVictory]);

  // AI Opponent Move
  useEffect(() => {
    if (currentTurn !== 'opponent' || winner) return;

    const timer = setTimeout(() => {
      if (leftEnd === null || rightEnd === null) return;

      const playable = opponentHand.find(
        (tile) =>
          tile.left === leftEnd ||
          tile.right === leftEnd ||
          tile.left === rightEnd ||
          tile.right === rightEnd
      );

      if (playable) {
        const isDouble = playable.left === playable.right;
        if (isDouble) {
          triggerSlam(`دوش المنافس (${playable.left}-${playable.right})! 💥`);
        } else {
          sound.playTileClick();
        }

        let targetEnd: 'left' | 'right' = 'right';
        let newL = leftEnd;
        let newR = rightEnd;

        if (playable.left === rightEnd) {
          newR = playable.right;
          targetEnd = 'right';
        } else if (playable.right === rightEnd) {
          newR = playable.left;
          targetEnd = 'right';
        } else if (playable.left === leftEnd) {
          newL = playable.right;
          targetEnd = 'left';
        } else {
          newL = playable.left;
          targetEnd = 'left';
        }

        const newBoard = [...boardTiles];
        if (targetEnd === 'left') {
          newBoard.unshift({ tile: playable, end: 'left' });
        } else {
          newBoard.push({ tile: playable, end: 'right' });
        }

        const newHand = opponentHand.filter((t) => t.id !== playable.id);
        setOpponentHand(newHand);
        setBoardTiles(newBoard);
        setLeftEnd(newL);
        setRightEnd(newR);

        if (newHand.length === 0) {
          setWinner('opponent');
          sound.playDoubleSlam();
          return;
        }

        setCurrentTurn('player');
      } else if (boneyard.length > 0) {
        // AI draws
        sound.playTileClick();
        const nextTile = boneyard[0];
        setBoneyard((prev) => prev.slice(1));
        setOpponentHand((prev) => [...prev, nextTile]);
      } else {
        // AI passes
        setCurrentTurn('player');
      }
    }, 950);

    return () => clearTimeout(timer);
  }, [currentTurn, leftEnd, rightEnd, opponentHand, boardTiles, boneyard, winner]);

  // Render 3D Ivory Domino Tile
  const renderTile = (
    tile: DominoTile,
    onClick?: () => void,
    isSelected?: boolean,
    isPlayable?: boolean,
    isVertical?: boolean
  ) => {
    return (
      <div
        key={tile.id}
        onClick={onClick}
        className={`relative flex items-center justify-center bg-gradient-to-b from-amber-50 via-slate-100 to-amber-100 rounded-lg shadow-xl border-2 transition-all duration-200 select-none ${
          isVertical ? 'w-8 h-16 flex-col' : 'w-16 h-8 flex-row'
        } ${
          isSelected
            ? 'ring-4 ring-amber-400 scale-110 -translate-y-2 z-40 border-amber-400 shadow-amber-500/50'
            : isPlayable
            ? 'border-emerald-400 ring-2 ring-emerald-300 hover:scale-105 cursor-pointer shadow-md'
            : 'border-slate-300 shadow-sm opacity-90'
        }`}
      >
        {/* Half 1 */}
        <div className={`relative flex-1 flex items-center justify-center ${isVertical ? 'w-full h-1/2' : 'h-full w-1/2'}`}>
          <div className="relative w-5 h-5">
            {PIP_COORDS[tile.left].map(([x, y], idx) => (
              <div
                key={idx}
                className="absolute w-1.5 h-1.5 rounded-full bg-slate-950 shadow-inner -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
              />
            ))}
          </div>
        </div>

        {/* Central Divider Bar & Brass Spinner Rivet */}
        <div
          className={`bg-slate-400/80 relative flex items-center justify-center ${
            isVertical ? 'w-full h-0.5 my-0.5' : 'h-full w-0.5 mx-0.5'
          }`}
        >
          <div className="absolute w-2 h-2 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 border border-amber-700 shadow-sm" />
        </div>

        {/* Half 2 */}
        <div className={`relative flex-1 flex items-center justify-center ${isVertical ? 'w-full h-1/2' : 'h-full w-1/2'}`}>
          <div className="relative w-5 h-5">
            {PIP_COORDS[tile.right].map(([x, y], idx) => (
              <div
                key={idx}
                className="absolute w-1.5 h-1.5 rounded-full bg-slate-950 shadow-inner -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${x}%`, top: `${y}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`relative w-full h-full flex flex-col items-center justify-between p-2 select-none overflow-hidden transition-transform ${
        screenShake ? 'scale-[1.02] translate-y-1 animate-pulse' : ''
      }`}
    >
      {/* Top Status & Opponent Rack */}
      <div className="w-full flex items-center justify-between bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-slate-700/80 shadow-xl z-20">
        <div className="flex items-center gap-2">
          <div
            className={`w-3.5 h-3.5 rounded-full ${
              currentTurn === 'player' ? 'bg-emerald-500 ring-2 ring-emerald-300' : 'bg-rose-500 ring-2 ring-rose-300'
            } animate-pulse`}
          />
          <span className="text-xs sm:text-sm font-black text-slate-100">
            {currentTurn === 'player' ? t.yourTurn : 'دور المنافس 🤖'}
          </span>
        </div>

        {/* Opponent Hidden Hand Counter */}
        <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 font-bold">المنافس:</span>
          <div className="flex gap-0.5">
            {Array.from({ length: opponentHand.length }).map((_, i) => (
              <div key={i} className="w-2.5 h-5 bg-gradient-to-b from-amber-100 to-amber-200 rounded-xs border border-slate-400 shadow-xs" />
            ))}
          </div>
          <span className="text-xs font-black text-amber-300">({opponentHand.length})</span>
        </div>

        <button
          onClick={startNewGame}
          id="btn-domino-restart"
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title={t.playAgain}
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Action Banner */}
      {slamBanner && (
        <div className="absolute top-14 z-40 pointer-events-none animate-bounce">
          <div className="bg-gradient-to-r from-emerald-600 via-amber-500 to-teal-600 text-white font-black text-xs sm:text-sm px-4 py-2 rounded-2xl shadow-2xl border-2 border-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-yellow-300 fill-current" />
            <span>{slamBanner}</span>
          </div>
        </div>
      )}

      {/* 3D Green Velvet Domino Table Stage */}
      <div
        className={`relative w-full max-w-[420px] aspect-[4/3] my-auto transition-transform duration-700 ease-out flex items-center justify-center ${
          is3DView
            ? 'rotate-x-[26deg] rotate-z-[-1deg] scale-[0.95] drop-shadow-[0_30px_50px_rgba(0,0,0,0.95)]'
            : ''
        }`}
        style={{ perspective: '1100px', transformStyle: 'preserve-3d' }}
      >
        <div className="w-full h-full bg-gradient-to-br from-emerald-950 via-teal-900 to-emerald-950 p-3 rounded-3xl border-4 border-amber-600/60 shadow-[0_0_40px_rgba(5,150,105,0.25)] flex flex-col justify-between relative overflow-hidden">
          {/* Subtle felt texture overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05)_0,transparent_100%)] pointer-events-none" />

          {/* Placement Destination Indicators when a tile is selected */}
          {selectedHandTile && currentTurn === 'player' && (
            <div className="absolute top-3 inset-x-3 flex items-center justify-between z-30 pointer-events-auto">
              <button
                onClick={() => placeTile(selectedHandTile, 'left')}
                id="btn-domino-place-left"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg animate-pulse cursor-pointer border border-white"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ضع على الطرف ({leftEnd})</span>
              </button>

              <button
                onClick={() => placeTile(selectedHandTile, 'right')}
                id="btn-domino-place-right"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg animate-pulse cursor-pointer border border-white"
              >
                <span>ضع على الطرف ({rightEnd})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Central Domino Chain Display */}
          <div className="w-full flex-1 flex items-center justify-center overflow-x-auto no-scrollbar py-2 px-1">
            <div className="flex items-center gap-1.5 min-w-max px-4">
              {boardTiles.map((item, idx) => {
                const isDouble = item.tile.left === item.tile.right;
                return (
                  <div key={`${item.tile.id}-${idx}`} className="transform transition-transform hover:scale-105">
                    {renderTile(item.tile, undefined, false, false, isDouble)}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Boneyard and Pass Turn Footer inside Table */}
          <div className="w-full flex items-center justify-between bg-emerald-950/70 backdrop-blur-xs p-2 rounded-2xl border border-emerald-700/40">
            <button
              onClick={drawFromBoneyard}
              id="btn-domino-draw"
              disabled={boneyard.length === 0 || currentTurn !== 'player'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                boneyard.length > 0 && currentTurn === 'player'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md ring-1 ring-white'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>ساحة السحب ({boneyard.length})</span>
            </button>

            {validTilesForPlayer.length === 0 && boneyard.length === 0 && currentTurn === 'player' && (
              <button
                onClick={passTurn}
                id="btn-domino-pass"
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md animate-pulse cursor-pointer"
              >
                تمرير الدور (Pass)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Player's 3D Domino Hand Rack */}
      <div className="w-full flex flex-col items-center gap-1.5 z-20">
        <div className="text-xs font-bold text-slate-300 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>قواشيطك ({playerHand.length}) - اضغط لاختيار قشاط</span>
        </div>

        <div className="w-full flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-2 px-2 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl max-w-[420px]">
          {playerHand.map((tile) => {
            const isPlayable = validTilesForPlayer.some((t) => t.id === tile.id);
            const isSelected = selectedHandTile?.id === tile.id;

            return (
              <div key={tile.id}>
                {renderTile(
                  tile,
                  () => {
                    if (currentTurn !== 'player') return;
                    if (isPlayable) {
                      sound.playTileClick();
                      setSelectedHandTile(tile);
                    }
                  },
                  isSelected,
                  isPlayable,
                  true
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Winner / Blocked Game Modal */}
      {winner && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-50 animate-fade-in">
          <Trophy className="w-16 h-16 text-amber-400 animate-bounce mb-3" />
          <h2 className="text-2xl font-black text-amber-300 mb-1">
            {winner === 'player' ? 'ألف مبروك الفوز! 🏆' : winner === 'tie' ? 'تعادل بالنقاط! 🤝' : 'فاز المنافس! 🤖'}
          </h2>
          {blockedGameInfo && (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-2xl my-2 text-xs text-center font-bold text-slate-200">
              <span className="text-amber-400 block mb-1">أغلقت اللعبة (قفلة)!</span>
              <span>نقاطك: {blockedGameInfo.p1Score} | نقاط المنافس: {blockedGameInfo.p2Score}</span>
            </div>
          )}
          <button
            onClick={startNewGame}
            id="btn-domino-new-round"
            className="mt-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-amber-500 text-slate-950 font-black text-sm shadow-xl hover:brightness-110 active:scale-95 cursor-pointer"
          >
            {t.playAgain}
          </button>
        </div>
      )}
    </div>
  );
};
