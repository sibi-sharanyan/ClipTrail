import create from 'zustand';

export interface IClipboardItem {
  id: string;
  content: string;
  type: string;
  isPinned: boolean;
}

export interface ISettings {
  portNumber: number;
  selectedShortcut: string;
}

interface IMainStore {
  clipboardItems: IClipboardItem[];
  setClipboardItems(items: IClipboardItem[]): void;
  settings: ISettings;
  setSettings(settings: ISettings): void;
}

export default create<IMainStore>((set) => ({
  clipboardItems: [],
  setClipboardItems: (items) =>
    set((state) => ({
      clipboardItems: [...items],
    })),
  settings: {
    portNumber: 3000,
    selectedShortcut: 'CommandOrControl+Shift+C',
  },
  setSettings: (settings) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ...settings,
      },
    })),
}));
