import create from 'zustand';

export interface IClipboardItem {
  id: string;
  content: string;
  type: string;
  isPinned: boolean;
}

interface IMainStore {
  clipboardItems: IClipboardItem[];
  setClipboardItems(items: IClipboardItem[]): void;
}

export default create<IMainStore>((set) => ({
  clipboardItems: [],
  setClipboardItems: (items) =>
    set((state) => ({
      clipboardItems: [...items],
    })),
}));
