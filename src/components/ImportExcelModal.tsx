import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Package, 
  HelpCircle,
  Eye,
  Check
} from 'lucide-react';
import { Product, Category } from '../types';
import { 
  downloadTemplateExcel, 
  parseImportFile, 
  ParsedImportResult,
  SAMPLE_TEMPLATE_ROWS 
} from '../services/excelService';
import { saveProductsBulk } from '../services/storeService';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  existingProducts: Product[];
  onImportSuccess?: (count: number) => void;
  lojaId?: string;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  categories,
  existingProducts,
  onImportSuccess,
  lojaId,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState<ParsedImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'columns_guide'>('upload');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    await processFile(selected);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = async (selectedFile: File) => {
    setErrorMsg('');
    setSuccessMsg('');
    setFile(selectedFile);
    setIsLoading(true);

    try {
      const result = await parseImportFile(selectedFile, categories, lojaId);
      setParseResult(result);
    } catch (err: any) {
      console.error('Error parsing file:', err);
      setErrorMsg(err.message || 'Erro ao processar a planilha. Verifique o formato.');
      setParseResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.products.length === 0) return;

    setIsSaving(true);
    setErrorMsg('');

    try {
      await saveProductsBulk(parseResult.products, parseResult.newCategories, lojaId);
      setSuccessMsg(`✓ Sucesso! ${parseResult.products.length} produtos importados e sincronizados.`);
      if (onImportSuccess) {
        onImportSuccess(parseResult.products.length);
      }
      setTimeout(() => {
        onClose();
        setParseResult(null);
        setFile(null);
        setSuccessMsg('');
      }, 2000);
    } catch (err: any) {
      console.error('Error saving imported products:', err);
      setErrorMsg(err?.message || 'Falha ao salvar os produtos no sistema. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParseResult(null);
    setErrorMsg('');
    setSuccessMsg('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-stone-950/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">Importar Produtos via Excel</h3>
              <p className="text-xs text-stone-400">Planilha padronizada com fotos, variações, categorias e preços</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation & Template Download Button */}
        <div className="bg-stone-50 border-b border-stone-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
              }`}
            >
              Upload da Planilha
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('columns_guide')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'columns_guide'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
              }`}
            >
              Colunas & Variações
            </button>
          </div>

          {/* Download Model Button */}
          <button
            type="button"
            onClick={downloadTemplateExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-1.5 px-3 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            title="Baixar modelo oficial em Excel pronto para preencher"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Planilha Modelo (.xlsx)</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {activeTab === 'upload' ? (
            <>
              {/* Feedback messages */}
              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Upload Drop Zone (if no file parsed yet) */}
              {!parseResult && (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-stone-300 hover:border-blue-500 rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all hover:bg-blue-50/30 group bg-stone-50/50"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
                    {isLoading ? (
                      <RefreshCw className="w-8 h-8 animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8" />
                    )}
                  </div>

                  <h4 className="font-extrabold text-stone-900 text-base sm:text-lg mt-4">
                    {isLoading ? 'Lendo e validando a planilha...' : 'Arraste sua planilha Excel aqui'}
                  </h4>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                    Ou clique para selecionar um arquivo do seu computador (.xlsx, .xls ou .csv)
                  </p>

                  <div className="mt-4 inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-stone-200 text-xs font-semibold text-stone-600 shadow-xs">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dica: Use nosso botão verde acima para baixar o modelo preenchido</span>
                  </div>
                </div>
              )}

              {/* Preview of Parsed Products */}
              {parseResult && (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-extrabold text-blue-950 text-sm block">
                        ✓ {parseResult.validRows} Produtos Prontos para Importar
                      </span>
                      <span className="text-blue-800 text-[11px]">
                        Arquivo: <span className="font-bold">{file?.name}</span>
                        {parseResult.newCategories.length > 0 && (
                          <> • <span className="font-bold">{parseResult.newCategories.length} nova(s) categoria(s)</span> serão criadas automaticamente.</>
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-3 py-1.5 bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 font-bold rounded-xl transition-colors"
                    >
                      Trocar Arquivo
                    </button>
                  </div>

                  {/* Warnings if any */}
                  {parseResult.warnings.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                        <span>Avisos de Linhas Ignoradas:</span>
                      </div>
                      {parseResult.warnings.slice(0, 3).map((w, idx) => (
                        <p key={idx} className="text-[11px] text-amber-800">{w}</p>
                      ))}
                    </div>
                  )}

                  {/* Products Table Preview */}
                  <div>
                    <h5 className="font-extrabold text-stone-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-blue-600" />
                      <span>Prévia dos Produtos (Primeiros {Math.min(parseResult.products.length, 5)} itens):</span>
                    </h5>
                    
                    <div className="border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-100 max-h-60 overflow-y-auto bg-white">
                      {parseResult.products.slice(0, 10).map((prod, idx) => (
                        <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-stone-50 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="w-10 h-10 rounded-lg object-contain bg-white border border-stone-200 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-stone-900 truncate text-xs sm:text-sm">
                                {prod.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] text-stone-500">
                                <span className="bg-stone-100 px-1.5 py-0.5 rounded font-bold text-stone-700">
                                  {prod.sellMode === 'bag_and_bulk' ? 'Saco & Granel' : prod.sellMode === 'unit' ? 'Unitário' : prod.sellMode === 'bag_only' ? 'Só Saco' : 'Só Granel'}
                                </span>
                                {prod.bagVariations && prod.bagVariations.length > 0 && (
                                  <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                                    {prod.bagVariations.length} tamanhos de sacos
                                  </span>
                                )}
                                {prod.animalTypes && prod.animalTypes.map(at => (
                                  <span key={at} className="bg-stone-100 px-1 py-0.5 rounded font-medium">
                                    {at === 'dog' ? '🐕 Cão' : at === 'cat' ? '🐈 Gato' : at === 'bird' ? '🦜 Pássaro' : at === 'fish' ? '🐠 Peixe' : '🐾 Outro'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-black text-stone-900 text-xs sm:text-sm block">
                              {prod.sellMode === 'unit' 
                                ? `R$ ${(prod.unitPrice || 0).toFixed(2).replace('.', ',')}` 
                                : `R$ ${(prod.bagPrice || 0).toFixed(2).replace('.', ',')}`}
                            </span>
                            {prod.bulkPricePerKg && prod.bulkPricePerKg > 0 && (
                              <span className="text-[10px] text-stone-500 block">
                                R$ {prod.bulkPricePerKg.toFixed(2).replace('.', ',')}/kg
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Confirm Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      disabled={isSaving}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 px-4 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-700/25 active:scale-98 transition-all disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Salvando e Sincronizando Produtos...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          <span>Confirmar Importação de {parseResult.validRows} Produtos</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Tab: Guide of Columns & Variations */
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs space-y-2">
                <h4 className="font-extrabold text-blue-950 text-sm flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                  <span>Como preencher a planilha perfeitamente:</span>
                </h4>
                <p className="text-blue-900 leading-relaxed">
                  A planilha foi desenhada para cobrir 100% dos recursos do sistema: rações vendidas por quilo e saco, itens com múltiplos tamanhos de saco (ex: 10kg, 15kg e 20kg), itens unitários (remédios, brinquedos, shampoos), fotos e múltiplos pets.
                </p>
              </div>

              {/* Variations formatting example */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2 text-xs">
                <span className="font-extrabold text-stone-900 uppercase tracking-wider text-[11px] block">
                  💡 Como colocar Variações de Sacos (Peso e Preço):
                </span>
                <p className="text-stone-600">
                  Na coluna <code className="bg-stone-200 px-1 py-0.5 rounded font-bold text-stone-800">Variacoes_Sacos_Peso_e_Preco</code>, basta separar os pesos e preços com uma barra vertical (<code className="font-bold">|</code>):
                </p>
                <div className="bg-white p-2.5 rounded-xl border border-stone-300 font-mono text-xs text-blue-700 font-bold">
                  10kg:118.00 | 15kg:154.90 | 20kg:194.00
                </div>
                <p className="text-[11px] text-stone-500">
                  O sistema criará automaticamente as opções de 10kg, 15kg e 20kg na modalidade saco!
                </p>
              </div>

              {/* Multiple Pets example */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2 text-xs">
                <span className="font-extrabold text-stone-900 uppercase tracking-wider text-[11px] block">
                  🐾 Como categorizar mais de um pet:
                </span>
                <p className="text-stone-600">
                  Na coluna <code className="bg-stone-200 px-1 py-0.5 rounded font-bold text-stone-800">Tipos_Pet_Separado_por_Virgula</code>, separe por vírgula se o produto servir para mais de um animal:
                </p>
                <div className="bg-white p-2.5 rounded-xl border border-stone-300 font-mono text-xs text-blue-700 font-bold">
                  caes, gatos
                </div>
                <p className="text-[11px] text-stone-500">
                  Palavras aceitas: <span className="font-semibold">caes</span>, <span className="font-semibold">gatos</span>, <span className="font-semibold">passaros</span>, <span className="font-semibold">peixes</span>, <span className="font-semibold">outros</span>.
                </p>
              </div>

              {/* Photos example */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-2 text-xs">
                <span className="font-extrabold text-stone-900 uppercase tracking-wider text-[11px] block">
                  🖼️ Links das Fotos:
                </span>
                <p className="text-stone-600">
                  Cole o link direto da imagem na coluna <code className="bg-stone-200 px-1 py-0.5 rounded font-bold text-stone-800">Link_da_Foto_URL</code> (ex: imagens do Unsplash, Imgur, ou do seu próprio site/servidor). Se deixar em branco, o sistema aplica uma imagem padrão automaticamente.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
