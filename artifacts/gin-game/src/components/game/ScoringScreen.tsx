import React from 'react';
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
  const loserName = session.roundWinner === 'Noah' ? 'Amelia' : 'Noah';
  const isLoser = localIdentity === loserName;
  const loserHand = loserName === 'Noah' ? session.noahHand : session.ameliaHand;
  const safeIndices = new Set(session.loserMeldIndices);

  const toggleSafe = (index: number) => {
    if (!isLoser) return;
    const newSet = new Set(session.loserMeldIndices);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    // Push loserMeldIndices update through container → server
    onAction({ loserMeldIndices: Array.from(newSet) });
  };

  const calculateDeadwood = (indices: Set<number>) =>
    loserHand.reduce(
      (total, card, idx) => (indices.has(idx) ? total : total + getDeadwoodValue(card.rank)),
      0
    );

  const currentPenalty = calculateDeadwood(safeIndices);

  const handleApplyScores = () => {
    const penalty = currentPenalty;
    const newNoahScore = session.noahScore + (loserName === 'Noah' ? penalty : 0);
    const newAmeliaScore = session.ameliaScore + (loserName === 'Amelia' ? penalty : 0);
    const isGameOver = session.currentRound >= session.totalRounds;

    if (isGameOver) {
      onAction({
        noahScore: newNoahScore,
        ameliaScore: newAmeliaScore,
        status: 'gameover',
        loserMeldIndices: Array.from(safeIndices),
        log: ['Match finished!', ...session.log].slice(0, 50),
      });
    } else {
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
        loserMeldIndices: [],
        log: [`Round ${session.currentRound + 1} dealt. Noah goes first.`, ...session.log].slice(0, 50),
      });
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 space-y-8 mt-4">
      <div className="text-center space-y-3">
        <motion.h1
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-3xl md:text-4xl font-serif font-bold text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]"
        >
          {session.roundWinner} declared GIN!
        </motion.h1>
        <p className="text-muted-foreground">
          {session.roundWinner} scores 0 points this round.
        </p>
        <div className="flex justify-center gap-4 text-xs text-muted-foreground">
          <span>Noah's Wild: <strong className="text-amber-400">{session.noahWild}</strong></span>
          <span>Amelia's Wild: <strong className="text-amber-400">{session.ameliaWild}</strong></span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-6">
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${
          isLoser
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : 'bg-muted/50 border-border text-muted-foreground'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            {isLoser
              ? "Tap your successfully melded cards to protect them. Unprotected cards are penalty points."
              : `Waiting for ${loserName} to mark their melds. Updates appear automatically.`}
          </p>
        </div>

        <div>
          <h3 className="text-base font-bold mb-4">{loserName}'s Hand</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {loserHand.map((card, idx) => (
              <motion.div
                key={`${card.rank}${card.suit}${idx}`}
                whileTap={isLoser ? { scale: 0.95 } : {}}
              >
                <Card
                  card={card}
                  isMelded={safeIndices.has(idx)}
                  onClick={() => toggleSafe(idx)}
                  className={isLoser ? 'cursor-pointer' : 'cursor-default'}
                  data-testid={`card-scoring-${idx}`}
                />
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 pt-2">
          <div className="text-center bg-black/30 px-10 py-4 rounded-2xl border border-border w-full">
            <span className="text-muted-foreground uppercase tracking-widest text-xs block mb-1">
              {loserName}'s Deadwood Penalty
            </span>
            <motion.span
              key={currentPenalty}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-5xl font-mono font-bold text-destructive"
            >
              +{currentPenalty}
            </motion.span>
            <p className="text-xs text-muted-foreground mt-1.5">A=15 · Face=10 · Number=5</p>
          </div>

          <div className="w-full grid grid-cols-2 gap-4 text-center border-t border-border pt-5">
            <div>
              <div className="text-sm text-muted-foreground">Noah</div>
              <div className="text-2xl font-bold">
                {session.noahScore + (loserName === 'Noah' ? currentPenalty : 0)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Amelia</div>
              <div className="text-2xl font-bold">
                {session.ameliaScore + (loserName === 'Amelia' ? currentPenalty : 0)}
              </div>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full py-6 text-base"
            onClick={handleApplyScores}
            data-testid="button-apply-scores"
          >
            {session.currentRound >= session.totalRounds ? 'Finish Match' : 'Apply Scores & Deal Next Round'}
          </Button>
        </div>
      </div>
    </div>
  );
}
