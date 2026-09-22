export type GameId = 'ludo' | 'domino' | 'tawla' | 'uno';

export type PlayMode = 'pass_play' | 'vs_ai' | 'tiktok_live';

export type SupportedLanguage = 'ar' | 'en' | 'fr' | 'es' | 'tr' | 'hi' | 'de';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isAi?: boolean;
  score: number;
  giftsReceived?: number;
}

// TikTok Live types
export interface LiveComment {
  id: string;
  username: string;
  avatar: string;
  text: string;
  gift?: {
    name: string;
    icon: string;
    count: number;
  };
  team?: string;
  time: string;
}

export interface TikTokGift {
  id: string;
  nameKey: string;
  coins: number;
  icon: string;
  color: string;
  effect: 'cheer' | 'boost' | 'lion' | 'galaxy' | 'crown';
}

// Ludo Game State
export type LudoColor = 'red' | 'green' | 'yellow' | 'blue';

export interface LudoToken {
  id: number;
  color: LudoColor;
  step: number; // -1: in yard, 0-51: track, 52-57: home path, 58: finished
  position: number;
}

export interface LudoState {
  currentTurn: LudoColor;
  diceValue: number;
  isRolling: boolean;
  hasRolled: boolean;
  tokens: Record<LudoColor, LudoToken[]>;
  winner: LudoColor | null;
  consecutiveSixes: number;
  activeColors: LudoColor[];
}

// Domino Game State
export interface DominoTile {
  id: number;
  left: number;
  right: number;
  isPlayed?: boolean;
}

export interface PlacedDomino {
  tile: DominoTile;
  end: 'left' | 'right';
  rotated?: boolean;
  x?: number;
  y?: number;
}

export interface DominoState {
  playersHands: Record<string, DominoTile[]>;
  boneyard: DominoTile[];
  boardTiles: PlacedDomino[];
  leftEnd: number;
  rightEnd: number;
  currentTurnIndex: number;
  winner: string | null;
  isBlocked: boolean;
  scores: Record<string, number>;
}

// Tawla / Backgammon State
export interface TawlaChecker {
  id: string;
  color: 'white' | 'black';
}

export interface TawlaPoint {
  pointIndex: number; // 0 to 23
  checkers: TawlaChecker[];
}

export interface TawlaState {
  points: TawlaPoint[]; // 24 points
  bar: {
    white: TawlaChecker[];
    black: TawlaChecker[];
  };
  borneOff: {
    white: TawlaChecker[];
    black: TawlaChecker[];
  };
  currentTurn: 'white' | 'black';
  dice: number[];
  usedDice: boolean[];
  isRolling: boolean;
  hasRolled: boolean;
  selectedPoint: number | null;
  validMoves: number[]; // target point indexes
  winner: 'white' | 'black' | null;
}

// Uno Game State
export type UnoColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
export type UnoValue = 
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

export interface UnoCard {
  id: string;
  color: UnoColor;
  value: UnoValue;
}

export interface UnoState {
  playersHands: Record<string, UnoCard[]>;
  deck: UnoCard[];
  discardPile: UnoCard[];
  currentTurnIndex: number;
  direction: 1 | -1;
  activeColor: UnoColor;
  winner: string | null;
  hasShoutedUno: Record<string, boolean>;
  drawAccumulator: number;
}
