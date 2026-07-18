import React, { useState, useEffect, useRef } from 'react';
import { SetupScreen } from '@/components/game/SetupScreen';
import { WildPickScreen } from '@/components/game/WildPickScreen';
import { GameScreen } from '@/components/game/GameScreen';
import { ScoringScreen } from '@/components/game/ScoringScreen';
import { GameOverScreen } from '@/components/game/GameOverScreen';
import { SessionState, PlayerName, Card, getInitialSession } from '@/lib/engine';
import { Toaster } from '@/components/ui/toaster';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getRoom, pushRoom } from '@/lib/roomApi';

const ROOM_CODE_KEY = 'gin_room_code';
const IDENTITY_KEY = 'sms_gin_engine_identity';
const SESSION_KEY = 'sms_gin_engine_save';

export function GameContainer() {
  const [session, setSession] = useState<SessionState>(getInitialSession());
  const [localIdentity, setLocalIdentity] = useState<PlayerName | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const roomCodeRef = useRef<string | null>(null);
  const lastUpdatedAtRef = useRef<string | null>(null);

  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);

  // Load persisted state on mount
  useEffect(() => {
    const savedIdentity = localStorage.getItem(IDENTITY_KEY);
    if (savedIdentity === 'Noah' || savedIdentity === 'Amelia') {
      setLocalIdentity(savedIdentity as PlayerName);
    }

    const savedCode = localStorage.getItem(ROOM_CODE_KEY);
    if (savedCode) {
      setRoomCode(savedCode);
      roomCodeRef.current = savedCode;
      getRoom(savedCode)
        .then(({ session: serverSession, updatedAt }) => {
          if (typeof serverSession.noahScore === 'number') {
            lastUpdatedAtRef.current = updatedAt;
            setSession(serverSession);
          }
        })
        .catch(() => {
          const saved = localStorage.getItem(SESSION_KEY);
          if (saved) { try { setSession(JSON.parse(saved)); } catch { /* ignore */ } }
        });
    } else {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) { try { const p = JSON.parse(saved); if (typeof p.noahScore === 'number') setSession(p); } catch { /* ignore */ } }
    }
    setIsLoaded(true);
  }, []);

  // Persist locally
  useEffect(() => {
    if (isLoaded) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }, [session, isLoaded]);

  // Poll when it's NOT my turn
  useEffect(() => {
    if (!roomCode || !localIdentity || !isLoaded) return;
    const s = session;

    const iAmActing =
      (s.status === 'active' && s.turn === localIdentity) ||
      (s.status === 'scoring' && s.roundWinner !== localIdentity) ||
      (s.status === 'wildpick' && s.wildPickerThisRound === localIdentity);
    const isTerminal = s.status === 'setup' || s.status === 'gameover';

    if (iAmActing || isTerminal) return;

    const interval = setInterval(async () => {
      try {
        const { session: serverSession, updatedAt } = await getRoom(roomCode);
        if (updatedAt !== lastUpdatedAtRef.current) {
          lastUpdatedAtRef.current = updatedAt;
          setSession(serverSession);
        }
      } catch { /* ignore poll failures */ }
    }, 3000);

    return () => clearInterval(interval);
  }, [roomCode, localIdentity, session.status, session.turn, session.wildPickerThisRound, isLoaded]);

  const handleIdentityChange = (name: PlayerName) => {
    setLocalIdentity(name);
    localStorage.setItem(IDENTITY_KEY, name);
  };

  const handleSetRoomCode = (code: string | null) => {
    setRoomCode(code);
    roomCodeRef.current = code;
    if (code) localStorage.setItem(ROOM_CODE_KEY, code);
    else localStorage.removeItem(ROOM_CODE_KEY);
  };

  /** Update session and push to server */
  const updateSession = (updates: Partial<SessionState>) => {
    setSession(prev => {
      const next = { ...prev, ...updates };
      if (roomCodeRef.current) pushRoom(roomCodeRef.current, next).catch(() => {});
      return next;
    });
  };

  /**
   * Reorder a player's hand locally only — cosmetic, no server push.
   * We don't want the opponent's push to race with active gameplay.
   */
  const reorderHand = (player: PlayerName, newHand: Card[]) => {
    setSession(prev => ({
      ...prev,
      [player === 'Noah' ? 'noahHand' : 'ameliaHand']: newHand,
    }));
  };

  const handleWipe = () => {
    if (confirm('Reset the entire game?')) {
      handleSetRoomCode(null);
      lastUpdatedAtRef.current = null;
      setSession(getInitialSession());
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {session.status === 'setup' && (
        <SetupScreen
          session={session}
          onDeal={updateSession}
          localIdentity={localIdentity}
          setLocalIdentity={handleIdentityChange}
          roomCode={roomCode}
          setRoomCode={handleSetRoomCode}
          setSession={setSession}
          lastUpdatedAtRef={lastUpdatedAtRef}
        />
      )}

      {session.status === 'wildpick' && localIdentity && (
        <WildPickScreen
          session={session}
          localIdentity={localIdentity}
          onAction={updateSession}
          roomCode={roomCode}
        />
      )}

      {session.status === 'active' && localIdentity && (
        <GameScreen
          session={session}
          localIdentity={localIdentity}
          onAction={updateSession}
          onReorder={reorderHand}
          roomCode={roomCode}
        />
      )}

      {session.status === 'scoring' && localIdentity && (
        <ScoringScreen
          session={session}
          localIdentity={localIdentity}
          onAction={updateSession}
        />
      )}

      {session.status === 'gameover' && (
        <GameOverScreen
          session={session}
          onReset={() => {
            handleSetRoomCode(null);
            lastUpdatedAtRef.current = null;
            setSession(getInitialSession());
          }}
        />
      )}

      {session.status !== 'setup' && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-2 right-2 opacity-20 hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-opacity z-50"
          onClick={handleWipe}
          title="Reset Game"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}

      <Toaster />
    </div>
  );
}
