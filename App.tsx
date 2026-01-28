
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ElementType, GameState, GridCell, Block, GamePhase, SpecialType } from './types';
import { GRID_SIZE, ELEMENT_COLORS, ELEMENT_ICONS } from './constants';
import { getSageCommentary } from './services/geminiService';
import { Trophy, RefreshCcw, Zap, Sparkles, Wand2, Bomb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const INITIAL_MOVES = 30;
const SWIPE_THRESHOLD = 20;

interface ScorePopup { id: string; x: number; y: number; val: string; }

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(() => ({
    grid: Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)),
    score: 0,
    highScore: 0,
    movesRemaining: INITIAL_MOVES,
    multiplier: 1,
    phase: GamePhase.IDLE,
    selectedPos: null,
    sageMessage: "Flow with the square.",
  }));

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touchStart = useRef<{ x: number; y: number; r: number; c: number } | null>(null);
  const stateRef = useRef(gameState);
  const particles = useRef<any[]>([]);

  useEffect(() => { stateRef.current = gameState; }, [gameState]);

  const triggerHaptic = (pattern: number | number[]) => {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.current = particles.current.filter(p => p.life > 0);
      particles.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      animationFrame = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const spawnParticles = (x: number, y: number, color: string, count = 10) => {
    for (let i = 0; i < count; i++) {
      particles.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1.0,
        size: Math.random() * 3 + 1.5,
        color
      });
    }
  };

  const createBlock = (type?: ElementType, special?: SpecialType): Block => ({
    id: Math.random().toString(36).substr(2, 9),
    type: type || [ElementType.FIRE, ElementType.WATER, ElementType.NATURE, ElementType.VOID, ElementType.PRISM][Math.floor(Math.random() * 5)],
    special
  });

  const checkMatches = (grid: GridCell[][]) => {
    const matches = new Set<string>();
    const specials: { r: number, c: number, type: SpecialType, element: ElementType }[] = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      let count = 1;
      for (let c = 0; c < GRID_SIZE; c++) {
        if (c + 1 < GRID_SIZE && grid[r][c] && grid[r][c + 1] && grid[r][c]?.type === grid[r][c + 1]?.type) {
          count++;
        } else {
          if (count >= 3) {
            for (let i = 0; i < count; i++) matches.add(`${r},${c - i}`);
            if (count === 4) specials.push({ r, c: c - 1, type: 'BEAM_H', element: grid[r][c]!.type });
            if (count >= 5) specials.push({ r, c: c - 2, type: 'RAINBOW', element: grid[r][c]!.type });
          }
          count = 1;
        }
      }
    }

    for (let c = 0; c < GRID_SIZE; c++) {
      let count = 1;
      for (let r = 0; r < GRID_SIZE; r++) {
        if (r + 1 < GRID_SIZE && grid[r][c] && grid[r + 1][c] && grid[r][c]?.type === grid[r + 1][c]?.type) {
          count++;
        } else {
          if (count >= 3) {
            for (let i = 0; i < count; i++) matches.add(`${r - i},${c}`);
            if (count === 4) specials.push({ r: r - 1, c, type: 'BEAM_V', element: grid[r][c]!.type });
            if (count >= 5) specials.push({ r: r - 2, c, type: 'RAINBOW', element: grid[r][c]!.type });
          }
          count = 1;
        }
      }
    }

    const matchArray = Array.from(matches).map(s => s.split(',').map(Number));
    const intersectionCount = new Map<string, number>();
    matchArray.forEach(([r, c]) => {
      const key = `${r},${c}`;
      intersectionCount.set(key, (intersectionCount.get(key) || 0) + 1);
    });

    intersectionCount.forEach((v, k) => {
      if (v > 1) {
        const [r, c] = k.split(',').map(Number);
        specials.push({ r, c, type: 'BLAST', element: grid[r][c]!.type });
      }
    });

    return { coords: matchArray, specials };
  };

  const processBoard = async (currentGrid: GridCell[][]) => {
    let loopGrid = currentGrid.map(row => [...row]);
    let multiplier = 1;

    while (true) {
      setGameState(p => ({ ...p, phase: GamePhase.EVALUATING }));
      const { coords, specials } = checkMatches(loopGrid);
      if (coords.length === 0) break;

      triggerHaptic(coords.length > 5 ? [30, 20, 50] : 15);
      
      const toClear = new Set<string>();
      coords.forEach(([r, c]) => {
        const cell = loopGrid[r][c];
        if (!cell) return;
        toClear.add(`${r},${c}`);
        
        if (cell.special === 'BEAM_H') for (let i = 0; i < GRID_SIZE; i++) toClear.add(`${r},${i}`);
        if (cell.special === 'BEAM_V') for (let i = 0; i < GRID_SIZE; i++) toClear.add(`${i},${c}`);
        if (cell.special === 'BLAST') {
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            if (r + dr >= 0 && r + dr < GRID_SIZE && c + dc >= 0 && c + dc < GRID_SIZE) toClear.add(`${r + dr},${c + dc}`);
          }
        }
      });

      const nextGrid = loopGrid.map(row => [...row]);
      toClear.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        nextGrid[r][c] = null;
        const rect = document.getElementById(`tile-${r}-${c}`)?.getBoundingClientRect();
        if (rect) spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, '#fff', 4);
      });

      specials.forEach(s => {
        if (!nextGrid[s.r][s.c]) nextGrid[s.r][s.c] = createBlock(s.element, s.type);
      });

      const gain = toClear.size * 100 * multiplier;
      setGameState(p => ({ ...p, score: p.score + gain, multiplier }));
      multiplier *= 2;
      
      await new Promise(r => setTimeout(r, 200));
      
      setGameState(p => ({ ...p, phase: GamePhase.CASCADING }));
      for (let c = 0; c < GRID_SIZE; c++) {
        let empty = GRID_SIZE - 1;
        for (let r = GRID_SIZE - 1; r >= 0; r--) {
          if (nextGrid[r][c]) {
            const temp = nextGrid[r][c];
            nextGrid[r][c] = null;
            nextGrid[empty][c] = temp;
            empty--;
          }
        }
      }
      setGameState(p => ({ ...p, grid: nextGrid }));
      await new Promise(r => setTimeout(r, 150));

      setGameState(p => ({ ...p, phase: GamePhase.REFILLING }));
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (!nextGrid[r][c]) nextGrid[r][c] = createBlock();
        }
      }
      loopGrid = nextGrid;
      setGameState(p => ({ ...p, grid: loopGrid }));
      await new Promise(r => setTimeout(r, 150));
    }

    const isGameOver = stateRef.current.movesRemaining <= 0;
    setGameState(p => ({ ...p, phase: isGameOver ? GamePhase.GAME_OVER : GamePhase.IDLE, multiplier: 1 }));
  };

  const handlePointerDown = (e: React.PointerEvent, r: number, c: number) => {
    if (gameState.phase !== GamePhase.IDLE) return;
    touchStart.current = { x: e.clientX, y: e.clientY, r, c };
    setGameState(p => ({ ...p, selectedPos: { r, c } }));
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    if (!touchStart.current || gameState.phase !== GamePhase.IDLE) return;
    const dx = e.clientX - touchStart.current.x;
    const dy = e.clientY - touchStart.current.y;
    const { r, c } = touchStart.current;
    touchStart.current = null;

    let targetR = r;
    let targetC = c;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > SWIPE_THRESHOLD) targetC += dx > 0 ? 1 : -1;
    } else {
      if (Math.abs(dy) > SWIPE_THRESHOLD) targetR += dy > 0 ? 1 : -1;
    }

    if (targetR < 0 || targetR >= GRID_SIZE || targetC < 0 || targetC >= GRID_SIZE || (targetR === r && targetC === c)) {
      setGameState(p => ({ ...p, selectedPos: null }));
      return;
    }

    triggerHaptic(10);
    setGameState(p => ({ ...p, phase: GamePhase.SWAPPING, selectedPos: null }));
    const grid = gameState.grid.map(row => [...row]);
    const temp = grid[r][c];
    grid[r][c] = grid[targetR][targetC];
    grid[targetR][targetC] = temp;

    const { coords } = checkMatches(grid);
    if (coords.length > 0) {
      setGameState(p => ({ ...p, grid, movesRemaining: p.movesRemaining - 1 }));
      processBoard(grid);
    } else {
      setGameState(p => ({ ...p, grid }));
      await new Promise(res => setTimeout(res, 200));
      const reset = grid.map(row => [...row]);
      reset[r][c] = reset[targetR][targetC];
      reset[targetR][targetC] = temp;
      setGameState(p => ({ ...p, grid: reset, phase: GamePhase.IDLE }));
    }
  };

  const initialize = useCallback(() => {
    let g: GridCell[][] = [];
    do {
      g = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null).map(() => createBlock()));
    } while (checkMatches(g).coords.length > 0);
    setGameState(p => ({ ...p, grid: g, score: 0, movesRemaining: INITIAL_MOVES, phase: GamePhase.IDLE }));
  }, []);

  useEffect(() => { initialize(); }, [initialize]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen pt-[var(--safe-top)] pb-[var(--safe-bottom)] relative overflow-hidden bg-slate-950">
      {/* Background Ambience */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-slate-900 to-black" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] bg-indigo-500/5 blur-[150px] rounded-full" />
      </div>

      <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} className="fixed inset-0 pointer-events-none z-50" />

      {/* Responsive Square Wrapper */}
      <div className="w-full max-w-lg aspect-square flex flex-col items-center justify-between p-4 sm:p-6">
        
        {/* Header HUD */}
        <div className="w-full flex justify-between items-center mb-4 px-2">
          <div className="neon-glass px-4 py-2 rounded-2xl flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" />
            <span className="text-xl font-black font-heading">{gameState.score}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {gameState.multiplier > 1 && (
                <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }}
                            className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs font-black italic border border-yellow-500/30">
                  x{gameState.multiplier}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="neon-glass px-4 py-2 rounded-2xl flex items-center gap-2">
              <Zap size={18} className={`${gameState.movesRemaining < 5 ? 'text-rose-500 animate-pulse' : 'text-sky-400'}`} />
              <span className="text-xl font-black font-heading">{gameState.movesRemaining}</span>
            </div>
          </div>
        </div>

        {/* Square Puzzle Engine */}
        <div className="relative w-full flex-1 flex items-center justify-center">
          <div className="neon-glass p-1 sm:p-2 rounded-[2rem] sm:rounded-[2.5rem] w-full aspect-square relative shadow-2xl border-white/20">
            <div className="grid grid-cols-8 gap-1 bg-slate-950/60 p-1 sm:p-2 rounded-[1.8rem] sm:rounded-[2rem] w-full h-full">
              {gameState.grid.map((row, r) => row.map((cell, c) => {
                const isSelected = gameState.selectedPos?.r === r && gameState.selectedPos?.c === c;
                return (
                  <motion.div
                    id={`tile-${r}-${c}`}
                    key={cell?.id || `${r}-${c}`}
                    layout
                    onPointerDown={(e) => handlePointerDown(e, r, c)}
                    onPointerUp={handlePointerUp}
                    className={`
                      relative w-full h-full rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300
                      border-[1.5px] sm:border-2 overflow-hidden touch-none
                      ${cell ? ELEMENT_COLORS[cell.type] : 'opacity-0 border-transparent'}
                      ${isSelected ? 'z-20 border-white ring-4 ring-white/30 scale-105 brightness-125' : 'border-white/5'}
                    `}
                  >
                    {cell && (
                      <div className="tile-glow opacity-95 scale-75 sm:scale-90 pointer-events-none">
                        {ELEMENT_ICONS[cell.type]}
                      </div>
                    )}
                    {cell?.special === 'BEAM_H' && <div className="absolute inset-0 border-y border-sky-400/50 rounded-xl animate-pulse" />}
                    {cell?.special === 'BEAM_V' && <div className="absolute inset-0 border-x border-sky-400/50 rounded-xl animate-pulse" />}
                    {cell?.special === 'BLAST' && <Bomb className="absolute text-white/30" size={24} />}
                    {cell?.special === 'RAINBOW' && <Sparkles className="absolute text-white/50 animate-spin-slow" size={20} />}
                  </motion.div>
                );
              }))}
            </div>
          </div>
        </div>

        {/* Footer HUD */}
        <div className="w-full flex items-center justify-between mt-4 px-2">
          <div className="neon-glass px-4 py-2 rounded-2xl flex items-center gap-3 flex-1 mr-4 overflow-hidden">
            <Wand2 size={16} className="text-indigo-400 shrink-0" />
            <p className="text-[10px] font-bold text-slate-300 truncate italic">
              {gameState.sageMessage}
            </p>
          </div>
          <button onClick={initialize} className="p-3 neon-glass rounded-2xl hover:bg-white/10 transition-colors shadow-lg active:scale-90">
            <RefreshCcw size={20} className="text-slate-300" />
          </button>
        </div>
      </div>

      {/* Result Overlay */}
      <AnimatePresence>
        {gameState.phase === GamePhase.GAME_OVER && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-8">
            <div className="neon-glass p-10 rounded-[3rem] text-center w-full max-w-sm border-white/20">
              <h2 className="text-5xl font-black font-heading mb-6 tracking-tighter text-white">SHIFT OVER</h2>
              <div className="bg-slate-900/50 p-6 rounded-3xl mb-8 border border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Final Energy</p>
                <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500">
                  {gameState.score}
                </p>
              </div>
              <button onClick={initialize} 
                      className="w-full py-5 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl font-black uppercase tracking-widest text-white shadow-[0_0_30px_rgba(79,70,229,0.4)] active:scale-95 transition-transform">
                New Cycle
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
