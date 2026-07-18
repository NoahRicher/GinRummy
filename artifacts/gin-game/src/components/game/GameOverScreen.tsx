import React from 'react';
import { Button } from '@/components/ui/button';
import { SessionState } from '@/lib/engine';
import { Trophy, Skull } from 'lucide-react';
import { motion } from 'framer-motion';

interface GameOverScreenProps {
  session: SessionState;
  onReset: () => void;
}

export function GameOverScreen({ session, onReset }: GameOverScreenProps) {
  const isTie = session.noahScore === session.ameliaScore;
  const noahWon = session.noahScore < session.ameliaScore;
  const winnerName = isTie ? 'Nobody' : (noahWon ? 'Noah' : 'Amelia');
  const loserName = isTie ? 'Nobody' : (noahWon ? 'Amelia' : 'Noah');
  const winnerScore = isTie ? session.noahScore : (noahWon ? session.noahScore : session.ameliaScore);
  const loserScore = isTie ? session.ameliaScore : (noahWon ? session.ameliaScore : session.noahScore);

  return (
    <div className="max-w-2xl mx-auto p-6 mt-12 flex flex-col items-center text-center space-y-12">
      
      <div className="space-y-4">
        <h1 className="text-3xl font-serif text-muted-foreground uppercase tracking-widest">Match Complete</h1>
        {isTie ? (
          <h2 className="text-5xl font-bold text-amber-500">It's a Tie!</h2>
        ) : (
          <motion.div 
            initial={{ scale: 0.8, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            className="space-y-2"
          >
            <h2 className="text-6xl font-serif font-bold text-primary drop-shadow-[0_0_25px_rgba(200,16,46,0.45)]">
              {winnerName} Wins!
            </h2>
            <p className="text-xl text-muted-foreground">Lowest score takes the crown.</p>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-8 w-full max-w-md">
        <div className="bg-card border border-border p-6 rounded-2xl shadow-xl flex flex-col items-center gap-2 relative overflow-hidden">
          {noahWon && <div className="absolute top-0 left-0 w-full h-1 bg-primary" />}
          <span className="text-lg font-bold">Noah</span>
          <span className="text-5xl font-mono">{session.noahScore}</span>
          <span className="text-xs text-muted-foreground uppercase">Penalty Pts</span>
          {noahWon && <Trophy className="w-8 h-8 text-primary mt-2 opacity-50" />}
          {!noahWon && !isTie && <Skull className="w-6 h-6 text-destructive mt-2 opacity-30" />}
        </div>
        
        <div className="bg-card border border-border p-6 rounded-2xl shadow-xl flex flex-col items-center gap-2 relative overflow-hidden">
          {!noahWon && !isTie && <div className="absolute top-0 left-0 w-full h-1 bg-primary" />}
          <span className="text-lg font-bold">Amelia</span>
          <span className="text-5xl font-mono">{session.ameliaScore}</span>
          <span className="text-xs text-muted-foreground uppercase">Penalty Pts</span>
          {!noahWon && !isTie && <Trophy className="w-8 h-8 text-primary mt-2 opacity-50" />}
          {noahWon && <Skull className="w-6 h-6 text-destructive mt-2 opacity-30" />}
        </div>
      </div>

      <Button size="lg" onClick={onReset} className="w-full max-w-sm py-8 text-xl rounded-xl shadow-lg">
        Start New Match
      </Button>

    </div>
  );
}