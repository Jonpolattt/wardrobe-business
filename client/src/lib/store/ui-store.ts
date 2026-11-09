import { create } from 'zustand';

export type ModalKind = 'product' | 'batch' | 'help' | null;
export interface PendingDelete {
  kind: 'batch' | 'product';
  id: string;
  name: string;
}

interface UiState {
  popover: string;
  modal: ModalKind;
  targetBatch: string | null;
  toast: string;
  pendingDelete: PendingDelete | null;
  confirmLogout: boolean;
  /** purchase id shown in the product view modal */
  viewedPurchaseId: string | null;
  selectedProducts: string[];
  selectedBatches: string[];
  query: string;
  category: string;
  period: string;
  chartPeriod: string;
  sidebarHovered: boolean;
  sidebarFocused: boolean;
  hoverSuppressed: boolean;
  setPopover: (value: string) => void;
  togglePopover: (name: string) => void;
  setModal: (modal: ModalKind, targetBatch?: string | null) => void;
  setToast: (toast: string) => void;
  setPendingDelete: (value: PendingDelete | null) => void;
  setConfirmLogout: (value: boolean) => void;
  setViewedPurchase: (id: string | null) => void;
  setSelectedProducts: (update: (list: string[]) => string[]) => void;
  setSelectedBatches: (update: (list: string[]) => string[]) => void;
  clearSelection: () => void;
  set: (patch: Partial<UiState>) => void;
}

/** Transient interface state shared between components (not persisted). */
export const useUi = create<UiState>((set) => ({
  popover: '',
  modal: null,
  targetBatch: null,
  toast: '',
  pendingDelete: null,
  confirmLogout: false,
  viewedPurchaseId: null,
  selectedProducts: [],
  selectedBatches: [],
  query: '',
  category: 'All categories',
  period: 'Last 30 days',
  chartPeriod: 'Monthly',
  sidebarHovered: false,
  sidebarFocused: false,
  hoverSuppressed: false,
  setPopover: (popover) => set({ popover }),
  togglePopover: (name) => set((s) => ({ popover: s.popover === name ? '' : name })),
  setModal: (modal, targetBatch = null) => set({ modal, targetBatch }),
  setToast: (toast) => set({ toast }),
  setPendingDelete: (pendingDelete) => set({ pendingDelete }),
  setConfirmLogout: (confirmLogout) => set({ confirmLogout }),
  setViewedPurchase: (viewedPurchaseId) => set({ viewedPurchaseId }),
  setSelectedProducts: (update) => set((s) => ({ selectedProducts: update(s.selectedProducts) })),
  setSelectedBatches: (update) => set((s) => ({ selectedBatches: update(s.selectedBatches) })),
  clearSelection: () => set({ selectedProducts: [], selectedBatches: [] }),
  set: (patch) => set(patch),
}));
