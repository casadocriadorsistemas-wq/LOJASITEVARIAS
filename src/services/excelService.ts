import * as XLSX from 'xlsx';
import { Product, Category, BagVariation, SellMode, AnimalType } from '../types';

export interface ParsedImportResult {
  products: Product[];
  newCategories: Category[];
  totalRows: number;
  validRows: number;
  warnings: string[];
}

// Columns definition for the Template
export const EXCEL_COLUMNS = [
  { key: 'nome', label: 'Nome_do_Produto*', example: 'Ração Golden Special Frango e Carne' },
  { key: 'categoria', label: 'Categoria*', example: 'Rações a Granel' },
  { key: 'link_foto', label: 'Link_da_Foto_URL', example: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600' },
  { key: 'modalidade', label: 'Modalidade_Venda*', example: 'saco_e_granel' },
  { key: 'preco_saco', label: 'Preco_Saco_Padrao_R$', example: 154.90 },
  { key: 'peso_saco_kg', label: 'Peso_Saco_Padrao_Kg', example: 15 },
  { key: 'variacoes_sacos', label: 'Variacoes_Sacos_Peso_e_Preco', example: '10kg:118.00 | 15kg:154.90 | 20kg:194.00' },
  { key: 'preco_granel_kg', label: 'Preco_Granel_por_Kg_R$', example: 13.90 },
  { key: 'preco_unitario', label: 'Preco_Unitario_R$', example: 0 },
  { key: 'rotulo_unidade', label: 'Rotulo_Unidade', example: 'unidade' },
  { key: 'estoque_sacos', label: 'Estoque_Sacos', example: 14 },
  { key: 'estoque_granel_kg', label: 'Estoque_Granel_Kg', example: 65 },
  { key: 'estoque_unidades', label: 'Estoque_Unidades', example: 0 },
  { key: 'em_estoque', label: 'Em_Estoque_SIM_NAO', example: 'SIM' },
  { key: 'em_destaque', label: 'Em_Destaque_SIM_NAO', example: 'SIM' },
  { key: 'em_promocao', label: 'Em_Promocao_SIM_NAO', example: 'SIM' },
  { key: 'texto_promocao', label: 'Texto_Promocao', example: 'Oferta Especial' },
  { key: 'tipos_pet', label: 'Tipos_Pet_Separado_por_Virgula', example: 'caes' },
  { key: 'descricao', label: 'Descricao_Detalhada', example: 'Ração Premium Especial com ingredientes selecionados para cães adultos.' },
];

// Realistic sample rows for the template spreadsheet
export const SAMPLE_TEMPLATE_ROWS = [
  {
    'Nome_do_Produto*': 'Ração Golden Special Frango e Carne - Cães Adultos',
    'Categoria*': 'Rações a Granel',
    'Link_da_Foto_URL': 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&auto=format&fit=crop&q=80',
    'Modalidade_Venda*': 'saco_e_granel',
    'Preco_Saco_Padrao_R$': 154.90,
    'Peso_Saco_Padrao_Kg': 15,
    'Variacoes_Sacos_Peso_e_Preco': '10kg:118.00 | 15kg:154.90 | 20kg:194.00',
    'Preco_Granel_por_Kg_R$': 13.90,
    'Preco_Unitario_R$': '',
    'Rotulo_Unidade': '',
    'Estoque_Sacos': 14,
    'Estoque_Granel_Kg': 65,
    'Estoque_Unidades': 0,
    'Em_Estoque_SIM_NAO': 'SIM',
    'Em_Destaque_SIM_NAO': 'SIM',
    'Em_Promocao_SIM_NAO': 'SIM',
    'Texto_Promocao': 'Oferta Especial',
    'Tipos_Pet_Separado_por_Virgula': 'caes',
    'Descricao_Detalhada': 'Ração Premium Especial rica em proteínas e ômegas para cães adultos.'
  },
  {
    'Nome_do_Produto*': 'Ração GranPlus Gourmet Salmão & Frango Gatos Castrados',
    'Categoria*': 'Gatos',
    'Link_da_Foto_URL': 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80',
    'Modalidade_Venda*': 'saco_e_granel',
    'Preco_Saco_Padrao_R$': 145.00,
    'Peso_Saco_Padrao_Kg': 10.1,
    'Variacoes_Sacos_Peso_e_Preco': '3kg:55.00 | 10.1kg:145.00',
    'Preco_Granel_por_Kg_R$': 17.00,
    'Preco_Unitario_R$': '',
    'Rotulo_Unidade': '',
    'Estoque_Sacos': 6,
    'Estoque_Granel_Kg': 35,
    'Estoque_Unidades': 0,
    'Em_Estoque_SIM_NAO': 'SIM',
    'Em_Destaque_SIM_NAO': 'SIM',
    'Em_Promocao_SIM_NAO': 'NAO',
    'Texto_Promocao': '',
    'Tipos_Pet_Separado_por_Virgula': 'gatos',
    'Descricao_Detalhada': 'Sabor irresistível para gatos castrados com calorias reduzidas.'
  },
  {
    'Nome_do_Produto*': 'Shampoo Neutro Antipulgas & Carrapatos 500ml (Cães e Gatos)',
    'Categoria*': 'Higiene & Farmácia',
    'Link_da_Foto_URL': 'https://images.unsplash.com/photo-1585837575652-267c041d77d4?w=600&auto=format&fit=crop&q=80',
    'Modalidade_Venda*': 'unitario',
    'Preco_Saco_Padrao_R$': '',
    'Peso_Saco_Padrao_Kg': '',
    'Variacoes_Sacos_Peso_e_Preco': '',
    'Preco_Granel_por_Kg_R$': '',
    'Preco_Unitario_R$': 24.90,
    'Rotulo_Unidade': 'frasco 500ml',
    'Estoque_Sacos': 0,
    'Estoque_Granel_Kg': 0,
    'Estoque_Unidades': 18,
    'Em_Estoque_SIM_NAO': 'SIM',
    'Em_Destaque_SIM_NAO': 'NAO',
    'Em_Promocao_SIM_NAO': 'NAO',
    'Texto_Promocao': '',
    'Tipos_Pet_Separado_por_Virgula': 'caes, gatos',
    'Descricao_Detalhada': 'Fórmula suave com extratos naturais eficaz contra pulgas e carrapatos para cães e gatos.'
  },
  {
    'Nome_do_Produto*': 'Mix Especial de Sementes e Frutas para Calopsitas',
    'Categoria*': 'Aves & Pássaros',
    'Link_da_Foto_URL': 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=600&auto=format&fit=crop&q=80',
    'Modalidade_Venda*': 'apenas_granel',
    'Preco_Saco_Padrao_R$': '',
    'Peso_Saco_Padrao_Kg': '',
    'Variacoes_Sacos_Peso_e_Preco': '',
    'Preco_Granel_por_Kg_R$': 14.50,
    'Preco_Unitario_R$': '',
    'Rotulo_Unidade': '',
    'Estoque_Sacos': 0,
    'Estoque_Granel_Kg': 50,
    'Estoque_Unidades': 0,
    'Em_Estoque_SIM_NAO': 'SIM',
    'Em_Destaque_SIM_NAO': 'SIM',
    'Em_Promocao_SIM_NAO': 'SIM',
    'Texto_Promocao': 'Grãos Selecionados',
    'Tipos_Pet_Separado_por_Virgula': 'passaros',
    'Descricao_Detalhada': 'Mistura enriquecida com girassol fino, aveia, cártamo e pedaços de frutas desidratadas.'
  },
  {
    'Nome_do_Produto*': 'Bifinho Petisco Canino Carne & Frango 65g',
    'Categoria*': 'Petiscos & Ossos',
    'Link_da_Foto_URL': 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600&auto=format&fit=crop&q=80',
    'Modalidade_Venda*': 'unitario',
    'Preco_Saco_Padrao_R$': '',
    'Peso_Saco_Padrao_Kg': '',
    'Variacoes_Sacos_Peso_e_Preco': '',
    'Preco_Granel_por_Kg_R$': '',
    'Preco_Unitario_R$': 7.50,
    'Rotulo_Unidade': 'pacote 65g',
    'Estoque_Sacos': 0,
    'Estoque_Granel_Kg': 0,
    'Estoque_Unidades': 35,
    'Em_Estoque_SIM_NAO': 'SIM',
    'Em_Destaque_SIM_NAO': 'NAO',
    'Em_Promocao_SIM_NAO': 'SIM',
    'Texto_Promocao': 'Compre 3 por R$ 20',
    'Tipos_Pet_Separado_por_Virgula': 'caes',
    'Descricao_Detalhada': 'Petisco macio e saboroso ideal para adestramento e agrado do seu cão.'
  }
];

// Instructions explanation rows for the second sheet
export const INSTRUCTION_ROWS = [
  {
    'Coluna': 'Nome_do_Produto*',
    'Obrigatorio': 'SIM',
    'Exemplo': 'Ração Golden Adultos 15kg',
    'Instruções / Explicação': 'Nome completo e claro do produto que aparecerá para os clientes na loja.'
  },
  {
    'Coluna': 'Categoria*',
    'Obrigatorio': 'SIM',
    'Exemplo': 'Rações a Granel, Cães (ou apenas Cães)',
    'Instruções / Explicação': 'Nome da(s) categoria(s). Para cadastrar o produto em mais de uma categoria, separe por vírgula (ex: Rações a Granel, Cães). Se não existir, será criada automaticamente!'
  },
  {
    'Coluna': 'Link_da_Foto_URL',
    'Obrigatorio': 'NAO',
    'Exemplo': 'https://exemplo.com/foto.jpg',
    'Instruções / Explicação': 'Link direto da imagem do produto (deve começar com http:// ou https://). Se deixar vazio, uma imagem padrão será usada.'
  },
  {
    'Coluna': 'Modalidade_Venda*',
    'Obrigatorio': 'SIM',
    'Exemplo': 'saco_e_granel, apenas_saco, apenas_granel ou unitario',
    'Instruções / Explicação': 'Como o produto é vendido: "saco_e_granel" (vende pacote fechado e por quilo), "apenas_saco", "apenas_granel" ou "unitario" (itens por unidade, frasco, pacote).'
  },
  {
    'Coluna': 'Preco_Saco_Padrao_R$',
    'Obrigatorio': 'Depende',
    'Exemplo': '154.90',
    'Instruções / Explicação': 'Preço em Reais do saco fechado padrão (usar ponto para centavos, ex: 154.90). Obrigatório se vender sacos.'
  },
  {
    'Coluna': 'Peso_Saco_Padrao_Kg',
    'Obrigatorio': 'Depende',
    'Exemplo': '15',
    'Instruções / Explicação': 'Peso em Quilos do saco padrão (ex: 10, 15, 20).'
  },
  {
    'Coluna': 'Variacoes_Sacos_Peso_e_Preco',
    'Obrigatorio': 'NAO',
    'Exemplo': '10kg:118.00 | 15kg:154.90 | 20kg:194.00',
    'Instruções / Explicação': 'Se o mesmo produto possui vários tamanhos de saco, separe por barra (|). Formato: PESOkg:VALOR (ex: 3kg:55.00 | 10.1kg:145.00).'
  },
  {
    'Coluna': 'Preco_Granel_por_Kg_R$',
    'Obrigatorio': 'Depende',
    'Exemplo': '13.90',
    'Instruções / Explicação': 'Valor de 1kg a granel. Obrigatório caso a modalidade seja "saco_e_granel" ou "apenas_granel".'
  },
  {
    'Coluna': 'Preco_Unitario_R$',
    'Obrigatorio': 'Depende',
    'Exemplo': '24.90',
    'Instruções / Explicação': 'Valor unitário para itens vendidos avulsos (shampoo, remédios, brinquedos, petiscos).'
  },
  {
    'Coluna': 'Rotulo_Unidade',
    'Obrigatorio': 'NAO',
    'Exemplo': 'unidade, frasco, pacote, lata, sachê',
    'Instruções / Explicação': 'Texto da unidade exibido para o cliente. Padrão: "unidade".'
  },
  {
    'Coluna': 'Estoque_Sacos',
    'Obrigatorio': 'NAO',
    'Exemplo': '10',
    'Instruções / Explicação': 'Quantidade de sacos disponíveis em estoque.'
  },
  {
    'Coluna': 'Estoque_Granel_Kg',
    'Obrigatorio': 'NAO',
    'Exemplo': '50',
    'Instruções / Explicação': 'Quantidade total de quilos em estoque para venda a granel.'
  },
  {
    'Coluna': 'Estoque_Unidades',
    'Obrigatorio': 'NAO',
    'Exemplo': '25',
    'Instruções / Explicação': 'Quantidade de unidades em estoque para produtos unitários.'
  },
  {
    'Coluna': 'Em_Estoque_SIM_NAO',
    'Obrigatorio': 'NAO',
    'Exemplo': 'SIM ou NAO',
    'Instruções / Explicação': 'Coloque "SIM" para produto disponível ou "NAO" para esgotado.'
  },
  {
    'Coluna': 'Em_Destaque_SIM_NAO',
    'Obrigatorio': 'NAO',
    'Exemplo': 'SIM ou NAO',
    'Instruções / Explicação': 'Coloque "SIM" para exibir no topo ou destaque da página.'
  },
  {
    'Coluna': 'Em_Promocao_SIM_NAO',
    'Obrigatorio': 'NAO',
    'Exemplo': 'SIM ou NAO',
    'Instruções / Explicação': 'Coloque "SIM" para marcar o produto em promoção.'
  },
  {
    'Coluna': 'Texto_Promocao',
    'Obrigatorio': 'NAO',
    'Exemplo': '10% OFF, Oferta Especial, Preço Baixo',
    'Instruções / Explicação': 'Texto exibido no selo vermelho de promoção (ex: 15% OFF).'
  },
  {
    'Coluna': 'Tipos_Pet_Separado_por_Virgula',
    'Obrigatorio': 'NAO',
    'Exemplo': 'caes, gatos (ou passaros, peixes, outros)',
    'Instruções / Explicação': 'Pode colocar mais de um animal separado por vírgula! Aceita: caes, gatos, passaros, peixes, outros.'
  },
  {
    'Coluna': 'Descricao_Detalhada',
    'Obrigatorio': 'NAO',
    'Exemplo': 'Alimento premium com minerais...',
    'Instruções / Explicação': 'Texto explicativo do produto com benefícios, composição ou instruções.'
  }
];

// Helper to download the complete Excel template
export function downloadTemplateExcel(): void {
  const wb = XLSX.utils.book_new();

  // 1. Sheet with sample products
  const wsData = XLSX.utils.json_to_sheet(SAMPLE_TEMPLATE_ROWS);
  // Auto-fit column widths
  wsData['!cols'] = [
    { wch: 35 }, // Nome
    { wch: 22 }, // Categoria
    { wch: 35 }, // Link Foto
    { wch: 18 }, // Modalidade
    { wch: 22 }, // Preco Saco
    { wch: 20 }, // Peso Saco
    { wch: 38 }, // Variacoes
    { wch: 22 }, // Preco Granel
    { wch: 18 }, // Preco Unitario
    { wch: 16 }, // Rotulo
    { wch: 14 }, // Est Saco
    { wch: 18 }, // Est Granel
    { wch: 16 }, // Est Unidades
    { wch: 18 }, // Em Estoque
    { wch: 18 }, // Destaque
    { wch: 18 }, // Promocao
    { wch: 20 }, // Texto Promo
    { wch: 30 }, // Tipos Pet
    { wch: 45 }, // Descricao
  ];
  XLSX.utils.book_append_sheet(wb, wsData, 'Produtos_Modelo');

  // 2. Sheet with instructions
  const wsInstructions = XLSX.utils.json_to_sheet(INSTRUCTION_ROWS);
  wsInstructions['!cols'] = [
    { wch: 30 },
    { wch: 14 },
    { wch: 30 },
    { wch: 70 },
  ];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instruções_Preenchimento');

  // Trigger download in browser
  XLSX.writeFile(wb, 'modelo_importacao_produtos_pet.xlsx');
}

// Export current products to Excel
export function exportProductsToExcel(products: Product[], categories: Category[]): void {
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  const rows = products.map(p => {
    // Variations to string: 10kg:118.00 | 15kg:154.90
    let varStr = '';
    if (p.bagVariations && p.bagVariations.length > 0) {
      varStr = p.bagVariations
        .map(v => `${v.weightKg}kg:${v.price.toFixed(2)}`)
        .join(' | ');
    }

    // Pet types string: caes, gatos
    const pets = (p.animalTypes && p.animalTypes.length > 0)
      ? p.animalTypes.join(', ')
      : (p.animalType || 'caes');

    return {
      'Nome_do_Produto*': p.name,
      'Categoria*': (p.categoryIds && p.categoryIds.length > 0)
        ? p.categoryIds.map(id => categoryMap.get(id)).filter(Boolean).join(', ')
        : (categoryMap.get(p.categoryId) || 'Rações a Granel'),
      'Link_da_Foto_URL': p.imageUrl || '',
      'Modalidade_Venda*': p.sellMode,
      'Preco_Saco_Padrao_R$': p.bagPrice ?? '',
      'Peso_Saco_Padrao_Kg': p.bagWeightKg ?? '',
      'Variacoes_Sacos_Peso_e_Preco': varStr,
      'Preco_Granel_por_Kg_R$': p.bulkPricePerKg ?? '',
      'Preco_Unitario_R$': p.unitPrice ?? '',
      'Rotulo_Unidade': p.unitLabel ?? '',
      'Estoque_Sacos': p.stockBags ?? 0,
      'Estoque_Granel_Kg': p.stockKg ?? 0,
      'Estoque_Unidades': p.stockUnits ?? 0,
      'Em_Estoque_SIM_NAO': p.inStock ? 'SIM' : 'NAO',
      'Em_Destaque_SIM_NAO': p.isFeatured ? 'SIM' : 'NAO',
      'Apenas_Consulta_SIM_NAO': p.isConsultationOnly ? 'SIM' : 'NAO',
      'Em_Promocao_SIM_NAO': p.isOnSale ? 'SIM' : 'NAO',
      'Texto_Promocao': p.promoDiscountText ?? '',
      'Tipos_Pet_Separado_por_Virgula': pets,
      'Descricao_Detalhada': p.description ?? '',
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
  XLSX.writeFile(wb, `produtos_exportados_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Parse imported Excel / CSV file
export async function parseImportFile(
  file: File,
  existingCategories: Category[],
  lojaId?: string
): Promise<ParsedImportResult> {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });

  // Use the first sheet or the sheet named 'Produtos' / 'Produtos_Modelo'
  let sheetName = wb.SheetNames[0];
  for (const name of wb.SheetNames) {
    if (name.toLowerCase().includes('produto')) {
      sheetName = name;
      break;
    }
  }

  const worksheet = wb.Sheets[sheetName];
  if (!worksheet) {
    throw new Error('A planilha selecionada está vazia ou sem abas legíveis.');
  }

  // Convert to JSON array of objects
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (rawRows.length === 0) {
    throw new Error('Nenhuma linha de produto foi encontrada na planilha.');
  }

  const products: Product[] = [];
  const newCategoriesMap = new Map<string, Category>();
  const warnings: string[] = [];

  // Helper to find column case-insensitively
  const getCol = (row: Record<string, any>, possibleKeys: string[]): any => {
    for (const k of Object.keys(row)) {
      const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const pk of possibleKeys) {
        const cleanPk = pk.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanKey.includes(cleanPk) || cleanPk.includes(cleanKey)) {
          return row[k];
        }
      }
    }
    return '';
  };

  const categoryNameMap = new Map<string, Category>();
  existingCategories.forEach(c => {
    categoryNameMap.set(c.name.trim().toLowerCase(), c);
    categoryNameMap.set(c.slug.trim().toLowerCase(), c);
  });

  let rowIndex = 1;
  for (const row of rawRows) {
    rowIndex++;
    // Get product name
    const rawName = String(getCol(row, ['nome', 'nomedoproduto', 'produto']) || '').trim();
    if (!rawName) {
      warnings.push(`Linha ${rowIndex}: ignorada pois não possui nome do produto.`);
      continue;
    }

    // Category resolution (supports multiple categories separated by comma, semicolon, or pipe)
    const rawCat = String(getCol(row, ['categoria', 'cat']) || '').trim() || 'Geral';
    const splitCats = rawCat.split(/[,;|]+/).map(s => s.trim()).filter(Boolean);
    const resolvedCatIds: string[] = [];

    for (const singleCat of (splitCats.length > 0 ? splitCats : ['Geral'])) {
      const cleanCatKey = singleCat.toLowerCase();
      let resolvedId = '';
      if (categoryNameMap.has(cleanCatKey)) {
        resolvedId = categoryNameMap.get(cleanCatKey)!.id;
      } else if (newCategoriesMap.has(cleanCatKey)) {
        resolvedId = newCategoriesMap.get(cleanCatKey)!.id;
      } else {
        // Create new category dynamically
        const newCatId = `cat-imp-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const newCat: Category = {
          id: newCatId,
          lojaId,
          name: singleCat,
          slug: singleCat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          icon: 'Layers',
          sortOrder: existingCategories.length + newCategoriesMap.size + 1,
        };
        newCategoriesMap.set(cleanCatKey, newCat);
        categoryNameMap.set(cleanCatKey, newCat);
        resolvedId = newCatId;
      }
      if (resolvedId && !resolvedCatIds.includes(resolvedId)) {
        resolvedCatIds.push(resolvedId);
      }
    }

    const categoryId = resolvedCatIds[0] || 'cat-granel';
    const categoryIds = resolvedCatIds.length > 0 ? resolvedCatIds : [categoryId];

    // Sell Mode resolution
    const rawMode = String(getCol(row, ['modalidade', 'modalidadevenda', 'tipo']) || '').toLowerCase();
    let sellMode: SellMode = 'bag_and_bulk';
    if (rawMode.includes('unit') || rawMode.includes('avulso')) {
      sellMode = 'unit';
    } else if (rawMode.includes('apenas_saco') || rawMode.includes('so_saco') || rawMode.includes('fechado')) {
      sellMode = 'bag_only';
    } else if (rawMode.includes('apenas_granel') || rawMode.includes('so_granel') || rawMode.includes('quilo')) {
      sellMode = 'bulk_only';
    } else {
      sellMode = 'bag_and_bulk';
    }

    // Prices and weights
    const parseNum = (val: any): number => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      const str = String(val).replace('R$', '').replace('kg', '').replace(',', '.').trim();
      const n = parseFloat(str);
      return isNaN(n) ? 0 : n;
    };

    const bagPrice = parseNum(getCol(row, ['precosaco', 'valorsaco', 'saco']));
    const bagWeightKg = parseNum(getCol(row, ['pesosaco', 'pesokg', 'kilosaco'])) || 15;
    const bulkPricePerKg = parseNum(getCol(row, ['precogranel', 'valorganel', 'kg', 'granel']));
    const unitPrice = parseNum(getCol(row, ['precounitario', 'valorunitario', 'unitario']));
    const unitLabel = String(getCol(row, ['rotulounidade', 'unidade', 'embalagem']) || '').trim() || 'unidade';

    // Bag variations parsing (e.g. "10kg:118.00 | 15kg:154.90 | 20kg:194.00" or separated by semicolon / comma)
    const rawVariations = String(getCol(row, ['variacoes', 'variacoessacos', 'tamanhos']) || '').trim();
    const bagVariations: BagVariation[] = [];

    if (rawVariations) {
      const parts = rawVariations.split(/[|;]/);
      parts.forEach((part, vIdx) => {
        const cleanPart = part.trim();
        if (!cleanPart) return;
        // Format could be: "10kg:118.00" or "10:118" or "10kg - 118"
        const [wStr, pStr] = cleanPart.split(/[:=-]/);
        if (wStr && pStr) {
          const w = parseNum(wStr);
          const p = parseNum(pStr);
          if (w > 0 && p > 0) {
            bagVariations.push({
              id: `bv-${Date.now()}-${vIdx}-${w}`,
              weightKg: w,
              price: p,
              stockBags: 10,
            });
          }
        }
      });
    }

    // If bag price exists but no variations were written, create default variations
    if (bagVariations.length === 0 && (sellMode === 'bag_and_bulk' || sellMode === 'bag_only') && bagPrice > 0) {
      bagVariations.push({
        id: `bv-${Date.now()}-default`,
        weightKg: bagWeightKg,
        price: bagPrice,
        stockBags: 10,
      });
    }

    // Stocks
    const stockBags = Math.round(parseNum(getCol(row, ['estoquesacos', 'estoquesaco'])) || 10);
    const stockKg = Math.round(parseNum(getCol(row, ['estoquegranel', 'estoquekg'])) || 50);
    const stockUnits = Math.round(parseNum(getCol(row, ['estoqueunidades', 'estoqueunidade'])) || 20);

    // Booleans
    const parseBool = (val: any, defaultVal = false): boolean => {
      if (typeof val === 'boolean') return val;
      const s = String(val).toLowerCase().trim();
      if (['sim', 's', 'true', '1', 'yes', 'y'].includes(s)) return true;
      if (['nao', 'não', 'n', 'false', '0', 'no'].includes(s)) return false;
      return defaultVal;
    };

    const inStock = parseBool(getCol(row, ['emestoque', 'disponivel']), true);
    const isFeatured = parseBool(getCol(row, ['emdestaque', 'destaque']), false);
    const isConsultationOnly = parseBool(getCol(row, ['apenasconsulta', 'consulta', 'sobconsulta']), false);
    const isOnSale = parseBool(getCol(row, ['empromocao', 'promocao']), false);
    const promoDiscountText = String(getCol(row, ['textopromocao', 'desconto', 'ofertatexto']) || '').trim();

    // Image URL
    let imageUrl = String(getCol(row, ['linkfoto', 'foto', 'imagem', 'url']) || '').trim();
    if (!imageUrl || !imageUrl.startsWith('http')) {
      imageUrl = 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&auto=format&fit=crop&q=80';
    }

    // Pet types parsing (e.g. "caes, gatos" or "passaros")
    const rawPets = String(getCol(row, ['tipospet', 'pet', 'pets', 'animal']) || '').toLowerCase();
    const animalTypes: AnimalType[] = [];

    if (rawPets.includes('c') || rawPets.includes('dog')) animalTypes.push('dog');
    if (rawPets.includes('gat') || rawPets.includes('cat')) animalTypes.push('cat');
    if (rawPets.includes('passar') || rawPets.includes('ave') || rawPets.includes('bird')) animalTypes.push('bird');
    if (rawPets.includes('peix') || rawPets.includes('fish') || rawPets.includes('aquar')) animalTypes.push('fish');
    if (rawPets.includes('outr') || rawPets.includes('other')) animalTypes.push('other');

    if (animalTypes.length === 0) {
      animalTypes.push('dog');
    }

    // Description
    const description = String(getCol(row, ['descricao', 'detalhes', 'obs']) || '').trim();

    const product: Product = {
      id: `prod-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      lojaId,
      name: rawName,
      description: description || `Produto de alta qualidade para ${animalTypes.includes('cat') ? 'gatos' : 'cães'}.`,
      categoryId,
      categoryIds,
      imageUrl,
      sellMode,
      stockBags,
      stockKg,
      stockUnits,
      inStock,
      isFeatured,
      isConsultationOnly,
      isOnSale,
      promoDiscountText: isOnSale ? (promoDiscountText || 'Promoção') : '',
      animalType: animalTypes[0] || 'dog',
      animalTypes,
      createdAt: new Date().toISOString(),
    };

    if (bagPrice > 0) {
      product.bagPrice = bagPrice;
    }
    if (bagWeightKg > 0) {
      product.bagWeightKg = bagWeightKg;
    }
    if (bagVariations.length > 0) {
      product.bagVariations = bagVariations;
    }
    if (bulkPricePerKg > 0) {
      product.bulkPricePerKg = bulkPricePerKg;
    }
    if (unitPrice > 0) {
      product.unitPrice = unitPrice;
    }
    if (unitLabel) {
      product.unitLabel = unitLabel;
    }

    products.push(product);
  }

  return {
    products,
    newCategories: Array.from(newCategoriesMap.values()),
    totalRows: rawRows.length,
    validRows: products.length,
    warnings,
  };
}
