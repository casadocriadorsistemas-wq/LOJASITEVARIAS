/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Header 
} from './components/Header';
import { 
  StoreStatusBanner 
} from './components/StoreStatusBanner';
import { 
  CategoryFilterBar 
} from './components/CategoryFilterBar';
import { 
  ProductCard 
} from './components/ProductCard';
import { 
  RationBuyModal 
} from './components/RationBuyModal';
import { 
  CartDrawer 
} from './components/CartDrawer';
import { 
  CheckoutModal 
} from './components/CheckoutModal';
import { 
  FloatingWhatsApp 
} from './components/FloatingWhatsApp';
import { 
  AdminPanel 
} from './components/AdminPanel';
import { 
  OrderSuccessModal 
} from './components/OrderSuccessModal';
import { 
  AddToCartChoiceModal 
} from './components/AddToCartChoiceModal';
import { 
  ProductDetailsModal 
} from './components/ProductDetailsModal';
import { 
  MasterAdminModal 
} from './components/MasterAdminModal';
import { 
  ExpiredLockScreen 
} from './components/ExpiredLockScreen';
import { 
  WelcomeModal 
} from './components/WelcomeModal';
import { 
  FeaturedCarousel 
} from './components/FeaturedCarousel';
import { 
  Category, 
  Coupon, 
  StoreSettings, 
  CartItem, 
  OrderRecord,
  SystemSubscription,
  Product
} from './types';
import { 
  DEFAULT_CATEGORIES, 
  DEFAULT_COUPONS, 
  DEFAULT_SETTINGS,
  DEFAULT_SUBSCRIPTION 
} from './data/defaultData';
import { updateAppBranding } from './services/pwaService';
import { WhatsAppIcon } from './components/WhatsAppIcon';
import { 
  subscribeProducts, 
  subscribeCategories, 
  subscribeCoupons, 
  subscribeSettings, 
  subscribeOrders,
  subscribeSubscription,
  checkStoreOpenStatus,
  checkIsSubscriptionExpired,
  seedInitialDataIfNeeded
} from './services/storeService';
import { getLojaId, getLojaStorageKey } from './services/storeId';
import { testConnection } from './lib/firebase';
import { 
  ShoppingBag, 
  ArrowRight, 
  Scale, 
  Sparkles, 
  ShieldCheck, 
  Heart,
  Truck,
  Lock
} from 'lucide-react';

const LOCAL_CART_KEY = 'pet_store_customer_cart_v1';

export default function App() {
  // Multitenancy: Identify current store based on hostname/subdomain
  const currentLojaId = getLojaId();

  // Remote/Local synchronized states - starts empty [] when database is blank for this tenant
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(getLojaStorageKey('pet_store_products_v1', currentLojaId));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [coupons, setCoupons] = useState<Coupon[]>(DEFAULT_COUPONS);
  const [settings, setSettings] = useState<StoreSettings>(() => {
    try {
      const saved = localStorage.getItem(getLojaStorageKey('pet_store_settings_v1', currentLojaId));
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved), id: currentLojaId, lojaId: currentLojaId } : { ...DEFAULT_SETTINGS, id: currentLojaId, lojaId: currentLojaId };
    } catch {
      return { ...DEFAULT_SETTINGS, id: currentLojaId, lojaId: currentLojaId };
    }
  });
  const [orders, setOrders] = useState<OrderRecord[]>([]);

  // Cart state: strictly isolated per lojaId
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(getLojaStorageKey(LOCAL_CART_KEY, currentLojaId));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  // Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedAnimal, setSelectedAnimal] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & UI States
  const [selectedProductForCustom, setSelectedProductForCustom] = useState<Product | null>(null);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [addedChoiceItem, setAddedChoiceItem] = useState<CartItem | null>(null);

  // Welcome Dialog state on accessing site
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(() => {
    try {
      const seen = sessionStorage.getItem(`welcome_seen_${currentLojaId}`);
      return !seen;
    } catch {
      return true;
    }
  });

  const handleCloseWelcomeModal = () => {
    setIsWelcomeModalOpen(false);
    try {
      sessionStorage.setItem(`welcome_seen_${currentLojaId}`, 'true');
    } catch {
      // ignore
    }
  };

  // System Subscription (Super Admin xT7$mQ2!vB9#)
  const [subscription, setSubscription] = useState<SystemSubscription>({ ...DEFAULT_SUBSCRIPTION, id: `sub_${currentLojaId}`, lojaId: currentLojaId });
  const [isMasterAdminOpen, setIsMasterAdminOpen] = useState(false);

  // On mount: test connection, seed if empty, attach subscriptions filtered by currentLojaId
  useEffect(() => {
    testConnection();
    seedInitialDataIfNeeded(currentLojaId);

    const unsubProducts = subscribeProducts(setProducts, currentLojaId);
    const unsubCategories = subscribeCategories(setCategories, currentLojaId);
    const unsubCoupons = subscribeCoupons(setCoupons, currentLojaId);
    const unsubSettings = subscribeSettings(setSettings, currentLojaId);
    const unsubOrders = subscribeOrders(setOrders, currentLojaId);
    const unsubSubscription = subscribeSubscription(setSubscription, currentLojaId);

    return () => {
      unsubProducts();
      unsubCategories();
      unsubCoupons();
      unsubSettings();
      unsubOrders();
      unsubSubscription();
    };
  }, [currentLojaId]);

  // Save cart to local storage with tenant namespace
  useEffect(() => {
    try {
      localStorage.setItem(getLojaStorageKey(LOCAL_CART_KEY, currentLojaId), JSON.stringify(cartItems));
    } catch {}
  }, [cartItems, currentLojaId]);

  // Sync PWA Branding (Favicon, Apple icon, Web App Manifest) and social share meta tags with store settings
  useEffect(() => {
    updateAppBranding(settings.logoUrl, settings.storeName, settings.shareDescription);
  }, [settings.logoUrl, settings.storeName, settings.shareDescription]);

  // Compute Store Open/Closed status
  const openStatus = checkStoreOpenStatus(settings);

  // Compute System Subscription Expiration
  const subscriptionStatus = checkIsSubscriptionExpired(subscription);

  // If subscription is expired: lock the store and show ONLY ExpiredLockScreen & Master Admin button
  if (subscriptionStatus.isExpired) {
    return (
      <div className="min-h-screen bg-stone-100 font-sans text-stone-900">
        <ExpiredLockScreen onOpenMasterAdmin={() => setIsMasterAdminOpen(true)} />
        <MasterAdminModal
          isOpen={isMasterAdminOpen}
          onClose={() => setIsMasterAdminOpen(false)}
          subscription={subscription}
          settings={settings}
          onSettingsUpdated={setSettings}
          lojaId={currentLojaId}
        />
      </div>
    );
  }

  // Cart handlers
  const handleAddToCart = (item: CartItem) => {
    let finalItem = item;
    setCartItems(prev => {
      const existingIdx = prev.findIndex(
        i => i.productId === item.productId && i.type === item.type && i.unitPrice === item.unitPrice && i.details === item.details
      );
      if (existingIdx > -1 && (item.type === 'unit' || item.type === 'bag')) {
        const updated = [...prev];
        const existing = updated[existingIdx];
        const newQty = existing.quantity + item.quantity;
        const labelBase = existing.label.replace(/^\d+x\s*/, '');
        const updatedItem: CartItem = {
          ...existing,
          quantity: newQty,
          label: `${newQty}x ${labelBase || (existing.type === 'unit' ? 'unidade' : 'saco')}`,
          totalPrice: existing.unitPrice * newQty,
        };
        updated[existingIdx] = updatedItem;
        finalItem = updatedItem;
        return updated;
      }
      return [item, ...prev];
    });
    setAddedChoiceItem(finalItem);
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCartItems(prev => prev.filter(i => i.cartItemId !== cartItemId));
    if (addedChoiceItem?.cartItemId === cartItemId) {
      setAddedChoiceItem(null);
    }
  };

  const handleUpdateCartQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(cartItemId);
      return;
    }
    setCartItems(prev =>
      prev.map(i => {
        if (i.cartItemId === cartItemId) {
          const unitP = i.unitPrice;
          const labelBase = i.label.replace(/^\d+x\s*/, '');
          const updatedItem: CartItem = {
            ...i,
            quantity: newQty,
            label: `${newQty}x ${labelBase || (i.type === 'unit' ? 'unidade' : 'saco')}`,
            totalPrice: unitP * newQty,
          };
          if (addedChoiceItem?.cartItemId === cartItemId) {
            setAddedChoiceItem(updatedItem);
          }
          return updatedItem;
        }
        return i;
      })
    );
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleOrderSuccess = () => {
    setCartItems([]);
    setAppliedCoupon(null);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    setIsSuccessOpen(true);
  };

  // Pet Mode disabled check (controls lojista pet option, main filters and bulk notice)
  const isPetModeDisabled = Boolean(settings.disablePetMode || settings.hidePetFilters);

  // Filter products
  const filteredProducts = products.filter(p => {
    // Category or Promotions filter
    if (selectedCategoryId === 'promotions') {
      if (!p.isOnSale) {
        return false;
      }
    } else if (selectedCategoryId !== 'all') {
      const matchCategory = (p.categoryIds && p.categoryIds.length > 0)
        ? p.categoryIds.includes(selectedCategoryId)
        : p.categoryId === selectedCategoryId;
      if (!matchCategory) {
        return false;
      }
    }
    // Animal filter (Cães, Gatos, Pássaros, Peixes, Outros) - Ignored when isPetModeDisabled is true
    if (!isPetModeDisabled && selectedAnimal !== 'all') {
      const productPets: string[] = (p.animalTypes && p.animalTypes.length > 0)
        ? p.animalTypes
        : p.animalType
          ? [p.animalType]
          : [
              p.name.toLowerCase().includes('gato') || p.name.toLowerCase().includes('felin') || p.name.toLowerCase().includes('whiskas') ? 'cat' :
              p.name.toLowerCase().includes('pássaro') || p.name.toLowerCase().includes('calopsita') || p.name.toLowerCase().includes('canário') || p.name.toLowerCase().includes('alpiste') || p.name.toLowerCase().includes('ave') ? 'bird' :
              p.name.toLowerCase().includes('peixe') || p.name.toLowerCase().includes('aquári') ? 'fish' :
              'dog'
            ];
      if (!productPets.includes(selectedAnimal)) {
        return false;
      }
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchDesc = p.description.toLowerCase().includes(q);
      return matchName || matchDesc;
    }
    return true;
  }).sort((a, b) => {
    // Featured products appear at the top of the page
    const aFeatured = a.isFeatured ? 1 : 0;
    const bFeatured = b.isFeatured ? 1 : 0;
    if (aFeatured !== bFeatured) {
      return bFeatured - aFeatured; // 1 comes before 0
    }
    return 0;
  });

  const cartTotalSum = cartItems.reduce((acc, i) => acc + i.totalPrice, 0);
  const promoCount = products.filter(p => p.isOnSale).length;

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans text-stone-900 pb-20 sm:pb-12">
      {/* 1. Header */}
      <Header
        settings={settings}
        openStatus={openStatus}
        cartCount={cartItems.reduce((acc, curr) => acc + (curr.quantity || 1), 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* 2. Store Open/Closed Status Banner */}
      <StoreStatusBanner openStatus={openStatus} />

      {/* 3. Carrossel de Imagens dos Produtos em Destaque */}
      <FeaturedCarousel
        products={products}
        onSelectForCustom={setSelectedProductForCustom}
        onOpenDetails={setSelectedProductForDetails}
        whatsappNumber={settings.whatsappNumber}
        storeName={settings.storeName}
        hidePetBadges={isPetModeDisabled}
      />

      {/* 4. Filter & Category Bar */}
      <CategoryFilterBar
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedAnimal={selectedAnimal}
        onSelectAnimal={setSelectedAnimal}
        promoCount={promoCount}
        hidePetFilters={isPetModeDisabled}
      />

      {/* 5. Main Catalog Grid */}
      <main id="catalogo-section" className="container mx-auto px-4 py-6 flex-1">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-extrabold text-stone-900 text-lg sm:text-xl flex items-center gap-2">
              {selectedCategoryId === 'promotions' ? (
                <span className="flex items-center gap-1.5 text-rose-700">
                  <span>🔥</span> Produtos em Promoção
                </span>
              ) : (
                <span>Catálogo de Produtos</span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                selectedCategoryId === 'promotions' ? 'bg-rose-100 text-rose-700' : 'bg-stone-200 text-stone-700'
              }`}>
                {filteredProducts.length} {selectedCategoryId === 'promotions' ? 'ofertas' : 'itens'}
              </span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {selectedCategoryId === 'promotions'
                ? 'Aproveite os melhores preços e ofertas especiais da loja!'
                : (isPetModeDisabled
                    ? 'Clique no produto para ver detalhes e adicionar ao carrinho'
                    : 'Clique em "Escolher Quantidade" para rações a granel ou por saco')}
            </p>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-stone-200 shadow-xs max-w-md mx-auto my-8">
            <ShoppingBag className="w-12 h-12 stroke-1 text-stone-300 mx-auto mb-3" />
            <h3 className="font-extrabold text-stone-800 text-base">
              {products.length === 0 ? 'Catálogo em branco' : 'Nenhum produto encontrado'}
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              {products.length === 0
                ? 'Nenhum produto cadastrado no catálogo. Adicione produtos pelo Painel do Lojista ou importe via planilha Excel.'
                : 'Tente buscar com outro termo ou selecionar outra categoria acima.'}
            </p>
            {products.length === 0 ? (
              <button
                onClick={() => setIsAdminOpen(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-xs transition-colors"
              >
                Abrir Painel do Lojista
              </button>
            ) : (
              <button
                onClick={() => {
                  setSelectedCategoryId('all');
                  setSelectedAnimal('all');
                  setSearchQuery('');
                }}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-colors"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelectForCustom={setSelectedProductForCustom}
                onAddDirectUnit={handleAddToCart}
                onOpenDetails={setSelectedProductForDetails}
                hidePetBadges={isPetModeDisabled}
                whatsappNumber={settings.whatsappNumber}
                storeName={settings.storeName}
              />
            ))}
          </div>
        )}

        {/* Section requested: Não encontrou o que está procurando? Fale com a gente, atenderemos em segundos */}
        <div className="mt-12 bg-gradient-to-r from-blue-900 via-indigo-900 to-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(circle_at_center,white_0,transparent_100%)] pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div className="space-y-2 max-w-xl">
              <span translate="no" className="notranslate inline-flex items-center gap-1.5 bg-amber-400 text-stone-950 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                ⚡ Atendimento Rápido
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                Não encontrou o que está procurando?
              </h3>
              <p className="text-blue-100 text-sm font-medium">
                {isPetModeDisabled
                  ? 'Fale com a gente, atenderemos em segundos! trabalhamos com a principais marcas do mercado em nosso estoque físico, com preços especiais'
                  : 'Fale com a gente, atenderemos em segundos! Temos marcas especiais de rações, petiscos e medicamentos em nosso estoque físico.'}
              </p>
            </div>

            <a
              href={`https://wa.me/${(settings.whatsappNumber || '').replace(/\D/g, '')}?text=${encodeURIComponent(
                'Olá! Não encontrei um produto específico no site e gostaria de saber se vocês têm disponível.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              translate="no"
              className="notranslate bg-[#25D366] hover:bg-[#20ba5a] text-white font-black px-6 py-4 rounded-2xl text-sm sm:text-base shadow-lg shadow-emerald-950/30 flex items-center justify-center gap-2.5 transition-all transform hover:scale-105 active:scale-95 shrink-0"
            >
              <WhatsAppIcon className="w-5 h-5 fill-white" />
              <span translate="no" className="notranslate">Falar no WhatsApp</span>
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-8 text-center text-xs text-stone-500 mt-8">
        <div className="container mx-auto px-4 space-y-2">
          <p className="font-bold text-stone-800 text-sm">
            {settings.storeName}
          </p>
          <p>{settings.address}</p>
          <p className="text-stone-400">
            Pedidos diretamente pelo WhatsApp • Atendimento: Seg a Sex ({settings.weekdayOpen} às {settings.weekdayClose})
            {settings.saturdayOpen && ` • Sáb (${settings.saturdayOpen} às ${settings.saturdayClose})`}
            {!settings.isSundayClosed && settings.sundayOpen && ` • Dom (${settings.sundayOpen} às ${settings.sundayClose})`}
          </p>
          <div className="pt-3 flex items-center justify-center gap-3 text-xs">
            <button
              onClick={() => setIsAdminOpen(true)}
              className="text-stone-600 hover:text-blue-700 underline text-xs font-semibold inline-flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Painel do Lojista
            </button>
            <span className="text-stone-300">•</span>
            {/* Acesso bem discreto ao final da página */}
            <button
              onClick={() => setIsMasterAdminOpen(true)}
              className="text-stone-400 hover:text-stone-600 text-xs font-normal inline-flex items-center gap-1 transition-colors"
              title="Área do Administrador (Assinatura & Licença)"
            >
              <Lock className="w-3 h-3 text-stone-400" />
              <span>Área do Administrador</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Sticky Mobile Cart Bar */}
      {cartItems.length > 0 && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 p-3 shadow-2xl">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold py-3 px-4 rounded-xl flex items-center justify-between shadow-lg shadow-blue-700/25 active:scale-98"
          >
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-stone-950 font-black text-xs px-2 py-0.5 rounded-full">
                {cartItems.length}
              </span>
              <span className="text-sm">Ver Carrinho</span>
            </div>
            <div className="flex items-center gap-1.5 font-black text-sm">
              <span>R$ {cartTotalSum.toFixed(2).replace('.', ',')}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white font-bold text-xs py-2.5 px-4 rounded-2xl shadow-xl border border-stone-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating WhatsApp Action Button */}
      <FloatingWhatsApp settings={settings} />

      {/* Modals */}
      {selectedProductForDetails && (
        <ProductDetailsModal
          product={selectedProductForDetails}
          categoryNames={(() => {
            const ids = (selectedProductForDetails.categoryIds && selectedProductForDetails.categoryIds.length > 0)
              ? selectedProductForDetails.categoryIds
              : (selectedProductForDetails.categoryId ? [selectedProductForDetails.categoryId] : []);
            return ids.map(id => categories.find(c => c.id === id)?.name).filter(Boolean) as string[];
          })()}
          categoryName={categories.find(c => c.id === selectedProductForDetails.categoryId)?.name}
          onClose={() => setSelectedProductForDetails(null)}
          onSelectForCustom={(prod) => {
            setSelectedProductForDetails(null);
            setSelectedProductForCustom(prod);
          }}
          onAddDirectUnit={(item) => {
            setSelectedProductForDetails(null);
            handleAddToCart(item);
          }}
          hidePetBadges={isPetModeDisabled}
          whatsappNumber={settings.whatsappNumber}
          storeName={settings.storeName}
        />
      )}

      {selectedProductForCustom && (
        <RationBuyModal
          product={selectedProductForCustom}
          onClose={() => setSelectedProductForCustom(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onRemoveItem={handleRemoveCartItem}
        onUpdateQuantity={handleUpdateCartQuantity}
        coupons={coupons}
        appliedCoupon={appliedCoupon}
        onApplyCoupon={setAppliedCoupon}
        settings={settings}
        openStatus={openStatus}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        appliedCoupon={appliedCoupon}
        settings={settings}
        openStatus={openStatus}
        onOrderSuccess={handleOrderSuccess}
      />

      <OrderSuccessModal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        openStatus={openStatus}
        settings={settings}
      />

      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        products={products}
        categories={categories}
        coupons={coupons}
        settings={settings}
        orders={orders}
        onSettingsUpdated={setSettings}
        lojaId={currentLojaId}
        subscription={subscription}
        onOpenMasterAdmin={() => setIsMasterAdminOpen(true)}
      />
      <AddToCartChoiceModal
        isOpen={!!addedChoiceItem}
        item={addedChoiceItem ? cartItems.find(i => i.cartItemId === addedChoiceItem.cartItemId) || addedChoiceItem : null}
        totalCartCount={cartItems.reduce((acc, curr) => acc + (curr.quantity || 1), 0)}
        onContinueShopping={() => setAddedChoiceItem(null)}
        onGoToCart={() => {
          setAddedChoiceItem(null);
          setIsCartOpen(true);
        }}
        onUpdateQuantity={handleUpdateCartQuantity}
      />

      {/* Master Admin Modal (xT7$mQ2!vB9#) */}
      <MasterAdminModal
        isOpen={isMasterAdminOpen}
        onClose={() => setIsMasterAdminOpen(false)}
        subscription={subscription}
        settings={settings}
        onSettingsUpdated={setSettings}
        lojaId={currentLojaId}
      />

      {/* Welcome Dialog Modal on Site Access */}
      <WelcomeModal
        isOpen={isWelcomeModalOpen}
        onClose={handleCloseWelcomeModal}
        settings={settings}
      />
    </div>
  );
}
