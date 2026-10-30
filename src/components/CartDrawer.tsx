import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  ShoppingBag, 
  Tag, 
  ArrowRight, 
  Check, 
  AlertCircle,
  Truck,
  Sparkles,
  Info,
  Plus,
  Minus
} from 'lucide-react';
import { CartItem, Coupon, StoreSettings } from '../types';
import { StoreOpenStatus } from '../services/storeService';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemoveItem: (cartItemId: string) => void;
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  coupons: Coupon[];
  appliedCoupon: Coupon | null;
  onApplyCoupon: (coupon: Coupon | null) => void;
  settings: StoreSettings;
  openStatus: StoreOpenStatus;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onRemoveItem,
  onUpdateQuantity,
  coupons,
  appliedCoupon,
  onApplyCoupon,
  settings,
  openStatus,
  onProceedToCheckout,
}) => {
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  if (!isOpen) return null;

  // Calculate subtotal
  const subtotal = items.reduce((acc, item) => acc + item.totalPrice, 0);

  // Calculate discount
  let discount = 0;
  if (appliedCoupon && appliedCoupon.isActive) {
    if (appliedCoupon.discountType === 'percentage') {
      discount = (subtotal * appliedCoupon.discountValue) / 100;
    } else {
      discount = appliedCoupon.discountValue;
    }
    // Cannot discount more than subtotal
    discount = Math.min(subtotal, discount);
  }

  // Calculate delivery fee
  let deliveryFee = settings.fixedDeliveryFee;
  const isFreeDelivery = settings.deliveryFeeType === 'free_above' && subtotal >= settings.freeDeliveryThreshold;
  if (isFreeDelivery) {
    deliveryFee = 0;
  }

  const total = Math.max(0, subtotal - discount + deliveryFee);
  const remainingForFreeDelivery = Math.max(0, settings.freeDeliveryThreshold - subtotal);
  const freeDeliveryPercent = Math.min(100, (subtotal / settings.freeDeliveryThreshold) * 100);

  const handleApplyCouponCode = () => {
    setCouponError('');
    const code = couponInput.trim().toUpperCase();
    if (!code) return;

    const found = coupons.find(c => c.code.toUpperCase() === code);
    if (!found) {
      setCouponError('Cupom não encontrado.');
      return;
    }

    if (!found.isActive) {
      setCouponError('Este cupom está desativado.');
      return;
    }

    if (found.minOrderValue && subtotal < found.minOrderValue) {
      setCouponError(`Pedido mínimo de R$ ${found.minOrderValue.toFixed(2).replace('.', ',')} para usar este cupom.`);
      return;
    }

    onApplyCoupon(found);
    setCouponInput('');
  };

  const handleRemoveCoupon = () => {
    onApplyCoupon(null);
    setCouponError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl overflow-hidden border-l border-stone-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-stone-900 text-base">Meu Carrinho</h2>
              <span className="text-xs text-stone-500 font-medium">
                {items.length} {items.length === 1 ? 'item selecionado' : 'itens selecionados'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Delivery Bar */}
        {settings.deliveryFeeType === 'free_above' && (
          <div className="bg-blue-50/70 border-b border-blue-100 p-3 text-xs">
            <div className="flex items-center justify-between mb-1.5 font-bold text-blue-950">
              <span className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-blue-700" />
                {isFreeDelivery ? (
                  <span className="text-blue-700 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Parabéns! Você ganhou Frete Grátis!
                  </span>
                ) : (
                  <span>
                    Adicione mais <strong>R$ {remainingForFreeDelivery.toFixed(2).replace('.', ',')}</strong> para Frete Grátis
                  </span>
                )}
              </span>
              <span className="text-[11px] font-semibold text-blue-700">
                Meta: R$ {settings.freeDeliveryThreshold.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <div className="w-full bg-blue-200/60 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${freeDeliveryPercent}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Closed store notice in cart */}
        {!openStatus.isOpen && (
          <div className="bg-amber-50 border-b border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-amber-950">Aviso: Loja Fechada</span>
              <span>
                Fique tranquilo! Você pode concluir o pedido normalmente e entregaremos no primeiro horário de atendimento.
              </span>
            </div>
          </div>
        )}

        {/* Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
              <ShoppingBag className="w-16 h-16 stroke-1 text-stone-300 mb-3" />
              <h3 className="font-bold text-stone-700 text-base">Seu carrinho está vazio</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-xs">
                Navegue pelo catálogo e escolha rações em saco fechado, a granel por kg ou pelo valor em Reais que preferir!
              </p>
              <button
                onClick={onClose}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs"
              >
                Ver Produtos
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.cartItemId}
                className="bg-white border border-stone-200/90 rounded-2xl p-3 flex gap-3 shadow-xs hover:border-stone-300 transition-all"
              >
                <img
                  src={item.imageUrl}
                  alt={item.productName}
                  className="w-16 h-16 object-contain bg-white p-1 rounded-xl border border-stone-200 shrink-0"
                />

                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm line-clamp-1">
                        {item.productName}
                      </h4>
                      <span className="inline-block font-semibold text-blue-800 text-xs mt-0.5">
                        {item.label}
                      </span>
                      {item.details && (
                        <p className="text-[11px] text-stone-500 line-clamp-1">
                          {item.details}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => onRemoveItem(item.cartItemId)}
                      className="text-stone-300 hover:text-rose-600 p-1 transition-colors"
                      title="Remover item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quantity & Item Total */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100">
                    {item.type === 'unit' || item.type === 'bag' ? (
                      <div className="flex items-center gap-1.5 bg-stone-100 rounded-xl p-0.5 border border-stone-200/90 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.cartItemId, Math.max(1, item.quantity - 1))}
                          className="w-6 h-6 flex items-center justify-center rounded-lg bg-white hover:bg-stone-200 text-stone-700 active:scale-90 font-bold transition-all shadow-2xs"
                          title="Diminuir quantidade"
                          aria-label="Diminuir quantidade"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-black text-xs text-stone-900 select-none">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg bg-white hover:bg-stone-200 text-stone-700 active:scale-90 font-bold transition-all shadow-2xs"
                          title="Aumentar quantidade"
                          aria-label="Aumentar quantidade"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-stone-400">Total do item:</span>
                    )}

                    <span className="font-black text-stone-900 text-sm">
                      R$ {item.totalPrice.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer / Summary */}
        {items.length > 0 && (
          <div className="p-4 border-t border-stone-200 bg-stone-50 space-y-3">
            {/* Coupon Section */}
            <div className="space-y-1.5">
              {appliedCoupon ? (
                <div className="bg-blue-100/70 border border-blue-200 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-blue-900 font-bold">
                    <Tag className="w-3.5 h-3.5 text-blue-700" />
                    <span>Cupom: <strong>{appliedCoupon.code}</strong></span>
                    <span className="text-[11px] bg-blue-200 text-blue-900 px-1.5 py-0.2 rounded font-black">
                      {appliedCoupon.discountType === 'percentage'
                        ? `-${appliedCoupon.discountValue}%`
                        : `-R$ ${appliedCoupon.discountValue.toFixed(2).replace('.', ',')}`}
                    </span>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-blue-700 hover:text-rose-700 font-semibold text-xs ml-2"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Cupom de desconto"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-300 focus:border-blue-500 text-xs uppercase font-bold outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCouponCode}
                    className="bg-stone-900 hover:bg-stone-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-colors"
                  >
                    Aplicar
                  </button>
                </div>
              )}

              {couponError && (
                <p className="text-rose-600 text-[11px] font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {couponError}
                </p>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-1 text-xs text-stone-600 pt-1 border-t border-stone-200/60">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold text-stone-900">
                  R$ {subtotal.toFixed(2).replace('.', ',')}
                </span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-blue-700 font-bold">
                  <span>Desconto cupom:</span>
                  <span>-R$ {discount.toFixed(2).replace('.', ',')}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Taxa de Entrega estimada:</span>
                <span className="font-semibold text-stone-900">
                  {deliveryFee === 0 ? (
                    <span className="text-blue-700 font-bold">GRÁTIS</span>
                  ) : (
                    `R$ ${deliveryFee.toFixed(2).replace('.', ',')}`
                  )}
                </span>
              </div>

              <div className="flex justify-between items-baseline pt-2 border-t border-stone-200 text-stone-900">
                <span className="font-extrabold text-sm">Total Estimado:</span>
                <span className="font-black text-xl text-blue-700">
                  R$ {total.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              onClick={onProceedToCheckout}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-3.5 px-4 rounded-xl text-sm shadow-md shadow-blue-700/25 flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              <span>Continuar para Finalizar Pedido</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
