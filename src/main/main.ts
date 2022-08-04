/* eslint global-require: off, no-console: off, promise/always-return: off */

import path from 'path';
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  globalShortcut,
  nativeImage,
  clipboard,
  Tray,
  Menu,
} from 'electron';
import extendedClipboard from 'electron-clipboard-extended';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import sha1 from 'crypto-js/sha1';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs, existsSync, mkdirSync } from 'fs';
import express from 'express';
import Store from 'electron-store';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

const store = new Store();

let isWindowHidden = false;
const expressApp = express();
const port = store.get('port') || 3800;
// const clipboardItemsLimit = Number(store.get('clipboard-limit')) || 30;
const clipboardItemsLimit = 30;

const imageCachePath = path.join(app.getPath('pictures'), 'image_cache');

console.log('imageCachePath', imageCachePath);

const checkPath = async (dirPath: string): Promise<void> => {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath);
  }
};

checkPath(imageCachePath);

expressApp.use(express.static(imageCachePath));

expressApp.listen(port, () => {
  console.log(`Image server listening on port ${port}`);
});

interface IClipboardItem {
  id: string;
  type: string;
  content: string;
  thumbnail?: string;
  thumbnailPath?: string;
  hash: string;
  imagePath?: string;
  isPinned: boolean;
}

const clipboardStoreCache = (store.get('clipboard-store') ||
  []) as IClipboardItem[];

let clipboardStore: IClipboardItem[] = clipboardStoreCache || [];

let mostRecentlyCopiedClipboardItemHash = '';
export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

ipcMain.handle('copy-to-clipboard', async (event, data) => {
  const { id, type } = data;

  console.log('copy-to-clipboard', data);

  if (clipboardStore.length === 0) {
    return;
  }

  const clipboardItem = clipboardStore.find((item) => item.id === id);

  mostRecentlyCopiedClipboardItemHash =
    clipboardItem?.hash || mostRecentlyCopiedClipboardItemHash;

  if (!clipboardItem) {
    return;
  }

  if (type === 'text') {
    clipboard.writeText(clipboardItem.content as string);
  } else {
    const { imagePath } = clipboardItem;
    if (imagePath) {
      const imageBuffer = await fs.readFile(imagePath);
      const convertedImage = nativeImage.createFromBuffer(imageBuffer);
      clipboard.writeImage(convertedImage);
    }
  }
});

const handleImageItemToBeDeleted = (
  itemToBeDeleted: IClipboardItem | undefined
) => {
  if (itemToBeDeleted?.type === 'image' && itemToBeDeleted.imagePath) {
    try {
      fs.unlink(itemToBeDeleted.imagePath);

      if (itemToBeDeleted.thumbnailPath) {
        fs.unlink(itemToBeDeleted.thumbnailPath);
      }
    } catch (error) {
      console.log('error', error);
    }
  }
};

const sendClipboardStoreToMainWindow = (): void => {
  let noOfItemsToBeDeleted = clipboardStore.length - clipboardItemsLimit;

  const itemsToBeDeleted: IClipboardItem[] = [];

  clipboardStore.forEach((item) => {
    if (!item.isPinned && noOfItemsToBeDeleted > 0) {
      itemsToBeDeleted.push(item);
      noOfItemsToBeDeleted -= 1;
    }
  });

  clipboardStore = clipboardStore.filter(
    (item) => !itemsToBeDeleted.find(({ id }) => id === item.id)
  );

  mainWindow?.webContents.send('clipboard-changed', clipboardStore);
  store.set('clipboard-store', clipboardStore);

  itemsToBeDeleted.forEach((item) => {
    handleImageItemToBeDeleted(item);
  });
};

ipcMain.handle('pin-item', async (event, data) => {
  const { id, type } = data;

  const clipboardItem = clipboardStore.find((item) => item.id === id);

  if (!clipboardItem) {
    return;
  }

  clipboardItem.isPinned = !clipboardItem.isPinned;

  sendClipboardStoreToMainWindow();
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDevelopment =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDevelopment) {
  require('electron-debug')();
}

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../../assets');

const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDevelopment) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 350,
    height: 480,
    icon: getAssetPath('icon.png'),
    titleBarStyle: 'default',
    acceptFirstMouse: true,
    frame: false,
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  settingsWindow = new BrowserWindow({
    show: false,
    width: 400,
    height: 640,
    icon: getAssetPath('icon.png'),
    titleBarStyle: 'default',
    acceptFirstMouse: true,
    frame: true,
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));
  settingsWindow.loadURL(resolveHtmlPath('index.html'));
  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.setResizable(false);
  settingsWindow.setResizable(false);
  mainWindow.setMinimizable(false);
  settingsWindow.setMinimizable(false);

  settingsWindow.on('close', (e) => {
    e.preventDefault();
    settingsWindow?.hide();
  });

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      if (clipboardStore.length > 0) {
        sendClipboardStoreToMainWindow();
      }
    }
  });

  settingsWindow.on('ready-to-show', () => {
    if (!settingsWindow) {
      throw new Error('"settingsWindow" is not defined');
    }

    const settings = {
      portNumber: store.get('port'),
      selectedShortcut: store.get('shortcut'),
      clipboardItemsLimit: store.get('clipboard-limit'),
    };

    settingsWindow?.webContents.send('populate-settings', {
      settings,
      navigateToSettingsPage: true,
    });
    mainWindow?.webContents.send('populate-settings', { settings });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

const moveExistingClipboardItemToEnd = (hash: string): void => {
  if (hash === mostRecentlyCopiedClipboardItemHash) {
    mostRecentlyCopiedClipboardItemHash = '';
    return;
  }

  const clipboardItem = clipboardStore.find((item) => item.hash === hash);
  if (clipboardItem) {
    clipboardStore.splice(clipboardStore.indexOf(clipboardItem), 1);
    clipboardStore.push(clipboardItem);
  }
  sendClipboardStoreToMainWindow();
};

extendedClipboard
  .on('text-changed', () => {
    const id = uuidv4();
    const content = clipboard.readText();

    if (content.trim() === '') {
      return;
    }

    const hash = sha1(content).toString();

    if (!clipboardStore.find((item) => item.hash === hash)) {
      clipboardStore.push({
        id,
        content,
        hash: sha1(content).toString(),
        isPinned: false,
        type: 'text',
      });

      sendClipboardStoreToMainWindow();
    } else {
      moveExistingClipboardItemToEnd(hash);
    }
  })
  .on('image-changed', async () => {
    const id = uuidv4();
    const image = extendedClipboard.readImage();

    const content = image.toDataURL();
    const hash = sha1(content).toString();

    if (!clipboardStore.find((item) => item.hash === hash)) {
      const imagePath = `${imageCachePath}/${id}.png`;
      const thumbnailPath = `${imageCachePath}/${id}-thumbnail.jpeg`;

      fs.writeFile(imagePath, image.toPNG());

      await fs.writeFile(thumbnailPath, image.toJPEG(10));

      clipboardStore.push({
        id,
        content: `http://localhost:${port}/${id}.png`,
        thumbnail: `http://localhost:${port}/${id}-thumbnail.jpeg`,
        imagePath,
        hash,
        thumbnailPath,
        isPinned: false,
        type: 'image',
      });

      sendClipboardStoreToMainWindow();
    } else {
      moveExistingClipboardItemToEnd(hash);
    }
  })
  .startWatching();

app.dock.hide();

const deleteClioboardItem = async (
  event: Electron.IpcMainInvokeEvent,
  data: {
    id: string;
  }
): Promise<void> => {
  const { id } = data;

  const itemToBeDeleted = clipboardStore.find((item) => item.id === id);

  handleImageItemToBeDeleted(itemToBeDeleted);

  clipboardStore = clipboardStore.filter((item) => item.id !== id);
  sendClipboardStoreToMainWindow();
};

const clearAllClipboardItems = (event: Electron.IpcMainInvokeEvent): void => {
  const imagesToBeDeleted = clipboardStore.filter(
    (item) => item.type === 'image' && !item.isPinned
  );

  imagesToBeDeleted.map((item) => {
    handleImageItemToBeDeleted(item);
    return undefined;
  });

  clipboardStore = clipboardStore.filter((item) => item.isPinned);
  sendClipboardStoreToMainWindow();
};

const settingUpdated = (event: Electron.IpcMainInvokeEvent, data): void => {
  console.log('settings updated', data);
  store.set('port', data.portNumber);
  store.set('shortcut', data.selectedShortcut);

  if (data.clipboardItemsLimit >= 20 && data.clipboardItemsLimit <= 100) {
    store.set('clipboard-limit', data.clipboardItemsLimit);
  }

  console.log('store.get', store.get('port'));

  app.relaunch();
  app.exit(0);
};

ipcMain.handle('delete-clipboard-item', deleteClioboardItem);
ipcMain.handle('clear-all-clipboard-items', clearAllClipboardItems);
ipcMain.handle('settings-updated', settingUpdated);

let tray = null;

app
  .whenReady()
  .then(() => {
    const image = nativeImage.createFromPath(getAssetPath('mycake.png'));

    tray = new Tray(image.resize({ width: 16, height: 16 }));
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Toggle Clipboard',
        click: () => {
          if (isWindowHidden) {
            mainWindow?.show();
          } else {
            mainWindow?.hide();
          }
          isWindowHidden = !isWindowHidden;
        },
      },
      {
        label: 'Settings',
        click: () => {
          settingsWindow?.show();
        },
      },
      {
        label: 'Quit',
        click: () => {
          app.exit(0);
        },
      },
    ]);
    tray.setToolTip('This is my application.');
    tray.setContextMenu(contextMenu);
    globalShortcut.register(
      (store.get('shortcut') || 'Command+i') as string,
      () => {
        if (isWindowHidden) {
          mainWindow?.show();
        } else {
          mainWindow?.hide();
        }
        isWindowHidden = !isWindowHidden;
      }
    );
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
