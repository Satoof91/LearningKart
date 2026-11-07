// One-time "full game" unlock (non-consumable in-app purchase on Google Play and the App Store).
// Free: all letters and numbers in both languages + the first FREE_WORDS animal words per language.
// The purchase is always reached through the parent gate (Families policy / Apple Kids category).
// The entitlement is cached in the save (Store.data.full) so the game works offline; on start the
// store is asked again on start, so a purchase made on another device (same account) unlocks here too.
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { isNative } from './platform.js';
import { Store } from './store.js';

export const PRODUCT_ID = 'full_game';
export const FREE_WORDS = 5;
const FALLBACK_PRICE = '$1.99';

export const Purchase = {
  price: FALLBACK_PRICE, available: false, busy: false, onChange: null,
  isFull() { return !!Store.data.full; },
  // is this level part of the free game?
  isFree(kind, i) { return kind !== 'word' || i < FREE_WORDS; },
  canPlay(kind, i) { return this.isFull() || this.isFree(kind, i); },
  _set(full) {
    const was = !!Store.data.full; Store.data.full = !!full; Store.save();
    if (was !== !!full && this.onChange) this.onChange(!!full);
  },
  async init() {
    if (!isNative) return;
    try {
      const { isBillingSupported } = await NativePurchases.isBillingSupported();
      this.available = !!isBillingSupported;
      if (!this.available) return;
      const { products } = await NativePurchases.getProducts({ productIdentifiers: [PRODUCT_ID], productType: PURCHASE_TYPE.INAPP });
      if (products && products[0] && products[0].priceString) this.price = products[0].priceString;
      await this.refresh();
    } catch (e) { console.warn('purchase init', e); }
  },
  // ask the store what this account owns (no network = keep the cached value)
  async refresh() {
    const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP });
    const owned = (purchases || []).some(p => p.productIdentifier === PRODUCT_ID && (p.purchaseState === undefined || p.purchaseState === '1' || p.purchaseState === 'PURCHASED'));
    // only ever unlock here: an empty answer (signed out, store hiccup) must not lock a paid family out
    if (owned) this._set(true);
    return owned;
  },
  // returns 'ok' | 'cancel' | 'unavailable' | 'error'
  async buy() {
    if (!isNative || !this.available) return 'unavailable';
    if (this.busy) return 'error';
    this.busy = true;
    try {
      const t = await NativePurchases.purchaseProduct({ productIdentifier: PRODUCT_ID, productType: PURCHASE_TYPE.INAPP, quantity: 1, isConsumable: false });
      if (t && (t.purchaseState === undefined || t.purchaseState === '1' || t.purchaseState === 'PURCHASED')) { this._set(true); return 'ok'; }
      return 'error'; // pending (e.g. cash payment on Android): unlocked on a later start once it completes
    } catch (e) {
      const msg = String((e && (e.message || e.code)) || e).toLowerCase();
      return msg.includes('cancel') ? 'cancel' : 'error';
    } finally { this.busy = false; }
  },
  async restore() {
    if (!isNative || !this.available) return 'unavailable';
    try { await NativePurchases.restorePurchases(); return (await this.refresh()) ? 'ok' : 'none'; } catch (e) { return 'error'; }
  }
};
