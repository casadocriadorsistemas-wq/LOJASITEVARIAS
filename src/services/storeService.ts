import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  writeBatch,
  query,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, Category, Coupon, StoreSettings, OrderRecord, CartItem, SystemSubscription, StoreTenantSummary, CustomerProfile } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_COUPONS, DEFAULT_SETTINGS, DEFAULT_SUBSCRIPTION } from '../data/defaultData';
import { getLojaId, getLojaStorageKey, sanitizeLojaId, DEFAULT_LOJA_ID } from './storeId';

const LOCAL_PRODUCTS_KEY = 'pet_store_products_v1';
const LOCAL_CATEGORIES_KEY = 'pet_store_categories_v1';
const LOCAL_COUPONS_KEY = 'pet_store_coupons_v1';
const LOCAL_SETTINGS_KEY = 'pet_store_settings_v1';
const LOCAL_SUBSCRIPTION_KEY = 'pet_store_subscription_v1';
const LOCAL_ORDERS_KEY = 'pet_store_orders_v1';
const LOCAL_CUSTOMERS_KEY = 'pet_store_customers_v1';
const SEED_LOCK_KEY = 'pet_store_seeded_lock_v1';

let isSeedingInProgress = false;

// Seed initial setup to Firestore (categories, settings and coupons if empty) for the current lojaId.
// NOTE: We NEVER seed fictitious/mock products into Firestore. If empty, it stays blank as requested.
export async function seedInitialDataIfNeeded(lojaIdOverride?: string): Promise<void> {
  if (isSeedingInProgress) return;
  
  const lojaId = sanitizeLojaId(lojaIdOverride || getLojaId());
  isSeedingInProgress = true;
  try {
    // 1. Categories for current lojaId
    const catQuery = query(collection(db, 'categories'), where('lojaId', '==', lojaId));
    const categoriesSnap = await getDocs(catQuery);
    
    if (categoriesSnap.empty) {
      const batch = writeBatch(db);
      const seededCats: Category[] = DEFAULT_CATEGORIES.map(cat => ({
        ...cat,
        id: cat.id,
        lojaId,
      }));

      for (const cat of seededCats) {
        // Doc ID in Firestore scoped by lojaId to prevent collision
        const docId = `${lojaId}_${cat.id}`;
        batch.set(doc(db, 'categories', docId), cat);
      }
      await batch.commit();
      localStorage.setItem(getLojaStorageKey(LOCAL_CATEGORIES_KEY, lojaId), JSON.stringify(seededCats));
    }

    // 2. Settings for current lojaId
    const settingsRef = doc(db, 'settings', lojaId);
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      // If legacy 'casadocriadorteste' and 'config' doc exists, migrate it
      let initialSettings: StoreSettings = {
        ...DEFAULT_SETTINGS,
        id: lojaId,
        lojaId,
      };

      if (lojaId === DEFAULT_LOJA_ID) {
        const legacyConfigSnap = await getDoc(doc(db, 'settings', 'config'));
        if (legacyConfigSnap.exists()) {
          initialSettings = { ...initialSettings, ...legacyConfigSnap.data(), id: lojaId, lojaId };
        }
      }

      await setDoc(settingsRef, initialSettings);
      localStorage.setItem(getLojaStorageKey(LOCAL_SETTINGS_KEY, lojaId), JSON.stringify(initialSettings));
    }

    // 3. Coupons for current lojaId
    const coupQuery = query(collection(db, 'coupons'), where('lojaId', '==', lojaId));
    const couponsSnap = await getDocs(coupQuery);
    if (couponsSnap.empty) {
      const batch = writeBatch(db);
      const seededCoupons: Coupon[] = DEFAULT_COUPONS.map(c => ({
        ...c,
        lojaId,
      }));
      for (const coup of seededCoupons) {
        const docId = `${lojaId}_${coup.id}`;
        batch.set(doc(db, 'coupons', docId), coup);
      }
      await batch.commit();
      localStorage.setItem(getLojaStorageKey(LOCAL_COUPONS_KEY, lojaId), JSON.stringify(seededCoupons));
    }

    // 4. Subscription for current lojaId
    const subRef = doc(db, 'settings', `sub_${lojaId}`);
    const subSnap = await getDoc(subRef);
    if (!subSnap.exists()) {
      const initialSub: SystemSubscription = {
        ...DEFAULT_SUBSCRIPTION,
        id: `sub_${lojaId}`,
        lojaId,
      };
      await setDoc(subRef, initialSub, { merge: true });
    }

    localStorage.setItem(getLojaStorageKey(SEED_LOCK_KEY, lojaId), 'true');
  } catch (error) {
    console.warn('Initial multitenant seeding note (working with local data if offline):', error);
  } finally {
    isSeedingInProgress = false;
  }
}

// Active In-Memory Listeners for Instant UI updates
const productListeners = new Set<(products: Product[]) => void>();
const categoryListeners = new Set<(categories: Category[]) => void>();
const couponListeners = new Set<(coupon: Coupon[]) => void>();

function notifyProductListeners(products: Product[]) {
  productListeners.forEach((cb) => {
    try { cb(products); } catch (e) { console.error(e); }
  });
}

function notifyCategoryListeners(categories: Category[]) {
  categoryListeners.forEach((cb) => {
    try { cb(categories); } catch (e) { console.error(e); }
  });
}

function notifyCouponListeners(coupons: Coupon[]) {
  couponListeners.forEach((cb) => {
    try { cb(coupons); } catch (e) { console.error(e); }
  });
}

// Subscribe to Products with change detection: filtered strictly by current lojaId
export function subscribeProducts(callback: (products: Product[]) => void, lojaIdOverride?: string): () => void {
  productListeners.add(callback);
  const lojaId = sanitizeLojaId(lojaIdOverride || getLojaId());
  const cacheKey = getLojaStorageKey(LOCAL_PRODUCTS_KEY, lojaId);
  let lastJson = '';

  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      lastJson = cached;
      callback(JSON.parse(cached));
    } catch {
      lastJson = JSON.stringify([]);
      callback([]);
    }
  } else {
    // When no cache exists, default to empty blank list []
    lastJson = JSON.stringify([]);
    callback([]);
  }

  let firestoreUnsub = () => {};
  try {
    const productsQuery = query(collection(db, 'products'), where('lojaId', '==', lojaId));
    firestoreUnsub = onSnapshot(productsQuery, (snapshot) => {
      const prods: Product[] = [];
      if (!snapshot.empty) {
        snapshot.forEach((d) => {
          const item = d.data() as Product;
          prods.push({
            ...item,
            id: d.id,
            lojaId: item.lojaId || lojaId,
          });
        });
      }
      // When snapshot is empty, prods is [] and accurately clears the screen and cache
      const newJson = JSON.stringify(prods);
      if (newJson !== lastJson) {
        lastJson = newJson;
        localStorage.setItem(cacheKey, newJson);
        notifyProductListeners(prods);
      }
    }, (error) => {
      console.warn(`Products listener note for loja ${lojaId}:`, error.message);
    });
  } catch {}

  return () => {
    productListeners.delete(callback);
    firestoreUnsub();
  };
}

export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj
      .map(item => sanitizeForFirestore(item))
      .filter(item => item !== undefined) as any;
  }
  if (typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean as any;
  }
  return obj;
}

export async function saveProduct(product: Product, lojaIdOverride?: string): Promise<boolean> {
  const lojaId = sanitizeLojaId(lojaIdOverride || product.lojaId || getLojaId());
  const cacheKey = getLojaStorageKey(LOCAL_PRODUCTS_KEY, lojaId);
  const productWithLoja: Product = {
    ...product,
    lojaId,
  };

  const cached = localStorage.getItem(cacheKey);
  let list: Product[] = cached ? JSON.parse(cached) : [];
  const idx = list.findIndex(p => p.id === product.id);
  if (idx >= 0) {
    list[idx] = productWithLoja;
  } else {
    list.push(productWithLoja);
  }
  localStorage.setItem(cacheKey, JSON.stringify(list));
  notifyProductListeners(list);

  try {
    const cleanDoc = sanitizeForFirestore(productWithLoja);
    await setDoc(doc(db, 'products', product.id), cleanDoc);
    return true;
  } catch (err) {
    console.error('Product save to Firestore error:', err);
    throw err;
  }
}

export async function saveProductsBulk(
  newProducts: Product[],
  newCategories: Category[] = [],
  lojaIdOverride?: string
): Promise<boolean> {
  const lojaId = sanitizeLojaId(lojaIdOverride || getLojaId());
  const catCacheKey = getLojaStorageKey(LOCAL_CATEGORIES_KEY, lojaId);
  const prodCacheKey = getLojaStorageKey(LOCAL_PRODUCTS_KEY, lojaId);

  // 1. Update Categories locally with lojaId
  const taggedCategories = newCategories.map(c => ({
    ...c,
    lojaId,
  }));

  if (taggedCategories.length > 0) {
    const cachedCats = localStorage.getItem(catCacheKey);
    let catList: Category[] = cachedCats ? JSON.parse(cachedCats) : [...DEFAULT_CATEGORIES];
    for (const cat of taggedCategories) {
      const idx = catList.findIndex(c => c.id === cat.id || c.name.toLowerCase() === cat.name.toLowerCase());
      if (idx >= 0) catList[idx] = cat;
      else catList.push(cat);
    }
    localStorage.setItem(catCacheKey, JSON.stringify(catList));
    notifyCategoryListeners(catList);
  }

  // 2. Update Products locally with lojaId
  const taggedProducts = newProducts.map(p => ({
    ...p,
    lojaId,
  }));

  const cachedProds = localStorage.getItem(prodCacheKey);
  let prodList: Product[] = cachedProds ? JSON.parse(cachedProds) : [];
  for (const prod of taggedProducts) {
    const idx = prodList.findIndex(p => p.id === prod.id || p.name.toLowerCase() === prod.name.toLowerCase());
    if (idx >= 0) prodList[idx] = prod;
    else prodList.push(prod);
  }
  localStorage.setItem(prodCacheKey, JSON.stringify(prodList));
  notifyProductListeners(prodList);

  // 3. Commit to Firestore in chunks (max 300 operations per batch)
  try {
    const operations: { ref: any; data: any }[] = [];

    for (const cat of taggedCategories) {
      const docId = cat.id.startsWith(lojaId + '_') ? cat.id : `${lojaId}_${cat.id}`;
      operations.push({
        ref: doc(db, 'categories', docId),
        data: sanitizeForFirestore(cat),
      });
    }

    for (const prod of taggedProducts) {
      operations.push({
        ref: doc(db, 'products', prod.id),
        data: sanitizeForFirestore(prod),
      });
    }

    const CHUNK_SIZE = 300;
    for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
      const chunk = operations.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const op of chunk) {
        batch.set(op.ref, op.data);
      }
      await batch.commit();
    }

    return true;
  } catch (err: any) {
    console.error('CRITICAL: Error committing bulk products to Firestore:', err);
    throw new Error(err.message || 'Erro ao gravar os produtos no Firestore.');
  }
}

export async function removeProduct(productId: string, lojaIdOverride?: string): Promise<boolean> {
  const lojaId = sanitizeLojaId(lojaIdOverride || getLojaId());
  const cacheKey = getLojaStorageKey(LOCAL_PRODUCTS_KEY, lojaId);

  const cached = localStorage.getItem(cacheKey);
  let list: Product[] = cached ? JSON.parse(cached) : [];
  const updated = list.filter(p => p.id !== productId);
  localStorage.setItem(cacheKey, JSON.stringify(updated));
  notifyProductListeners(updated);

  try {
    await deleteDoc(doc(db, 'products', productId));
    return true;
  } catch (err) {
    console.warn('Product deleted locally, Firestore error:', err);
    return true;
  }
}

// Clear all products completely from Firestore and local storage ONLY for the current lojaId
export async function clearAllProducts(lojaIdOverride?: string): Promise<boolean> {
  const lojaId = sanitizeLojaId(lojaIdOverride || getLojaId());
  const cacheKey = getLojaStorageKey(LOCAL_PRODUCTS_KEY, lojaId);

  localStorage.setItem(cacheKey, JSON.stringify([]));
  notifyProductListeners([]);

  try {
    const prodsQuery = query(collection(db, 'products'), where('lojaId', '==', lojaId));
    const snap = await getDocs(prodsQuery);
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    }
    return true;
  } catch (err) {
    console.error('Error clearing products collection from Firestore:', err);
    throw err;
  }
}

// Categories: isolated by lojaId
export function subscribeCategories(callback: (categories: Category[]) => void, lojaIdOverride?: string): () => void {
  categoryListeners.add(callback);
  const lojaId = sanitizeLojaId(lojaIdOverride || getLojaId());
  const cacheKey = getLojaStorageKey(LOCAL_CATEGORIES_KEY, lojaId);
  let lastJson = '';

  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      lastJson = cached;
      callback(JSON.parse(cached));
    } catch {}
  } else {
    lastJson = JSON.stringify(DEFAULT_CATEGORIES);
    callback(DEFAULT_CATEGORIES);
  }

  let firestoreUnsub = () => {};
  try {
    const catQuery = query(collection(db, 'categories'), where('lojaId', '==', lojaId));
    firestoreUnsub = onSnapshot(catQuery, (snapshot) => {
      if (!snapshot.empty) {
        const cats: Category[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as Category;
          cats.push({
            ...item,
            id: item.id || d.id,
            lojaId: item.lojaId || lojaId,
          });
        });
        cats.sort((a, b) => a.sortOrder - b.sortOrder);
        const newJson = JSON.stringify(cats);
        if (newJson !== lastJson) {
          lastJson = newJson;
          localStorage.setItem(cacheKey, newJson);
          notifyCategoryListeners(cats);
        }
      } else {
        const currentCached = localStorage.getItem(cacheKey);
        if (!currentCached) {
          const defaultCats = DEFAULT_CATEGORIES.map(c => ({ ...c, lojaId }));
          localStorage.setItem(cacheKey, JSON.stringify(defaultCats));
          notifyCategoryListeners(defaultCats);
        }
      }
    }, (err) => console.warn(`Categories listener note for loja ${lojaId}:`, err.message));
  } catch {}

  return () => {
    categoryListeners.delete(callback);
    firestoreUnsub();
  };
}

export async function saveCategory(category: Category, lojaIdOverride?: string): Promise<boolean> {
  const lojaId = sanitizeLojaId(lojaIdOverride || category.lojaId || getLojaId());
  const cacheKey = getLojaStorageKey(LOCAL_CATEGORIES_KEY, lojaId);
  const catWithLoja: Category = {
    ...category,
    lojaId,
  };

  const cached = localStorage.getItem(cacheKey);
  let list: Category[] = cached ? JSON.parse(cached) : [...DEFAULT_CATEGORIES];
  const idx = list.findIndex(c => c.id === category.id);
  if (idx >= 0) list[idx] = catWithLoja;
  else list.push(catWithLoja);
  localStorage.setItem(cacheKey, JSON.stringify(list));
  notifyCategoryListeners(list);

  try {
    const docId = category.id.startsWith(lojaId + '_') ? category.id : `${lojaId}_${category.id}`;
    await setDoc(doc(db, 'categories', docId), sanitizeForFirestore(catWithLoja));
    return true;
  } catch (err) {
    console.warn('Category saved locally:', err);
    return true;
  }
}

export async function removeCategory(categoryId: string, lojaIdOverride?: string): Promise<boolean> {
  const lojaId = sanitizeLojaId(lojaIdOverride || getLojaId());
  const cacheKey = getLojaStorageKey(LOCAL_CATEGORIES_KEY, lojaId);

  const cached = localStorage.getItem(cacheKey);
  let list: Category[] = cached ? JSON.parse(cached) : [...DEFAULT_CATEGORIES];
  const updated = list.filter(c => c.id !== categoryId);
  localStorage.setItem(cacheKey, JSON.stringify(updated));
  notifyCategoryListeners(updated);

  try {
    const docId = categoryId.startsWith(lojaId + '_') ? categoryId : `${lojaId}_${categoryId}`;
    await deleteDoc(doc(db, 'categories', docId));
    // Also try removing raw categoryId in case of legacy document
    await deleteDoc(doc(db, 'categories', categoryId)).catch(() => {});
    return true;
  } catch (err) {
    console.warn('Category deleted locally:', err);
    return true;
  }
}

// Coupons: isolated by lojaId
export function subscribeCoupons(callback: (coupons: Coupon[]) => void, lojaIdOverride?: string): () => void {
  couponListeners.add(callback);
  const lojaId = sanitizeLojaId(lojaIdOverride || getLojaId());
  const cacheKey = getLojaStorageKey(LOCAL_COUPONS_KEY, lojaId);
  let lastJson = '';

  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      lastJson = cached;
      callback(JSON.parse(cached));
    } catch {}
  } else {
    lastJson = JSON.stringify(DEFAULT_COUPONS);
    callback(DEFAULT_COUPONS);
  }

  let firestoreUnsub = () => {};
  try {
    const coupQuery = query(collection(db, 'coupons'), where('lojaId', '==', lojaId));
    firestoreUnsub = onSnapshot(coupQuery, (snapshot) => {
      if (!snapshot.empty) {
        const list: Coupon[] = [];
        snapshot.forEach(d => {
          const item = d.data() as Coupon;
          list.push({ ...item, id: item.id || d.id, lojaId: item.lojaId || lojaId });
        });
        const newJson = JSON.stringify(list);
        if (newJson !== lastJson) {
          lastJson = newJson;
          localStorage.setItem(cacheKey, newJson);
          callback(list);
        }
      }
    }, (err) => console.warn(`Coupons listener note for loja ${lojaId}:`, err.message));
  } catch {}

  return () => {
    couponListeners.delete(callback);
    firestoreUnsub();
  };
}

export async function saveCoupon(coupon: Coupon, lojaIdOverride?: string): Promise<boolean> {
  const lojaId = sanitizeLojaId(lojaIdOverride || coupon.lojaId || getLojaId());
  const cacheKey = getLojaStorageKey(LOCAL_COUPONS_KEY, lojaId);
  const couponWithLoja: Coupon = {
    ...coupon,
    lojaId,
  };

  const cached = localStorage.getItem(cacheKey);
  let list: Coupon[] = cached ? JSON.parse(cached) : [...DEFAULT_COUPONS];
  const idx = list.findIndex(c => c.id === coupon.id);
  if (idx >= 0) list[idx] = couponWithLoja;
  else list.push(couponWithLoja);
  localStorage.setItem(cacheKey, JSON.stringify(list));
  notifyCouponListeners(list);

  try {
    const docId = coupon.id.startsWith(lojaId + '_') ? coupon.id : `${lojaId}_${coupon.id}`;
    await setDoc(doc(db, 'coupons', docId), sanitizeForFirestore(couponWithLoja));
    return true;
  } catch (err) {
    console.warn('Coupon saved locally:', err);
    return true;
  }
}

export async function removeCoupon(couponId: string, lojaIdOverride?: string): Promise<boolean> {
  const lojaId = sanitizeLojaId(lojaIdOverride || getLojaId());
  const cacheKey = getLojaStorageKey(LOCAL_COUPONS_KEY, lojaId);

  const cached = localStorage.getItem(cacheKey);
  let list: Coupon[] = cached ? JSON.parse(cached) : [...DEFAULT_COUPONS];
  const updated = list.filter(c => c.id !== couponId);
  localStorage.setItem(cacheKey, JSON.stringify(updated));
  notifyCouponListeners(updated);

  try {
    const docId = couponId.startsWith(lojaId + '_') ? couponId : `${lojaId}_${couponId}`;
    await deleteDoc(doc(db, 'coupons', docId));
    await deleteDoc(doc(db, 'coupons', couponId)).catch(() => {});
    return true;
  } catch (err) {
    console.warn('Coupon deleted locally:', err);
    return true;
  }
}

// Settings: isolated per lojaId
const settingsListeners = new Set<(settings: StoreSettings) => void>();

export function getStoredSettings(lojaIdOverride?: string): StoreSettings {
  const lojaId = sanitizeLojaId(lojaIdOverride || getLojaId());
  const cacheKey = getLojaStorageKey(LOCAL_SETTINGS_KEY, lojaId);
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(cached), id: lojaId, lojaId };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS, id: lojaId, lojaId };
}

export function getStoredAdminPassword(lojaIdOverride?: string): string {
  const lojaId = sanitizeLojaId(lojaIdOverride || getLojaId());
  const cacheKey = getLojaStorageKey(LOCAL_SETTINGS_KEY, lojaId);
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.adminPassword && String(parsed.adminPassword).trim()) {
        return String(parsed.adminPassword).trim();
      }
    }
  } catch {}
  return DEFAULT_SETTINGS.adminPassword || '1234';
}

export function subscribeSettings(callback: (settings: StoreSettings) => void, lojaIdOverride?: string): () => void {
  settingsListeners.add(callback);
  const lojaId = sanitizeLojaId(lojaIdOverride || getLojaId());
  const cacheKey = getLojaStorageKey(LOCAL_SETTINGS_KEY, lojaId);
  let lastJson = '';

  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      lastJson = cached;
      callback(JSON.parse(cached));
    } catch {}
  } else {
    const initial = { ...DEFAULT_SETTINGS, id: lojaId, lojaId };
    lastJson = JSON.stringify(initial);
    callback(initial);
  }

  try {
    // Each tenant has its own isolated document: settings/{lojaId}
    const unsub = onSnapshot(doc(db, 'settings', lojaId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as StoreSettings;
        const normalized = { ...DEFAULT_SETTINGS, ...data, id: lojaId, lojaId };
        const newJson = JSON.stringify(normalized);
        if (newJson !== lastJson) {
          lastJson = newJson;
          localStorage.setItem(cacheKey, newJson);
          callback(normalized);
        }
      } else {
        // If legacy casadocriadorteste and 'config' doc exists, seed from legacy
        if (lojaId === DEFAULT_LOJA_ID) {
          getDoc(doc(db, 'settings', 'config')).then(legacy => {
            if (legacy.exists()) {
              const legacyData = legacy.data() as StoreSettings;
              const migrated = { ...DEFAULT_SETTINGS, ...legacyData, id: lojaId, lojaId };
              setDoc(doc(db, 'settings', lojaId), migrated).catch(() => {});
              callback(migrated);
            }
          }).catch(() => {});
        }
      }
    }, (err) => console.warn(`Settings listener note for loja ${lojaId}:`, err.message));
    return () => {
      settingsListeners.delete(callback);
      unsub();
    };
  } catch {
    return () => {
      settingsListeners.delete(callback);
    };
  }
}

export async function saveSettings(settings: StoreSettings, lojaIdOverride?: string): Promise<boolean> {
  const lojaId = sanitizeLojaId(lojaIdOverride || settings.lojaId || getLojaId());
  const cacheKey = getLojaStorageKey(LOCAL_SETTINGS_KEY, lojaId);
  const updatedSettings: StoreSettings = {
    ...settings,
    id: lojaId,
    lojaId,
  };

  try {
    // 1. Always save in localStorage instantly with lojaId namespace
    localStorage.setItem(cacheKey, JSON.stringify(updatedSettings));

    // 2. Notify in-memory listeners
    settingsListeners.forEach(listener => {
      try {
        listener(updatedSettings);
      } catch (e) {
        console.warn('Listener notification error in saveSettings:', e);
      }
    });

    // 3. Persist to Firestore: settings/{lojaId}
    await setDoc(doc(db, 'settings', lojaId), sanitizeForFirestore(updatedSettings), { merge: true });

    // 4. If casadocriadorteste, also sync legacy settings/config for backward compatibility
    if (lojaId === DEFAULT_LOJA_ID) {
      await setDoc(doc(db, 'settings', 'config'), sanitizeForFirestore(updatedSettings), { merge: true }).catch(() => {});
    }

    return true;
  } catch (err) {
    console.warn('Settings saved locally, Firestore update note:', err);
    return true;
  }
}

// System Subscription Management (Admin Master xT7$mQ2!vB9#): isolated per lojaId
export function subscribeSubscription(callback: (sub: SystemSubscription) => void, lojaIdOverride?: string): () => void {
  const lojaId = sanitizeLojaId(lojaIdOverride || getLojaId());
  const cacheKey = getLojaStorageKey(LOCAL_SUBSCRIPTION_KEY, lojaId);
  let lastJson = '';

  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      lastJson = cached;
      callback(JSON.parse(cached));
    } catch {}
  } else {
    const defaultSub = { ...DEFAULT_SUBSCRIPTION, id: `sub_${lojaId}`, lojaId };
    lastJson = JSON.stringify(defaultSub);
    localStorage.setItem(cacheKey, lastJson);
    callback(defaultSub);
  }

  try {
    const unsub = onSnapshot(doc(db, 'settings', `sub_${lojaId}`), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as SystemSubscription;
        const normalized = { ...DEFAULT_SUBSCRIPTION, ...data, id: `sub_${lojaId}`, lojaId };
        const newJson = JSON.stringify(normalized);
        if (newJson !== lastJson) {
          lastJson = newJson;
          localStorage.setItem(cacheKey, newJson);
          callback(normalized);
        }
      } else {
        const initial = { ...DEFAULT_SUBSCRIPTION, id: `sub_${lojaId}`, lojaId };
        setDoc(doc(db, 'settings', `sub_${lojaId}`), initial, { merge: true }).catch(() => {});
      }
    }, (err) => console.warn(`Subscription listener note for loja ${lojaId}:`, err.message));
    return unsub;
  } catch {
    return () => {};
  }
}

export async function saveSubscription(sub: SystemSubscription, lojaIdOverride?: string): Promise<boolean> {
  const lojaId = sanitizeLojaId(lojaIdOverride || sub.lojaId || getLojaId());
  const cacheKey = getLojaStorageKey(LOCAL_SUBSCRIPTION_KEY, lojaId);
  const updatedSub: SystemSubscription = {
    ...sub,
    id: `sub_${lojaId}`,
    lojaId,
  };

  try {
    localStorage.setItem(cacheKey, JSON.stringify(updatedSub));
    await setDoc(doc(db, 'settings', `sub_${lojaId}`), sanitizeForFirestore(updatedSub), { merge: true });
    return true;
  } catch (err) {
    console.warn('Subscription saved locally, Firestore update note:', err);
    return true;
  }
}

export function checkIsSubscriptionExpired(sub: SystemSubscription): {
  isExpired: boolean;
  daysRemaining: number;
  formattedDueDate: string;
} {
  if (sub.isExpiredManualOverride) {
    const [y, m, d] = (sub.dueDate || '').split('-').map(Number);
    const formattedDueDate = y && m && d ? `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}` : 'Hoje';
    return {
      isExpired: true,
      daysRemaining: 0,
      formattedDueDate,
    };
  }

  if (!sub.dueDate) {
    return { isExpired: false, daysRemaining: 999, formattedDueDate: '' };
  }

  const [y, m, d] = sub.dueDate.split('-').map(Number);
  if (!y || !m || !d) {
    return { isExpired: false, daysRemaining: 999, formattedDueDate: '' };
  }

  // Current browser date
  const now = new Date();
  const currentY = now.getFullYear();
  const currentM = now.getMonth() + 1;
  const currentD = now.getDate();
  const currentDateStr = `${currentY}-${String(currentM).padStart(2, '0')}-${String(currentD).padStart(2, '0')}`;

  const dueDateTime = new Date(y, m - 1, d, 23, 59, 59).getTime();
  const diffMs = dueDateTime - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  // Bloqueio automático: se a data atual for maior que a data de vencimento
  const isExpired = currentDateStr > sub.dueDate || now.getTime() > dueDateTime;
  const formattedDueDate = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;

  return {
    isExpired,
    daysRemaining,
    formattedDueDate,
  };
}

// -------------------------------------------------------------
// Customer Management & Phone Lookup (11 digits: (XX) XXXXX-XXXX)
// -------------------------------------------------------------

export function cleanPhoneDigits(phone: string): string {
  return (phone || '').replace(/\D/g, '');
}

/**
 * Formats a Brazilian mobile phone number with 11 digits: (44) 99991-8762
 */
export function formatBrazilianPhone(value: string): string {
  const digits = (value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function cacheCustomerLocally(cleanPhone: string, profile: CustomerProfile, lojaId: string) {
  try {
    const cacheKey = getLojaStorageKey(LOCAL_CUSTOMERS_KEY, lojaId);
    const cached = localStorage.getItem(cacheKey);
    const map: Record<string, CustomerProfile> = cached ? JSON.parse(cached) : {};
    map[cleanPhone] = profile;
    localStorage.setItem(cacheKey, JSON.stringify(map));
  } catch {}
}

export async function getCustomerByPhone(
  phone: string,
  lojaIdOverride?: string
): Promise<CustomerProfile | null> {
  const cleanPhone = cleanPhoneDigits(phone);
  if (cleanPhone.length < 10) return null;

  const lojaId = sanitizeLojaId(lojaIdOverride || getLojaId());
  const cacheKey = getLojaStorageKey(LOCAL_CUSTOMERS_KEY, lojaId);

  // 1. Check in local cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const map: Record<string, CustomerProfile> = JSON.parse(cached);
      if (map[cleanPhone]) {
        return map[cleanPhone];
      }
    }
  } catch {}

  // 2. Check in Firestore
  try {
    // Scoped by tenant: customers/{lojaId}_{cleanPhone}
    const scopedRef = doc(db, 'customers', `${lojaId}_${cleanPhone}`);
    const scopedSnap = await getDoc(scopedRef);
    if (scopedSnap.exists()) {
      const profile = scopedSnap.data() as CustomerProfile;
      cacheCustomerLocally(cleanPhone, profile, lojaId);
      return profile;
    }

    // Direct doc: customers/{cleanPhone}
    const directRef = doc(db, 'customers', cleanPhone);
    const directSnap = await getDoc(directRef);
    if (directSnap.exists()) {
      const profile = directSnap.data() as CustomerProfile;
      cacheCustomerLocally(cleanPhone, profile, lojaId);
      return profile;
    }

    // Query by phone field
    const q = query(collection(db, 'customers'), where('phone', '==', cleanPhone));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const profile = snap.docs[0].data() as CustomerProfile;
      cacheCustomerLocally(cleanPhone, profile, lojaId);
      return profile;
    }
  } catch (err) {
    console.warn('Customer Firestore search note:', err);
  }

  return null;
}

export async function saveCustomerProfile(
  profile: CustomerProfile,
  lojaIdOverride?: string
): Promise<void> {
  const cleanPhone = cleanPhoneDigits(profile.phone);
  if (!cleanPhone) return;

  const lojaId = sanitizeLojaId(lojaIdOverride || profile.lojaId || getLojaId());
  const normalized: CustomerProfile = {
    ...profile,
    phone: cleanPhone,
    formattedPhone: formatBrazilianPhone(cleanPhone),
    lojaId,
    updatedAt: new Date().toISOString(),
  };

  // 1. Cache locally
  cacheCustomerLocally(cleanPhone, normalized, lojaId);
  try {
    localStorage.setItem(`last_customer_phone_${lojaId}`, normalized.formattedPhone);
    localStorage.setItem('pet_store_last_customer_phone', normalized.formattedPhone);
  } catch {}

  // 2. Persist to Firestore (scoped and global doc for resiliency)
  try {
    const cleanDoc = sanitizeForFirestore(normalized);
    await setDoc(doc(db, 'customers', `${lojaId}_${cleanPhone}`), cleanDoc, { merge: true });
    await setDoc(doc(db, 'customers', cleanPhone), cleanDoc, { merge: true }).catch(() => {});
  } catch (err) {
    console.warn('Save customer Firestore note:', err);
  }
}

// Orders: filtered and stored strictly per lojaId
export async function createOrder(order: OrderRecord, lojaIdOverride?: string): Promise<void> {
  const lojaId = sanitizeLojaId(lojaIdOverride || order.lojaId || getLojaId());
  const cacheKey = getLojaStorageKey(LOCAL_ORDERS_KEY, lojaId);
  const orderWithLoja: OrderRecord = {
    ...order,
    lojaId,
  };

  const cached = localStorage.getItem(cacheKey);
  const list: OrderRecord[] = cached ? JSON.parse(cached) : [];
  list.unshift(orderWithLoja);
  localStorage.setItem(cacheKey, JSON.stringify(list));

  try {
    await setDoc(doc(db, 'orders', order.id), sanitizeForFirestore(orderWithLoja));
  } catch (err) {
    console.warn('Order saved locally, firestore write note:', err);
  }
}

export function subscribeOrders(callback: (orders: OrderRecord[]) => void, lojaIdOverride?: string): () => void {
  const lojaId = sanitizeLojaId(lojaIdOverride || getLojaId());
  const cacheKey = getLojaStorageKey(LOCAL_ORDERS_KEY, lojaId);
  let lastJson = '';

  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      lastJson = cached;
      callback(JSON.parse(cached));
    } catch {}
  }

  try {
    const ordersQuery = query(collection(db, 'orders'), where('lojaId', '==', lojaId));
    const unsub = onSnapshot(ordersQuery, (snapshot) => {
      const orders: OrderRecord[] = [];
      snapshot.forEach(d => {
        const item = d.data() as OrderRecord;
        orders.push({
          ...item,
          id: d.id,
          lojaId: item.lojaId || lojaId,
        });
      });
      orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const newJson = JSON.stringify(orders);
      if (newJson !== lastJson) {
        lastJson = newJson;
        localStorage.setItem(cacheKey, newJson);
        callback(orders);
      }
    }, (err) => console.warn(`Orders listener note for loja ${lojaId}:`, err.message));
    return unsub;
  } catch {
    return () => {};
  }
}

export async function updateOrderStatus(orderId: string, status: OrderRecord['status'], lojaIdOverride?: string): Promise<void> {
  const lojaId = sanitizeLojaId(lojaIdOverride || getLojaId());
  const cacheKey = getLojaStorageKey(LOCAL_ORDERS_KEY, lojaId);

  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const list: OrderRecord[] = JSON.parse(cached);
    const item = list.find(o => o.id === orderId);
    if (item) item.status = status;
    localStorage.setItem(cacheKey, JSON.stringify(list));
  }
  try {
    await updateDoc(doc(db, 'orders', orderId), { status });
  } catch (err) {
    console.warn('Update order status locally:', err);
  }
}

// Store Open / Closed Schedule Calculation
export interface StoreOpenStatus {
  isOpen: boolean;
  message: string;
  nextScheduleText: string;
  badgeText: string;
}

export function checkStoreOpenStatus(settings: StoreSettings): StoreOpenStatus {
  if (settings.scheduleMode === 'forced_open') {
    return {
      isOpen: true,
      message: 'Loja Aberta! Faça seu pedido agora.',
      nextScheduleText: 'Atendimento imediato.',
      badgeText: 'ABERTO AGORA',
    };
  }

  if (settings.scheduleMode === 'forced_closed') {
    return {
      isOpen: false,
      message: settings.closedMessage || 'Loja fechada no momento, mas fique à vontade para escolher seus produtos! Entregaremos no primeiro horário de atendimento.',
      nextScheduleText: 'Consulte nosso horário de funcionamento.',
      badgeText: 'LOJA FECHADA',
    };
  }

  // Automatic calculation based on local time
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1-5 = Weekday, 6 = Saturday
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeVal = currentHours * 60 + currentMinutes;

  const parseTime = (timeStr: string) => {
    const [h, m] = (timeStr || '08:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  let openTimeVal = 0;
  let closeTimeVal = 0;
  let isClosedToday = false;
  let scheduleDesc = '';

  if (dayOfWeek === 0) { // Sunday
    if (settings.isSundayClosed) {
      isClosedToday = true;
      scheduleDesc = 'Fechado aos Domingos';
    } else {
      openTimeVal = parseTime(settings.sundayOpen || '08:00');
      closeTimeVal = parseTime(settings.sundayClose || '12:00');
      scheduleDesc = `Domingo das ${settings.sundayOpen} às ${settings.sundayClose}`;
    }
  } else if (dayOfWeek === 6) { // Saturday
    openTimeVal = parseTime(settings.saturdayOpen || '08:00');
    closeTimeVal = parseTime(settings.saturdayClose || '14:00');
    scheduleDesc = `Sábado das ${settings.saturdayOpen} às ${settings.saturdayClose}`;
  } else { // Monday - Friday
    openTimeVal = parseTime(settings.weekdayOpen || '08:00');
    closeTimeVal = parseTime(settings.weekdayClose || '18:30');
    scheduleDesc = `Segunda a Sexta das ${settings.weekdayOpen} às ${settings.weekdayClose}`;
  }

  if (isClosedToday) {
    return {
      isOpen: false,
      message: settings.closedMessage,
      nextScheduleText: `Reabrimos segunda-feira às ${settings.weekdayOpen || '08:00'}`,
      badgeText: 'LOJA FECHADA HOJE',
    };
  }

  const isOpen = currentTimeVal >= openTimeVal && currentTimeVal < closeTimeVal;

  if (isOpen) {
    return {
      isOpen: true,
      message: `Aberto até as ${dayOfWeek === 6 ? settings.saturdayClose : dayOfWeek === 0 ? settings.sundayClose : settings.weekdayClose}!`,
      nextScheduleText: scheduleDesc,
      badgeText: 'ABERTO AGORA',
    };
  }

  let nextInfo = '';
  if (currentTimeVal < openTimeVal) {
    const nextH = Math.floor(openTimeVal / 60).toString().padStart(2, '0');
    const nextM = (openTimeVal % 60).toString().padStart(2, '0');
    nextInfo = `Abrimos hoje às ${nextH}:${nextM}`;
  } else {
    if (dayOfWeek === 5) {
      nextInfo = `Abrimos amanhã (Sábado) às ${settings.saturdayOpen || '08:00'}`;
    } else if (dayOfWeek === 6) {
      if (settings.isSundayClosed) {
        nextInfo = `Abrimos Segunda-feira às ${settings.weekdayOpen || '08:00'}`;
      } else {
        nextInfo = `Abrimos amanhã (Domingo) às ${settings.sundayOpen || '08:00'}`;
      }
    } else {
      nextInfo = `Abrimos amanhã às ${settings.weekdayOpen || '08:00'}`;
    }
  }

  return {
    isOpen: false,
    message: settings.closedMessage,
    nextScheduleText: nextInfo,
    badgeText: 'LOJA FECHADA',
  };
}

// Generate formatted WhatsApp URL
export function generateWhatsAppOrderUrl({
  settings,
  order,
  items,
  isClosed,
}: {
  settings: StoreSettings;
  order: Omit<OrderRecord, 'id' | 'createdAt' | 'status' | 'itemsSummary'>;
  items: CartItem[];
  isClosed: boolean;
}): string {
  const cleanPhone = (settings.whatsappNumber || '').replace(/\D/g, '');
  
  let msg = `🐾 *NOVO PEDIDO - ${(settings.storeName || 'LOJA').toUpperCase()}* 🐾\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `👤 *Cliente:* ${order.customerName || 'Cliente'}\n`;
  if (order.customerPhone) {
    msg += `📱 *Telefone / WhatsApp:* ${order.customerPhone}\n`;
  }
  if (order.isExistingCustomer) {
    msg += `⭐ *Cadastro:* Cliente Cadastrado na Loja ✅\n`;
  } else {
    msg += `✨ *Cadastro:* Novo Cliente 🆕\n`;
  }
  msg += `📍 *Modalidade:* ${order.deliveryType === 'delivery' ? '🛵 Entrega em Domicílio' : '🏬 Retirar no Balcão'}\n`;
  if (order.deliveryType === 'delivery') {
    msg += `🏠 *Endereço:* ${order.address}\n`;
  }
  
  msg += `💳 *Forma de Pagamento:* ${order.paymentMethod}\n`;
  if (order.changeFor) {
    msg += `💵 *Troco para:* ${order.changeFor}\n`;
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `🛒 *ITENS DO PEDIDO:*\n\n`;

  items.forEach((item, index) => {
    msg += `${index + 1}️⃣ *${item.productName}*\n`;
    msg += `   ▫️ ${item.label}\n`;
    if (item.details) {
      msg += `   ▫️ _${item.details}_\n`;
    }
    msg += `   ▫️ Subtotal: R$ ${item.totalPrice.toFixed(2).replace('.', ',')}\n\n`;
  });

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `💵 *Subtotal:* R$ ${order.subtotal.toFixed(2).replace('.', ',')}\n`;
  
  if (order.discount > 0) {
    msg += `🏷️ *Cupom Desconto (${order.couponCode || 'APLICADO'}):* -R$ ${order.discount.toFixed(2).replace('.', ',')}\n`;
  }

  if (order.deliveryType === 'delivery') {
    if (order.deliveryFee === 0) {
      msg += `🛵 *Taxa de Entrega:* GRÁTIS 🎉\n`;
    } else {
      msg += `🛵 *Taxa de Entrega:* R$ ${order.deliveryFee.toFixed(2).replace('.', ',')}\n`;
    }
  }

  msg += `💰 *TOTAL A PAGAR: R$ ${order.total.toFixed(2).replace('.', ',')}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;

  if (order.notes && order.notes.trim()) {
    msg += `📝 *Observações:* ${order.notes.trim()}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  }

  const dateStr = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  msg += `🕒 Pedido gerado em ${dateStr}\n`;

  if (isClosed) {
    msg += `\n⚠️ *Aviso do Cliente:* Sei que a loja está fechada no momento, mas deixo meu pedido registrado para ser entregue/atendido no primeiro horário! Obrigado! 🙏🐾\n`;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
}

// ==========================================
// GESTÃO MASTER MULTITENANT DE TODAS AS LOJAS
// ==========================================

export async function fetchAllStoresSummary(): Promise<StoreTenantSummary[]> {
  try {
    const settingsSnap = await getDocs(collection(db, 'settings'));
    
    const settingsMap = new Map<string, StoreSettings>();
    const subMap = new Map<string, SystemSubscription>();
    const allStoreIds = new Set<string>();

    settingsSnap.forEach(d => {
      const data = d.data();
      if (d.id.startsWith('sub_')) {
        const storeId = sanitizeLojaId(d.id.replace('sub_', ''));
        subMap.set(storeId, data as SystemSubscription);
        allStoreIds.add(storeId);
      } else if (d.id === 'subscription') {
        const storeId = sanitizeLojaId(data.lojaId || DEFAULT_LOJA_ID);
        if (!subMap.has(storeId)) subMap.set(storeId, data as SystemSubscription);
        allStoreIds.add(storeId);
      } else if (d.id === 'config') {
        const storeId = sanitizeLojaId(data.lojaId || DEFAULT_LOJA_ID);
        if (!settingsMap.has(storeId)) settingsMap.set(storeId, data as StoreSettings);
        allStoreIds.add(storeId);
      } else {
        const storeId = sanitizeLojaId(data.lojaId || d.id);
        settingsMap.set(storeId, data as StoreSettings);
        allStoreIds.add(storeId);
      }
    });

    // Also get product counts per lojaId
    const productCountMap = new Map<string, number>();
    try {
      const prodsSnap = await getDocs(collection(db, 'products'));
      prodsSnap.forEach(d => {
        const pData = d.data() as Product;
        const pLoja = sanitizeLojaId(pData.lojaId || DEFAULT_LOJA_ID);
        allStoreIds.add(pLoja);
        productCountMap.set(pLoja, (productCountMap.get(pLoja) || 0) + 1);
      });
    } catch (e) {
      console.warn('Product count note:', e);
    }

    // Also check localStorage keys for known stores
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || '';
        if (k.startsWith('pet_store_settings_v1_')) {
          const lId = sanitizeLojaId(k.replace('pet_store_settings_v1_', ''));
          allStoreIds.add(lId);
          if (!settingsMap.has(lId)) {
            try {
              const val = JSON.parse(localStorage.getItem(k) || '');
              settingsMap.set(lId, val);
            } catch {}
          }
        }
      }
    } catch {}

    // Ensure default store is present
    allStoreIds.add(DEFAULT_LOJA_ID);

    const summaries: StoreTenantSummary[] = [];

    for (const storeId of allStoreIds) {
      if (!storeId) continue;
      const set = settingsMap.get(storeId) || { ...DEFAULT_SETTINGS, id: storeId, lojaId: storeId };
      const sub = subMap.get(storeId) || { ...DEFAULT_SUBSCRIPTION, id: `sub_${storeId}`, lojaId: storeId };

      const exp = checkIsSubscriptionExpired(sub);

      summaries.push({
        lojaId: storeId,
        storeName: set.storeName || (storeId === DEFAULT_LOJA_ID ? 'Casa do criador Pet' : storeId),
        phone: set.whatsappNumber || '',
        address: set.address || '',
        notes: sub.notes || '',
        dueDate: sub.dueDate || '2026-11-08',
        monthlyFee: sub.monthlyFee || 150,
        startDate: sub.startDate || '2026-10-09',
        isExpired: exp.isExpired,
        isExpiredManualOverride: sub.isExpiredManualOverride,
        daysRemaining: exp.daysRemaining,
        formattedDueDate: exp.formattedDueDate,
        productsCount: productCountMap.get(storeId) || 0,
        updatedAt: sub.updatedAt || '',
      });
    }

    summaries.sort((a, b) => a.storeName.localeCompare(b.storeName));
    return summaries;
  } catch (err) {
    console.warn('Error fetching all stores summary:', err);
    return [];
  }
}

export function subscribeAllStoresSummary(callback: (stores: StoreTenantSummary[]) => void): () => void {
  fetchAllStoresSummary().then(callback);

  try {
    const unsub = onSnapshot(collection(db, 'settings'), () => {
      fetchAllStoresSummary().then(callback);
    }, (err) => console.warn('All stores subscription note:', err));
    return unsub;
  } catch {
    return () => {};
  }
}

export async function updateStoreTenantInfo(
  lojaIdInput: string,
  updates: {
    dueDate?: string;
    notes?: string;
    monthlyFee?: number;
    storeName?: string;
    phone?: string;
    address?: string;
    isExpiredManualOverride?: boolean;
  }
): Promise<void> {
  const lojaId = sanitizeLojaId(lojaIdInput);
  
  // 1. Update settings if storeName, phone, or address provided
  if (updates.storeName !== undefined || updates.phone !== undefined || updates.address !== undefined) {
    const setKey = getLojaStorageKey(LOCAL_SETTINGS_KEY, lojaId);
    let currentSet: StoreSettings = { ...DEFAULT_SETTINGS, id: lojaId, lojaId };
    const cached = localStorage.getItem(setKey);
    if (cached) {
      try { currentSet = { ...currentSet, ...JSON.parse(cached) }; } catch {}
    }
    if (updates.storeName !== undefined) currentSet.storeName = updates.storeName;
    if (updates.phone !== undefined) currentSet.whatsappNumber = updates.phone;
    if (updates.address !== undefined) currentSet.address = updates.address;

    localStorage.setItem(setKey, JSON.stringify(currentSet));
    try {
      await setDoc(doc(db, 'settings', lojaId), sanitizeForFirestore(currentSet), { merge: true });
    } catch (e) {
      console.warn('Update store settings note:', e);
    }
  }

  // 2. Update subscription if dueDate, notes, monthlyFee, or isExpiredManualOverride provided
  if (
    updates.dueDate !== undefined ||
    updates.notes !== undefined ||
    updates.monthlyFee !== undefined ||
    updates.isExpiredManualOverride !== undefined
  ) {
    const subKey = getLojaStorageKey(LOCAL_SUBSCRIPTION_KEY, lojaId);
    let currentSub: SystemSubscription = { ...DEFAULT_SUBSCRIPTION, id: `sub_${lojaId}`, lojaId };
    const cachedSub = localStorage.getItem(subKey);
    if (cachedSub) {
      try { currentSub = { ...currentSub, ...JSON.parse(cachedSub) }; } catch {}
    }
    if (updates.dueDate !== undefined) currentSub.dueDate = updates.dueDate;
    if (updates.notes !== undefined) currentSub.notes = updates.notes;
    if (updates.monthlyFee !== undefined) currentSub.monthlyFee = updates.monthlyFee;
    if (updates.isExpiredManualOverride !== undefined) currentSub.isExpiredManualOverride = updates.isExpiredManualOverride;
    currentSub.updatedAt = new Date().toISOString();

    localStorage.setItem(subKey, JSON.stringify(currentSub));
    try {
      await setDoc(doc(db, 'settings', `sub_${lojaId}`), sanitizeForFirestore(currentSub), { merge: true });
    } catch (e) {
      console.warn('Update store sub note:', e);
    }
  }
}

export async function deleteStoreData(lojaIdInput: string): Promise<{
  success: boolean;
  deletedProducts: number;
  deletedCategories: number;
  deletedCoupons: number;
  deletedOrders: number;
}> {
  const lojaId = sanitizeLojaId(lojaIdInput);
  let deletedProducts = 0;
  let deletedCategories = 0;
  let deletedCoupons = 0;
  let deletedOrders = 0;

  try {
    // 1. Delete Products matching lojaId or prefix
    const prodsSnap = await getDocs(collection(db, 'products'));
    const prodDocsToDelete = prodsSnap.docs.filter(d => {
      const data = d.data();
      return (data.lojaId && sanitizeLojaId(data.lojaId) === lojaId) || d.id.startsWith(`${lojaId}_`);
    });
    for (const d of prodDocsToDelete) {
      try {
        await deleteDoc(d.ref);
        deletedProducts++;
      } catch (err) {
        console.warn('Error deleting product doc:', d.id, err);
      }
    }

    // 2. Delete Categories matching lojaId or prefix
    const catsSnap = await getDocs(collection(db, 'categories'));
    const catDocsToDelete = catsSnap.docs.filter(d => {
      const data = d.data();
      return (data.lojaId && sanitizeLojaId(data.lojaId) === lojaId) || d.id.startsWith(`${lojaId}_`);
    });
    for (const d of catDocsToDelete) {
      try {
        await deleteDoc(d.ref);
        deletedCategories++;
      } catch (err) {
        console.warn('Error deleting category doc:', d.id, err);
      }
    }

    // 3. Delete Coupons matching lojaId or prefix
    const coupsSnap = await getDocs(collection(db, 'coupons'));
    const coupDocsToDelete = coupsSnap.docs.filter(d => {
      const data = d.data();
      return (data.lojaId && sanitizeLojaId(data.lojaId) === lojaId) || d.id.startsWith(`${lojaId}_`);
    });
    for (const d of coupDocsToDelete) {
      try {
        await deleteDoc(d.ref);
        deletedCoupons++;
      } catch (err) {
        console.warn('Error deleting coupon doc:', d.id, err);
      }
    }

    // 4. Delete Orders matching lojaId
    const ordersSnap = await getDocs(collection(db, 'orders'));
    const orderDocsToDelete = ordersSnap.docs.filter(d => {
      const data = d.data();
      return (data.lojaId && sanitizeLojaId(data.lojaId) === lojaId);
    });
    for (const d of orderDocsToDelete) {
      try {
        await deleteDoc(d.ref);
        deletedOrders++;
      } catch (err) {
        console.warn('Error deleting order doc:', d.id, err);
      }
    }

    // 5. Delete Settings & Subscription docs in Firestore
    try { await deleteDoc(doc(db, 'settings', lojaId)); } catch {}
    try { await deleteDoc(doc(db, 'settings', `sub_${lojaId}`)); } catch {}
    try { await deleteDoc(doc(db, 'subscriptions', `sub_${lojaId}`)); } catch {}
    try { await deleteDoc(doc(db, 'subscriptions', lojaId)); } catch {}

    // 6. Clear local storage keys associated with this lojaId
    try {
      localStorage.removeItem(getLojaStorageKey(LOCAL_SETTINGS_KEY, lojaId));
      localStorage.removeItem(getLojaStorageKey(LOCAL_SUBSCRIPTION_KEY, lojaId));
      localStorage.removeItem(getLojaStorageKey(LOCAL_PRODUCTS_KEY, lojaId));
      localStorage.removeItem(getLojaStorageKey(LOCAL_CATEGORIES_KEY, lojaId));
      localStorage.removeItem(getLojaStorageKey(LOCAL_COUPONS_KEY, lojaId));
      localStorage.removeItem(getLojaStorageKey(LOCAL_ORDERS_KEY, lojaId));
      localStorage.removeItem(getLojaStorageKey('pet_store_cart_v1', lojaId));
      localStorage.removeItem(getLojaStorageKey('pet_admin_password_custom_v1', lojaId));
      localStorage.removeItem(getLojaStorageKey(SEED_LOCK_KEY, lojaId));
    } catch {}

    return {
      success: true,
      deletedProducts,
      deletedCategories,
      deletedCoupons,
      deletedOrders,
    };
  } catch (err) {
    console.error(`Error deleting store data for ${lojaId}:`, err);
    return {
      success: false,
      deletedProducts,
      deletedCategories,
      deletedCoupons,
      deletedOrders,
    };
  }
}

export async function createNewStoreTenant(data: {
  lojaId: string;
  storeName: string;
  phone?: string;
  address?: string;
  dueDate: string;
  monthlyFee?: number;
  notes?: string;
}): Promise<void> {
  const lojaId = sanitizeLojaId(data.lojaId);
  const newSettings: StoreSettings = {
    ...DEFAULT_SETTINGS,
    id: lojaId,
    lojaId,
    storeName: data.storeName.trim(),
    whatsappNumber: (data.phone || '').trim(),
    address: (data.address || '').trim(),
  };

  const newSub: SystemSubscription = {
    ...DEFAULT_SUBSCRIPTION,
    id: `sub_${lojaId}`,
    lojaId,
    dueDate: data.dueDate,
    monthlyFee: data.monthlyFee || 150,
    startDate: new Date().toISOString().split('T')[0],
    notes: data.notes || '',
    isExpiredManualOverride: false,
    updatedAt: new Date().toISOString(),
  };

  await seedInitialDataIfNeeded(lojaId);

  await setDoc(doc(db, 'settings', lojaId), sanitizeForFirestore(newSettings));
  await setDoc(doc(db, 'settings', `sub_${lojaId}`), sanitizeForFirestore(newSub));

  localStorage.setItem(getLojaStorageKey(LOCAL_SETTINGS_KEY, lojaId), JSON.stringify(newSettings));
  localStorage.setItem(getLojaStorageKey(LOCAL_SUBSCRIPTION_KEY, lojaId), JSON.stringify(newSub));
}

