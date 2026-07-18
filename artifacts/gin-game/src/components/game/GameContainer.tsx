import React, { useState, useEffect } from 'react';
import { SetupScreen } from '@/components/game/SetupScreen';
import { GameScreen } from '@/components/game/GameScreen';
import { ScoringScreen } from '@/components/game/ScoringScreen';
import { GameOverScreen } from '@/components/game/GameOverScreen';
import { SessionState, PlayerName, getInitialSession } from '@/lib/engine';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function GameContainer() {
  const [session, setSession] = useState<SessionState>(getInitialSession());
  const [localIdentity, setLocalIdentity] = useState<PlayerName | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();

  // Load state on mount
  useEffect(() => {
    const savedIdentity = localStorage.getItem('sms_gin_engine_identity');
    if (savedIdentity === 'Noah' || savedIdentity === 'Amelia') {
      setLocalIdentity(savedIdentity);
    }

    const savedSession = localStorage.getItem('sms_gin_engine_save');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (typeof parsed.noahScore === 'number') {
          setSession(parsed);
        }
      } catch (e) {
        console.error("Failed to parse saved session", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save state on change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('sms_gin_engine_save', JSON.stringify(session));
    }
  }, [session, isLoaded]);

  const handleIdentityChange = (name: PlayerName) => {
    setLocalIdentity(name);
    localStorage.setItem('sms_gin_engine_identity', name);
  };

  const updateSession = (updates: Partial<SessionState>) => {
    setSession(prev => ({ ...prev, ...updates }));
  };

  const handleSync = (encodedData: string) => {
    try {
      const payload = encodedData.split("GIN_DATA:")[1]?.trim();
      if (!payload) throw new Error("Invalid format");
      
      const decoded = JSON.parse(atob(payload));
      if (typeof decoded.noahScore !== 'number') throw new Error("Invalid session shape");
      
      setSession(decoded);
    } catch (e) {
      toast({
        title: "Sync Failed",
        description: "The pasted data seems corrupted or invalid.",
        variant: "destructive"
      });
    }
  };

  const handleWipe = () => {
    if (confirm("Are you sure you want to wipe the game? This cannot be undone.")) {
      setSession(getInitialSession());
    }
  };

  if (!isLoaded) return null;

  const encodedSyncString = `GIN_DATA:${btoa(JSON.stringify(session))}`;

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {session.status === 'setup' && (
        <SetupScreen 
          session={session} 
          onDeal={updateSession} 
          onSync={handleSync}
          localIdentity={localIdentity}
          setLocalIdentity={handleIdentityChange}
        />
      )}

      {session.status === 'active' && localIdentity && (
        <GameScreen 
          session={session} 
          localIdentity={localIdentity} 
          onAction={updateSession}
          onSync={handleSync}
          encodedSyncString={encodedSyncString}
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
          onReset={() => setSession(getInitialSession())}
        />
      )}

      {session.status !== 'setup' && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2 opacity-20 hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-opacity"
          onClick={handleWipe}
          title="Emergency Reset Game"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}

      <Toaster />
    </div>
  );
}