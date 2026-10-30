import React from 'react';
import { CheckCircle2, ShoppingCart, ArrowLeft, ArrowRight, X, Plus, Minus } from 'lucide-react';
import { CartItem } from '../types';

interface AddToCartChoiceModalProps {
  isOpen: boolean;
  item: CartItem | null;
  totalCartCount: number;
  onContinueShopping: () => void;
  onGoToCart: () => void;
  onUpdateQuantity?: (cartItemId: string, newQty: number) => void;
}

export const AddToCartChoiceModal: React.FC<AddToCartChoiceModalProps> = ({
  isOpen,
  item,
  totalCartCount,
  onContinueShopping,
  onGoToCart,
  onUpdateQuantity,
}) => {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-100 text-center space-y-4 animate-in zoom-in-95">
        
        {/* Success Icon */}
        <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <h3 className="font-extrabold text-stone-900 text-lg">
            Item Adicionado ao Pedido!
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            O que você gostaria de fazer agora?
          </p>
        </div>

        {/* Item Preview Card */}
        <div className="bg-stone-50 border border-stone-200/90 rounded-2xl p-3 flex items-center gap-3 text-left">
          <img
            src={item.imageUrl}
            alt={item.productName}
            className="w-14 h-14 object-contain bg-white p-1 rounded-xl border border-stone-200 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-stone-900 text-xs sm:text-sm truncate">
              {item.productName}
            </h4>
            <span className="text-xs font-semibold text-blue-800 block">
              {item.label}
            </span>
            <span className="text-xs font-black text-stone-900 block mt-0.5">
              R$ {item.totalPrice.toFixed(2).replace('.', ',')}
            </span>
          </div>

          {(item.type === 'unit' || item.type === 'bag') && onUpdateQuantity && (
            <div className="flex items-center gap-1 bg-white border border-stone-200/90 rounded-xl p-1 shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => onUpdateQuantity(item.cartItemId, Math.max(1, item.quantity - 1))}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 active:scale-90 font-bold transition-all text-xs"
                title="Diminuir quantidade"
                aria-label="Diminuir quantidade"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-5 text-center font-black text-xs text-stone-900 select-none">
                {item.quantity}
              </span>
              <button
                type="button"
                onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)}
                className="w-6 h-6 flex items-center justify-center rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 active:scale-90 font-bold transition-all text-xs"
                title="Aumentar quantidade"
                aria-label="Aumentar quantidade"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          {/* Go to Cart (Primary) */}
          <button
            type="button"
            onClick={onGoToCart}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-3.5 px-4 rounded-xl text-sm shadow-md shadow-blue-700/20 flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Ir para o Carrinho</span>
            <span className="bg-white/20 text-white font-bold text-xs px-2 py-0.5 rounded-full ml-1">
              {totalCartCount}
            </span>
            <ArrowRight className="w-4 h-4 ml-auto" />
          </button>

          {/* Continue Shopping (Secondary) */}
          <button
            type="button"
            onClick={onContinueShopping}
            className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Continuar Comprando</span>
          </button>
        </div>

      </div>
    </div>
  );
};
