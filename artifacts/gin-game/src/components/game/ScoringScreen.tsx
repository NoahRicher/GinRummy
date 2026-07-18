import React from 'react';
import { Card } from '@/components/game/Card';
import { Button } from '@/components/ui/button';
import { SessionState, PlayerName, getDeadwoodValue, evaluateHandForMeldStatus } from '@/lib/engine';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ScoringScreenProps {
  session: SessionState;
  localIdentity: PlayerName;
  onAction: (updates: Partial<SessionState>) => void;
}

export function ScoringScreen({ session, localIdentity, onAction }: ScoringScreenProps) {
  const loserName: PlayerName = session.roundWinner === 'Noah' ? 'Amelia' : 'Noah';
  const loserHand = loserName === 'Noah' ? session.noahHand : session.ameliaHand;

  // Auto-detect which cards are part of a valid meld (3+ set or run, wilds fill gaps)
  const meldFlags = evaluateHandForMeldStatus(loserHand, session.currentWild);

  // Deadwood = only cards that couldn't be placed in any meld
  const deadwoodPenalty = loserHand.reduce(
    (total, card, idx) => meldFlags[idx] ? total : total + getDeadwoodValue(card.rank),
    0
  );

  const handleApplyScores = () => {
    const newNoahScore = session.noahScore + (loserName === 'Noah' ? deadwoodPenalty : 0);
    const newAmeliaScore = session.ameliaScore + (loserName === 'Amelia' ? deadwoodPenalty : 0);
    const isGameOver = session.currentRound >= session.totalRounds;

    if (isGameOver) {
      onAction({
        noahScore: newNoahScore,
        ameliaScore: newAmeliaScore,
        status: 'gameover',
        log: ['Match finished!', ...session.log].slice(0, 50),
      });
    } else {
      const nextPicker: PlayerName = session.wildPickerThisRound === 'Noah' ? 'Amelia' : 'Noah';
      onAction({
        noahScore: newNoahScore,
        ameliaScore: newAmeliaScore,
        currentRound: session.currentRound + 1,
        wildPickerThisRound: nextPicker,
        currentWild: '',
        deck: [],
        noahHand: [],
        ameliaHand: [],
        discardPile: [],
        turn: 'Noah',
        hasDrawn: false,
        status: 'wildpick',
        log: [`Round ${session.currentRound + 1}: ${nextPicker} picks the wild.`, ...session.log].slice(0, 50),
      });
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 space-y-8 mt-4">

      <div className="text-center space-y-2">
        <motion.h1
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-3xl md:text-4xl font-serif font-bold text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]"
        >
          {session.roundWinner} declared GIN!
        </motion.h1>
        <p className="text-muted-foreground text-sm">
          {session.roundWinner} gets 0 points this round.
        </p>
        <p className="text-xs text-muted-foreground">
          Wild this round: <strong className="text-amber-400">{session.currentWild}s</strong>
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-6">

        {/* Loser's hand — melds auto-detected */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold">{loserName}'s Hand</h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500/70" /> melded
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-destructive/70" /> deadwood
              </span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {loserHand.map((card, idx) => (
              <div key={`${card.rank}${card.suit}${idx}`} className="relative">
                <Card
                  card={card}
                  isWild={card.rank === session.currentWild}
                  isMelded={meldFlags[idx]}
                  className={cn(
                    !meldFlags[idx] && 'ring-2 ring-destructive/60 ring-offset-1 ring-offset-background'
                  )}
                />
              </div>
            ))}
          </div>

          <p className="text-xs text-center text-muted-foreground mt-3">
            Melds need 3+ cards (same rank or same-suit run). Wilds fill any gap.
          </p>
        </div>

        {/* Score summary */}
        <div className="flex flex-col items-center gap-5 pt-2">
          <div className="text-center bg-black/30 px-10 py-4 rounded-2xl border border-border w-full">
            <span className="text-muted-foreground uppercase tracking-widest text-xs block mb-1">
              {loserName}'s Deadwood Penalty
            </span>
            <motion.span
              key={deadwoodPenalty}
              initial={{ scale: 1.2 }} animate={{ scale: 1 }}
              className="text-5xl font-mono font-bold text-destructive"
            >
              +{deadwoodPenalty}
            </motion.span>
            <p className="text-xs text-muted-foreground mt-1.5">A=15 · Face=10 · Number=5</p>
          </div>

          <div className="w-full grid grid-cols-2 gap-4 text-center border-t border-border pt-4">
            <div>
              <div className="text-sm text-muted-foreground">Noah</div>
              <div className="text-2xl font-bold">
                {session.noahScore + (loserName === 'Noah' ? deadwoodPenalty : 0)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Amelia</div>
              <div className="text-2xl font-bold">
                {session.ameliaScore + (loserName === 'Amelia' ? deadwoodPenalty : 0)}
              </div>
            </div>
          </div>

          <Button size="lg" className="w-full py-6 text-base" onClick={handleApplyScores}>
            {session.currentRound >= session.totalRounds ? 'Finish Match' : 'Apply Scores & Pick Next Wild'}
          </Button>
        </div>
      </div>
    </div>
  );
}
