import React, { useState } from 'react';
import { Card } from '@/components/game/Card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SessionState, RANKS, PlayerName, createDeck, sortHand, Card as CardType } from '@/lib/engine';
import { motion } from 'framer-motion';

interface SetupScreenProps {
  session: SessionState;
  onDeal: (updates: Partial<SessionState>) => void;
  onSync: (encodedData: string) => void;
  localIdentity: PlayerName | null;
  setLocalIdentity: (name: PlayerName) => void;
}

export function SetupScreen({ session, onDeal, onSync, localIdentity, setLocalIdentity }: SetupScreenProps) {
  const [rounds, setRounds] = useState(session.totalRounds.toString());
  const [noahWild, setNoahWild] = useState(session.noahWild);
  const [ameliaWild, setAmeliaWild] = useState(session.ameliaWild);
  const [syncData, setSyncData] = useState('');

  const handleStart = () => {
    if (!localIdentity) {
      alert("Please select who you are first!");
      return;
    }

    const deck = createDeck();
    const noahHand = sortHand(deck.splice(0, 7), noahWild);
    const ameliaHand = sortHand(deck.splice(0, 7), ameliaWild);
    const discardPile = [deck.pop() as CardType];

    onDeal({
      totalRounds: parseInt(rounds, 10),
      noahWild,
      ameliaWild,
      deck,
      noahHand,
      ameliaHand,
      discardPile,
      status: 'active',
      turn: 'Noah',
      hasDrawn: false,
      currentRound: 1,
      noahScore: 0,
      ameliaScore: 0,
      log: [`🎲 Match started. Noah goes first.`],
      roundWinner: '',
      loserMeldIndices: []
    });
  };

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setSyncData(val);
    if (val.includes("GIN_DATA:")) {
      onSync(val);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-8 bg-card text-card-foreground rounded-xl shadow-xl mt-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-serif font-bold text-amber-500">Midnight Gin</h1>
        <p className="text-muted-foreground text-sm">A private table for Noah & Amelia</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-lg">Who is playing on this device?</Label>
          <RadioGroup 
            value={localIdentity || ""} 
            onValueChange={(val) => setLocalIdentity(val as PlayerName)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2 bg-secondary/50 p-3 rounded-lg flex-1 cursor-pointer hover:bg-secondary">
              <RadioGroupItem value="Noah" id="noah" />
              <Label htmlFor="noah" className="cursor-pointer flex-1">Noah</Label>
            </div>
            <div className="flex items-center space-x-2 bg-secondary/50 p-3 rounded-lg flex-1 cursor-pointer hover:bg-secondary">
              <RadioGroupItem value="Amelia" id="amelia" />
              <Label htmlFor="amelia" className="cursor-pointer flex-1">Amelia</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label>Match Length (Rounds)</Label>
          <Select value={rounds} onValueChange={setRounds}>
            <SelectTrigger>
              <SelectValue placeholder="Select rounds" />
            </SelectTrigger>
            <SelectContent>
              {[1, 3, 5, 7, 10].map(n => (
                <SelectItem key={n} value={n.toString()}>{n} {n === 1 ? 'Round' : 'Rounds'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Noah's Wild</Label>
            <Select value={noahWild} onValueChange={setNoahWild}>
              <SelectTrigger className="border-amber-500/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANKS.map(r => <SelectItem key={`n-${r}`} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Amelia's Wild</Label>
            <Select value={ameliaWild} onValueChange={setAmeliaWild}>
              <SelectTrigger className="border-amber-500/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANKS.map(r => <SelectItem key={`a-${r}`} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          className="w-full text-lg py-6 shadow-lg shadow-primary/20" 
          onClick={handleStart}
          disabled={!localIdentity}
        >
          Start Match & Deal
        </Button>
      </div>

      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-muted"></span>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or resume game</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Paste a turn from your friend</Label>
        <Textarea 
          placeholder="Paste GIN_DATA:... here" 
          value={syncData}
          onChange={handlePaste}
          className="font-mono text-xs resize-none h-24 bg-black/40"
        />
      </div>
    </div>
  );
}