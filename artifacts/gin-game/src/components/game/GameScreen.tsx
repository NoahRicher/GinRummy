import React, { useState, useEffect } from 'react';
import { Card } from '@/components/game/Card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SessionState, PlayerName, evaluateHandForMeldStatus, sortHand, Card as CardType } from '@/lib/engine';
import { Copy, RefreshCw, Hand } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface GameScreenProps {
  session: SessionState;
  localIdentity: PlayerName;
  onAction: (updates: Partial<SessionState>) => void;
  onSync: (encodedData: string) => void;
  encodedSyncString: string;
}

export function GameScreen({ session, localIdentity, onAction, onSync, encodedSyncString }: GameScreenProps) {
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [syncData, setSyncData] = useState('');
  const { toast } = useToast();

  const isMyTurn = session.turn === localIdentity;
  const myHand = localIdentity === 'Noah' ? session.noahHand : session.ameliaHand;
  const myWild = localIdentity === 'Noah' ? session.noahWild : session.ameliaWild;
  
  // Re-sort hand if it gets unsorted
  useEffect(() => {
    setSelectedCardIndex(null); // Reset selection on state changes
  }, [session.turn, session.hasDrawn]);

  const meldFlags = evaluateHandForMeldStatus(myHand, myWild);
  const canGin = isMyTurn && session.hasDrawn && myHand.length === 8 && meldFlags.every(Boolean);

  const handleDrawStock = () => {
    if (!isMyTurn || session.hasDrawn) return;
    
    let newDeck = [...session.deck];
    let newDiscard = [...session.discardPile];
    
    // Reshuffle if deck empty
    if (newDeck.length === 0) {
      if (newDiscard.length <= 1) {
        toast({ title: "Deck exhausted!", variant: "destructive" });
        return;
      }
      const topDiscard = newDiscard.pop()!;
      newDeck = [...newDiscard].sort(() => Math.random() - 0.5);
      newDiscard = [topDiscard];
      toast({ title: "Deck reshuffled." });
    }

    const drawnCard = newDeck.pop()!;
    const updatedHand = sortHand([...myHand, drawnCard], myWild);

    onAction({
      deck: newDeck,
      discardPile: newDiscard,
      [localIdentity === 'Noah' ? 'noahHand' : 'ameliaHand']: updatedHand,
      hasDrawn: true,
      log: [`${localIdentity} drew from the stock.`, ...session.log].slice(0, 50)
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
      log: [`${localIdentity} picked up the ${drawnCard.rank}${drawnCard.icon}.`, ...session.log].slice(0, 50)
    });
  };

  const handleDiscard = () => {
    if (!isMyTurn || !session.hasDrawn || selectedCardIndex === null) return;

    const discardedCard = myHand[selectedCardIndex];
    const newHand = [...myHand];
    newHand.splice(selectedCardIndex, 1);
    
    const newDiscardPile = [...session.discardPile, discardedCard];
    const nextTurn = localIdentity === 'Noah' ? 'Amelia' : 'Noah';

    onAction({
      discardPile: newDiscardPile,
      [localIdentity === 'Noah' ? 'noahHand' : 'ameliaHand']: sortHand(newHand, myWild),
      turn: nextTurn,
      hasDrawn: false,
      log: [`${localIdentity} discarded ${discardedCard.rank}${discardedCard.icon}.`, ...session.log].slice(0, 50)
    });
    setSelectedCardIndex(null);
  };

  const handleGin = () => {
    if (!canGin) return;
    
    onAction({
      status: 'scoring',
      roundWinner: localIdentity,
      log: [`✨ ${localIdentity} DECLARED GIN! ✨`, ...session.log].slice(0, 50)
    });
  };

  const handleCopySync = () => {
    navigator.clipboard.writeText(encodedSyncString);
    toast({ title: "Copied to clipboard!", description: "Paste this in your chat with your opponent." });
  };

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setSyncData(val);
    if (val.includes("GIN_DATA:")) {
      onSync(val);
      setSyncData(''); // Clear after successful sync
      toast({ title: "Turn received & applied!" });
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 flex flex-col h-[100dvh] overflow-hidden">
      
      {/* Header Info */}
      <header className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-serif font-bold text-amber-500">Round {session.currentRound} <span className="text-muted-foreground text-sm font-sans font-normal">of {session.totalRounds}</span></h2>
          <div className="flex gap-4 text-xs text-muted-foreground mt-1">
            <span>Noah's Wild: <strong className="text-amber-400">{session.noahWild}</strong></span>
            <span>Amelia's Wild: <strong className="text-amber-400">{session.ameliaWild}</strong></span>
          </div>
        </div>
        <div className="flex items-center gap-6 bg-secondary/50 px-4 py-2 rounded-lg border border-border">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Noah</div>
            <div className="font-bold">{session.noahScore}</div>
          </div>
          <div className="w-px h-8 bg-border"></div>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Amelia</div>
            <div className="font-bold">{session.ameliaScore}</div>
          </div>
        </div>
      </header>

      {/* Turn Indicator */}
      <div className="flex justify-center mb-8 shrink-0">
        {isMyTurn ? (
          <div className="bg-primary/20 text-primary border border-primary/50 px-6 py-2 rounded-full font-bold animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            YOUR TURN — Make your move!
          </div>
        ) : (
          <div className="bg-muted text-muted-foreground px-6 py-2 rounded-full flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin opacity-50" />
            Waiting on {session.turn}'s turn...
          </div>
        )}
      </div>

      {/* Play Area */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        
        {/* Piles */}
        <div className="flex gap-8 mb-12">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Deck ({session.deck.length})</span>
            <Card 
              card={{ rank: '', suit: '', icon: '', isRed: false, suitOrder: 0 }} 
              faceDown 
              onClick={isMyTurn && !session.hasDrawn ? handleDrawStock : undefined}
              className={cn(isMyTurn && !session.hasDrawn && "ring-2 ring-primary ring-offset-4 ring-offset-background")}
            />
          </div>
          
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Discard</span>
            {session.discardPile.length > 0 ? (
              <Card 
                card={session.discardPile[session.discardPile.length - 1]} 
                onClick={isMyTurn && !session.hasDrawn ? handleDrawDiscard : undefined}
                className={cn(isMyTurn && !session.hasDrawn && "ring-2 ring-primary ring-offset-4 ring-offset-background")}
              />
            ) : (
              <div className="w-16 h-24 sm:w-20 sm:h-28 rounded-md border-2 border-dashed border-border flex items-center justify-center opacity-50">
                <Hand className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Player Hand */}
        <div className="w-full overflow-x-auto pb-8 pt-4 px-4 snap-x flex justify-center">
          <div className="flex gap-2 sm:gap-3 min-w-max px-4">
            {myHand.map((card, idx) => (
              <div key={card.id || `${card.rank}${card.suit}${idx}`} className="snap-center">
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
                />
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="h-16 flex items-center justify-center gap-4 shrink-0">
          <Button 
            size="lg" 
            variant="secondary"
            disabled={!isMyTurn || !session.hasDrawn || selectedCardIndex === null}
            onClick={handleDiscard}
            className="w-48 shadow-lg"
          >
            Discard Selected
          </Button>

          {canGin && (
            <Button 
              size="lg" 
              className="w-48 bg-amber-500 hover:bg-amber-600 text-black shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-bounce"
              onClick={handleGin}
            >
              Declare GIN! ✨
            </Button>
          )}
        </div>
      </div>

      {/* Sync Footer */}
      <div className="mt-auto grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0 bg-secondary/30 p-4 rounded-xl border border-border">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Your outgoing turn:</span>
            <Button size="sm" variant="ghost" onClick={handleCopySync} className="h-6 px-2 text-xs">
              <Copy className="w-3 h-3 mr-1" /> Copy Data
            </Button>
          </div>
          <Textarea 
            readOnly 
            value={encodedSyncString} 
            className="font-mono text-[10px] h-16 resize-none bg-black/40 text-muted-foreground select-all" 
          />
        </div>
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Paste opponent's turn here:</span>
          <Textarea 
            value={syncData}
            onChange={handlePaste}
            placeholder="Paste GIN_DATA:... here" 
            className="font-mono text-[10px] h-16 resize-none bg-black/40 border-primary/30 focus-visible:ring-primary/50" 
          />
        </div>
      </div>

    </div>
  );
}