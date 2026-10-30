import React from 'react';
import { CheckCircle2, Clock, X, ShoppingBag } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { StoreOpenStatus } from '../services/storeService';
import { StoreSettings } from '../types';

interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  openStatus: StoreOpenStatus;
  settings: StoreSettings;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  isOpen,
  onClose,
  openStatus,
  settings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-stone-100 space-y-4">
        <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 mx-auto flex items-center justify-center animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <h3 className="font-extrabold text-stone-900 text-xl">Pedido Enviado com Sucesso!</h3>
          <p className="text-xs text-stone-600 mt-1">
            Seu pedido foi formatado e direcionado para o WhatsApp da <strong>{settings.storeName}</strong>.
          </p>
        </div>

        {!openStatus.isOpen ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-left text-amber-950 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Clock className="w-4 h-4 text-amber-700" />
              <span>Aviso de Loja Fechada:</span>
            </div>
            <p className="text-stone-700">
              Recebemos seu pedido fora do horário comercial, mas ele já está salvo no sistema e garantido! Nossa equipe entrará em contato para entrega logo no primeiro horário de atendimento.
            </p>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-950 font-semibold flex items-center justify-center gap-2">
            <WhatsAppIcon className="w-4 h-4 fill-emerald-600 shrink-0" />
            <span>Nossa equipe responderá sua mensagem no WhatsApp em segundos!</span>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 rounded-xl text-sm transition-colors"
        >
          Continuar Navegando
        </button>
      </div>
    </div>
  );
};
