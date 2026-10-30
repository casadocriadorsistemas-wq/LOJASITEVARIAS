import React, { useState } from 'react';
import { 
  X, 
  Scale, 
  Package, 
  DollarSign, 
  Plus, 
  Minus, 
  Check, 
  Info,
  Sparkles
} from 'lucide-react';
import { Product, CartItem } from '../types';

interface RationBuyModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

export const RationBuyModal: React.FC<RationBuyModalProps> = ({
  product,
  onClose,
  onAddToCart,
}) => {
  // Determine available tabs
  const hasBag = (product.sellMode === 'bag_and_bulk' || product.sellMode === 'bag_only') && !!product.bagPrice;
  const hasBulk = (product.sellMode === 'bag_and_bulk' || product.sellMode === 'bulk_only') && !!product.bulkPricePerKg;

  // Active tab: 'value' (R$), 'kg' (peso), or 'bag' (saco)
  const [activeTab, setActiveTab] = useState<'value' | 'kg' | 'bag'>(
    hasBulk ? 'value' : 'bag'
  );

  // States for Value (R$)
  const [selectedRValue, setSelectedRValue] = useState<number>(20);
  const [customRValue, setCustomRValue] = useState<string>('20.00');

  // States for Weight (Kg)
  const [selectedKg, setSelectedKg] = useState<number>(1.0);
  const [customKg, setCustomKg] = useState<string>('1.0');

  // States for Bag
  const bagVariations = product.bagVariations && product.bagVariations.length > 0
    ? product.bagVariations
    : (product.bagPrice ? [{ id: 'default', weightKg: product.bagWeightKg || 15, price: product.bagPrice }] : []);

  const [selectedBagVarId, setSelectedBagVarId] = useState<string>(
    bagVariations[0]?.id || 'default'
  );
  const [bagQty, setBagQty] = useState<number>(1);

  const selectedBagVar = bagVariations.find(v => v.id === selectedBagVarId) || bagVariations[0] || { weightKg: 15, price: product.bagPrice || 0 };
  const currentBagPrice = selectedBagVar.price;
  const currentBagWeight = selectedBagVar.weightKg;

  const pricePerKg = product.bulkPricePerKg || 1;

  // Calculations
  const calculatedWeightFromValue = selectedRValue / pricePerKg;
  const calculatedPriceFromKg = selectedKg * pricePerKg;
  const calculatedPriceFromBag = bagQty * currentBagPrice;

  // Handle R$ value change
  const handleSelectRValue = (val: number) => {
    setSelectedRValue(val);
    setCustomRValue(val.toFixed(2));
  };

  const handleCustomRValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(',', '.');
    setCustomRValue(raw);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed > 0) {
      setSelectedRValue(parsed);
    }
  };

  // Handle Kg change
  const handleSelectKg = (val: number) => {
    setSelectedKg(val);
    setCustomKg(val.toString());
  };

  const handleCustomKgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(',', '.');
    setCustomKg(raw);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed) && parsed > 0) {
      setSelectedKg(parsed);
    }
  };

  const handleConfirm = () => {
    let newItem: CartItem;

    if (activeTab === 'value') {
      const val = Math.max(1, selectedRValue);
      const wt = val / pricePerKg;
      newItem = {
        cartItemId: `${product.id}-val-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        imageUrl: product.imageUrl,
        type: 'bulk_value',
        label: `A Granel: R$ ${val.toFixed(2).replace('.', ',')}`,
        details: `Aprox. ${wt.toFixed(2).replace('.', ',')} kg (R$ ${pricePerKg.toFixed(2).replace('.', ',')}/kg)`,
        unitPrice: val,
        quantity: 1,
        calculatedWeightKg: wt,
        totalPrice: val,
      };
    } else if (activeTab === 'kg') {
      const wt = Math.max(0.1, selectedKg);
      const total = wt * pricePerKg;
      newItem = {
        cartItemId: `${product.id}-kg-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        imageUrl: product.imageUrl,
        type: 'bulk_kg',
        label: `A Granel: ${wt.toFixed(2).replace('.', ',')} kg`,
        details: `R$ ${pricePerKg.toFixed(2).replace('.', ',')}/kg`,
        unitPrice: pricePerKg,
        quantity: 1,
        calculatedWeightKg: wt,
        totalPrice: total,
      };
    } else {
      const qty = Math.max(1, bagQty);
      const total = qty * currentBagPrice;
      newItem = {
        cartItemId: `${product.id}-bag-${currentBagWeight}kg-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        imageUrl: product.imageUrl,
        type: 'bag',
        label: `Saco Fechado (${currentBagWeight} kg)`,
        details: `${qty}x Saco de ${currentBagWeight} kg lacrado de fábrica`,
        unitPrice: currentBagPrice,
        quantity: qty,
        calculatedWeightKg: currentBagWeight * qty,
        totalPrice: total,
      };
    }

    onAddToCart(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-stone-100">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-14 h-14 object-contain bg-white p-1 rounded-xl border border-stone-200 shadow-xs shrink-0"
            />
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                Escolha a quantidade ideal
              </span>
              <h3 className="font-extrabold text-stone-900 text-sm sm:text-base leading-tight mt-1 line-clamp-2">
                {product.name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Option Selector Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-xl">
            {hasBulk && (
              <button
                type="button"
                onClick={() => setActiveTab('value')}
                className={`py-2 px-1 text-xs font-bold rounded-lg transition-all flex flex-col items-center gap-1 ${
                  activeTab === 'value'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Por Valor (R$)</span>
              </button>
            )}

            {hasBulk && (
              <button
                type="button"
                onClick={() => setActiveTab('kg')}
                className={`py-2 px-1 text-xs font-bold rounded-lg transition-all flex flex-col items-center gap-1 ${
                  activeTab === 'kg'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Scale className="w-4 h-4" />
                <span>Por Peso (Kg)</span>
              </button>
            )}

            {hasBag && (
              <button
                type="button"
                onClick={() => setActiveTab('bag')}
                className={`py-2 px-1 text-xs font-bold rounded-lg transition-all flex flex-col items-center gap-1 ${
                  activeTab === 'bag'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Saco Fechado</span>
              </button>
            )}
          </div>

          {/* TAB 1: POR VALOR EM REAIS (R$) */}
          {activeTab === 'value' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Compre o valor que você quiser!</p>
                  <p className="text-blue-800">
                    Ex: Coloque <strong>R$ 20,00</strong> e pesamos a quantidade exata de ração a granel para seu pet.
                  </p>
                </div>
              </div>

              {/* Preset buttons */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2">
                  Valores rápidos mais pedidos:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 15, 20, 30].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleSelectRValue(val)}
                      className={`py-2.5 rounded-xl text-xs font-extrabold border transition-all ${
                        selectedRValue === val
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:border-blue-300'
                      }`}
                    >
                      R$ {val},00
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount input */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Ou digite outro valor em Reais:
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-bold text-sm">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.50"
                    min="1"
                    value={customRValue}
                    onChange={handleCustomRValueChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-stone-900 font-extrabold text-base outline-none"
                    placeholder="20.00"
                  />
                </div>
              </div>

              {/* Live Yield Calculation Card */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-500 block">Rendimento Estimado:</span>
                  <span className="font-extrabold text-stone-900 text-base">
                    ≈ {calculatedWeightFromValue.toFixed(2).replace('.', ',')} kg
                  </span>
                  <span className="text-[11px] text-stone-500 block">
                    (Preço: R$ {pricePerKg.toFixed(2).replace('.', ',')} / kg)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-stone-500 block">Valor a Pagar:</span>
                  <span className="font-extrabold text-blue-700 text-xl">
                    R$ {selectedRValue.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: POR PESO EM KG */}
          {activeTab === 'kg' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2">
                <Scale className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Escolha pelo peso desejado</p>
                  <p className="text-blue-800">
                    Pesamos a granel no saco higienizado, fresquinha e bem acondicionada.
                  </p>
                </div>
              </div>

              {/* Quick weight chips */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2">
                  Pesos comuns:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0.5, 1.0, 1.5, 2.0].map((kgVal) => (
                    <button
                      key={kgVal}
                      type="button"
                      onClick={() => handleSelectKg(kgVal)}
                      className={`py-2 rounded-xl text-xs font-extrabold border transition-all ${
                        selectedKg === kgVal
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:border-blue-300'
                      }`}
                    >
                      {kgVal === 0.5 ? '500g' : `${kgVal.toFixed(1).replace('.', ',')} kg`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stepper & input for weight */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Quantidade exata de quilos:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectKg(Math.max(0.5, +(selectedKg - 0.5).toFixed(1)))}
                    className="w-11 h-11 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={customKg}
                      onChange={handleCustomKgChange}
                      className="w-full text-center py-2.5 rounded-xl border border-stone-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-stone-900 font-extrabold text-base outline-none"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-semibold text-xs">
                      kg
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectKg(+(selectedKg + 0.5).toFixed(1))}
                    className="w-11 h-11 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Live Price Calculation Card */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-500 block">Preço do Kg:</span>
                  <span className="font-extrabold text-stone-800 text-sm">
                    R$ {pricePerKg.toFixed(2).replace('.', ',')} / kg
                  </span>
                  <span className="text-[11px] text-stone-500 block">
                    Peso selecionado: {selectedKg.toFixed(2).replace('.', ',')} kg
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-stone-500 block">Total a Pagar:</span>
                  <span className="font-extrabold text-blue-700 text-xl">
                    R$ {calculatedPriceFromKg.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SACO FECHADO */}
          {activeTab === 'bag' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                <Package className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Embalagem Original Lacrada de Fábrica</p>
                  <p className="text-amber-800">
                    Saco fechado lacrado com garantia de procedência e máxima economia.
                  </p>
                </div>
              </div>

              {/* Bag Size Variations Selector */}
              {bagVariations.length > 1 && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-2">
                    Escolha o tamanho do saco:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {bagVariations.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedBagVarId(v.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          selectedBagVarId === v.id
                            ? 'bg-amber-500 text-stone-950 border-amber-600 shadow-sm font-black'
                            : 'bg-white text-stone-800 border-stone-200 hover:border-amber-400 font-bold'
                        }`}
                      >
                        <span className="block text-sm">
                          {v.weightKg} kg
                        </span>
                        <span className={`block text-xs font-extrabold ${selectedBagVarId === v.id ? 'text-stone-950' : 'text-blue-700'}`}>
                          R$ {v.price.toFixed(2).replace('.', ',')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Stepper */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2">
                  Quantos sacos de {currentBagWeight} kg você deseja?
                </label>
                <div className="flex items-center justify-center gap-4 bg-stone-50 p-3 rounded-xl border border-stone-200">
                  <button
                    type="button"
                    onClick={() => setBagQty(Math.max(1, bagQty - 1))}
                    disabled={bagQty <= 1}
                    className="w-10 h-10 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 disabled:opacity-40 text-stone-800 font-bold flex items-center justify-center transition-colors shadow-xs"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="text-center px-4">
                    <span className="text-2xl font-black text-stone-900">{bagQty}</span>
                    <span className="block text-[11px] text-stone-500 font-medium">
                      {bagQty === 1 ? 'Saco' : 'Sacos'} ({bagQty * currentBagWeight} kg no total)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setBagQty(bagQty + 1)}
                    className="w-10 h-10 rounded-xl bg-white border border-stone-200 hover:bg-stone-100 text-stone-800 font-bold flex items-center justify-center transition-colors shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Total Card */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-500 block">Saco selecionado ({currentBagWeight} kg):</span>
                  <span className="font-extrabold text-stone-800 text-sm">
                    R$ {currentBagPrice.toFixed(2).replace('.', ',')} / saco
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-stone-500 block">Total a Pagar:</span>
                  <span className="font-extrabold text-blue-700 text-xl">
                    R$ {calculatedPriceFromBag.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-stone-100 bg-stone-50 flex items-center justify-between gap-3">
          <div className="leading-tight">
            <span className="text-stone-400 text-xs block font-medium">Subtotal deste item:</span>
            <span className="font-black text-xl text-stone-900">
              R$ {
                activeTab === 'value'
                  ? selectedRValue.toFixed(2).replace('.', ',')
                  : activeTab === 'kg'
                  ? calculatedPriceFromKg.toFixed(2).replace('.', ',')
                  : calculatedPriceFromBag.toFixed(2).replace('.', ',')
              }
            </span>
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 max-w-[220px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-3 px-4 rounded-xl text-sm shadow-md shadow-blue-700/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Adicionar ao Pedido</span>
          </button>
        </div>
      </div>
    </div>
  );
};
