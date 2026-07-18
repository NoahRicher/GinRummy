import React, { useState } from 'react';
import { Card } from '@/components/game/Card';
import { Button } from '@/components/ui/button';
import { SessionState, PlayerName, getDeadwoodValue, createDeck, sortHand, Card as CardType } from '@/lib/engine';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

interface ScoringScreenProps {
  session: SessionState;
  localIdentity: PlayerName;
  onAction: (updates: Partial<SessionState>) => void;
}

export function ScoringScreen({ session, localIdentity, onAction }: ScoringScreenProps) {
  const isLoser = localIdentity !== session.roundWinner;
  const loserName = session.roundWinner === 'Noah' ? 'Amelia' : 'Noah';
  const loserHand = loserName === 'Noah' ? session.noahHand : session.ameliaHand;
  
  // Local state for toggling meld protections if I am the loser
  const [safeIndices, setSafeIndices] = useState<Set<number>>(new Set(session.loserMeldIndices));

  const toggleSafe = (index: number) => {
    if (!isLoser) return;
    const newSet = new Set(safeIndices);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setSafeIndices(newSet);
  };

  const calculateDeadwood = () => {
    return loserHand.reduce((total, card, idx) => {
      if (safeIndices.has(idx)) return total;
      return total + getDeadwoodValue(card.rank);
    }, 0);
  };

  const handleApplyScores = () => {
    const penalty = calculateDeadwood();
    const newNoahScore = session.noahScore + (loserName === 'Noah' ? penalty : 0);
    const newAmeliaScore = session.ameliaScore + (loserName === 'Amelia' ? penalty : 0);
    
    const isGameOver = session.currentRound >= session.totalRounds;

    if (isGameOver) {
      onAction({
        noahScore: newNoahScore,
        ameliaScore: newAmeliaScore,
        status: 'gameover',
        loserMeldIndices: Array.from(safeIndices),
        log: [`Match Finished!`, ...session.log].slice(0, 50)
      });
    } else {
      // Deal next round
      const deck = createDeck();
      const noahHand = sortHand(deck.splice(0, 7), session.noahWild);
      const ameliaHand = sortHand(deck.splice(0, 7), session.ameliaWild);
      const discardPile = [deck.pop() as CardType];

      onAction({
        noahScore: newNoahScore,
        ameliaScore: newAmeliaScore,
        currentRound: session.currentRound + 1,
        deck,
        noahHand,
        ameliaHand,
        discardPile,
        turn: 'Noah',
        hasDrawn: false,
        status: 'active',
        loserMeldIndices: [], // reset
        log: [`Round ${session.currentRound + 1} dealt. Noah goes first.`, ...session.log].slice(0, 50)
      });
    }
  };

  const currentPenalty = calculateDeadwood();

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8 mt-8">
      
      <div className="text-center space-y-4">
        <motion.h1 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl md:text-5xl font-serif font-bold text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]"
        >
          ✨ {session.roundWinner} declared GIN! ✨
        </motion.h1>
        <p className="text-lg text-muted-foreground">
          {session.roundWinner} scores 0 points this round.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6 bg-destructive/10 text-destructive px-4 py-3 rounded-lg border border-destructive/20">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">
            {isLoser 
              ? "Tap your successfully melded cards below to protect them. Unprotected cards become penalty points!" 
              : `Waiting for ${loserName} to mark their melds... (You can help if you're holding their phone)`}
          </p>
        </div>

        <h3 className="text-xl font-bold mb-4">{loserName}'s Hand</h3>
        
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {loserHand.map((card, idx) => (
            <Card
              key={`${card.rank}${card.suit}${idx}`}
              card={card}
              isMelded={safeIndices.has(idx)}
              onClick={() => toggleSafe(idx)}
              className="cursor-pointer"
            />
          ))}
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="text-center bg-black/30 px-8 py-4 rounded-xl border border-border">
            <span className="text-muted-foreground uppercase tracking-widest text-sm block mb-1">
              {loserName}'s Deadwood Penalty
            </span>
            <span className="text-5xl font-mono font-bold text-destructive">
              +{currentPenalty}
            </span>
            <p className="text-xs text-muted-foreground mt-2">
              (A=15, Face=10, Num=5)
            </p>
          </div>

          <div className="w-full grid grid-cols-2 gap-4 text-center border-t border-border pt-6 mt-2">
            <div>
              <span className="text-sm text-muted-foreground">Noah Total</span>
              <div className="text-2xl font-bold">{session.noahScore + (loserName === 'Noah' ? currentPenalty : 0)}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Amelia Total</span>
              <div className="text-2xl font-bold">{session.ameliaScore + (loserName === 'Amelia' ? currentPenalty : 0)}</div>
            </div>
          </div>

          <Button 
            size="lg" 
            className="w-full mt-4 py-6 text-lg" 
            onClick={handleApplyScores}
          >
            {session.currentRound >= session.totalRounds ? 'Finish Match' : 'Apply Scores & Deal Next Round'}
          </Button>
        </div>
      </div>

    </div>
  );
}