import React from 'react';
import { 
  X, 
  Truck, 
  Scale, 
  Sparkles, 
  Store,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { StoreSettings } from '../types';
import { WhatsAppIcon } from './WhatsAppIcon';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  if (!isOpen) return null;

  const handleGetBestPrices = () => {
    onClose();
    // Direct smoothly to the top of the page
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const isPetModeDisabled = settings.disablePetMode || settings.hidePetFilters;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-md sm:max-w-lg shadow-2xl border border-stone-200 overflow-hidden relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with decorative background */}
        <div className="relative bg-gradient-to-br from-blue-700 via-indigo-700 to-stone-900 text-white p-6 pt-7 text-center overflow-hidden shrink-0">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-amber-400/20 rounded-full blur-lg pointer-events-none" />

          {/* Close X Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 active:scale-90 text-white flex items-center justify-center transition-all cursor-pointer"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Store Logo / Icon */}
          <div className="mx-auto mb-3 w-16 h-16 rounded-2xl bg-white p-1 shadow-lg shadow-black/20 flex items-center justify-center border-2 border-white/40">
            {settings.logoUrl ? (
              <img 
                src={settings.logoUrl} 
                alt={settings.storeName} 
                className="w-full h-full object-contain rounded-xl"
              />
            ) : (
              <Store className="w-8 h-8 text-blue-700" />
            )}
          </div>

          <span className="inline-flex items-center gap-1 bg-amber-400/90 text-stone-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider mb-1.5 shadow-xs">
            <Sparkles className="w-3 h-3" /> Bem-vindo(a)
          </span>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
            Seja bem-vindo à{' '}
            <span className="text-amber-300 block sm:inline">{settings.storeName || 'Nossa Loja'}</span>
          </h2>
          <p className="text-xs text-blue-100 mt-1 max-w-sm mx-auto">
            Qualidade, praticidade e os melhores preços na palma da sua mão!
          </p>
        </div>

        {/* Modal Body with Fast Delivery and No-Login Cards */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-3 flex-1 bg-stone-50/50">
          {/* 1. Entrega Rápida em Casa */}
          <div className="bg-white border border-amber-200/90 rounded-2xl p-4 flex items-start gap-3.5 shadow-xs hover:border-amber-300 transition-colors">
            <div className="w-11 h-11 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Truck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-stone-900 text-sm sm:text-base">
                  Entrega Rápida em Casa
                </h3>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-1.5 py-0.2 rounded-md">
                  Express
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                {settings.freeDeliveryThreshold > 0 ? (
                  <>
                    Frete grátis em compras acima de{' '}
                    <strong className="text-stone-900 font-black">
                      R$ {settings.freeDeliveryThreshold.toFixed(2).replace('.', ',')}
                    </strong>. Entregamos com total agilidade no seu endereço!
                  </>
                ) : (
                  'Entregamos com total agilidade e cuidado diretamente no seu endereço!'
                )}
              </p>
            </div>
          </div>

          {/* 2. Sem Login e Direto no WhatsApp */}
          <div className="bg-white border border-emerald-200/90 rounded-2xl p-4 flex items-start gap-3.5 shadow-xs hover:border-emerald-300 transition-colors">
            <div className="w-11 h-11 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <WhatsAppIcon className="w-5 h-5 fill-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-stone-900 text-sm sm:text-base">
                  Sem Login e Direto no WhatsApp
                </h3>
                <span className="bg-emerald-100 text-emerald-900 text-[10px] font-black px-1.5 py-0.2 rounded-md">
                  100% Fácil
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                Você não precisa criar conta nem decorar senhas! Escolha seus itens no catálogo e conclua o pedido direto com a nossa equipe em segundos.
              </p>
            </div>
          </div>

          {/* 3. Benefício Ração a Granel (se o modo pet estiver ativo) */}
          {!isPetModeDisabled && (
            <div className="bg-white border border-blue-200/90 rounded-2xl p-4 flex items-start gap-3.5 shadow-xs hover:border-blue-300 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <Scale className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-stone-900 text-sm sm:text-base">
                  Ração a Granel por Kg ou Valor
                </h3>
                <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
                  Compre R$ 10, R$ 20 ou quantos quilos desejar, pesado na hora com máxima frescura e economia.
                </p>
              </div>
            </div>
          )}

          {/* Info Trust Pills */}
          <div className="pt-1 flex items-center justify-center gap-4 text-[11px] font-bold text-stone-500">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Atendimento rápido
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Pagamento na entrega
            </span>
          </div>
        </div>

        {/* Footer with "Obter os Melhores Preços" button */}
        <div className="p-4 sm:p-5 bg-white border-t border-stone-200/80 shrink-0">
          <button
            type="button"
            onClick={handleGetBestPrices}
            className="w-full py-3.5 px-6 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-md bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-blue-700/25 active:scale-98 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Obter os Melhores Preços</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
