import React, { useState } from 'react';
import { 
  X, 
  Scale, 
  Package, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Tag,
  MessageCircle,
  Share2
} from 'lucide-react';
import { Product, CartItem } from '../types';
import { generateProductShareWhatsAppUrl } from '../utils/shareUtils';

interface ProductDetailsModalProps {
  product: Product | null;
  onClose: () => void;
  onSelectForCustom: (product: Product) => void;
  onAddDirectUnit: (item: CartItem) => void;
  categoryName?: string;
  categoryNames?: string[];
  hidePetBadges?: boolean;
  whatsappNumber?: string;
  storeName?: string;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product,
  onClose,
  onSelectForCustom,
  onAddDirectUnit,
  categoryName,
  categoryNames,
  hidePetBadges,
  whatsappNumber,
  storeName,
}) => {
  const [unitQuantity, setUnitQuantity] = useState(1);

  if (!product) return null;

  const isRation = 
    product.sellMode === 'bag_and_bulk' || 
    product.sellMode === 'bag_only' || 
    product.sellMode === 'bulk_only';

  const unitPrice = product.unitPrice || 0;

  const handleAddUnit = () => {
    const qty = Math.max(1, unitQuantity);
    const item: CartItem = {
      cartItemId: `${product.id}-unit-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      imageUrl: product.imageUrl,
      type: 'unit',
      label: `${qty}x ${product.unitLabel || 'unidade'}`,
      details: product.unitLabel ? `Embalagem: ${product.unitLabel}` : 'Item unitário',
      unitPrice: unitPrice,
      quantity: qty,
      totalPrice: unitPrice * qty,
    };
    onAddDirectUnit(item);
    onClose();
  };

  const handleChooseQuantity = () => {
    onClose();
    onSelectForCustom(product);
  };

  const getPetBadges = () => {
    const list = (product.animalTypes && product.animalTypes.length > 0)
      ? product.animalTypes
      : [product.animalType || 'dog'];

    return list.map((at) => {
      switch (at) {
        case 'cat':
          return { id: at, label: 'Gatos', emoji: '🐈' };
        case 'bird':
          return { id: at, label: 'Pássaros', emoji: '🦜' };
        case 'fish':
          return { id: at, label: 'Peixes', emoji: '🐠' };
        case 'other':
          return { id: at, label: 'Outros Pets', emoji: '🐾' };
        default:
          return { id: at, label: 'Cães', emoji: '🐕' };
      }
    });
  };

  const petBadges = getPetBadges();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl border border-stone-100 overflow-hidden animate-in zoom-in-95">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between gap-3 shrink-0 bg-stone-50/70">
          <div className="flex flex-wrap items-center gap-1.5">
            {!hidePetBadges && petBadges.map((badge) => (
              <span key={badge.id} className="bg-blue-100 text-blue-800 font-bold text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <span>{badge.emoji}</span>
                <span>{badge.label}</span>
              </span>
            ))}
            {categoryNames && categoryNames.length > 0 ? (
              categoryNames.map((cName, idx) => (
                <span key={idx} className="text-xs font-semibold text-stone-700 bg-white border border-stone-200 px-2 py-0.5 rounded-lg shadow-2xs flex items-center gap-1">
                  <Tag className="w-3 h-3 text-blue-600" />
                  <span>{cName}</span>
                </span>
              ))
            ) : categoryName ? (
              <span className="text-xs font-semibold text-stone-700 bg-white border border-stone-200 px-2 py-0.5 rounded-lg shadow-2xs flex items-center gap-1">
                <Tag className="w-3 h-3 text-blue-600" />
                <span>{categoryName}</span>
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={generateProductShareWhatsAppUrl(product, storeName)}
              target="_blank"
              rel="noopener noreferrer"
              className="py-1 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-200 hover:border-emerald-600 transition-all flex items-center gap-1.5 text-xs font-bold shadow-2xs cursor-pointer active:scale-95 group"
              title={`Compartilhar ${product.name} pelo WhatsApp`}
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white transition-colors" />
              <span>Compartilhar</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/80 transition-colors cursor-pointer"
              title="Fechar"
              aria-label="Fechar detalhes do produto"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Big Product Image */}
          <div className="relative aspect-4/3 sm:aspect-square bg-stone-50 rounded-2xl border border-stone-200/80 p-4 flex items-center justify-center overflow-hidden">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-contain"
            />

            {/* Badges Overlay */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
              {product.isOnSale && (
                <span className="bg-gradient-to-r from-rose-600 to-red-600 text-white font-black text-xs uppercase px-2.5 py-1 rounded-lg shadow-md shadow-rose-600/30 flex items-center gap-1 animate-pulse">
                  🔥 {product.promoDiscountText || 'PROMOÇÃO'}
                </span>
              )}
            </div>

            {/* Stock status overlay if out of stock */}
            {!product.inStock && (
              <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center">
                <span className="bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                  Esgotado no Momento
                </span>
              </div>
            )}
          </div>

          {/* Product Title & Stock Status */}
          <div className="space-y-1.5">
            <h2 className="font-extrabold text-stone-900 text-lg sm:text-xl leading-snug">
              {product.name}
            </h2>
            <div className="flex items-center gap-2 text-xs">
              <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md ${
                product.inStock ? 'bg-blue-50 text-blue-800' : 'bg-rose-50 text-rose-700'
              }`}>
                {product.inStock ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Produto em Estoque</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Indisponível no Momento</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Product Description */}
          {product.description && (
            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3.5 text-xs sm:text-sm text-stone-700 leading-relaxed space-y-1">
              <span className="font-extrabold text-stone-900 block text-xs uppercase tracking-wider">
                Descrição do Produto:
              </span>
              <p className="whitespace-pre-line text-stone-600">
                {product.description}
              </p>
            </div>
          )}

          {/* Pricing Details breakdown */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2.5">
            <span className="font-extrabold text-stone-900 block text-xs uppercase tracking-wider text-stone-500">
              Informações de Preço:
            </span>

            {/* If Ration with Sack and Bulk */}
            {product.sellMode === 'bag_and_bulk' && (
              <div className="space-y-2 text-xs">
                {product.bulkPricePerKg && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50/60 border border-blue-100">
                    <span className="font-bold text-stone-700 flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-blue-600" />
                      <span>A Granel (peso ou valor R$):</span>
                    </span>
                    <span className="font-black text-blue-700 text-sm">
                      R$ {product.bulkPricePerKg.toFixed(2).replace('.', ',')} / kg
                    </span>
                  </div>
                )}

                {product.bagVariations && product.bagVariations.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="font-bold text-stone-600 block flex items-center gap-1">
                      <Package className="w-4 h-4 text-stone-400" />
                      <span>Sacos Fechados Lacrados:</span>
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {product.bagVariations.map((bv) => (
                        <div key={bv.id} className="p-2 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between">
                          <span className="font-bold text-stone-800">{bv.weightKg} kg</span>
                          <span className="font-black text-stone-900">R$ {bv.price.toFixed(2).replace('.', ',')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* If Bulk Only */}
            {product.sellMode === 'bulk_only' && (
              <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-700 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-blue-600" />
                    <span>Preço a Granel:</span>
                  </span>
                  <span className="font-black text-blue-700 text-sm">
                    R$ {(product.bulkPricePerKg || 0).toFixed(2).replace('.', ',')} / kg
                  </span>
                </div>
                <p className="text-[11px] text-blue-800">
                  Compre a quantidade que desejar (ex: R$ 10,00 ou 1,5 kg).
                </p>
              </div>
            )}

            {/* If Bag Only */}
            {product.sellMode === 'bag_only' && (
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-stone-600 block flex items-center gap-1">
                  <Package className="w-4 h-4 text-stone-400" />
                  <span>Sacos Disponíveis:</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(product.bagVariations && product.bagVariations.length > 0 ? product.bagVariations : [{ id: '1', weightKg: product.bagWeightKg || 15, price: product.bagPrice || 0 }]).map((bv) => (
                    <div key={bv.id} className="p-2 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between">
                      <span className="font-bold text-stone-800">{bv.weightKg} kg</span>
                      <span className="font-black text-stone-900">R$ {bv.price.toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* If Consultation Only */}
            {product.isConsultationOnly && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div>
                  <span className="text-xs font-bold text-stone-600 block">Preço do Produto:</span>
                  <span className="font-black text-emerald-800 text-lg">
                    Sob Consulta
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-white border border-emerald-200 px-3 py-1 rounded-full shadow-2xs">
                  💬 Via WhatsApp
                </span>
              </div>
            )}

            {/* If Unit */}
            {!product.isConsultationOnly && product.sellMode === 'unit' && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-xs font-bold text-stone-600">
                  {product.unitLabel ? `Preço por ${product.unitLabel}:` : 'Preço Unitário:'}
                </span>
                <span className="font-black text-stone-900 text-lg">
                  R$ {unitPrice.toFixed(2).replace('.', ',')}
                </span>
              </div>
            )}
          </div>

          {/* Quantity Selector for Unit products */}
          {!product.isConsultationOnly && !isRation && product.inStock && (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700">Quantidade:</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setUnitQuantity(Math.max(1, unitQuantity - 1))}
                  className="w-8 h-8 rounded-xl bg-white border border-stone-300 text-stone-700 flex items-center justify-center font-bold hover:bg-stone-100 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-black text-stone-900 text-sm min-w-5 text-center">
                  {unitQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => setUnitQuantity(unitQuantity + 1)}
                  className="w-8 h-8 rounded-xl bg-white border border-stone-300 text-stone-700 flex items-center justify-center font-bold hover:bg-stone-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Action Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-100 bg-white shrink-0">
          {product.isConsultationOnly ? (
            <button
              type="button"
              onClick={() => {
                const cleanPhone = (whatsappNumber || '').replace(/\D/g, '');
                const msg = `gostaria de saber o valor do ${product.name}`;
                const url = cleanPhone
                  ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
                  : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                window.open(url, '_blank');
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 px-5 rounded-2xl text-sm shadow-md shadow-emerald-700/25 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Consultar Preço no WhatsApp</span>
            </button>
          ) : isRation ? (
            <button
              type="button"
              onClick={handleChooseQuantity}
              disabled={!product.inStock}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-5 rounded-2xl text-sm shadow-md shadow-blue-700/25 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Scale className="w-5 h-5" />
              <span>Escolher Quantidades</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAddUnit}
              disabled={!product.inStock}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-5 rounded-2xl text-sm shadow-md shadow-blue-700/25 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>
                Adicionar ao Carrinho • R$ {(unitPrice * unitQuantity).toFixed(2).replace('.', ',')}
              </span>
            </button>
          )}

          {/* Compartilhar pelo WhatsApp */}
          <a
            href={generateProductShareWhatsAppUrl(product, storeName)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mt-2 py-2.5 px-4 rounded-2xl text-xs font-bold text-stone-700 hover:text-emerald-800 bg-stone-50 hover:bg-emerald-50 border border-stone-200/90 hover:border-emerald-300 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs group"
            title={`Compartilhar ${product.name} pelo WhatsApp`}
          >
            <Share2 className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform shrink-0" />
            <span>Compartilhar este Produto no WhatsApp</span>
          </a>
        </div>

      </div>
    </div>
  );
};
