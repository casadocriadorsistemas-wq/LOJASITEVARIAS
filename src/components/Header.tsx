import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Clock, 
  ShoppingCart, 
  ShieldCheck, 
  MapPin, 
  ChevronDown,
  X
} from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { StoreSettings } from '../types';
import { StoreOpenStatus } from '../services/storeService';

interface HeaderProps {
  settings: StoreSettings;
  openStatus: StoreOpenStatus;
  cartCount: number;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  openStatus,
  cartCount,
  onOpenCart,
  onOpenAdmin,
}) => {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setLogoError(false);
  }, [settings.logoUrl]);

  const cleanPhone = settings.whatsappNumber.replace(/\D/g, '');
  const directChatUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    'Olá! Estou no site da loja e gostaria de tirar uma dúvida sobre rações e produtos.'
  )}`;

  return (
    <header translate="no" className="notranslate">
      {/* Top Banner Notice */}
      <div className="bg-amber-500 text-stone-900 text-xs sm:text-sm font-semibold px-4 py-1.5 flex items-center justify-between shadow-sm">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 truncate">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            <span className="truncate">
              ⚡ <strong>{settings.whatsappHelpNotice}</strong>
            </span>
          </div>
          <button
            onClick={onOpenAdmin}
            className="text-stone-900 hover:text-stone-950 underline text-xs font-medium ml-3 whitespace-nowrap flex items-center gap-1"
            title="Acesso Lojista"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Área do</span> Lojista
          </button>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Logo & Store Title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20 shrink-0 overflow-hidden">
              {settings.logoUrl && !logoError ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.storeName}
                  className="w-full h-full object-contain p-1 rounded-2xl bg-white"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <Store className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-xl text-stone-900 leading-tight tracking-tight">
                  {settings.storeName}
                </h1>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                <span className="hidden md:inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-stone-400" />
                  {settings.address}
                </span>
                <span className="hidden md:inline text-stone-300">•</span>
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className={`inline-flex items-center gap-1 font-semibold rounded-full px-2 py-0.5 text-[11px] transition-colors ${
                    openStatus.isOpen
                      ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  {openStatus.badgeText}
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Actions: Direct WhatsApp & Cart Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Direct WhatsApp Quick Contact button */}
            <a
              href={directChatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <WhatsAppIcon className="w-4 h-4 fill-emerald-600" />
              <span>Fale Conosco</span>
            </a>

            {/* Shopping Cart button */}
            <button
              onClick={onOpenCart}
              className="relative flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-blue-700/25 transition-all transform active:scale-95"
              aria-label="Abrir Carrinho de Compras"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="hidden sm:inline">Meu Carrinho</span>
              {cartCount > 0 && (
                <span className="bg-amber-400 text-stone-900 font-extrabold text-xs px-2 py-0.5 rounded-full shadow-inner animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-stone-800 text-base">Horário de Atendimento</h3>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-2.5 text-sm text-stone-700">
              <div className="flex justify-between items-center py-1 border-b border-stone-50">
                <span className="font-medium text-stone-600">Segunda a Sexta:</span>
                <span className="font-bold text-stone-900">{settings.weekdayOpen} às {settings.weekdayClose}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-stone-50">
                <span className="font-medium text-stone-600">Sábado:</span>
                <span className="font-bold text-stone-900">{settings.saturdayOpen} às {settings.saturdayClose}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="font-medium text-stone-600">Domingo:</span>
                <span className="font-bold text-stone-900">
                  {settings.isSundayClosed ? 'Fechado' : `${settings.sundayOpen} às ${settings.sundayClose}`}
                </span>
              </div>
            </div>

            <div className="bg-stone-50 p-3 rounded-xl text-xs text-stone-600 border border-stone-200">
              <p className="font-semibold text-stone-800 mb-0.5">Status Atual:</p>
              <p>{openStatus.message}</p>
              <p className="text-blue-700 font-medium mt-1">{openStatus.nextScheduleText}</p>
            </div>

            <button
              onClick={() => setShowScheduleModal(false)}
              className="mt-4 w-full bg-stone-900 text-white font-bold py-2.5 rounded-xl hover:bg-stone-800 text-sm transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
