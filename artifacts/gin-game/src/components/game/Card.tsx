import React from 'react';
import { Card as CardType } from '@/lib/engine';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface CardProps {
  card: CardType;
  isWild?: boolean;
  isMelded?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  faceDown?: boolean;
  className?: string;
}

export function Card({
  card,
  isWild,
  isMelded,
  isSelected,
  onClick,
  faceDown,
  className
}: CardProps) {
  if (faceDown) {
    return (
      <motion.div
        whileHover={onClick ? { y: -5 } : undefined}
        whileTap={onClick ? { scale: 0.95 } : undefined}
        onClick={onClick}
        className={cn(
          "relative w-16 h-24 sm:w-20 sm:h-28 rounded-md shadow-md border-2 border-red-900 bg-[repeating-linear-gradient(45deg,#6B0011,#6B0011_10px,#4A000C_10px,#4A000C_20px)] cursor-pointer flex-shrink-0 transition-shadow",
          className
        )}
      />
    );
  }

  return (
    <motion.div
      initial={false}
      animate={{
        y: isSelected ? -15 : 0,
        boxShadow: isWild 
          ? '0 0 12px 2px rgba(200, 16, 46, 0.75)' 
          : isMelded 
            ? '0 0 12px 2px rgba(46, 204, 113, 0.7)' 
            : '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
      }}
      whileHover={onClick ? { y: isSelected ? -15 : -5 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
      onClick={onClick}
      className={cn(
        "relative w-16 h-24 sm:w-20 sm:h-28 rounded-md bg-white text-black shadow-md flex-shrink-0 select-none flex flex-col justify-between p-1 sm:p-2 cursor-pointer transition-colors border-2",
        card.isRed ? "text-red-600" : "text-slate-900",
        isWild ? "border-red-500" : isMelded ? "border-green-500" : isSelected ? "border-primary" : "border-slate-200",
        className
      )}
    >
      <div className="text-sm sm:text-base font-bold leading-none">{card.rank}</div>
      <div className="text-2xl sm:text-3xl self-end leading-none">{card.icon}</div>
    </motion.div>
  );
}
