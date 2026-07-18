import React, { useState, useEffect } from 'react';
import { Card } from '@/components/game/Card';
import { Button } from '@/components/ui/button';
import { SessionState, PlayerName, Card as CardType, evaluateHandForMeldStatus, sortHand } from '@/lib/engine';
import { RefreshCw, Hand, Wifi, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface GameScreenProps {
  session: SessionState;
  localIdentity: PlayerName;
  onAction: (updates: Partial<SessionState>) => void;
  onReorder: (player: PlayerName, newHand: CardType[]) => void;
  roomCode: string | null;
}

export function GameScreen({ session, localIdentity, onAction, onReorder, roomCode }: GameScreenProps) {
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [arrangeMode, setArrangeMode] = useState(false);
  const [arrangeSelected, setArrangeSelected] = useState<number | null>(null);
  const { toast } = useToast();

  const isMyTurn = session.turn === localIdentity;
  const handKey = localIdentity === 'Noah' ? 'noahHand' : 'ameliaHand';
  const myHand = localIdentity === 'Noah' ? session.noahHand : session.ameliaHand;
  const wild = session.currentWild;

  // Reset selection when turn/draw state changes
  useEffect(() => {
    setSelectedCardIndex(null);
    setArrangeMode(false);
    setArrangeSelected(null);
  }, [session.turn, session.hasDrawn]);

  const rawMeldFlags = evaluateHandForMeldStatus(myHand, wild);

  // Meld highlights only appear AFTER drawing (8-card hand) — helps you pick what to discard.
  // Before drawing the highlights are hidden; the algorithm still runs silently for the gin check.
  const meldFlags = session.hasDrawn ? rawMeldFlags : rawMeldFlags.map(() => false);

  // Gin: all 7 cards melded before drawing
  const canGin = isMyTurn && !session.hasDrawn && myHand.length === 7 && rawMeldFlags.every(Boolean);

  // ── Arrange mode handlers ──────────────────────────────────────────────────
  const handleArrangeTap = (idx: number) => {
    if (arrangeSelected === null) {
      setArrangeSelected(idx);
    } else if (arrangeSelected === idx) {
      setArrangeSelected(null);
    } else {
      // Swap the two cards
      const newHand = [...myHand];
      [newHand[arrangeSelected], newHand[idx]] = [newHand[idx], newHand[arrangeSelected]];
      onReorder(localIdentity, newHand);
      setArrangeSelected(null);
    }
  };

  // ── Game action handlers ───────────────────────────────────────────────────
  const handleDrawStock = () => {
    if (!isMyTurn || session.hasDrawn) return;
    let newDeck = [...session.deck];
    let newDiscard = [...session.discardPile];

    if (newDeck.length === 0) {
      if (newDiscard.length <= 1) { toast({ title: 'Deck exhausted!', variant: 'destructive' }); return; }
      const top = newDiscard.pop()!;
      newDeck = [...newDiscard].sort(() => Math.random() - 0.5);
      newDiscard = [top];
      toast({ title: 'Deck reshuffled.' });
    }

    const drawn = newDeck.pop()!;
    onAction({
      deck: newDeck,
      discardPile: newDiscard,
      [handKey]: sortHand([...myHand, drawn], wild),
      hasDrawn: true,
      log: [`${localIdentity} drew from stock.`, ...session.log].slice(0, 50),
    });
  };

  const handleDrawDiscard = () => {
    if (!isMyTurn || session.hasDrawn || session.discardPile.length === 0) return;
    const newDiscard = [...session.discardPile];
    const drawn = newDiscard.pop()!;
    onAction({
      discardPile: newDiscard,
      [handKey]: sortHand([...myHand, drawn], wild),
      hasDrawn: true,
      log: [`${localIdentity} picked up ${drawn.rank}${drawn.icon}.`, ...session.log].slice(0, 50),
    });
  };

  const handleDiscard = () => {
    if (!isMyTurn || !session.hasDrawn || selectedCardIndex === null) return;
    const discarded = myHand[selectedCardIndex];
    const newHand = myHand.filter((_, i) => i !== selectedCardIndex);

    // Auto-gin: if all 7 remaining cards are melded, declare gin immediately
    const postDiscardMelds = evaluateHandForMeldStatus(newHand, wild);
    if (postDiscardMelds.every(Boolean)) {
      onAction({
        discardPile: [...session.discardPile, discarded],
        [handKey]: newHand,
        hasDrawn: false,
        status: 'scoring',
        roundWinner: localIdentity,
        log: [`✨ ${localIdentity} declared GIN! ✨`, ...session.log].slice(0, 50),
      });
      return;
    }

    const nextTurn: PlayerName = localIdentity === 'Noah' ? 'Amelia' : 'Noah';
    onAction({
      discardPile: [...session.discardPile, discarded],
      [handKey]: newHand,
      turn: nextTurn,
      hasDrawn: false,
      log: [`${localIdentity} discarded ${discarded.rank}${discarded.icon}.`, ...session.log].slice(0, 50),
    });
    setSelectedCardIndex(null);
  };

  const handleGin = () => {
    if (!canGin) return;
    onAction({
      status: 'scoring',
      roundWinner: localIdentity,
      log: [`✨ ${localIdentity} declared GIN! ✨`, ...session.log].slice(0, 50),
    });
  };

  // ── Card tap: arrange vs discard selection ─────────────────────────────────
  const handleCardTap = (idx: number) => {
    if (arrangeMode) { handleArrangeTap(idx); return; }
    if (isMyTurn && session.hasDrawn) setSelectedCardIndex(prev => prev === idx ? null : idx);
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
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Wild</span>
            {/* Mini card badge */}
            <div
              className="relative w-7 h-9 rounded bg-white text-black flex flex-col justify-between p-0.5 border-2 border-amber-400 flex-shrink-0 select-none"
              style={{ boxShadow: '0 0 8px 1px rgba(241,196,15,0.65)' }}
            >
              <span className="text-[10px] font-bold leading-none text-slate-900">{wild}</span>
              <span className="text-base self-end leading-none">★</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {roomCode && (
            <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 px-2.5 py-1.5 rounded-lg">
              <Wifi className="w-3 h-3 text-green-400" />
              <span className="font-mono text-xs text-green-400 font-bold tracking-wider">{roomCode}</span>
            </div>
          )}
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
      <div className="flex justify-center mb-4 shrink-0">
        <AnimatePresence mode="wait">
          {isMyTurn ? (
            <motion.div key="my" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="bg-primary/20 text-primary border border-primary/50 px-6 py-2 rounded-full font-bold shadow-[0_0_15px_rgba(59,130,246,0.25)]">
              YOUR TURN
            </motion.div>
          ) : (
            <motion.div key="wait" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="bg-muted text-muted-foreground px-6 py-2 rounded-full flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin opacity-50" />
              Waiting on {session.turn}
              {roomCode && <span className="text-xs opacity-60 ml-1">(syncing)</span>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Gin banner */}
      <AnimatePresence>
        {canGin && (
          <motion.button
            key="gin"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={handleGin}
            className="mb-4 w-full py-4 rounded-xl font-bold text-lg bg-amber-500/20 border-2 border-amber-500 text-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.35)] animate-pulse hover:bg-amber-500/30 transition-colors shrink-0"
          >
            ✨ All cards melded — Declare GIN! ✨
          </motion.button>
        )}
      </AnimatePresence>

      {/* Play area */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">

        {/* Piles */}
        <div className="flex gap-10 mb-6">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Deck ({session.deck.length})</span>
            <Card
              card={{ rank: '', suit: '', icon: '', isRed: false, suitOrder: 0 }}
              faceDown
              onClick={isMyTurn && !session.hasDrawn && !arrangeMode ? handleDrawStock : undefined}
              className={cn(isMyTurn && !session.hasDrawn && !arrangeMode && 'ring-2 ring-primary ring-offset-4 ring-offset-background cursor-pointer')}
            />
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Discard</span>
            {session.discardPile.length > 0 ? (
              <Card
                card={session.discardPile[session.discardPile.length - 1]}
                onClick={isMyTurn && !session.hasDrawn && !arrangeMode ? handleDrawDiscard : undefined}
                className={cn(isMyTurn && !session.hasDrawn && !arrangeMode && 'ring-2 ring-primary ring-offset-4 ring-offset-background cursor-pointer')}
              />
            ) : (
              <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-xl border-2 border-dashed border-border flex items-center justify-center opacity-40">
                <Hand className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Hand label + arrange toggle */}
        <div className="w-full flex items-center justify-between px-4 mb-2">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Your hand</span>
          <button
            onClick={() => { setArrangeMode(m => !m); setArrangeSelected(null); setSelectedCardIndex(null); }}
            className={cn(
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors',
              arrangeMode
                ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
            )}
          >
            <ArrowLeftRight className="w-3 h-3" />
            {arrangeMode ? 'Done' : 'Arrange'}
          </button>
        </div>

        {/* Cards */}
        {arrangeMode && (
          <p className="text-xs text-center text-muted-foreground mb-2">
            {arrangeSelected === null ? 'Tap a card to pick it up…' : 'Now tap where to place it'}
          </p>
        )}

        <div className="w-full overflow-x-auto pb-4 flex justify-center">
          <div className="flex gap-2 min-w-max px-4">
            {myHand.map((card, idx) => {
              const isArrangeSelected = arrangeMode && arrangeSelected === idx;
              const isDiscardSelected = !arrangeMode && selectedCardIndex === idx;
              return (
                <motion.div key={card.id ?? `${card.rank}${card.suit}${idx}`} layout
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: idx * 0.03 }}>
                  <Card
                    card={card}
                    isWild={card.rank === wild}
                    isMelded={meldFlags[idx]}
                    isSelected={isDiscardSelected}
                    onClick={() => handleCardTap(idx)}
                    className={cn(
                      'cursor-pointer',
                      isArrangeSelected && 'ring-2 ring-amber-400 ring-offset-2 ring-offset-background scale-105 shadow-[0_0_14px_rgba(251,191,36,0.5)]',
                      arrangeMode && !isArrangeSelected && 'hover:ring-1 hover:ring-amber-400/50',
                    )}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Action button */}
        {!arrangeMode && (
          <div className="h-14 flex items-center justify-center mt-1 shrink-0">
            <Button
              size="lg"
              variant={selectedCardIndex !== null ? 'default' : 'secondary'}
              disabled={!isMyTurn || !session.hasDrawn || selectedCardIndex === null}
              onClick={handleDiscard}
              className="w-52 shadow-lg"
            >
              {session.hasDrawn
                ? selectedCardIndex !== null ? 'Discard Selected' : 'Select a Card'
                : 'Draw a Card First'}
            </Button>
          </div>
        )}
        {arrangeMode && <div className="h-14" />}
      </div>

      {/* Match log */}
      <div className="mt-3 shrink-0">
        <div className="bg-secondary/20 rounded-xl border border-border px-4 py-3 max-h-20 overflow-y-auto space-y-0.5">
          {session.log.slice(0, 6).map((entry, i) => (
            <p key={i} className={`text-xs ${i === 0 ? 'text-foreground/80' : 'text-muted-foreground/60'}`}>{entry}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
