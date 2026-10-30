import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lock, 
  KeyRound, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  ShieldCheck, 
  Clock, 
  RefreshCw, 
  Power, 
  Plus, 
  Eye, 
  EyeOff, 
  Database, 
  FileCode, 
  Copy, 
  Download, 
  Check, 
  Sparkles, 
  RotateCcw, 
  SlidersHorizontal,
  Store,
  Trash2,
  ExternalLink,
  Search,
  Phone,
  MapPin,
  FileText,
  AlertOctagon,
  ChevronRight
} from 'lucide-react';
import { SystemSubscription, StoreSettings, StoreTenantSummary } from '../types';
import { 
  saveSubscription, 
  checkIsSubscriptionExpired, 
  saveSettings, 
  getStoredSettings,
  fetchAllStoresSummary,
  subscribeAllStoresSummary,
  updateStoreTenantInfo,
  deleteStoreData,
  createNewStoreTenant
} from '../services/storeService';
import { 
  parseFirebaseConfigInput, 
  FirebaseAppletConfig 
} from '../services/firebaseConfigParser';
import { 
  getActiveFirebaseConfig, 
  saveActiveFirebaseConfig, 
  resetToDefaultFirebaseConfig, 
  isUsingCustomFirebaseConfig 
} from '../lib/firebase';
import { sanitizeLojaId, getLojaId } from '../services/storeId';
import defaultFirebaseConfig from '../../firebase-applet-config.json';

const MASTER_PASSWORD = 'xT7$mQ2!vB9#';

interface MasterAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: SystemSubscription;
  settings?: StoreSettings;
  onSettingsUpdated?: (settings: StoreSettings) => void;
  lojaId?: string;
}

export const MasterAdminModal: React.FC<MasterAdminModalProps> = ({
  isOpen,
  onClose,
  subscription,
  settings,
  onSettingsUpdated,
  lojaId,
}) => {
  const currentLojaId = sanitizeLojaId(lojaId || getLojaId());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Active Tab: 'stores' | 'subscription' | 'pet_mode' | 'database'
  const [activeTab, setActiveTab] = useState<'stores' | 'subscription' | 'pet_mode' | 'database'>('stores');
  
  // ==========================================
  // MULTITENANT ALL STORES STATE
  // ==========================================
  const [stores, setStores] = useState<StoreTenantSummary[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [storeSearch, setStoreSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');

  // Inline edit state per store: { [storeLojaId]: { storeName, phone, address, dueDate, notes, monthlyFee, isExpiredManualOverride, isSaving, successMsg } }
  const [storeFormState, setStoreFormState] = useState<Record<string, {
    storeName: string;
    phone: string;
    address: string;
    dueDate: string;
    notes: string;
    monthlyFee: number;
    isExpiredManualOverride: boolean;
    isSaving?: boolean;
    successMsg?: string;
    errorMsg?: string;
  }>>({});

  // Deletion modal state
  const [storeToDelete, setStoreToDelete] = useState<StoreTenantSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResultMsg, setDeleteResultMsg] = useState<{ text: string; success: boolean } | null>(null);

  // Store details modal state (opens upon clicking store row in single-line list)
  const [selectedStoreModal, setSelectedStoreModal] = useState<StoreTenantSummary | null>(null);

  // New store creation modal/drawer state
  const [isAddingStore, setIsAddingStore] = useState(false);
  const [newStoreId, setNewStoreId] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [newStorePhone, setNewStorePhone] = useState('');
  const [newStoreAddress, setNewStoreAddress] = useState('');
  const [newStoreDueDate, setNewStoreDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [newStoreFee, setNewStoreFee] = useState<number>(150);
  const [newStoreNotes, setNewStoreNotes] = useState('');
  const [isSavingNewStore, setIsSavingNewStore] = useState(false);
  const [newStoreError, setNewStoreError] = useState('');

  // ==========================================
  // CURRENT STORE SUBSCRIPTION & PET MODE STATE
  // ==========================================
  const [currentSettings, setCurrentSettings] = useState<StoreSettings>(() => settings || getStoredSettings());
  const [isSavingPetMode, setIsSavingPetMode] = useState(false);
  const [petSuccessMsg, setPetSuccessMsg] = useState('');
  
  const [monthlyFee, setMonthlyFee] = useState<number>(subscription.monthlyFee || 150);
  const [startDate, setStartDate] = useState<string>(subscription.startDate || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(subscription.dueDate || new Date().toISOString().split('T')[0]);
  const [isExpiredManual, setIsExpiredManual] = useState<boolean>(subscription.isExpiredManualOverride || false);
  const [notes, setNotes] = useState<string>(subscription.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // ==========================================
  // DATABASE (FIREBASE) CONFIG STATE
  // ==========================================
  const [dbInputText, setDbInputText] = useState('');
  const [parsedConfig, setParsedConfig] = useState<FirebaseAppletConfig | null>(null);
  const [formattedJsonOutput, setFormattedJsonOutput] = useState('');
  const [parseError, setParseError] = useState('');
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [dbSuccessMsg, setDbSuccessMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedStoreId, setCopiedStoreId] = useState<string | null>(null);
  const [currentConfig, setCurrentConfig] = useState<FirebaseAppletConfig>(getActiveFirebaseConfig());
  const [hasCustomDb, setHasCustomDb] = useState<boolean>(isUsingCustomFirebaseConfig());

  // Subscribe to all stores when modal is open and authenticated
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    setIsLoadingStores(true);
    const unsub = subscribeAllStoresSummary((all) => {
      setStores(all);
      setIsLoadingStores(false);
      // Initialize form buffers for each store
      setStoreFormState(prev => {
        const next = { ...prev };
        for (const s of all) {
          if (!next[s.lojaId]) {
            next[s.lojaId] = {
              storeName: s.storeName,
              phone: s.phone,
              address: s.address,
              dueDate: s.dueDate,
              notes: s.notes,
              monthlyFee: s.monthlyFee,
              isExpiredManualOverride: s.isExpiredManualOverride || false,
            };
          }
        }
        return next;
      });
    });

    return () => {
      unsub();
    };
  }, [isOpen, isAuthenticated]);

  // Sync state when props update
  useEffect(() => {
    if (subscription) {
      setMonthlyFee(subscription.monthlyFee || 150);
      setStartDate(subscription.startDate || new Date().toISOString().split('T')[0]);
      setDueDate(subscription.dueDate || new Date().toISOString().split('T')[0]);
      setIsExpiredManual(subscription.isExpiredManualOverride || false);
      setNotes(subscription.notes || '');
    }
    if (settings) {
      setCurrentSettings(settings);
    } else {
      setCurrentSettings(getStoredSettings());
    }
    if (isOpen) {
      setCurrentConfig(getActiveFirebaseConfig());
      setHasCustomDb(isUsingCustomFirebaseConfig());
    }
  }, [subscription, settings, isOpen]);

  if (!isOpen) return null;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === MASTER_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError('');
      setPasswordInput('');
    } else {
      setPasswordError('Senha master incorreta. Acesso não autorizado.');
    }
  };

  // Helper to add days to due date in current store tab
  const handleAddDaysCurrentStore = (days: number) => {
    const baseDate = dueDate ? new Date(dueDate + 'T12:00:00') : new Date();
    const now = new Date();
    const effectiveBase = baseDate.getTime() < now.getTime() ? now : baseDate;
    effectiveBase.setDate(effectiveBase.getDate() + days);
    const newDueDate = effectiveBase.toISOString().split('T')[0];
    setDueDate(newDueDate);
    setIsExpiredManual(false);
  };

  // Helper to add days to due date for any store in the stores list
  const handleAddDaysStore = (storeId: string, days: number) => {
    const form = storeFormState[storeId] || {
      storeName: '',
      phone: '',
      address: '',
      dueDate: new Date().toISOString().split('T')[0],
      notes: '',
      monthlyFee: 150,
      isExpiredManualOverride: false,
    };
    const baseDate = form.dueDate ? new Date(form.dueDate + 'T12:00:00') : new Date();
    const now = new Date();
    const effectiveBase = baseDate.getTime() < now.getTime() ? now : baseDate;
    effectiveBase.setDate(effectiveBase.getDate() + days);
    const nextDueDate = effectiveBase.toISOString().split('T')[0];
    
    setStoreFormState(prev => ({
      ...prev,
      [storeId]: {
        ...prev[storeId],
        dueDate: nextDueDate,
        isExpiredManualOverride: false,
      }
    }));
  };

  // Save changes for an individual store in the stores list
  const handleSaveStoreChanges = async (storeId: string) => {
    const form = storeFormState[storeId];
    if (!form) return;

    setStoreFormState(prev => ({
      ...prev,
      [storeId]: { ...prev[storeId], isSaving: true, successMsg: '', errorMsg: '' }
    }));

    try {
      await updateStoreTenantInfo(storeId, {
        storeName: form.storeName,
        phone: form.phone,
        address: form.address,
        dueDate: form.dueDate,
        notes: form.notes,
        monthlyFee: Number(form.monthlyFee) || 0,
        isExpiredManualOverride: form.isExpiredManualOverride,
      });

      setStoreFormState(prev => ({
        ...prev,
        [storeId]: {
          ...prev[storeId],
          isSaving: false,
          successMsg: '✓ Salvo e atualizado com sucesso!'
        }
      }));

      // Refresh stores list
      const refreshed = await fetchAllStoresSummary();
      setStores(refreshed);

      setTimeout(() => {
        setStoreFormState(prev => {
          if (!prev[storeId]) return prev;
          return {
            ...prev,
            [storeId]: { ...prev[storeId], successMsg: '' }
          };
        });
      }, 3500);
    } catch (err: any) {
      setStoreFormState(prev => ({
        ...prev,
        [storeId]: {
          ...prev[storeId],
          isSaving: false,
          errorMsg: err.message || 'Erro ao salvar alterações.'
        }
      }));
    }
  };

  // Confirm and delete all store data from Firestore
  const handleConfirmDeleteStore = async () => {
    if (!storeToDelete) return;
    setIsDeleting(true);
    setDeleteResultMsg(null);

    try {
      const result = await deleteStoreData(storeToDelete.lojaId);
      if (result.success) {
        setDeleteResultMsg({
          text: `✓ Loja "${storeToDelete.storeName}" (${storeToDelete.lojaId}) apagada com sucesso do Firestore! ${result.deletedProducts} produtos, ${result.deletedCategories} categorias e configurações foram removidos para liberar espaço.`,
          success: true,
        });
        // Refresh stores list
        const refreshed = await fetchAllStoresSummary();
        setStores(refreshed);
        setStoreToDelete(null);
        setSelectedStoreModal(null);
      } else {
        setDeleteResultMsg({
          text: `Erro ao apagar dados da loja ${storeToDelete.lojaId}. Verifique a conexão com o Firestore.`,
          success: false,
        });
      }
    } catch (err: any) {
      setDeleteResultMsg({
        text: `Erro ao excluir loja: ${err.message || 'Falha na operação.'}`,
        success: false,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Create new store
  const handleCreateNewStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewStoreError('');
    const cleanId = sanitizeLojaId(newStoreId);
    if (!cleanId) {
      setNewStoreError('Informe um ID válido para a loja (somente letras, números e traços).');
      return;
    }
    if (!newStoreName.trim()) {
      setNewStoreError('Informe o nome da loja.');
      return;
    }

    setIsSavingNewStore(true);
    try {
      await createNewStoreTenant({
        lojaId: cleanId,
        storeName: newStoreName.trim(),
        phone: newStorePhone.trim(),
        address: newStoreAddress.trim(),
        dueDate: newStoreDueDate,
        monthlyFee: Number(newStoreFee) || 150,
        notes: newStoreNotes.trim() || 'Nova loja cadastrada no sistema',
      });

      // Clear form
      setNewStoreId('');
      setNewStoreName('');
      setNewStorePhone('');
      setNewStoreAddress('');
      setNewStoreNotes('');
      setIsAddingStore(false);

      // Refresh
      const refreshed = await fetchAllStoresSummary();
      setStores(refreshed);
    } catch (err: any) {
      setNewStoreError(err.message || 'Erro ao cadastrar nova loja.');
    } finally {
      setIsSavingNewStore(false);
    }
  };

  // Copy storeId to clipboard
  const handleCopyStoreId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedStoreId(id);
    setTimeout(() => setCopiedStoreId(null), 2000);
  };

  // Save current store subscription
  const handleSaveCurrentStoreSub = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');

    try {
      const updated: SystemSubscription = {
        ...subscription,
        monthlyFee: Number(monthlyFee) || 0,
        startDate,
        dueDate,
        isExpiredManualOverride: isExpiredManual,
        notes,
        updatedAt: new Date().toISOString(),
      };

      await saveSubscription(updated, currentLojaId);
      setSuccessMsg('✓ Dados da assinatura e vencimento salvos com sucesso!');
      
      const refreshed = await fetchAllStoresSummary();
      setStores(refreshed);
      
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error saving subscription:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Pet mode toggle
  const isPetModeDisabled = Boolean(currentSettings.disablePetMode || currentSettings.hidePetFilters);
  const handleTogglePetMode = async () => {
    setIsSavingPetMode(true);
    setPetSuccessMsg('');
    try {
      const nextValue = !isPetModeDisabled;
      const updated: StoreSettings = {
        ...currentSettings,
        disablePetMode: nextValue,
        hidePetFilters: nextValue,
      };
      setCurrentSettings(updated);
      await saveSettings(updated, currentLojaId);
      if (onSettingsUpdated) {
        onSettingsUpdated(updated);
      }
      setPetSuccessMsg(
        nextValue
          ? '✓ Modo Pet desabilitado com sucesso! Filtros por animais e ração a granel foram ocultados.'
          : '✓ Modo Pet reativado com sucesso! Filtros e opções voltaram a ficar visíveis.'
      );
      setTimeout(() => setPetSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Error toggling pet mode:', err);
    } finally {
      setIsSavingPetMode(false);
    }
  };

  // Database handlers
  const handleDbInputChange = (text: string) => {
    setDbInputText(text);
    setDbSuccessMsg('');
    if (!text.trim()) {
      setParsedConfig(null);
      setFormattedJsonOutput('');
      setParseError('');
      return;
    }

    const result = parseFirebaseConfigInput(text);
    if (result.success && result.config && result.formattedJson) {
      setParsedConfig(result.config);
      setFormattedJsonOutput(result.formattedJson);
      setParseError('');
    } else {
      setParsedConfig(null);
      setFormattedJsonOutput('');
      setParseError(result.error || 'Formato inválido. Insira o objeto com apiKey, projectId, appId.');
    }
  };

  const handleFillSample = () => {
    const sample = `{\n  apiKey: "AIzaSyCWdj8oW7mBlIloEJdyXN3_N4btg203FlM",\n  authDomain: "lojabase1-9a4d4.firebaseapp.com",\n  projectId: "lojabase1-9a4d4",\n  storageBucket: "lojabase1-9a4d4.firebasestorage.app",\n  messagingSenderId: "1094336366479",\n  appId: "1:1094336366479:web:f7acb05482ccf71707adfa",\n  measurementId: "G-9L3Z7GYPQD"\n};`;
    handleDbInputChange(sample);
  };

  const handleCopyJson = () => {
    if (!formattedJsonOutput) return;
    navigator.clipboard.writeText(formattedJsonOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadJsonFile = () => {
    if (!formattedJsonOutput) return;
    const blob = new Blob([formattedJsonOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'firebase-applet-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveDatabaseConfig = async () => {
    if (!parsedConfig) return;
    setIsSavingDb(true);
    setDbSuccessMsg('');

    try {
      saveActiveFirebaseConfig(parsedConfig);
      let fileSavedOnDisk = false;
      try {
        const response = await fetch('/api/save-firebase-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsedConfig, null, 2),
        });
        if (response.ok) fileSavedOnDisk = true;
      } catch (e) {
        console.warn('File save API note:', e);
      }

      setCurrentConfig(parsedConfig);
      setHasCustomDb(true);
      setDbSuccessMsg(
        fileSavedOnDisk
          ? '✓ Sucesso! O arquivo firebase-applet-config.json foi atualizado no disco e o banco ativado!'
          : '✓ Sucesso! Configuração gravada e ativada no sistema!'
      );
    } catch (err: any) {
      setParseError(err.message || 'Erro ao salvar novo banco de dados.');
    } finally {
      setIsSavingDb(false);
    }
  };

  const handleRestoreDefaultDatabase = async () => {
    resetToDefaultFirebaseConfig();
    try {
      await fetch('/api/save-firebase-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultFirebaseConfig, null, 2),
      });
    } catch {}

    setCurrentConfig(defaultFirebaseConfig as FirebaseAppletConfig);
    setHasCustomDb(false);
    setDbInputText('');
    setParsedConfig(null);
    setFormattedJsonOutput('');
    setDbSuccessMsg('✓ Banco de dados padrão restaurado com sucesso!');
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  // Preview status of current store tab
  const previewExpired = checkIsSubscriptionExpired({
    id: 'preview',
    monthlyFee,
    startDate,
    dueDate,
    isExpiredManualOverride: isExpiredManual,
  });

  // Filter stores
  const filteredStores = stores.filter(s => {
    const matchesSearch = 
      s.lojaId.toLowerCase().includes(storeSearch.toLowerCase()) ||
      s.storeName.toLowerCase().includes(storeSearch.toLowerCase()) ||
      s.phone.toLowerCase().includes(storeSearch.toLowerCase()) ||
      s.address.toLowerCase().includes(storeSearch.toLowerCase()) ||
      s.notes.toLowerCase().includes(storeSearch.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'active') return !s.isExpired;
    if (statusFilter === 'expired') return s.isExpired;
    return true;
  });

  const activeStoresCount = stores.filter(s => !s.isExpired).length;
  const expiredStoresCount = stores.filter(s => s.isExpired).length;
  const totalRevenue = stores.reduce((sum, s) => sum + (s.monthlyFee || 0), 0);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-stone-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col my-auto animate-in zoom-in-95 max-h-[95vh]">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">Painel Master do Administrador</h3>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full font-bold">
                  Multitenancy
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Gestão central de todas as lojas, controle de vencimentos, bloqueio automático e banco de dados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            title="Fechar Painel Master"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lock Screen if Not Authenticated */}
        {!isAuthenticated ? (
          <div className="p-8 sm:p-12 text-center space-y-6 max-w-md mx-auto my-auto">
            <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center shadow-inner">
              <KeyRound className="w-8 h-8" />
            </div>

            <div>
              <h4 className="font-extrabold text-stone-900 text-xl">Acesso Restrito do Administrador</h4>
              <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                Digite a senha master para visualizar e gerenciar todas as lojas cadastradas, datas de vencimento e banco de dados.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-3.5 max-w-xs mx-auto">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Digite a senha master"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full text-center py-3.5 pl-4 pr-11 rounded-2xl border border-stone-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 text-sm font-bold outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                  tabIndex={-1}
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {passwordError && (
                <p className="text-xs font-bold text-rose-600 animate-in fade-in">{passwordError}</p>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 rounded-2xl text-sm transition-all shadow-md shadow-blue-700/20 active:scale-98 cursor-pointer"
              >
                Acessar Painel Master
              </button>
            </form>
          </div>
        ) : (
          /* Master Admin Management Form */
          <div className="flex flex-col flex-1 overflow-hidden">
            
            {/* Tab Navigation */}
            <div className="bg-stone-50 border-b border-stone-200 px-4 sm:px-6 pt-3 flex gap-2 shrink-0 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('stores')}
                className={`pb-3 px-3 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'stores'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Todas as Lojas & Vencimentos</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-black">
                  {stores.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('subscription')}
                className={`pb-3 px-3 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'subscription'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Loja Atual ({currentLojaId})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pet_mode')}
                className={`pb-3 px-3 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'pet_mode'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Desabilitar Modo Pet</span>
                {isPetModeDisabled ? (
                  <span className="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.2 rounded-full border border-amber-300">
                    Oculto
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('database')}
                className={`pb-3 px-3 text-xs font-extrabold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'database'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Banco de Dados (Firebase)</span>
                {hasCustomDb && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                )}
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 bg-stone-50/50">
              
              {/* TAB 1: TODAS AS LOJAS CADASTRADAS (MULTITENANCY MANAGER) */}
              {activeTab === 'stores' && (
                <div className="space-y-5">
                  {/* Delete / Operation Notification Message */}
                  {deleteResultMsg && (
                    <div className={`p-4 rounded-2xl border text-xs font-bold flex items-start justify-between gap-3 animate-in fade-in ${
                      deleteResultMsg.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}>
                      <div className="flex items-start gap-2.5">
                        {deleteResultMsg.success ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <p className="leading-relaxed">{deleteResultMsg.text}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDeleteResultMsg(null)}
                        className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Top Stats Overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-xs">
                      <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">Total de Lojas</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-stone-900">{stores.length}</span>
                        <span className="text-xs text-stone-500 font-semibold">cadastradas</span>
                      </div>
                    </div>

                    <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-xs">
                      <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Lojas Ativas / Em Dia</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-emerald-600">{activeStoresCount}</span>
                        <span className="text-xs text-stone-500 font-semibold">liberadas</span>
                      </div>
                    </div>

                    <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-xs">
                      <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Lojas Bloqueadas</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-rose-600">{expiredStoresCount}</span>
                        <span className="text-xs text-stone-500 font-semibold">expiradas</span>
                      </div>
                    </div>

                    <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-xs">
                      <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">Mensalidades Estimadas</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl sm:text-2xl font-black text-blue-700">R$ {totalRevenue.toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Search, Filter & Add Store Action Bar */}
                  <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex-1 relative">
                      <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Pesquisar por ID (lojaId), nome da loja, telefone, endereço..."
                        value={storeSearch}
                        onChange={(e) => setStoreSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold outline-none focus:border-blue-500 bg-stone-50/50"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Filter pills */}
                      <div className="flex items-center bg-stone-100 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setStatusFilter('all')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            statusFilter === 'all'
                              ? 'bg-white text-stone-900 shadow-xs'
                              : 'text-stone-500 hover:text-stone-900'
                          }`}
                        >
                          Todas ({stores.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter('active')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            statusFilter === 'active'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-stone-500 hover:text-stone-900'
                          }`}
                        >
                          Ativas ({activeStoresCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusFilter('expired')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            statusFilter === 'expired'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-stone-500 hover:text-stone-900'
                          }`}
                        >
                          Bloqueadas ({expiredStoresCount})
                        </button>
                      </div>

                      {/* Add Store Button */}
                      <button
                        type="button"
                        onClick={() => setIsAddingStore(!isAddingStore)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isAddingStore ? 'Cancelar' : 'Nova Loja'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Add New Store Drawer / Form */}
                  {isAddingStore && (
                    <form onSubmit={handleCreateNewStore} className="bg-white p-5 rounded-2xl border-2 border-blue-500/30 shadow-md space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Store className="w-5 h-5 text-blue-600" />
                          <h4 className="font-extrabold text-stone-900 text-sm sm:text-base">Cadastrar Nova Loja no Multitenancy</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAddingStore(false)}
                          className="text-stone-400 hover:text-stone-600 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {newStoreError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>{newStoreError}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1">
                            ID da Loja (Subdomínio / lojaId) *
                          </label>
                          <input
                            type="text"
                            placeholder="ex: caramelopetshop"
                            value={newStoreId}
                            onChange={(e) => setNewStoreId(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono text-xs font-bold text-stone-900 outline-none focus:border-blue-500"
                          />
                          <span className="text-[10px] text-stone-400 mt-0.5 block">Identificador único (usado no domínio da Vercel)</span>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1">
                            Nome Fantasia da Loja *
                          </label>
                          <input
                            type="text"
                            placeholder="ex: Caramelo Pet Shop Delivery"
                            value={newStoreName}
                            onChange={(e) => setNewStoreName(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-900 outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1">
                            Telefone / WhatsApp
                          </label>
                          <input
                            type="text"
                            placeholder="ex: 44999999999"
                            value={newStorePhone}
                            onChange={(e) => setNewStorePhone(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-900 outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1">
                            Endereço Físico
                          </label>
                          <input
                            type="text"
                            placeholder="ex: Av. Brasil, 123"
                            value={newStoreAddress}
                            onChange={(e) => setNewStoreAddress(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-900 outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1">
                            Data de Vencimento Inicial *
                          </label>
                          <input
                            type="date"
                            value={newStoreDueDate}
                            onChange={(e) => setNewStoreDueDate(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-900 outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1">
                            Valor da Mensalidade (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={newStoreFee}
                            onChange={(e) => setNewStoreFee(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-900 outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          Observações Internas (Cliente / Contrato)
                        </label>
                        <input
                          type="text"
                          placeholder="Anotações sobre pagamento, cliente ou contrato..."
                          value={newStoreNotes}
                          onChange={(e) => setNewStoreNotes(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingStore(false)}
                          className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-600 font-bold text-xs hover:bg-stone-100 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingNewStore}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-blue-700/20 cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
                        >
                          {isSavingNewStore ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Cadastrando Loja...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Cadastrar & Salvar no Firestore</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* List of Stores (Single-line list) */}
                  <div className="space-y-2">
                    {/* Header Columns for Desktop */}
                    <div className="hidden md:flex items-center justify-between px-4 py-2.5 text-[11px] font-black uppercase tracking-wider text-stone-400 bg-stone-100 rounded-xl">
                      <div className="flex-1">Status & Nome da Loja (ID)</div>
                      <div className="w-32">WhatsApp</div>
                      <div className="w-44">Vencimento</div>
                      <div className="w-24 text-right">Mensalidade</div>
                      <div className="w-28 text-right">Ação</div>
                    </div>

                    {isLoadingStores ? (
                      <div className="p-8 text-center bg-white rounded-2xl border border-stone-200">
                        <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                        <p className="text-xs font-bold text-stone-500">Carregando lojas cadastradas do Firestore...</p>
                      </div>
                    ) : filteredStores.length === 0 ? (
                      <div className="p-8 text-center bg-white rounded-2xl border border-stone-200">
                        <Store className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                        <h5 className="font-extrabold text-stone-700 text-sm">Nenhuma loja encontrada</h5>
                        <p className="text-xs text-stone-400 mt-1">
                          Nenhum resultado corresponde à sua busca ou filtro.
                        </p>
                      </div>
                    ) : (
                      filteredStores.map((store) => {
                        const form = storeFormState[store.lojaId] || {
                          storeName: store.storeName,
                          phone: store.phone,
                          address: store.address,
                          dueDate: store.dueDate,
                          notes: store.notes,
                          monthlyFee: store.monthlyFee,
                          isExpiredManualOverride: store.isExpiredManualOverride || false,
                        };

                        const statusCheck = checkIsSubscriptionExpired({
                          id: store.lojaId,
                          monthlyFee: form.monthlyFee,
                          startDate: store.startDate || '',
                          dueDate: form.dueDate,
                          isExpiredManualOverride: form.isExpiredManualOverride,
                        });

                        const isCurrentActiveLoja = store.lojaId === currentLojaId;

                        return (
                          <div 
                            key={store.lojaId}
                            onClick={() => setSelectedStoreModal(store)}
                            className={`bg-white hover:bg-blue-50/50 border rounded-xl p-3 sm:px-4 flex items-center justify-between gap-3 transition-all cursor-pointer shadow-2xs group select-none ${
                              statusCheck.isExpired 
                                ? 'border-rose-300 hover:border-rose-400 bg-rose-50/15' 
                                : isCurrentActiveLoja 
                                  ? 'border-blue-400 hover:border-blue-500 shadow-xs' 
                                  : 'border-stone-200 hover:border-blue-300'
                            }`}
                            title="Clique para abrir os detalhes e gerenciar esta loja"
                          >
                            {/* Left: Status Dot/Badge + Store Name + lojaId badge */}
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {/* Status Dot */}
                              <span 
                                className={`w-3 h-3 rounded-full shrink-0 ${
                                  statusCheck.isExpired 
                                    ? 'bg-rose-500 ring-4 ring-rose-100' 
                                    : statusCheck.daysRemaining <= 5 
                                      ? 'bg-amber-500 ring-4 ring-amber-100' 
                                      : 'bg-emerald-500 ring-4 ring-emerald-100'
                                }`} 
                                title={statusCheck.isExpired ? 'Site Bloqueado / Expirado' : `Site Ativo (${statusCheck.daysRemaining} dias)`} 
                              />

                              {/* Store Name & lojaId */}
                              <div className="min-w-0 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                <span className="font-extrabold text-xs sm:text-sm text-stone-900 group-hover:text-blue-700 truncate transition-colors">
                                  {form.storeName || store.storeName}
                                </span>
                                <span className="font-mono text-[11px] bg-stone-100 group-hover:bg-blue-100/70 text-stone-600 group-hover:text-blue-800 px-2 py-0.5 rounded-md border border-stone-200 shrink-0 font-bold transition-colors">
                                  {store.lojaId}
                                </span>
                                {isCurrentActiveLoja && (
                                  <span className="text-[10px] bg-blue-100 text-blue-900 border border-blue-300 font-black px-1.5 py-0.2 rounded-full uppercase shrink-0">
                                    ⭐ Loja Atual
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Center Columns (Desktop) */}
                            <div className="hidden md:flex items-center gap-4 text-xs shrink-0">
                              {/* Phone */}
                              <div className="text-stone-600 font-semibold w-32 truncate">
                                {form.phone ? form.phone : <span className="text-stone-300 italic">Sem telefone</span>}
                              </div>

                              {/* Due Date & Remaining */}
                              <div className="w-44 text-left">
                                <span className={`font-bold block ${statusCheck.isExpired ? 'text-rose-600 font-black' : 'text-stone-800'}`}>
                                  {statusCheck.formattedDueDate}
                                </span>
                                <span className={`text-[10px] block font-semibold ${
                                  statusCheck.isExpired 
                                    ? 'text-rose-600 font-black' 
                                    : statusCheck.daysRemaining <= 5 
                                      ? 'text-amber-600' 
                                      : 'text-stone-400'
                                }`}>
                                  {statusCheck.isExpired ? '⛔ Bloqueado (Expirado)' : `${statusCheck.daysRemaining} dias restantes`}
                                </span>
                              </div>

                              {/* Fee */}
                              <div className="w-24 text-right font-extrabold text-stone-800">
                                R$ {(form.monthlyFee || 0).toFixed(2).replace('.', ',')}
                              </div>
                            </div>

                            {/* Right: Mobile Info + Button */}
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`md:hidden text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                statusCheck.isExpired ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {statusCheck.isExpired ? 'Bloqueado' : `${statusCheck.daysRemaining}d`}
                              </span>

                              <div className="px-3 py-1.5 rounded-xl bg-stone-100 group-hover:bg-blue-600 group-hover:text-white text-stone-700 text-xs font-extrabold flex items-center gap-1 transition-all shadow-2xs">
                                <span>Ver Detalhes</span>
                                <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: ASSINATURA DA LOJA ATUAL */}
              {activeTab === 'subscription' && (
                <div className="space-y-5">
                  <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
                    previewExpired.isExpired 
                      ? 'bg-rose-50 border-rose-200 text-rose-900' 
                      : 'bg-blue-50 border-blue-200 text-blue-900'
                  }`}>
                    {previewExpired.isExpired ? (
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <span className="font-extrabold text-xs uppercase tracking-wider block">
                        Status Atual da Loja "{currentLojaId}":
                      </span>
                      <p className="font-extrabold text-sm sm:text-base mt-0.5">
                        {previewExpired.isExpired 
                          ? '⛔ SITE BLOQUEADO / EXPIRADO' 
                          : '✅ SITE ATIVO & LIBERADO'}
                      </p>
                      <p className="text-xs mt-1 text-stone-600">
                        {previewExpired.isExpired
                          ? 'Os clientes estão vendo a tela de "Site Expirado. Falar com Administrador". Atualize a data de vencimento abaixo para reativar o site imediatamente.'
                          : `Vencimento programado para ${previewExpired.formattedDueDate} (${previewExpired.daysRemaining} dias restantes).`}
                      </p>
                    </div>
                  </div>

                  {successMsg && (
                    <div className="p-3 bg-blue-100 border border-blue-300 text-blue-900 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  <div className="space-y-4 bg-white p-5 rounded-2xl border border-stone-200">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-stone-500" />
                        <span>Valor Mensal (R$):</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={monthlyFee}
                          onChange={(e) => setMonthlyFee(parseFloat(e.target.value) || 0)}
                          placeholder="150.00"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 text-sm font-bold text-stone-900 bg-white outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-stone-500" />
                          <span>Data de Início:</span>
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-800 bg-white outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-stone-500" />
                          <span>Data de Vencimento:</span>
                        </label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-800 bg-white outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                      <span className="text-[11px] font-extrabold text-stone-600 uppercase tracking-wider block">
                        Renovação Rápida da Assinatura:
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddDaysCurrentStore(30)}
                          className="py-2 px-2 rounded-xl bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ 30 Dias</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddDaysCurrentStore(60)}
                          className="py-2 px-2 rounded-xl bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ 60 Dias</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddDaysCurrentStore(365)}
                          className="py-2 px-2 rounded-xl bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ 1 Ano</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-stone-800 block">
                          Forçar Bloqueio Imediato (Manual)
                        </span>
                        <span className="text-[11px] text-stone-500 block">
                          Ative caso queira suspender o site mesmo antes da data de vencimento.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsExpiredManual(!isExpiredManual)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                          isExpiredManual
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                        }`}
                      >
                        {isExpiredManual ? 'Bloqueio Ativo' : 'Desativado'}
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Observações Internas (Cliente / Contrato):
                      </label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ex: Mensalidade paga via Pix referente ao mês de Outubro..."
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-800 bg-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleSaveCurrentStoreSub()}
                      disabled={isSaving}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-4 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-700/25 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Salvando Alterações...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Salvar Dados & Reativar Site</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: DESABILITAR MODO PET */}
              {activeTab === 'pet_mode' && (
                <div className="space-y-5">
                  <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                    isPetModeDisabled
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-blue-50 border-blue-200 text-blue-900'
                  }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      isPetModeDisabled ? 'bg-amber-500 text-stone-950' : 'bg-blue-600 text-white'
                    }`}>
                      {isPetModeDisabled ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs uppercase tracking-wider block">
                          Status do Catálogo:
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                          isPetModeDisabled 
                            ? 'bg-amber-200 text-amber-950 border border-amber-300' 
                            : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                        }`}>
                          {isPetModeDisabled ? 'MODO PET DESABILITADO (OCULTO)' : 'MODO PET HABILITADO (ATIVO)'}
                        </span>
                      </div>
                      <p className="font-extrabold text-sm sm:text-base mt-1 text-stone-900">
                        {isPetModeDisabled
                          ? 'O Modo Pet está Desabilitado no Sistema'
                          : 'O Modo Pet está Ativo no Sistema'}
                      </p>
                      <p className="text-xs mt-1 text-stone-600 leading-relaxed">
                        {isPetModeDisabled
                          ? 'A opção "Tipo de Pet" foi ocultada da Área do Lojista, os filtros por animais foram removidos da página principal e o informativo de ração a granel por kg/reais foi ocultado.'
                          : 'O catálogo funciona como pet shop completo: exibe filtros de animais (cães, gatos, etc.) e ração a granel por kg ou reais.'}
                      </p>
                    </div>
                  </div>

                  {petSuccessMsg && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{petSuccessMsg}</span>
                    </div>
                  )}

                  <div className="p-5 bg-white border border-stone-200 rounded-2xl space-y-4">
                    <button
                      type="button"
                      onClick={handleTogglePetMode}
                      disabled={isSavingPetMode}
                      className={`w-full py-4 px-5 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-98 cursor-pointer ${
                        isPetModeDisabled
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-700/25'
                          : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-700/25'
                      }`}
                    >
                      {isSavingPetMode ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Salvando Alteração...</span>
                        </>
                      ) : isPetModeDisabled ? (
                        <>
                          <Eye className="w-5 h-5" />
                          <span>Reativar Modo Pet</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-5 h-5" />
                          <span>Desabilitar Modo Pet</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: BANCO DE DADOS (FIREBASE) */}
              {activeTab === 'database' && (
                <div className="space-y-5">
                  <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-stone-800 flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-blue-600" />
                        <span>Banco de Dados Conectado no Momento:</span>
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                        hasCustomDb ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {hasCustomDb ? '✓ Banco Próprio Personalizado' : 'Banco Inicial da Loja'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                        <span className="text-[10px] text-stone-400 block font-bold">PROJECT ID</span>
                        <span className="font-mono font-bold text-stone-800 truncate block">{currentConfig.projectId}</span>
                      </div>
                      <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                        <span className="text-[10px] text-stone-400 block font-bold">FIRESTORE DATABASE ID</span>
                        <span className="font-mono font-bold text-stone-800 truncate block">
                          {currentConfig.firestoreDatabaseId || '(default)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-white p-5 rounded-2xl border border-stone-200">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-stone-800 flex items-center gap-1.5">
                        <span>Cole abaixo os dados do novo Firebase:</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleFillSample}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Inserir dados de exemplo (lojabase1-9a4d4)</span>
                      </button>
                    </div>

                    <textarea
                      rows={6}
                      value={dbInputText}
                      onChange={(e) => handleDbInputChange(e.target.value)}
                      placeholder={`Cole aqui no formato:\n{\n  apiKey: "AIzaSy...",\n  authDomain: "lojabase1-9a4d4.firebaseapp.com",\n  projectId: "lojabase1-9a4d4",\n  storageBucket: "lojabase1-9a4d4.firebasestorage.app",\n  messagingSenderId: "1094336366479",\n  appId: "1:1094336366479:web:f7acb05482ccf71707adfa",\n  measurementId: "G-9L3Z7GYPQD"\n};`}
                      className="w-full p-3 rounded-xl border border-stone-300 font-mono text-xs bg-stone-50 text-stone-900 outline-none focus:border-blue-500"
                    />

                    {parseError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in mt-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{parseError}</span>
                      </div>
                    )}

                    {dbSuccessMsg && (
                      <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in mt-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{dbSuccessMsg}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => window.location.reload()}
                          className="px-3 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0 hover:bg-emerald-800 cursor-pointer"
                        >
                          Recarregar Loja Agora
                        </button>
                      </div>
                    )}

                    {parsedConfig && formattedJsonOutput && (
                      <div className="space-y-2 p-3.5 bg-stone-900 text-white rounded-2xl border border-stone-800 animate-in fade-in mt-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                            <Check className="w-4 h-4" />
                            <span>Convertido com Sucesso para firebase-applet-config.json:</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleCopyJson}
                              className="text-[11px] bg-stone-800 hover:bg-stone-700 text-stone-200 px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                            >
                              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copied ? 'Copiado!' : 'Copiar JSON'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleDownloadJsonFile}
                              className="text-[11px] bg-stone-800 hover:bg-stone-700 text-stone-200 px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                              <span>Baixar Arquivo</span>
                            </button>
                          </div>
                        </div>

                        <pre className="font-mono text-[11px] leading-relaxed text-stone-300 bg-stone-950 p-3 rounded-xl overflow-x-auto max-h-48 border border-stone-800">
                          {formattedJsonOutput}
                        </pre>
                      </div>
                    )}

                    <div className="space-y-2 pt-2">
                      <button
                        type="button"
                        onClick={handleSaveDatabaseConfig}
                        disabled={!parsedConfig || isSavingDb}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-4 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-700/25 active:scale-98 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                      >
                        {isSavingDb ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Atualizando Banco de Dados...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Salvar no Arquivo firebase-applet-config.json & Ativar</span>
                          </>
                        )}
                      </button>

                      {hasCustomDb && (
                        <button
                          type="button"
                          onClick={handleRestoreDefaultDatabase}
                          className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                          <span>Restaurar Banco de Dados Padrão Original</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {/* MODAL DE DETALHES DA LOJA (ABERTO AO CLICAR NA LINHA DA LOJA) */}
      {selectedStoreModal && (() => {
        const store = selectedStoreModal;
        const form = storeFormState[store.lojaId] || {
          storeName: store.storeName,
          phone: store.phone,
          address: store.address,
          dueDate: store.dueDate,
          notes: store.notes,
          monthlyFee: store.monthlyFee,
          isExpiredManualOverride: store.isExpiredManualOverride || false,
        };

        const statusCheck = checkIsSubscriptionExpired({
          id: store.lojaId,
          monthlyFee: form.monthlyFee,
          startDate: store.startDate || '',
          dueDate: form.dueDate,
          isExpiredManualOverride: form.isExpiredManualOverride,
        });

        return (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 bg-stone-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
            <div className="bg-white max-w-2xl w-full rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto animate-in zoom-in-95 max-h-[92vh] flex flex-col">
              
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/30">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-base sm:text-lg">
                        {form.storeName || store.storeName}
                      </h4>
                      <span className="font-mono text-xs bg-stone-800 text-amber-400 px-2.5 py-0.5 rounded-lg border border-stone-700 font-bold">
                        {store.lojaId}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400">
                      Painel de controle, vencimento e dados da loja
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyStoreId(store.lojaId)}
                    className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
                    title="Copiar ID da Loja"
                  >
                    {copiedStoreId === store.lojaId ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStoreModal(null)}
                    className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
                    title="Fechar Detalhes"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                
                {/* Status Banner */}
                <div className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${
                  statusCheck.isExpired 
                    ? 'bg-rose-50 border-rose-200 text-rose-950' 
                    : statusCheck.daysRemaining <= 5
                      ? 'bg-amber-50 border-amber-200 text-amber-950'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                }`}>
                  <div className="flex items-start gap-2.5">
                    {statusCheck.isExpired ? (
                      <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs uppercase tracking-wider block">
                          Status do Site:
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                          statusCheck.isExpired 
                            ? 'bg-rose-200 text-rose-900 border border-rose-300' 
                            : 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                        }`}>
                          {statusCheck.isExpired ? 'SITE BLOQUEADO (EXPIRADO)' : 'SITE ATIVO & LIBERADO'}
                        </span>
                      </div>
                      <p className="text-xs mt-1 leading-relaxed font-medium">
                        {statusCheck.isExpired
                          ? 'O prazo desta loja expirou. Os clientes finais estão vendo a tela centralizada "Site Expirado. Falar com Administrador". Altere a data de vencimento abaixo para reativar.'
                          : `Vencimento programado para ${statusCheck.formattedDueDate} (${statusCheck.daysRemaining} dias restantes).`}
                      </p>
                    </div>
                  </div>

                  <a
                    href={`/?loja=${store.lojaId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 flex items-center gap-1.5 shrink-0 shadow-2xs transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                    <span>Abrir Loja</span>
                  </a>
                </div>

                {/* Form Fields: Store Name, Phone, Address */}
                <div className="bg-stone-50/70 p-4 rounded-2xl border border-stone-200 space-y-3">
                  <h5 className="font-extrabold text-xs text-stone-700 uppercase tracking-wider">
                    Dados da Loja
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Nome da Loja:
                      </label>
                      <input
                        type="text"
                        value={form.storeName}
                        onChange={(e) => setStoreFormState(prev => ({
                          ...prev,
                          [store.lojaId]: { ...prev[store.lojaId], storeName: e.target.value }
                        }))}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-900 outline-none focus:border-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Telefone (WhatsApp):
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={form.phone}
                          onChange={(e) => setStoreFormState(prev => ({
                            ...prev,
                            [store.lojaId]: { ...prev[store.lojaId], phone: e.target.value }
                          }))}
                          placeholder="44999999999"
                          className="flex-1 px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-900 outline-none focus:border-blue-500 bg-white"
                        />
                        {form.phone && (
                          <a
                            href={`https://wa.me/${form.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 transition-colors"
                          >
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Endereço Físico:
                    </label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => setStoreFormState(prev => ({
                        ...prev,
                        [store.lojaId]: { ...prev[store.lojaId], address: e.target.value }
                      }))}
                      placeholder="Endereço da loja"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-900 outline-none focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                {/* Vencimento & Renovação */}
                <div className="bg-stone-50/70 p-4 rounded-2xl border border-stone-200 space-y-3">
                  <h5 className="font-extrabold text-xs text-stone-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Controle de Mensalidade & Vencimento</span>
                    <span className="text-[11px] font-bold text-blue-600">
                      R$ {(form.monthlyFee || 0).toFixed(2).replace('.', ',')} / mês
                    </span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-stone-500" />
                        <span>Data de Vencimento:</span>
                      </label>
                      <input
                        type="date"
                        value={form.dueDate}
                        onChange={(e) => setStoreFormState(prev => ({
                          ...prev,
                          [store.lojaId]: { ...prev[store.lojaId], dueDate: e.target.value }
                        }))}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-900 outline-none focus:border-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-stone-500" />
                        <span>Valor Mensal (R$):</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.monthlyFee}
                        onChange={(e) => setStoreFormState(prev => ({
                          ...prev,
                          [store.lojaId]: { ...prev[store.lojaId], monthlyFee: parseFloat(e.target.value) || 0 }
                        }))}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold text-stone-900 outline-none focus:border-blue-500 bg-white"
                      />
                    </div>
                  </div>

                  {/* Botões Rápidos de Renovação */}
                  <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-2">
                    <span className="text-[11px] font-bold text-stone-600 block">
                      Renovação Rápida (+ Dias):
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddDaysStore(store.lojaId, 30)}
                        className="py-2 px-2 bg-stone-50 hover:bg-blue-50 border border-stone-200 text-blue-700 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer text-center"
                      >
                        + 30 Dias
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddDaysStore(store.lojaId, 60)}
                        className="py-2 px-2 bg-stone-50 hover:bg-blue-50 border border-stone-200 text-blue-700 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer text-center"
                      >
                        + 60 Dias
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddDaysStore(store.lojaId, 365)}
                        className="py-2 px-2 bg-stone-50 hover:bg-blue-50 border border-stone-200 text-blue-700 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer text-center"
                      >
                        + 1 Ano
                      </button>
                    </div>
                  </div>

                  {/* Manual Lock Toggle */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-200 gap-3">
                    <div>
                      <span className="text-xs font-bold text-stone-800 block">
                        Forçar Bloqueio Manual do Site
                      </span>
                      <span className="text-[11px] text-stone-500 block">
                        Ative caso queira suspender o site mesmo antes da data de vencimento.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStoreFormState(prev => ({
                        ...prev,
                        [store.lojaId]: {
                          ...prev[store.lojaId],
                          isExpiredManualOverride: !prev[store.lojaId]?.isExpiredManualOverride
                        }
                      }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 ${
                        form.isExpiredManualOverride
                          ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                          : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
                      }`}
                    >
                      {form.isExpiredManualOverride ? 'Bloqueio Ativo' : 'Desativado'}
                    </button>
                  </div>
                </div>

                {/* Observações */}
                <div className="bg-stone-50/70 p-4 rounded-2xl border border-stone-200 space-y-2">
                  <label className="block text-xs font-bold text-stone-700 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-stone-500" />
                    <span>Observações Editáveis (Cliente / Contrato / Pagamentos):</span>
                  </label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setStoreFormState(prev => ({
                      ...prev,
                      [store.lojaId]: { ...prev[store.lojaId], notes: e.target.value }
                    }))}
                    placeholder="Ex: Mensalidade paga via Pix dia 10. Contrato renovado..."
                    className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-medium text-stone-900 outline-none focus:border-blue-500 bg-white leading-relaxed"
                  />
                </div>

                {/* Feedback */}
                {form.successMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{form.successMsg}</span>
                  </div>
                )}
                {form.errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{form.errorMsg}</span>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 bg-stone-100 border-t border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setStoreToDelete(store)}
                  className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="Excluir todos os dados desta loja do Firestore para liberar espaço"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Excluir Loja & Liberar Banco</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStoreModal(null)}
                    className="px-4 py-3 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-200/60 transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveStoreChanges(store.lojaId)}
                    disabled={form.isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-3 rounded-xl text-xs shadow-md shadow-blue-700/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {form.isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Salvando Loja...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Salvar Alterações da Loja</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE DADOS POR LOJAID */}
      {storeToDelete && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 bg-stone-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-7 shadow-2xl border border-stone-200 space-y-5 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center shadow-inner">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <span className="bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full inline-block">
                Ação Irreversível
              </span>
              <h3 className="font-extrabold text-stone-900 text-lg">
                Excluir Todos os Dados da Loja?
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Você solicitou apagar permanentemente do Firestore todos os dados associados a:
              </p>
              <div className="p-3 bg-stone-100 rounded-xl font-mono text-xs font-black text-stone-900">
                lojaId: "{storeToDelete.lojaId}" ({storeToDelete.storeName})
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 space-y-2 text-xs text-rose-900">
              <p className="font-extrabold text-[11px] uppercase tracking-wide flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>O que será apagado no Firestore:</span>
              </p>
              <ul className="space-y-1 list-disc list-inside text-[11px] text-rose-800 pl-1 font-medium">
                <li>Todos os produtos catalogados desta loja</li>
                <li>Todas as categorias e cupons criados</li>
                <li>Histórico de pedidos e configurações da loja</li>
                <li>Assinatura e registros de cobrança</li>
              </ul>
              <p className="text-[10px] text-rose-700 pt-1 font-semibold">
                Essa ação liberará espaço no banco de dados e não poderá ser desfeita.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStoreToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 rounded-xl border border-stone-300 text-stone-700 font-extrabold text-xs hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStore}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Limpando Firestore...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Sim, Excluir Definitivamente</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
