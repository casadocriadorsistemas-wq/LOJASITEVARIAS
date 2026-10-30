import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  MapPin, 
  Phone, 
  User, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Truck, 
  Store, 
  AlertCircle,
  Clock,
  CheckCircle2,
  Sparkles,
  Edit3
} from 'lucide-react';
import { CartItem, Coupon, StoreSettings, OrderRecord } from '../types';
import { 
  StoreOpenStatus, 
  generateWhatsAppOrderUrl, 
  createOrder,
  formatBrazilianPhone,
  cleanPhoneDigits,
  getCustomerByPhone,
  saveCustomerProfile
} from '../services/storeService';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  appliedCoupon: Coupon | null;
  settings: StoreSettings;
  openStatus: StoreOpenStatus;
  onOrderSuccess: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  appliedCoupon,
  settings,
  openStatus,
  onOrderSuccess,
}) => {
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);
  const [customerFound, setCustomerFound] = useState<boolean | null>(null);
  
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [streetAddress, setStreetAddress] = useState('');
  const [numberAddress, setNumberAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [reference, setReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Pix');
  const [changeFor, setChangeFor] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or prefill from previous session for maximum speed
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      const savedPhone = 
        localStorage.getItem(`last_customer_phone_${settings.lojaId}`) ||
        localStorage.getItem('pet_store_last_customer_phone');

      if (savedPhone) {
        const formatted = formatBrazilianPhone(savedPhone);
        setCustomerPhone(formatted);
        lookupCustomer(formatted);
      }
    }
  }, [isOpen, settings.lojaId]);

  const lookupCustomer = async (phoneVal: string) => {
    const clean = cleanPhoneDigits(phoneVal);
    if (clean.length === 11) {
      setIsSearchingPhone(true);
      try {
        const profile = await getCustomerByPhone(clean, settings.lojaId);
        if (profile) {
          setCustomerFound(true);
          if (profile.name) setCustomerName(profile.name);
          if (profile.streetAddress) setStreetAddress(profile.streetAddress);
          if (profile.numberAddress) setNumberAddress(profile.numberAddress);
          if (profile.neighborhood) setNeighborhood(profile.neighborhood);
          if (profile.reference) setReference(profile.reference);
        } else {
          setCustomerFound(false);
        }
      } catch (err) {
        console.warn('Customer lookup error:', err);
      } finally {
        setIsSearchingPhone(false);
      }
    } else {
      setCustomerFound(null);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatBrazilianPhone(raw);
    setCustomerPhone(formatted);
    const clean = cleanPhoneDigits(formatted);
    if (clean.length === 11) {
      lookupCustomer(formatted);
    } else {
      setCustomerFound(null);
    }
  };

  if (!isOpen) return null;

  // Computations
  const subtotal = items.reduce((acc, item) => acc + item.totalPrice, 0);

  let discount = 0;
  if (appliedCoupon && appliedCoupon.isActive) {
    if (appliedCoupon.discountType === 'percentage') {
      discount = (subtotal * appliedCoupon.discountValue) / 100;
    } else {
      discount = appliedCoupon.discountValue;
    }
    discount = Math.min(subtotal, discount);
  }

  let deliveryFee = settings.fixedDeliveryFee;
  if (deliveryType === 'pickup') {
    deliveryFee = 0;
  } else if (settings.deliveryFeeType === 'free_above' && subtotal >= settings.freeDeliveryThreshold) {
    deliveryFee = 0;
  }

  const total = Math.max(0, subtotal - discount + deliveryFee);
  const cleanDigits = cleanPhoneDigits(customerPhone);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (cleanDigits.length !== 11) {
      setErrorMessage('Por favor, informe seu telefone com DDD e 11 dígitos no formato (44) 99991-8762.');
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }

    let fullAddress = 'Retirada no balcão da loja';

    if (deliveryType === 'delivery') {
      if (!streetAddress.trim() || !numberAddress.trim() || !neighborhood.trim()) {
        setErrorMessage('Por favor, preencha a rua, número e bairro para a entrega.');
        return;
      }
      fullAddress = `${streetAddress.trim()}, Nº ${numberAddress.trim()} - Bairro: ${neighborhood.trim()}${
        reference.trim() ? ` (Ref: ${reference.trim()})` : ''
      }`;
    }

    setIsSubmitting(true);

    try {
      // 1. Save or update customer profile for future purchases
      await saveCustomerProfile({
        phone: cleanDigits,
        formattedPhone: customerPhone,
        name: customerName.trim(),
        streetAddress: deliveryType === 'delivery' ? streetAddress.trim() : (streetAddress.trim() || undefined),
        numberAddress: deliveryType === 'delivery' ? numberAddress.trim() : (numberAddress.trim() || undefined),
        neighborhood: deliveryType === 'delivery' ? neighborhood.trim() : (neighborhood.trim() || undefined),
        reference: reference.trim() || undefined,
        lojaId: settings.lojaId,
      }, settings.lojaId);

      // 2. Build order record
      const orderId = `PED-${Date.now().toString().slice(-6)}`;
      const itemsSummary = items
        .map(i => `${i.productName} (${i.label}) - R$ ${i.totalPrice.toFixed(2)}`)
        .join('; ');

      const orderData: OrderRecord = {
        id: orderId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        isExistingCustomer: customerFound === true,
        deliveryType,
        address: fullAddress,
        paymentMethod,
        changeFor: paymentMethod === 'Dinheiro' && changeFor ? changeFor : undefined,
        notes: notes.trim(),
        subtotal,
        discount,
        deliveryFee,
        total,
        couponCode: appliedCoupon?.code,
        itemsSummary,
        status: 'novo',
        createdAt: new Date().toISOString(),
        lojaId: settings.lojaId,
      };

      // Save order in Firestore / Database
      await createOrder(orderData, settings.lojaId);

      // Generate WhatsApp link
      const whatsappUrl = generateWhatsAppOrderUrl({
        settings,
        order: orderData,
        items,
        isClosed: !openStatus.isOpen,
      });

      // Redirect directly to WhatsApp
      window.location.href = whatsappUrl;

      onOrderSuccess();
    } catch (err) {
      console.error('Checkout error:', err);
      setErrorMessage('Houve um erro ao processar o pedido. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl my-6 border border-stone-200 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div>
            <h2 className="font-extrabold text-stone-900 text-lg">Finalizar Pedido</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Identifique-se pelo telefone para entrega rápida e sem complicação!
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Closed store reassurance banner inside checkout */}
        {!openStatus.isOpen && (
          <div className="bg-amber-500 text-stone-950 p-3.5 text-xs font-semibold flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-stone-950 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold block uppercase tracking-wider text-[11px]">
                Loja Fechada no Momento
              </span>
              <span>
                Fique à vontade de enviar seu pedido! Deixaremos separado e entregaremos no primeiro horário de atendimento.
              </span>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmitOrder} className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Phone Input with Automatic Mask & Customer Identification */}
          <div className="bg-gradient-to-br from-blue-50/90 via-sky-50/50 to-indigo-50/70 border-2 border-blue-300 rounded-2xl p-4 transition-all shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="checkoutPhoneInput" className="text-xs font-black text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-blue-600" />
                Telefone / WhatsApp <span className="text-rose-600">*</span>
              </label>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-100/90 px-2 py-0.5 rounded-full">
                Formato: (44) 99991-8762
              </span>
            </div>

            <div className="relative">
              <input
                id="checkoutPhoneInput"
                type="tel"
                inputMode="numeric"
                required
                placeholder="(44) 99991-8762"
                value={customerPhone}
                onChange={handlePhoneChange}
                maxLength={15}
                className="w-full pl-3.5 pr-10 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 text-stone-900 font-black text-base sm:text-lg tracking-wide bg-white outline-none transition-all placeholder:text-stone-300 shadow-xs"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                {isSearchingPhone ? (
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : customerFound === true ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Phone className="w-4 h-4 text-stone-400" />
                )}
              </div>
            </div>

            {/* Dynamic Status / Feedback */}
            {isSearchingPhone && (
              <p className="mt-2 text-xs text-blue-700 font-semibold flex items-center gap-1.5 animate-pulse">
                <Clock className="w-3.5 h-3.5" /> Buscando cadastro do cliente...
              </p>
            )}

            {customerFound === true && (
              <div className="mt-2.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="font-extrabold block text-emerald-950">
                    Cliente cadastrado encontrado! 🎉
                  </span>
                  <span>
                    Preenchemos seus dados automaticamente. Você pode alterá-los abaixo se desejar.
                  </span>
                </div>
              </div>
            )}

            {customerFound === false && cleanDigits.length === 11 && (
              <div className="mt-2.5 p-2.5 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-950 font-medium flex items-start gap-2 animate-in fade-in">
                <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="font-extrabold block text-sky-950">
                    Novo cliente! 👋
                  </span>
                  <span>
                    Preencha seus dados abaixo. Salvaremos seu telefone e endereço para agilizar suas próximas compras!
                  </span>
                </div>
              </div>
            )}

            {cleanDigits.length > 0 && cleanDigits.length < 11 && (
              <p className="mt-1.5 text-[11px] text-stone-500 font-medium">
                Digite os 11 dígitos do seu celular com DDD (faltam {11 - cleanDigits.length} dígitos).
              </p>
            )}
          </div>

          {/* Section 1: Customer Name */}
          <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                Seu Nome Completo <span className="text-rose-500">*</span>
              </label>
              {customerFound === true && (
                <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                  <Edit3 className="w-3 h-3" /> Editável
                </span>
              )}
            </div>
            <input
              type="text"
              required
              placeholder="Ex: João da Silva"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-blue-500 text-xs text-stone-900 bg-white outline-none font-medium"
            />
          </div>

          {/* Section 2: Delivery Mode */}
          <div className="pt-2 border-t border-stone-100">
            <h3 className="text-xs font-extrabold text-stone-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-600" /> Como deseja receber?
            </h3>
            
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDeliveryType('delivery')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  deliveryType === 'delivery'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Truck className="w-5 h-5 text-blue-600" />
                <span>Receber em Casa (Delivery)</span>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryType('pickup')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  deliveryType === 'pickup'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Store className="w-5 h-5 text-blue-600" />
                <span>Retirar no Balcão</span>
              </button>
            </div>

            {/* Address fields ONLY if Delivery */}
            {deliveryType === 'delivery' && (
              <div className="mt-3 p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between pb-1 border-b border-stone-200/60">
                  <span className="text-xs font-extrabold text-stone-800 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" /> Endereço de Entrega
                  </span>
                  {customerFound === true && (
                    <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100/70 px-2 py-0.5 rounded-full">
                      Preenchido via cadastro
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Rua / Avenida: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Rua das Flores"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-blue-500 text-xs text-stone-900 bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Número: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      value={numberAddress}
                      onChange={(e) => setNumberAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-blue-500 text-xs text-stone-900 bg-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Bairro: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Jardim Pet"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-blue-500 text-xs text-stone-900 bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Ponto de Referência / Apto:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Próximo à padaria"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-blue-500 text-xs text-stone-900 bg-white outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Payment Method */}
          <div className="pt-2 border-t border-stone-100">
            <h3 className="text-xs font-extrabold text-stone-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Forma de Pagamento
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Pix', label: 'Pix', icon: <QrCode className="w-4 h-4" /> },
                { id: 'Cartão (Débito/Crédito)', label: 'Cartão na Entrega', icon: <CreditCard className="w-4 h-4" /> },
                { id: 'Dinheiro', label: 'Dinheiro', icon: <Banknote className="w-4 h-4" /> },
              ].map((pm) => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setPaymentMethod(pm.id)}
                  className={`py-2 px-1 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    paymentMethod === pm.id
                      ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <span className={paymentMethod === pm.id ? 'text-blue-700' : 'text-stone-500'}>
                    {pm.icon}
                  </span>
                  <span className="text-center">{pm.label}</span>
                </button>
              ))}
            </div>

            {paymentMethod === 'Dinheiro' && (
              <div className="mt-2.5 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <label className="block text-xs font-bold text-amber-950 mb-1">
                  Precisa de troco? Para quanto?
                </label>
                <input
                  type="text"
                  placeholder="Ex: Troco para R$ 100,00 ou Não preciso"
                  value={changeFor}
                  onChange={(e) => setChangeFor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-amber-300 focus:border-blue-500 text-xs bg-white text-stone-900 outline-none"
                />
              </div>
            )}
          </div>

          {/* Section 4: Notes */}
          <div className="pt-2 border-t border-stone-100">
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Observações adicionais (opcional):
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Se possível, embalar a ração em 2 sacos separados de 1kg..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-blue-500 text-xs text-stone-900 outline-none resize-none"
            />
          </div>

          {/* Order Summary Box */}
          <div className="bg-stone-100/80 p-3.5 rounded-xl border border-stone-200 text-xs space-y-1.5">
            <div className="flex justify-between text-stone-600">
              <span>{items.length} itens no pedido:</span>
              <span className="font-semibold text-stone-900">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-blue-700 font-bold">
                <span>Desconto ({appliedCoupon?.code}):</span>
                <span>-R$ {discount.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            <div className="flex justify-between text-stone-600">
              <span>Entrega:</span>
              <span className="font-semibold text-stone-900">
                {deliveryFee === 0 ? 'GRÁTIS' : `R$ ${deliveryFee.toFixed(2).replace('.', ',')}`}
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-1.5 border-t border-stone-200/80">
              <span className="font-black text-stone-900 text-sm">Total do Pedido:</span>
              <span className="font-black text-blue-700 text-xl">
                R$ {total.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold py-3.5 px-4 rounded-xl text-sm sm:text-base shadow-lg shadow-blue-700/30 flex items-center justify-center gap-2.5 transition-all transform active:scale-98 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
            <span>{isSubmitting ? 'Gerando Pedido...' : 'Enviar Pedido pelo WhatsApp'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
