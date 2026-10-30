import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Scale, 
  ArrowRight,
  MessageCircle,
  Share2
} from 'lucide-react';
import { Product } from '../types';
import { generateProductShareWhatsAppUrl } from '../utils/shareUtils';

interface FeaturedCarouselProps {
  products: Product[];
  onSelectForCustom: (product: Product) => void;
  onOpenDetails: (product: Product) => void;
  whatsappNumber?: string;
  storeName?: string;
  hidePetBadges?: boolean;
}

export const FeaturedCarousel: React.FC<FeaturedCarouselProps> = ({
  products,
  onSelectForCustom,
  onOpenDetails,
  whatsappNumber,
  storeName,
  hidePetBadges,
}) => {
  // Select featured products; if none marked as featured, fallback to on-sale or top catalog items
  const featuredItems = React.useMemo(() => {
    const featured = products.filter((p) => p.isFeatured && p.imageUrl);
    if (featured.length > 0) return featured;

    const onSale = products.filter((p) => p.isOnSale && p.imageUrl);
    if (onSale.length > 0) return onSale.slice(0, 5);

    return products.filter((p) => p.imageUrl).slice(0, 5);
  }, [products]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Keep index in valid bounds if products list changes
  useEffect(() => {
    if (currentIndex >= featuredItems.length) {
      setCurrentIndex(0);
    }
  }, [featuredItems.length, currentIndex]);

  // Auto-slide every 5 seconds
  useEffect(() => {
    if (featuredItems.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [featuredItems.length, isPaused]);

  if (featuredItems.length === 0) {
    return null;
  }

  const current = featuredItems[currentIndex];
  const isRation = current.sellMode === 'bag_and_bulk' || current.sellMode === 'bag_only' || current.sellMode === 'bulk_only';

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + featuredItems.length) % featuredItems.length);
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
  };

  const handleConsultWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanPhone = (whatsappNumber || '').replace(/\D/g, '');
    const msg = `gostaria de saber o valor do ${current.name}`;
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (current.isConsultationOnly) {
      handleConsultWhatsApp(e);
    } else if (isRation) {
      onSelectForCustom(current);
    } else {
      onOpenDetails(current);
    }
  };

  return (
    <section 
      className="container mx-auto px-4 pt-2.5 pb-1 max-w-5xl"
      aria-label="Carrossel de Produtos em Destaque"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative rounded-2xl overflow-hidden shadow-md border border-stone-800 bg-gradient-to-r from-stone-900 via-stone-850 to-blue-950 text-white">
        {/* Glow ambient background elements */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

        {/* Slide Content: Compact Horizontal Banner */}
        <div 
          onClick={() => onOpenDetails(current)}
          className="relative z-10 p-2.5 sm:p-3.5 flex items-center gap-3 sm:gap-4 cursor-pointer group"
        >
          {/* Product Image */}
          <div className="w-18 h-18 sm:w-22 sm:h-22 md:w-24 md:h-24 shrink-0 rounded-xl bg-white p-1 shadow-sm border border-white/20 flex items-center justify-center relative overflow-hidden transition-transform duration-200 group-hover:scale-102">
            <img
              src={current.imageUrl}
              alt={current.name}
              className="w-full h-full object-contain"
              loading="eager"
            />

            {/* Discount Badge */}
            {current.isOnSale && (
              <div className="absolute top-1 left-1 bg-rose-600 text-white text-[9px] font-black uppercase px-1.5 py-0.2 rounded shadow-2xs flex items-center gap-0.5">
                <span>🔥</span> {current.promoDiscountText || 'Oferta'}
              </div>
            )}

            {!current.inStock && (
              <div className="absolute inset-0 bg-stone-950/70 flex items-center justify-center">
                <span className="bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                  Esgotado
                </span>
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-center space-y-0.5 sm:space-y-1">
            {/* Top Badges */}
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 bg-amber-400 text-stone-950 font-black text-[9px] sm:text-[10px] uppercase px-2 py-0.2 rounded-md shadow-2xs shrink-0">
                <Sparkles className="w-3 h-3" />
                {current.isFeatured ? 'Destaque' : 'Mais Procurado'}
              </span>

              {!hidePetBadges && current.animalTypes && current.animalTypes.length > 0 && (
                <span className="bg-white/10 text-stone-200 text-[10px] font-medium px-2 py-0.2 rounded-md truncate hidden sm:inline-block">
                  {current.animalTypes.includes('cat') && '🐈 Gato'}
                  {current.animalTypes.includes('dog') && '🐕 Cão'}
                  {current.animalTypes.includes('bird') && '🦜 Pássaro'}
                  {current.animalTypes.includes('fish') && '🐠 Peixe'}
                  {current.animalTypes.includes('other') && '🐾 Outro'}
                </span>
              )}
            </div>

            {/* Product Title */}
            <h3 className="text-xs sm:text-sm md:text-base font-extrabold text-white tracking-tight leading-snug truncate group-hover:text-amber-300 transition-colors">
              {current.name}
            </h3>

            {/* Product Description - 1 line on desktop, hidden on small mobile */}
            {current.description && (
              <p className="text-stone-300 text-[11px] truncate leading-tight hidden md:block max-w-xl">
                {current.description}
              </p>
            )}

            {/* Price Presentation & Action CTA Button */}
            <div className="flex items-center gap-2 sm:gap-3 pt-0.5">
              {current.isConsultationOnly ? (
                <span className="text-xs sm:text-sm font-black text-emerald-400 shrink-0">
                  Sob Consulta
                </span>
              ) : current.sellMode === 'unit' ? (
                <span className="text-sm sm:text-base font-black text-amber-400 tracking-tight shrink-0">
                  R$ {current.unitPrice?.toFixed(2).replace('.', ',')}
                  {current.unitLabel && (
                    <span className="text-[10px] text-stone-300 font-normal ml-1">/{current.unitLabel}</span>
                  )}
                </span>
              ) : current.sellMode === 'bulk_only' ? (
                <span className="text-sm sm:text-base font-black text-blue-400 tracking-tight shrink-0">
                  R$ {current.bulkPricePerKg?.toFixed(2).replace('.', ',')}
                  <span className="text-[10px] text-stone-300 font-normal ml-1">/kg</span>
                </span>
              ) : (
                <span className="text-sm sm:text-base font-black text-amber-400 tracking-tight shrink-0">
                  a partir de R$ {(current.bagVariations?.[0]?.price || current.bulkPricePerKg || current.bagPrice || 0).toFixed(2).replace('.', ',')}
                </span>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleActionClick}
                className={`py-1 px-2.5 sm:px-3.5 rounded-lg font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer ml-auto sm:ml-0 shrink-0 ${
                  current.isConsultationOnly
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : isRation
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-amber-400 hover:bg-amber-300 text-stone-950'
                }`}
              >
                {current.isConsultationOnly ? (
                  <>
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Consultar</span>
                    <span className="sm:hidden">WhatsApp</span>
                  </>
                ) : isRation ? (
                  <>
                    <Scale className="w-3.5 h-3.5" />
                    <span>Escolher</span>
                  </>
                ) : (
                  <>
                    <span>Ver</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {/* WhatsApp Share Button */}
              <a
                href={generateProductShareWhatsAppUrl(current, storeName)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-all shadow-xs active:scale-95 cursor-pointer shrink-0 group"
                title={`Compartilhar ${current.name} pelo WhatsApp`}
                aria-label="Compartilhar pelo WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>

          {/* Navigation Controls on Right */}
          {featuredItems.length > 1 && (
            <div className="flex items-center gap-1 shrink-0 ml-1">
              <button
                type="button"
                onClick={handlePrev}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/10 hover:bg-white/25 active:scale-90 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Anterior"
                aria-label="Anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Dots */}
              <div className="flex items-center gap-1 px-1">
                {featuredItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(index);
                    }}
                    className={`transition-all rounded-full cursor-pointer ${
                      index === currentIndex
                        ? 'w-3.5 h-1.5 bg-amber-400'
                        : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
                    }`}
                    title={`Slide ${index + 1}`}
                    aria-label={`Slide ${index + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/10 hover:bg-white/25 active:scale-90 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Próximo"
                aria-label="Próximo"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
