export const SUITS = ['♠', '♥', '♦', '♣'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export type GameStatus = 'setup' | 'wildpick' | 'active' | 'scoring' | 'gameover';
export type PlayerName = 'Noah' | 'Amelia';

export interface Card {
  rank: string;
  suit: string;
  icon: string;
  isRed: boolean;
  suitOrder: number;
  id?: string;
}

export interface SessionState {
  totalRounds: number;
  currentRound: number;
  /** Shared wild rank for this round — empty string while not yet picked */
  currentWild: string;
  /** Which player picks the wild this round */
  wildPickerThisRound: PlayerName;
  noahScore: number;
  ameliaScore: number;
  turn: PlayerName;
  hasDrawn: boolean;
  deck: Card[];
  discardPile: Card[];
  noahHand: Card[];
  ameliaHand: Card[];
  status: GameStatus;
  log: string[];
  roundWinner: PlayerName | '';
  loserMeldIndices: number[];
}

export const getRankValue = (rank: string) => {
  if (rank === 'A') return 1;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  return parseInt(rank, 10);
};

export const getDeadwoodValue = (rank: string) => {
  if (rank === 'A') return 15;
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  return 5;
};

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  let id = 0;
  SUITS.forEach((suit, suitOrder) => {
    const isRed = suit === '♥' || suit === '♦';
    RANKS.forEach((rank) => {
      deck.push({ rank, suit, icon: suit, isRed, suitOrder, id: `card-${id++}` });
    });
  });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

export const sortHand = (hand: Card[], wildRank: string): Card[] => {
  return [...hand].sort((a, b) => {
    const aIsWild = a.rank === wildRank;
    const bIsWild = b.rank === wildRank;
    if (aIsWild && !bIsWild) return -1;
    if (!aIsWild && bIsWild) return 1;
    const aWeight = a.suitOrder * 20 + getRankValue(a.rank);
    const bWeight = b.suitOrder * 20 + getRankValue(b.rank);
    return aWeight - bWeight;
  });
};

interface Scaffold {
  indices: number[];
  wildsNeeded: number;
  matchedNormalCount: number;
}

/**
 * Evaluates which cards in a hand are part of a valid meld.
 * Wild cards (matching wildRank) act as true jokers — they substitute
 * for any card to complete a set or run.
 */
export function evaluateHandForMeldStatus(hand: Card[], wildRank: string): boolean[] {
  const flags = new Array(hand.length).fill(false);
  const wilds: { card: Card; index: number }[] = [];
  const normals: { card: Card; index: number }[] = [];

  for (let i = 0; i < hand.length; i++) {
    if (hand[i].rank === wildRank) {
      wilds.push({ card: hand[i], index: i });
    } else {
      normals.push({ card: hand[i], index: i });
    }
  }

  // 3+ wilds alone always form a valid meld
  if (wilds.length >= 3) wilds.forEach(w => (flags[w.index] = true));

  let remainingWilds = wilds.length;
  const scaffolds: Scaffold[] = [];

  // --- Sets (same rank, different suits) ---
  const rankGroups = new Map<string, typeof normals>();
  for (const c of normals) {
    if (!rankGroups.has(c.card.rank)) rankGroups.set(c.card.rank, []);
    rankGroups.get(c.card.rank)!.push(c);
  }
  for (const group of Array.from(rankGroups.values())) {
    const wildsNeeded = group.length >= 3 ? 0 : group.length === 2 ? 1 : 2;
    scaffolds.push({ indices: group.map(g => g.index), wildsNeeded, matchedNormalCount: group.length });
  }

  // --- Runs (sequential ranks, same suit) ---
  const suitGroups = new Map<string, typeof normals>();
  for (const c of normals) {
    if (!suitGroups.has(c.card.suit)) suitGroups.set(c.card.suit, []);
    suitGroups.get(c.card.suit)!.push(c);
  }
  for (const group of Array.from(suitGroups.values())) {
    group.sort((a, b) => getRankValue(a.card.rank) - getRankValue(b.card.rank));
    for (let i = 0; i < group.length; i++) {
      for (let j = i; j < group.length; j++) {
        const window = group.slice(i, j + 1);
        const first = window[0].card;
        const last = window[window.length - 1].card;
        const span = getRankValue(last.rank) - getRankValue(first.rank) + 1;
        const missingCount = span - window.length;
        const wildsNeeded = span < 3 ? missingCount + (3 - span) : missingCount;
        if (missingCount <= 4) {
          scaffolds.push({ indices: window.map(c => c.index), wildsNeeded, matchedNormalCount: window.length });
        }
      }
    }
  }

  scaffolds.sort((a, b) => b.matchedNormalCount - a.matchedNormalCount);

  for (const sc of scaffolds) {
    if (sc.wildsNeeded > remainingWilds) continue;
    if (sc.indices.some(idx => flags[idx])) continue;
    for (const idx of sc.indices) flags[idx] = true;
    remainingWilds -= sc.wildsNeeded;
    // Mark wilds consumed by this scaffold
    for (let w = 0; w < sc.wildsNeeded; w++) {
      const unusedWild = wilds.find(ww => !flags[ww.index]);
      if (unusedWild) flags[unusedWild.index] = true;
    }
  }

  // Any remaining unused wilds are still melded (they can always be placed)
  for (const w of wilds) flags[w.index] = true;

  return flags;
}

export const getInitialSession = (): SessionState => ({
  totalRounds: 3,
  currentRound: 1,
  currentWild: '',
  wildPickerThisRound: 'Noah',
  noahScore: 0,
  ameliaScore: 0,
  turn: 'Noah',
  hasDrawn: false,
  deck: [],
  discardPile: [],
  noahHand: [],
  ameliaHand: [],
  status: 'setup',
  log: [],
  roundWinner: '',
  loserMeldIndices: [],
});
