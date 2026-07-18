import React from 'react';
import { motion } from 'framer-motion';
import { SessionState, PlayerName, RANKS, createDeck, sortHand, Card as CardType } from '@/lib/engine';
import { RefreshCw, Wifi } from 'lucide-react';

interface WildPickScreenProps {
  session: SessionState;
  localIdentity: PlayerName;
  onAction: (updates: Partial<SessionState>) => void;
  roomCode: string | null;
}

export function WildPickScreen({ session, localIdentity, onAction, roomCode }: WildPickScreenProps) {
  const isMyPick = localIdentity === session.wildPickerThisRound;

  const handlePickWild = (rank: string) => {
    if (!isMyPick) return;

    // Deal cards now that the wild is known
    const deck = createDeck();
    const noahHand = sortHand(deck.splice(0, 7), rank);
    const ameliaHand = sortHand(deck.splice(0, 7), rank);
    const discardPile = [deck.pop() as CardType];

    onAction({
      currentWild: rank,
      deck,
      noahHand,
      ameliaHand,
      discardPile,
      status: 'active',
      turn: 'Noah',
      hasDrawn: false,
      log: [
        `${localIdentity} chose ${rank}s as wild. Cards dealt. Noah goes first.`,
        ...session.log,
      ].slice(0, 50),
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-card text-card-foreground rounded-2xl shadow-2xl border border-border overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Round {session.currentRound} of {session.totalRounds}
            </p>
            <h2 className="text-xl font-serif font-bold text-amber-500 mt-0.5">Pick the Wild</h2>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {roomCode && (
              <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 px-2 py-1 rounded-lg">
                <Wifi className="w-3 h-3 text-green-400" />
                <span className="font-mono text-xs text-green-400 font-bold">{roomCode}</span>
              </div>
            )}
            <div className="text-center bg-secondary/50 px-3 py-1.5 rounded-lg border border-border text-xs">
              <div className="text-muted-foreground">Scores</div>
              <div className="font-bold">{session.noahScore} – {session.ameliaScore}</div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {isMyPick ? (
            <>
              <p className="text-sm text-center text-muted-foreground">
                <span className="text-foreground font-semibold">{localIdentity}</span>, pick a rank.
                Cards of that rank will be wild this round — they can fill any spot in any meld.
              </p>

              {/* Rank grid */}
              <div className="grid grid-cols-4 gap-2">
                {RANKS.map((rank) => (
                  <motion.button
                    key={rank}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handlePickWild(rank)}
                    className="relative h-16 rounded-xl border-2 border-border bg-secondary/40 hover:border-amber-500 hover:bg-amber-500/10 hover:text-amber-400 transition-colors font-bold text-lg flex items-center justify-center"
                  >
                    {rank}
                  </motion.button>
                ))}
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Cards are dealt after you choose.
              </p>
            </>
          ) : (
            <div className="py-8 flex flex-col items-center gap-4 text-center">
              <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin opacity-50" />
              <p className="text-base font-semibold">
                Waiting for <span className="text-amber-400">{session.wildPickerThisRound}</span> to pick the wild…
              </p>
              {roomCode ? (
                <p className="text-xs text-muted-foreground">Your screen will update automatically.</p>
              ) : (
                <p className="text-xs text-muted-foreground">Hand your phone to {session.wildPickerThisRound}.</p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
