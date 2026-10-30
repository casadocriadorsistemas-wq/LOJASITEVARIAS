/**
 * Utilitário central de Multitenancy para identificação e isolamento por loja
 * Atende aos requisitos:
 * 1. Identificar automaticamente a loja atual com base no domínio/subdomínio usando window.location.hostname
 *    (ex: "casadocriadorteste.vercel.app" -> ID "casadocriadorteste"; "caramelopetshopdelivery.vercel.app" -> ID "caramelopetshopdelivery")
 * 2. Suporte a parâmetros na URL (?loja= ou ?lojaId=) e LocalStorage para ambiente local/preview
 * 3. Chaves de cache no LocalStorage isoladas por loja
 */

export const DEFAULT_LOJA_ID = 'casadocriadorteste';

export function sanitizeLojaId(raw: string): string {
  if (!raw) return DEFAULT_LOJA_ID;
  const cleaned = raw.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
  return cleaned || DEFAULT_LOJA_ID;
}

export function getLojaId(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_LOJA_ID;
  }

  // 1. Prioridade para parâmetro na URL (?loja=... ou ?lojaId=...)
  // Extremamente útil para testes, homologação e alternância entre lojas
  try {
    const params = new URLSearchParams(window.location.search);
    const paramLoja = params.get('loja') || params.get('lojaId');
    if (paramLoja && paramLoja.trim()) {
      return sanitizeLojaId(paramLoja.trim());
    }
  } catch {}

  const hostname = window.location.hostname.toLowerCase().trim();

  // 2. Se for ambiente local ou ambiente de desenvolvimento Cloud Run / AI Studio
  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.includes('run.app') ||
    hostname.includes('ai.studio') ||
    hostname.includes('webcontainer') ||
    hostname.includes('stackblitz')
  ) {
    const devOverride = localStorage.getItem('pet_store_dev_active_loja_id');
    if (devOverride && devOverride.trim()) {
      return sanitizeLojaId(devOverride.trim());
    }
    return DEFAULT_LOJA_ID;
  }

  // 3. Remover prefixo 'www.' se existir
  const cleanHost = hostname.replace(/^www\./, '');

  // 4. Extrair subdomínio (ex: casadocriadorteste.vercel.app -> casadocriadorteste)
  // ou caramelopetshopdelivery.vercel.app -> caramelopetshopdelivery
  const parts = cleanHost.split('.');
  if (parts.length >= 2) {
    return sanitizeLojaId(parts[0]);
  }

  return sanitizeLojaId(cleanHost || DEFAULT_LOJA_ID);
}

/**
 * Retorna uma chave de LocalStorage isolada para a loja atual
 */
export function getLojaStorageKey(baseKey: string, lojaId?: string): string {
  const currentLoja = lojaId || getLojaId();
  return `${baseKey}_${currentLoja}`;
}

/**
 * Permite definir manualmente a loja ativa em ambiente de desenvolvimento
 */
export function setDevLojaId(lojaId: string): void {
  if (typeof window !== 'undefined') {
    const clean = sanitizeLojaId(lojaId);
    localStorage.setItem('pet_store_dev_active_loja_id', clean);
    // Remove query params to avoid mismatch
    const url = new URL(window.location.href);
    url.searchParams.set('loja', clean);
    window.location.href = url.toString();
  }
}
