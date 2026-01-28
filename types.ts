export enum ElementType {
  FIRE = 'FIRE',
  WATER = 'WATER',
  NATURE = 'NATURE',
  VOID = 'VOID',
  PRISM = 'PRISM'
}

export enum GamePhase {
  IDLE = 'IDLE',
  SWAPPING = 'SWAPPING',
  EVALUATING = 'EVALUATING',
  CASCADING = 'CASCADING',
  REFILLING = 'REFILLING',
  RESHUFFLING = 'RESHUFFLING',
  GAME_OVER = 'GAME_OVER'
}

export type SpecialType = 'BEAM_H' | 'BEAM_V' | 'BLAST' | 'RAINBOW';

export interface Block {
  id: string;
  type: ElementType;
  special?: SpecialType;
}

export type GridCell = Block | null;

export interface GameState {
  grid: GridCell[][];
  score: number;
  highScore: number;
  movesRemaining: number;
  multiplier: number;
  phase: GamePhase;
  selectedPos: { r: number; c: number } | null;
  sageMessage: string;
}