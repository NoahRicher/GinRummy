import React, { useState, MutableRefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SessionState, PlayerName, getInitialSession } from '@/lib/engine';
import { createRoom, getRoom } from '@/lib/roomApi';
import { motion } from 'framer-motion';
import { Loader2, Link2, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SetupScreenProps {
  session: SessionState;
  onDeal: (updates: Partial<SessionState>) => void;
  localIdentity: PlayerName | null;
  setLocalIdentity: (name: PlayerName) => void;
  roomCode: string | null;
  setRoomCode: (code: string | null) => void;
  setSession: (s: SessionState) => void;
  lastUpdatedAtRef: MutableRefObject<string | null>;
}

export function SetupScreen({
  session,
  onDeal,
  localIdentity,
  setLocalIdentity,
  roomCode,
  setRoomCode,
  setSession,
  lastUpdatedAtRef,
}: SetupScreenProps) {
  const [tab, setTab] = useState<'new' | 'join'>('new');
  const [rounds, setRounds] = useState(session.totalRounds.toString());
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateRoom = async () => {
    if (!localIdentity) {
      toast({ title: 'Select who you are first!', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      // Start in wildpick phase — Noah picks wild first round 1
      const initial = getInitialSession();
      const newSession: SessionState = {
        ...initial,
        totalRounds: parseInt(rounds, 10),
        wildPickerThisRound: 'Noah',
        status: 'wildpick',
      };
      const code = await createRoom(newSession);
      setRoomCode(code);
      onDeal({
        totalRounds: parseInt(rounds, 10),
        wildPickerThisRound: 'Noah',
        status: 'wildpick',
      });
      toast({ title: `Room created! Code: ${code}`, description: 'Share this code with your opponent.' });
    } catch {
      toast({ title: 'Failed to create room', description: 'Check your connection and try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!localIdentity) {
      toast({ title: 'Select who you are first!', variant: 'destructive' });
      return;
    }
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      toast({ title: 'Enter the 4-character room code', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { session: serverSession, updatedAt } = await getRoom(code);
      lastUpdatedAtRef.current = updatedAt;
      setRoomCode(code);
      setSession(serverSession);
    } catch {
      toast({ title: 'Room not found', description: 'Double-check the code and try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card text-card-foreground rounded-2xl shadow-2xl border border-border overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-4 text-center border-b border-border">
          <h1 className="text-3xl font-serif font-bold text-amber-500 mb-1">Gin Rummy</h1>
          <p className="text-sm text-muted-foreground">A private table for Noah &amp; Amelia</p>
        </div>

        <div className="p-8 space-y-6">
          {/* Identity */}
          <div className="space-y-3">
            <Label className="text-base">Who are you?</Label>
            <RadioGroup
              value={localIdentity ?? ''}
              onValueChange={(v) => setLocalIdentity(v as PlayerName)}
              className="grid grid-cols-2 gap-3"
            >
              {(['Noah', 'Amelia'] as PlayerName[]).map((name) => (
                <label
                  key={name}
                  htmlFor={`id-${name}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                    localIdentity === name
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                      : 'border-border bg-secondary/40 hover:bg-secondary/70'
                  }`}
                >
                  <RadioGroupItem value={name} id={`id-${name}`} />
                  <span className="font-semibold">{name}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Tab switcher */}
          <div className="grid grid-cols-2 gap-2 bg-secondary/40 p-1 rounded-xl">
            <button
              onClick={() => setTab('new')}
              className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === 'new' ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              New Match
            </button>
            <button
              onClick={() => setTab('join')}
              className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === 'join' ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Join Match
            </button>
          </div>

          {tab === 'new' && (
            <motion.div key="new" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="space-y-2">
                <Label>Match Length</Label>
                <Select value={rounds} onValueChange={setRounds}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 3, 5, 7, 10].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} {n === 1 ? 'Round' : 'Rounds'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-secondary/30 rounded-xl p-4 border border-border text-sm text-muted-foreground space-y-1">
                <p className="text-foreground font-semibold text-sm">How wilds work</p>
                <p>Before each round one player picks any rank as the wild. Wild cards act as jokers — they fill any spot in any meld.</p>
                <p className="mt-1">Noah picks first (Round 1), then you alternate.</p>
              </div>

              <Button
                className="w-full py-6 text-base font-semibold shadow-lg shadow-primary/20"
                onClick={handleCreateRoom}
                disabled={loading || !localIdentity}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Room…</>
                ) : (
                  <><Link2 className="w-4 h-4 mr-2" /> Create Room</>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                You'll get a 4-letter code to share with your opponent.
              </p>
            </motion.div>
          )}

          {tab === 'join' && (
            <motion.div key="join" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="space-y-2">
                <Label>Room Code</Label>
                <Input
                  placeholder="e.g. A3KZ"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={4}
                  className="text-center text-2xl font-mono tracking-[0.4em] uppercase h-14 border-primary/40 focus-visible:ring-primary/50"
                />
              </div>

              <Button
                className="w-full py-6 text-base font-semibold"
                onClick={handleJoinRoom}
                disabled={loading || !localIdentity || joinCode.trim().length < 4}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Joining…</>
                ) : (
                  <><LogIn className="w-4 h-4 mr-2" /> Join Room</>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Ask your opponent for the 4-letter code.
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
