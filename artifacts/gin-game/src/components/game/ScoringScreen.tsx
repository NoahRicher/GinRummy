import React from 'react';
import { Card } from '@/components/game/Card';
import { Button } from '@/components/ui/button';
import { SessionState, PlayerName, getDeadwoodValue } from '@/lib/engine';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

interface ScoringScreenProps {
  session: SessionState;
  localIdentity: PlayerName;
  onAction: (updates: Partial<SessionState>) => void;
}

export function ScoringScreen({ session, localIdentity, onAction }: ScoringScreenProps) {
  const loserName: PlayerName = session.roundWinner === 'Noah' ? 'Amelia' : 'Noah';
  const isLoser = localIdentity === loserName;
  const loserHand = loserName === 'Noah' ? session.noahHand : session.ameliaHand;
  const safeIndices = new Set(session.loserMeldIndices);

  const toggleSafe = (index: number) => {
    if (!isLoser) return;
    const next = new Set(session.loserMeldIndices);
    if (next.has(index)) next.delete(index); else next.add(index);
    onAction({ loserMeldIndices: Array.from(next) });
  };

  const deadwoodPenalty = loserHand.reduce(
    (total, card, idx) => safeIndices.has(idx) ? total : total + getDeadwoodValue(card.rank),
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
      // Move to wild-pick phase for next round — opponent of last picker goes next
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
        loserMeldIndices: [],
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

        {/* Instruction banner */}
        <div className={cn(
          'flex items-start gap-3 px-4 py-3 rounded-xl border text-sm',
          isLoser
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : 'bg-muted/50 border-border text-muted-foreground'
        )}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            {isLoser
              ? 'Tap your melded cards to protect them. Groups of 3+ (sets or runs) count — wilds fill any spot. Unprotected cards are deadwood.'
              : `Waiting for ${loserName} to mark their melds. Screen updates automatically.`}
          </p>
        </div>

        {/* Loser's hand */}
        <div>
          <h3 className="text-base font-bold mb-4">{loserName}'s Hand</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {loserHand.map((card, idx) => (
              <motion.div key={`${card.rank}${card.suit}${idx}`} whileTap={isLoser ? { scale: 0.93 } : {}}>
                <Card
                  card={card}
                  isWild={card.rank === session.currentWild}
                  isMelded={safeIndices.has(idx)}
                  onClick={() => toggleSafe(idx)}
                  className={isLoser ? 'cursor-pointer' : 'cursor-default'}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Penalty display */}
        <div className="flex flex-col items-center gap-5 pt-2">
          <div className="text-center bg-black/30 px-10 py-4 rounded-2xl border border-border w-full">
            <span className="text-muted-foreground uppercase tracking-widest text-xs block mb-1">
              {loserName}'s Deadwood Penalty
            </span>
            <motion.span key={deadwoodPenalty} initial={{ scale: 1.2 }} animate={{ scale: 1 }}
              className="text-5xl font-mono font-bold text-destructive">
              +{deadwoodPenalty}
            </motion.span>
            <p className="text-xs text-muted-foreground mt-1.5">A=15 · Face=10 · Number=5</p>
          </div>

          <div className="w-full grid grid-cols-2 gap-4 text-center border-t border-border pt-4">
            <div>
              <div className="text-sm text-muted-foreground">Noah</div>
              <div className="text-2xl font-bold">{session.noahScore + (loserName === 'Noah' ? deadwoodPenalty : 0)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Amelia</div>
              <div className="text-2xl font-bold">{session.ameliaScore + (loserName === 'Amelia' ? deadwoodPenalty : 0)}</div>
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

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
