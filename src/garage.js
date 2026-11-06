// Garage: kart and driver customisation. Items unlock with LEARNING stars (the 1-3 stars of every
// finished level, in every track), never with purchases or ads, and nothing is ever spent or lost:
// reaching a threshold opens the item for good. The co-pilot is any animal friend the child has met.
export const KART_COLORS = ['#ff4d6d', '#3da5ff', '#ffd23f', '#4cd964', '#c77dff', '#20c997', '#ff922b', '#343a40'];
export const GARAGE = {
  body: [
    { id: 'classic', icon: '🚗', cost: 0 }, { id: 'racer', icon: '🏎️', cost: 6 },
    { id: 'jeep', icon: '🚙', cost: 15 }, { id: 'rocket', icon: '🚀', cost: 30 }
  ],
  color: KART_COLORS.map((c, i) => ({ id: i, color: c, cost: [0, 0, 0, 0, 0, 4, 9, 18][i] })),
  hat: [
    { id: 'helmet', icon: '⛑️', cost: 0 }, { id: 'cap', icon: '🧢', cost: 3 }, { id: 'safari', icon: '🤠', cost: 10 },
    { id: 'bunny', icon: '🐰', cost: 20 }, { id: 'crown', icon: '👑', cost: 40 }
  ],
  skin: ['#ffd6a5', '#f1c27d', '#c68642', '#8d5524'].map((c, i) => ({ id: i, color: c, cost: 0 }))
};
export const GARAGE_TABS = ['body', 'color', 'hat', 'skin', 'pilot'];
export const DEFAULT_LOOK = () => ({ body: 'classic', hat: 'helmet', skin: 0, pilot: '' });

// every item whose threshold lies in (before, after]: shown as "new in the garage" after a level
export function newlyUnlocked(before, after) {
  const out = [];
  for (const k of ['body', 'color', 'hat']) for (const it of GARAGE[k]) if (it.cost > before && it.cost <= after) out.push(it);
  return out;
}
