import React, { useState, useEffect } from 'react';
import { Card } from '@/components/game/Card';
import { Button } from '@/components/ui/button';
import { SessionState, PlayerName, evaluateHandForMeldStatus, sortHand } from '@/lib/engine';
import { RefreshCw, Hand, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface GameScreenProps {
  session: SessionState;
  localIdentity: PlayerName;
  onAction: (updates: Partial<SessionState>) => void;
  roomCode: string | null;
}

export function GameScreen({ session, localIdentity, onAction, roomCode }: GameScreenProps) {
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const isMyTurn = session.turn === localIdentity;
  const myHand = localIdentity === 'Noah' ? session.noahHand : session.ameliaHand;
  const myWild = localIdentity === 'Noah' ? session.noahWild : session.ameliaWild;

  useEffect(() => {
    setSelectedCardIndex(null);
  }, [session.turn, session.hasDrawn]);

  const meldFlags = evaluateHandForMeldStatus(myHand, myWild);

  // Gin rule: all 7 cards melded BEFORE drawing — declare gin at start of turn
  const canGin = isMyTurn && !session.hasDrawn && myHand.length === 7 && meldFlags.every(Boolean);

  const handleDrawStock = () => {
    if (!isMyTurn || session.hasDrawn) return;
    let newDeck = [...session.deck];
    let newDiscard = [...session.discardPile];

    if (newDeck.length === 0) {
      if (newDiscard.length <= 1) {
        toast({ title: 'Deck exhausted!', variant: 'destructive' });
        return;
      }
      const topDiscard = newDiscard.pop()!;
      newDeck = [...newDiscard].sort(() => Math.random() - 0.5);
      newDiscard = [topDiscard];
      toast({ title: 'Deck reshuffled.' });
    }

    const drawnCard = newDeck.pop()!;
    const updatedHand = sortHand([...myHand, drawnCard], myWild);

    onAction({
      deck: newDeck,
      discardPile: newDiscard,
      [localIdentity === 'Noah' ? 'noahHand' : 'ameliaHand']: updatedHand,
      hasDrawn: true,
      log: [`${localIdentity} drew from the stock.`, ...session.log].slice(0, 50),
    });
  };

  const handleDrawDiscard = () => {
    if (!isMyTurn || session.hasDrawn || session.discardPile.length === 0) return;
    const newDiscard = [...session.discardPile];
    const drawnCard = newDiscard.pop()!;
    const updatedHand = sortHand([...myHand, drawnCard], myWild);

    onAction({
      discardPile: newDiscard,
      [localIdentity === 'Noah' ? 'noahHand' : 'ameliaHand']: updatedHand,
      hasDrawn: true,
      log: [`${localIdentity} picked up ${drawnCard.rank}${drawnCard.icon}.`, ...session.log].slice(0, 50),
    });
  };

  const handleDiscard = () => {
    if (!isMyTurn || !session.hasDrawn || selectedCardIndex === null) return;
    const discardedCard = myHand[selectedCardIndex];
    const newHand = [...myHand];
    newHand.splice(selectedCardIndex, 1);
    const nextTurn = localIdentity === 'Noah' ? 'Amelia' : 'Noah';

    onAction({
      discardPile: [...session.discardPile, discardedCard],
      [localIdentity === 'Noah' ? 'noahHand' : 'ameliaHand']: sortHand(newHand, myWild),
      turn: nextTurn,
      hasDrawn: false,
      log: [`${localIdentity} discarded ${discardedCard.rank}${discardedCard.icon}.`, ...session.log].slice(0, 50),
    });
    setSelectedCardIndex(null);
  };

  const handleGin = () => {
    if (!canGin) return;
    onAction({
      status: 'scoring',
      roundWinner: localIdentity,
      log: [`✨ ${localIdentity} DECLARED GIN! ✨`, ...session.log].slice(0, 50),
    });
  };

  return (
    <div className="max-w-lg mx-auto p-4 flex flex-col min-h-[100dvh]">

      {/* Header */}
      <header className="flex items-start justify-between mb-4 shrink-0">
        <div>
          <h2 className="text-lg font-serif font-bold text-amber-500">
            Round {session.currentRound}
            <span className="text-muted-foreground text-sm font-sans font-normal"> / {session.totalRounds}</span>
          </h2>
          <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
            <span>Noah's Wild: <strong className="text-amber-400">{session.noahWild}</strong></span>
            <span>Amelia's Wild: <strong className="text-amber-400">{session.ameliaWild}</strong></span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Room indicator */}
          {roomCode && (
            <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 px-2.5 py-1.5 rounded-lg">
              <Wifi className="w-3 h-3 text-green-400" />
              <span className="font-mono text-xs text-green-400 font-bold tracking-wider">{roomCode}</span>
            </div>
          )}
          {/* Scoreboard */}
          <div className="flex items-center gap-3 bg-secondary/50 px-3 py-2 rounded-lg border border-border text-sm">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Noah</div>
              <div className="font-bold">{session.noahScore}</div>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Amelia</div>
              <div className="font-bold">{session.ameliaScore}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Turn indicator */}
      <div className="flex justify-center mb-6 shrink-0">
        <AnimatePresence mode="wait">
          {isMyTurn ? (
            <motion.div
              key="my-turn"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-primary/20 text-primary border border-primary/50 px-6 py-2 rounded-full font-bold shadow-[0_0_15px_rgba(59,130,246,0.25)]"
              data-testid="status-my-turn"
            >
              YOUR TURN — Make your move!
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-muted text-muted-foreground px-6 py-2 rounded-full flex items-center gap-2"
              data-testid="status-waiting"
            >
              <RefreshCw className="w-4 h-4 animate-spin opacity-50" />
              Waiting on {session.turn}
              {roomCode && <span className="text-xs opacity-60 ml-1">(auto-syncing)</span>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Gin banner — shown when 7-card hand is fully melded */}
      <AnimatePresence>
        {canGin && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 shrink-0"
          >
            <button
              onClick={handleGin}
              className="w-full py-4 rounded-xl font-bold text-lg bg-amber-500/20 border-2 border-amber-500 text-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.35)] animate-pulse hover:bg-amber-500/30 transition-colors"
              data-testid="button-declare-gin"
            >
              ✨ Your hand is complete — Declare GIN! ✨
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play area */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">

        {/* Piles */}
        <div className="flex gap-10 mb-8">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Deck ({session.deck.length})
            </span>
            <Card
              card={{ rank: '', suit: '', icon: '', isRed: false, suitOrder: 0 }}
              faceDown
              onClick={isMyTurn && !session.hasDrawn ? handleDrawStock : undefined}
              className={cn(
                isMyTurn && !session.hasDrawn && 'ring-2 ring-primary ring-offset-4 ring-offset-background cursor-pointer'
              )}
              data-testid="pile-stock"
            />
          </div>

          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Discard</span>
            {session.discardPile.length > 0 ? (
              <Card
                card={session.discardPile[session.discardPile.length - 1]}
                onClick={isMyTurn && !session.hasDrawn ? handleDrawDiscard : undefined}
                className={cn(
                  isMyTurn && !session.hasDrawn && 'ring-2 ring-primary ring-offset-4 ring-offset-background cursor-pointer'
                )}
                data-testid="pile-discard"
              />
            ) : (
              <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl border-2 border-dashed border-border flex items-center justify-center opacity-40">
                <Hand className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Player hand */}
        <div className="w-full overflow-x-auto pb-6 pt-2 flex justify-center">
          <div className="flex gap-2 min-w-max px-4">
            {myHand.map((card, idx) => (
              <motion.div
                key={card.id ?? `${card.rank}${card.suit}${idx}`}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: idx * 0.03 }}
              >
                <Card
                  card={card}
                  isWild={card.rank === myWild}
                  isMelded={meldFlags[idx]}
                  isSelected={selectedCardIndex === idx}
                  onClick={() => {
                    if (isMyTurn && session.hasDrawn) {
                      setSelectedCardIndex(idx === selectedCardIndex ? null : idx);
                    }
                  }}
                  data-testid={`card-hand-${idx}`}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Action button */}
        <div className="h-14 flex items-center justify-center mt-2 shrink-0">
          <Button
            size="lg"
            variant={selectedCardIndex !== null ? 'default' : 'secondary'}
            disabled={!isMyTurn || !session.hasDrawn || selectedCardIndex === null}
            onClick={handleDiscard}
            className="w-52 shadow-lg"
            data-testid="button-discard"
          >
            {session.hasDrawn
              ? selectedCardIndex !== null
                ? 'Discard Selected'
                : 'Select a Card'
              : 'Draw a Card First'}
          </Button>
        </div>
      </div>

      {/* Match log */}
      <div className="mt-4 shrink-0">
        <div className="bg-secondary/20 rounded-xl border border-border px-4 py-3 max-h-20 overflow-y-auto space-y-0.5">
          {session.log.slice(0, 6).map((entry, i) => (
            <p key={i} className={`text-xs ${i === 0 ? 'text-foreground/80' : 'text-muted-foreground/60'}`}>
              {entry}
            </p>
          ))}
        </div>
      </div>

    </div>
  );
}
