import create from 'zustand';

export interface IClipboardItem {
  content: string;
  type: string;
}

interface IMainStore {
  clipboardItems: IClipboardItem[];
  addClipboardItem(item: IClipboardItem): void;
}

export default create<IMainStore>((set) => ({
  clipboardItems: [],
  addClipboardItem: (item) =>
    set((state) => ({
      clipboardItems: [item, ...state.clipboardItems],
    })),
}));
