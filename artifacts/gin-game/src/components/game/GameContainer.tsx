import React, { useState, useEffect, useRef } from 'react';
import { SetupScreen } from '@/components/game/SetupScreen';
import { GameScreen } from '@/components/game/GameScreen';
import { ScoringScreen } from '@/components/game/ScoringScreen';
import { GameOverScreen } from '@/components/game/GameOverScreen';
import { SessionState, PlayerName, getInitialSession } from '@/lib/engine';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();

  // Refs for use in effects/callbacks without stale closures
  const roomCodeRef = useRef<string | null>(null);
  const sessionRef = useRef<SessionState>(session);
  const lastUpdatedAtRef = useRef<string | null>(null);

  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);
  useEffect(() => { sessionRef.current = session; }, [session]);

  // Load persisted state on mount
  useEffect(() => {
    const savedIdentity = localStorage.getItem(IDENTITY_KEY);
    if (savedIdentity === 'Noah' || savedIdentity === 'Amelia') {
      setLocalIdentity(savedIdentity);
    }

    const savedCode = localStorage.getItem(ROOM_CODE_KEY);
    if (savedCode) {
      setRoomCode(savedCode);
      roomCodeRef.current = savedCode;
      // Try to hydrate from server
      getRoom(savedCode)
        .then(({ session: serverSession, updatedAt }) => {
          if (typeof serverSession.noahScore === 'number') {
            lastUpdatedAtRef.current = updatedAt;
            setSession(serverSession);
          }
        })
        .catch(() => {
          // Server unavailable or room expired — fall back to local storage
          const savedSession = localStorage.getItem(SESSION_KEY);
          if (savedSession) {
            try {
              const parsed = JSON.parse(savedSession) as SessionState;
              if (typeof parsed.noahScore === 'number') setSession(parsed);
            } catch { /* ignore */ }
          }
        });
    } else {
      const savedSession = localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession) as SessionState;
          if (typeof parsed.noahScore === 'number') setSession(parsed);
        } catch { /* ignore */ }
      }
    }
    setIsLoaded(true);
  }, []);

  // Persist session locally whenever it changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }, [session, isLoaded]);

  // Polling — only when it's NOT my turn (opponent is acting)
  useEffect(() => {
    if (!roomCode || !localIdentity || !isLoaded) return;
    const s = session;

    // Conditions where I am the active party — don't poll, I push
    const iAmActing =
      (s.status === 'active' && s.turn === localIdentity) ||
      (s.status === 'scoring' && s.roundWinner !== localIdentity); // loser acts during scoring
    const isTerminal = s.status === 'setup' || s.status === 'gameover';

    if (iAmActing || isTerminal) return;

    const interval = setInterval(async () => {
      try {
        const { session: serverSession, updatedAt } = await getRoom(roomCode);
        if (updatedAt !== lastUpdatedAtRef.current) {
          lastUpdatedAtRef.current = updatedAt;
          setSession(serverSession);
        }
      } catch {
        // Silently ignore poll failures
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [roomCode, localIdentity, session.status, session.turn, isLoaded]);

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

  // Update session and push to server if in a room
  const updateSession = (updates: Partial<SessionState>) => {
    setSession(prev => {
      const next = { ...prev, ...updates };
      if (roomCodeRef.current) {
        pushRoom(roomCodeRef.current, next).catch(() => {});
      }
      return next;
    });
  };

  const handleWipe = () => {
    if (confirm('Are you sure you want to reset the game?')) {
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

      {session.status === 'active' && localIdentity && (
        <GameScreen
          session={session}
          localIdentity={localIdentity}
          onAction={updateSession}
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
          className="absolute top-2 right-2 opacity-20 hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-opacity"
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
