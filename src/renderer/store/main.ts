import create from 'zustand';

export interface IClipboardItem {
  id: string;
  content: string;
  type: string;
}

interface IMainStore {
  clipboardItems: IClipboardItem[];
  addClipboardItem(item: IClipboardItem): void;
  deleteClioboardItem(itemId: string): void;
  clearAllClipboardItems(): void;
}

export default create<IMainStore>((set) => ({
  clipboardItems: [],
  addClipboardItem: (item) =>
    set((state) => ({
      clipboardItems: [item, ...state.clipboardItems],
    })),
  deleteClioboardItem: (itemId) =>
    set((state) => ({
      clipboardItems: state.clipboardItems.filter((item) => item.id !== itemId),
    })),
  clearAllClipboardItems: () =>
    set((state) => ({
      clipboardItems: [],
    })),
}));
