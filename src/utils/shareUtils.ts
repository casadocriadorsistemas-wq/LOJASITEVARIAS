import { Product } from '../types';

/**
 * Formats a clean, readable price summary for a product
 */
export function formatProductPriceSummary(product: Product): string {
  if (product.isConsultationOnly) {
    return 'Sob Consulta (Preço via WhatsApp)';
  }

  if (product.sellMode === 'bag_and_bulk') {
    const parts: string[] = [];
    if (product.bulkPricePerKg) {
      parts.push(`Granel: R$ ${product.bulkPricePerKg.toFixed(2).replace('.', ',')}/kg`);
    }
    if (product.bagVariations && product.bagVariations.length > 0) {
      const minPrice = Math.min(...product.bagVariations.map((v) => v.price));
      parts.push(`Saco a partir de R$ ${minPrice.toFixed(2).replace('.', ',')}`);
    } else if (product.bagPrice) {
      parts.push(`Saco: R$ ${product.bagPrice.toFixed(2).replace('.', ',')}`);
    }
    return parts.join(' • ') || 'Sob Consulta';
  }

  if (product.sellMode === 'bulk_only') {
    return `Granel: R$ ${(product.bulkPricePerKg || 0).toFixed(2).replace('.', ',')}/kg`;
  }

  if (product.sellMode === 'bag_only') {
    if (product.bagVariations && product.bagVariations.length > 0) {
      const minPrice = Math.min(...product.bagVariations.map((v) => v.price));
      return `Saco a partir de R$ ${minPrice.toFixed(2).replace('.', ',')}`;
    }
    return `Saco: R$ ${(product.bagPrice || 0).toFixed(2).replace('.', ',')}`;
  }

  // Unit product
  return `R$ ${(product.unitPrice || 0).toFixed(2).replace('.', ',')}${product.unitLabel ? ` / ${product.unitLabel}` : ''}`;
}

/**
 * Generates an official WhatsApp sharing URL with pre-filled message
 * allowing the user to share the product with any friend, contact, or group on WhatsApp.
 */
export function generateProductShareWhatsAppUrl(
  product: Product,
  storeName?: string
): string {
  const price = formatProductPriceSummary(product);
  const store = (storeName || '').trim() || 'nossa loja';
  
  // Safe URL determination
  let catalogUrl = '';
  if (typeof window !== 'undefined') {
    catalogUrl = `${window.location.origin}${window.location.pathname}`;
  }

  const lines: string[] = [
    `🐾 *Olha esse produto que encontrei na loja ${store}!*`,
    '',
    `📦 *${product.name}*`,
  ];

  if (price) {
    lines.push(`💰 *Preço:* ${price}`);
  }

  if (product.description) {
    const cleanDesc = product.description.trim();
    const shortDesc = cleanDesc.length > 120 ? `${cleanDesc.slice(0, 120)}...` : cleanDesc;
    lines.push(`📝 ${shortDesc}`);
  }

  if (catalogUrl) {
    lines.push('');
    lines.push(`🛒 *Acesse a loja para ver mais detalhes:*`);
    lines.push(catalogUrl);
  }

  const text = lines.join('\n');
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}
