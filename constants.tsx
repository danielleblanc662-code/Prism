import React from 'react';
import { ElementType } from './types';
import { Flame, Droplets, Leaf, Orbit, Sparkles } from 'lucide-react';

export const GRID_SIZE = 8;

export const ELEMENT_COLORS: Record<ElementType, string> = {
  [ElementType.FIRE]: 'from-rose-500/80 to-orange-600/80 border-rose-400/30 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.3)]',
  [ElementType.WATER]: 'from-cyan-500/80 to-blue-600/80 border-cyan-300/30 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.3)]',
  [ElementType.NATURE]: 'from-emerald-400/80 to-green-600/80 border-emerald-200/30 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.3)]',
  [ElementType.VOID]: 'from-fuchsia-500/80 to-purple-800/80 border-fuchsia-300/30 bg-fuchsia-500/10 shadow-[0_0_15px_rgba(168,85,247,0.3)]',
  [ElementType.PRISM]: 'from-yellow-300/80 to-amber-500/80 border-yellow-100/30 bg-yellow-400/10 shadow-[0_0_15px_rgba(251,191,36,0.3)]',
};

export const ELEMENT_ICONS: Record<ElementType, React.ReactNode> = {
  [ElementType.FIRE]: <Flame size={24} className="text-white" />,
  [ElementType.WATER]: <Droplets size={24} className="text-white" />,
  [ElementType.NATURE]: <Leaf size={24} className="text-white" />,
  [ElementType.VOID]: <Orbit size={24} className="text-white" />,
  [ElementType.PRISM]: <Sparkles size={24} className="text-white" />,
};