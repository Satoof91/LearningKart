// Garage: kart and driver customisation, bought with the stars the child collects on the road (the same
// count the title screen and the race show). Buying spends the stars and the item stays the child's for
// good; never real money or ads. Items that cost 0 are always owned. The co-pilot is any animal friend met.
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

export const BUY_KINDS = ['body', 'color', 'hat'];
export const isOwned = (owned, kind, it) => !it.cost || !!(owned && owned[kind] && owned[kind].includes(it.id));
// items not owned yet that the stars of this level made affordable: shown as a hint after a level
export function newlyAffordable(before, after, owned) {
  const out = [];
  for (const k of BUY_KINDS) for (const it of GARAGE[k]) if (!isOwned(owned, k, it) && it.cost > before && it.cost <= after) out.push(it);
  return out;
}
