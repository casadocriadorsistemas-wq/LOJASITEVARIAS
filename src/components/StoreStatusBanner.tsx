import React from 'react';
import { Moon, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { StoreOpenStatus } from '../services/storeService';

interface StoreStatusBannerProps {
  openStatus: StoreOpenStatus;
}

export const StoreStatusBanner: React.FC<StoreStatusBannerProps> = ({ openStatus }) => {
  if (openStatus.isOpen) {
    return (
      <div className="bg-gradient-to-r from-blue-50 via-sky-50 to-blue-50 border-b border-blue-100 py-2.5 px-4">
        <div className="container mx-auto flex items-center justify-between text-xs sm:text-sm text-blue-950">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="font-bold">Loja Aberta Agora:</span>
            <span className="text-blue-800 hidden sm:inline">Faça seu pedido e receba com rapidez e comodidade!</span>
          </div>
          <span className="text-xs font-semibold bg-blue-200/70 text-blue-900 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {openStatus.nextScheduleText}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-stone-950 py-3.5 px-4 shadow-md border-b-2 border-amber-600/30">
      <div className="container mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-950/15 flex items-center justify-center text-stone-950 shrink-0 mt-0.5 sm:mt-0">
              <Moon className="w-5 h-5 text-stone-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-stone-950 text-amber-300 font-extrabold text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-md">
                  Loja Fechada no Momento
                </span>
                <span className="font-bold text-xs sm:text-sm text-stone-950 hidden md:inline">
                  {openStatus.nextScheduleText}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-stone-950 mt-1 leading-snug">
                🐾 {openStatus.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center bg-stone-950/10 px-3 py-1.5 rounded-lg border border-stone-950/10 text-xs font-bold text-stone-900">
            <CheckCircle2 className="w-4 h-4 text-blue-950" />
            <span>Pedidos aceitos 24h</span>
          </div>
        </div>
      </div>
    </div>
  );
};
