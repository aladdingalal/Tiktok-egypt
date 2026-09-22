import React, { useState, useEffect, useMemo } from 'react';
import { DominoTile, PlacedDomino, SupportedLanguage } from '../types';
import { sound } from '../utils/sound';
import { translations } from '../utils/translations';
import confetti from 'canvas-confetti';
import { RotateCw, Trophy, Layers, ChevronRight, ChevronLeft } from 'lucide-react';

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
  const [tilesPool, setTilesPool] = useState<DominoTile[]>(generateDominoSet);
  const [playerHand, setPlayerHand] = useState<DominoTile[]>([]);
  const [opponentHand, setOpponentHand] = useState<DominoTile[]>([]);
  const [boneyard, setBoneyard] = useState<DominoTile[]>([]);
  const [boardTiles, setBoardTiles] = useState<PlacedDomino[]>([]);
  const [leftEnd, setLeftEnd] = useState<number | null>(null);
  const [rightEnd, setRightEnd] = useState<number | null>(null);
  const [currentTurn, setCurrentTurn] = useState<'player' | 'opponent'>('player');
  const [winner, setWinner] = useState<string | null>(null);
  const [lastActionMessage, setLastActionMessage] = useState<string>('');
  const [selectedHandTile, setSelectedHandTile] = useState<DominoTile | null>(null);

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
      setLastActionMessage(
        starter === 'player'
          ? `بدأت بالدوش (${activeStartTile.left}-${activeStartTile.right})!`
          : `بدأ المنافس بـ (${activeStartTile.left}-${activeStartTile.right})!`
      );
    } else {
      // Default: player places first tile
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
    setSelectedHandTile(null);
  };

  useEffect(() => {
    startNewGame();
  }, []);

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

    sound.playTileClick();

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
      confetti({ particleCount: 150, spread: 80 });
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
    setLastActionMessage('سحبت قشاط من ساحة السحب 🀄');
  };

  // Pass turn if no moves and boneyard empty
  const passTurn = () => {
    if (currentTurn !== 'player' || validTilesForPlayer.length > 0 || boneyard.length > 0) return;
    setCurrentTurn('opponent');
    setLastActionMessage('تم تمرير الدور');
  };

  // AI Opponent Move
  useEffect(() => {
    if (currentTurn !== 'opponent' || winner) return;

    const timer = setTimeout(() => {
      if (leftEnd === null || rightEnd === null) return;

      // Find valid tile in opponent hand
      const playable = opponentHand.find(
        (tile) =>
          tile.left === leftEnd ||
          tile.right === leftEnd ||
          tile.left === rightEnd ||
          tile.right === rightEnd
      );

      if (playable) {
        sound.playTileClick();
        let targetEnd: 'left' | 'right' = 'right';
        let newL = leftEnd;
        let newR = rightEnd;

        if (playable.left === rightEnd) {
          newR = playable.right;
          targetEnd = 'right';
        } else if (playable.right === rightEnd) {
          newR = playable.left;
          targetEnd = 'right';
        } else if (playable.right === leftEnd) {
          newL = playable.left;
          targetEnd = 'left';
        } else if (playable.left === leftEnd) {
          newL = playable.right;
          targetEnd = 'left';
        }

        const newBoard = [...boardTiles];
        if (targetEnd === 'left') {
          newBoard.unshift({ tile: playable, end: 'left' });
        } else {
          newBoard.push({ tile: playable, end: 'right' });
        }

        const newOppHand = opponentHand.filter((t) => t.id !== playable.id);
        setOpponentHand(newOppHand);
        setBoardTiles(newBoard);
        setLeftEnd(newL);
        setRightEnd(newR);

        if (newOppHand.length === 0) {
          setWinner('opponent');
          return;
        }

        setCurrentTurn('player');
      } else if (boneyard.length > 0) {
        // AI draws
        sound.playTileClick();
        const drawn = boneyard[0];
        setBoneyard(boneyard.slice(1));
        setOpponentHand([...opponentHand, drawn]);
        setLastActionMessage('المنافس سحب قشاط!');
        // Allow AI to attempt play after draw
      } else {
        // AI passes
        setLastActionMessage('المنافس مرر دوره (لا توجد حركة)!');

        // Check if game is blocked completely
        if (validTilesForPlayer.length === 0) {
          // Both blocked! Calculate score
          const pSum = playerHand.reduce((acc, t) => acc + t.left + t.right, 0);
          const oppSum = opponentHand.reduce((acc, t) => acc + t.left + t.right, 0);
          if (pSum < oppSum) {
            setWinner('player');
            sound.playFanfare();
            confetti({ particleCount: 120 });
          } else {
            setWinner('opponent');
          }
          setLastActionMessage(`قفلة! نقاطك: ${pSum} vs نقاط الخصم: ${oppSum}`);
          return;
        }

        setCurrentTurn('player');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentTurn, opponentHand, leftEnd, rightEnd, boneyard, boardTiles, winner, playerHand, validTilesForPlayer]);

  // Render Pip Dots inside tile half
  const renderPips = (value: number) => {
    const coords = PIP_COORDS[value] || [];
    return (
      <div className="relative w-full h-full">
        {coords.map(([x, y], idx) => (
          <div
            key={idx}
            className="absolute w-2 h-2 rounded-full bg-slate-900 shadow-inner -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-2 select-none overflow-hidden">
      {/* Header Bar */}
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

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <span className="bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
            🀄 الخصم: {opponentHand.length}
          </span>
          <span className="bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
            📦 السحب: {boneyard.length}
          </span>
        </div>

        <button
          onClick={startNewGame}
          id="btn-domino-restart"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          title={t.playAgain}
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Opponent Hand (Face Down 3D tiles) */}
      <div className="flex items-center justify-center gap-1 my-1">
        {opponentHand.map((_, idx) => (
          <div
            key={idx}
            className="w-5 h-8 sm:w-6 sm:h-10 rounded-sm bg-gradient-to-br from-amber-100 to-amber-200 border border-amber-300/80 shadow-md transform -rotate-2"
          >
            <div className="w-full h-full bg-slate-900/10 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-amber-400/40" />
            </div>
          </div>
        ))}
      </div>

      {/* 3D Green Velvet Domino Table */}
      <div
        className={`relative w-full max-w-[440px] flex-1 max-h-[300px] bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 rounded-3xl p-3 border-4 border-amber-700/60 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col items-center justify-center my-auto transition-transform duration-500 ${
          is3DView ? 'rotate-x-[22deg] scale-[0.96] shadow-2xl' : ''
        }`}
        style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
      >
        {/* Felt Texture Marks */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        {/* Board Tiles Snake Line (Scrollable / Centered) */}
        <div className="w-full flex items-center justify-center gap-1.5 overflow-x-auto py-4 px-2 no-scrollbar">
          {boardTiles.map((item, idx) => (
            <div
              key={idx}
              className="flex-shrink-0 w-8 h-16 sm:w-10 sm:h-20 bg-gradient-to-br from-amber-50 to-stone-200 rounded-md border-2 border-stone-300 shadow-xl flex flex-col justify-between p-1 relative transform hover:scale-105 transition-transform"
            >
              {/* Top half */}
              <div className="w-full h-[46%]">{renderPips(item.tile.left)}</div>

              {/* Center Brass Divider Pin */}
              <div className="w-full h-[2px] bg-amber-600 shadow-xs relative">
                <div className="absolute left-1/2 -top-[2px] -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-xs" />
              </div>

              {/* Bottom half */}
              <div className="w-full h-[46%]">{renderPips(item.tile.right)}</div>
            </div>
          ))}
        </div>

        {/* Open Ends Indicator */}
        {leftEnd !== null && rightEnd !== null && (
          <div className="flex items-center gap-3 mt-1 bg-slate-950/70 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-bold text-amber-300 border border-amber-500/40">
            <span>الطرف الأيمن: {leftEnd}</span>
            <span>•</span>
            <span>الطرف الأيسر: {rightEnd}</span>
          </div>
        )}
      </div>

      {/* Selected Tile Placement Chooser */}
      {selectedHandTile && currentTurn === 'player' && (
        <div className="flex items-center gap-3 bg-slate-900/95 p-2 rounded-2xl border border-amber-500/60 shadow-2xl z-30 animate-fade-in">
          <span className="text-xs font-bold text-amber-300">ضع القشاط على:</span>
          <button
            onClick={() => placeTile(selectedHandTile, 'left')}
            id="btn-domino-place-left"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-md"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>اليمين ({leftEnd})</span>
          </button>
          <button
            onClick={() => placeTile(selectedHandTile, 'right')}
            id="btn-domino-place-right"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-md"
          >
            <span>اليسار ({rightEnd})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSelectedHandTile(null)}
            className="px-2 py-1 text-slate-400 text-xs font-bold hover:text-white"
          >
            إلغاء
          </button>
        </div>
      )}

      {/* Player's 3D Tile Rack (Hand) */}
      <div className="w-full flex flex-col items-center gap-2 z-20">
        <div className="w-full flex items-center justify-center gap-1.5 sm:gap-2 overflow-x-auto py-2 px-1">
          {playerHand.map((tile) => {
            const isValid =
              currentTurn === 'player' &&
              (tile.left === leftEnd ||
                tile.right === leftEnd ||
                tile.left === rightEnd ||
                tile.right === rightEnd);

            const isSelected = selectedHandTile?.id === tile.id;

            return (
              <button
                key={tile.id}
                id={`domino-player-tile-${tile.id}`}
                onClick={() => {
                  if (!isValid) return;
                  // If matches both ends, let player pick; otherwise place directly
                  const canLeft = tile.left === leftEnd || tile.right === leftEnd;
                  const canRight = tile.left === rightEnd || tile.right === rightEnd;
                  if (canLeft && canRight && leftEnd !== rightEnd) {
                    setSelectedHandTile(tile);
                  } else if (canLeft) {
                    placeTile(tile, 'left');
                  } else {
                    placeTile(tile, 'right');
                  }
                }}
                disabled={currentTurn !== 'player' || !isValid}
                className={`w-9 h-16 sm:w-11 sm:h-20 bg-gradient-to-br from-amber-50 via-white to-stone-200 rounded-lg border-2 shadow-2xl flex flex-col justify-between p-1 transition-all duration-200 transform ${
                  isValid
                    ? 'border-amber-400 hover:-translate-y-2 ring-2 ring-amber-400/80 cursor-pointer shadow-amber-400/30'
                    : 'border-stone-400 opacity-60 cursor-not-allowed'
                } ${isSelected ? '-translate-y-3 ring-4 ring-amber-300' : ''}`}
              >
                {/* Top Half */}
                <div className="w-full h-[46%]">{renderPips(tile.left)}</div>

                {/* Center Brass Divider */}
                <div className="w-full h-[2px] bg-amber-600 shadow-xs relative">
                  <div className="absolute left-1/2 -top-[2px] -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-500" />
                </div>

                {/* Bottom Half */}
                <div className="w-full h-[46%]">{renderPips(tile.right)}</div>
              </button>
            );
          })}
        </div>

        {/* Action Controls: Draw from Boneyard / Pass Turn */}
        <div className="flex items-center gap-3">
          <button
            onClick={drawFromBoneyard}
            id="btn-domino-draw"
            disabled={boneyard.length === 0 || currentTurn !== 'player' || !!winner}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-lg transition-all ${
              boneyard.length > 0 && currentTurn === 'player'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:brightness-110 active:scale-95 cursor-pointer ring-1 ring-amber-300'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{t.drawTile} ({boneyard.length})</span>
          </button>

          {validTilesForPlayer.length === 0 && boneyard.length === 0 && currentTurn === 'player' && (
            <button
              onClick={passTurn}
              id="btn-domino-pass"
              className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-lg hover:bg-rose-500 cursor-pointer active:scale-95"
            >
              {t.passTurn}
            </button>
          )}
        </div>

        {lastActionMessage && (
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-900/60 px-3 py-0.5 rounded-full">
            {lastActionMessage}
          </span>
        )}
      </div>

      {/* Winner Popup */}
      {winner && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-50 animate-fade-in">
          <Trophy className="w-16 h-16 text-amber-400 animate-bounce mb-3" />
          <h2 className="text-2xl font-black text-amber-300 mb-1">
            {winner === 'player' ? t.winner : 'فاز المنافس!'}
          </h2>
          <p className="text-sm text-slate-300 mb-4 font-bold">
            {winner === 'player' ? 'دومينو! أحسنت اللعب يا بطل 🀄' : 'حظ أوفر في الجولة القادمة!'}
          </p>
          <button
            onClick={startNewGame}
            id="btn-domino-play-again"
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-black text-sm shadow-xl hover:brightness-110 active:scale-95 cursor-pointer"
          >
            {t.playAgain}
          </button>
        </div>
      )}
    </div>
  );
};
