import React from 'react';
import { 
  Search, 
  X, 
  Scale, 
  Dog, 
  Cat, 
  Feather, 
  Bone, 
  Sparkles, 
  Package, 
  Layers
} from 'lucide-react';
import { Category } from '../types';

interface CategoryFilterBarProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedAnimal: string;
  onSelectAnimal: (animal: string) => void;
  promoCount?: number;
  hidePetFilters?: boolean;
}

export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  selectedAnimal,
  onSelectAnimal,
  promoCount,
  hidePetFilters,
}) => {
  const getCategoryIcon = (iconName: string) => {
    switch (iconName.toLowerCase()) {
      case 'scale':
        return <Scale className="w-4 h-4" />;
      case 'dog':
        return <Dog className="w-4 h-4" />;
      case 'cat':
        return <Cat className="w-4 h-4" />;
      case 'feather':
        return <Feather className="w-4 h-4" />;
      case 'bone':
        return <Bone className="w-4 h-4" />;
      case 'sparkles':
        return <Sparkles className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  return (
    <div translate="no" className="notranslate bg-white border-b border-stone-200 py-3 shadow-xs">
      <div className="container mx-auto px-4 space-y-3">
        {/* Search Bar & Animal Quick Badges */}
        <div className={`flex flex-col ${hidePetFilters ? 'sm:flex-row' : 'sm:flex-row'} gap-2.5 items-stretch sm:items-center justify-between`}>
          {/* Search Input */}
          <div className={`relative ${hidePetFilters ? 'w-full' : 'flex-1 max-w-md'}`}>
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder={hidePetFilters ? "Pesquisar produtos..." : "Buscar rações, petiscos, medicamentos..."}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-stone-100/80 hover:bg-stone-100 focus:bg-white border border-stone-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm text-stone-800 outline-none transition-all placeholder:text-stone-400"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Animal Type Filter Chips - Hidden if hidePetFilters is true */}
          {!hidePetFilters && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'all', label: 'Todos os Pets', emoji: '🐾' },
                { id: 'dog', label: 'Cães', emoji: '🐕' },
                { id: 'cat', label: 'Gatos', emoji: '🐈' },
                { id: 'bird', label: 'Pássaros', emoji: '🦜' },
                { id: 'fish', label: 'Peixes', emoji: '🐠' },
                { id: 'other', label: 'Outros', emoji: '🐾' },
              ].map((animal) => (
                <button
                  key={animal.id}
                  onClick={() => onSelectAnimal(animal.id)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedAnimal === animal.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <span>{animal.emoji}</span>
                  <span>{animal.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-0.5">
          <button
            onClick={() => onSelectCategory('all')}
            className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              selectedCategoryId === 'all'
                ? 'bg-stone-900 text-white shadow-sm shadow-stone-900/20'
                : 'bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Todos os Produtos</span>
          </button>

          {/* Promoções Filter Tab */}
          <button
            onClick={() => onSelectCategory('promotions')}
            className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
              selectedCategoryId === 'promotions'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/30 ring-2 ring-rose-400/40'
                : 'bg-rose-50 border border-rose-200/90 text-rose-700 hover:bg-rose-100 hover:border-rose-300'
            }`}
          >
            <span className="text-sm">🔥</span>
            <span>Promoções</span>
            {promoCount !== undefined && promoCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                selectedCategoryId === 'promotions' ? 'bg-white text-rose-600' : 'bg-rose-600 text-white'
              }`}>
                {promoCount}
              </span>
            )}
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                selectedCategoryId === cat.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25'
                  : 'bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100'
              }`}
            >
              <span className={selectedCategoryId === cat.id ? 'text-blue-100' : 'text-blue-600'}>
                {getCategoryIcon(cat.icon)}
              </span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
