/* eslint global-require: off, no-console: off, promise/always-return: off */

import path from 'path';
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  globalShortcut,
  clipboard,
} from 'electron';
import extendedClipboard from 'electron-clipboard-extended';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import sha1 from 'crypto-js/sha1';
import { v4 as uuidv4 } from 'uuid';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

let isWindowHidden = false;

let clipboardStore: {
  [key: string]: string | Electron.NativeImage;
} = {};

let hashes: string[] = [];

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

ipcMain.handle('copy-to-clipboard', async (event, someArgument) => {
  const { id, type } = someArgument;

  if (type === 'text') {
    clipboard.writeText(clipboardStore[id] as string);
  } else {
    clipboard.writeImage(clipboardStore[id] as Electron.NativeImage);
  }
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

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 350,
    height: 480,
    icon: getAssetPath('icon.png'),
    titleBarStyle: 'default',
    acceptFirstMouse: true,
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));
  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.setResizable(false);
  mainWindow.setMinimizable(false);
  // mainWindow.setClosable(false);
  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
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

const isContentAlreadyOnClipboard = (content: string) => {
  const hash = sha1(content).toString();
  const isHashPresent = hashes.includes(hash);

  if (isHashPresent) {
    return true;
    console.log('already present');
  }

  hashes.push(hash);

  return false;
};

extendedClipboard
  .on('text-changed', () => {
    const id = uuidv4();
    const content = clipboard.readText();

    if (!isContentAlreadyOnClipboard(content)) {
      clipboardStore[id] = content;

      mainWindow?.webContents.send('clipboard-changed', {
        id,
        content,
        type: 'text',
      });
    }
  })
  .on('image-changed', async () => {
    const id = uuidv4();
    const image = extendedClipboard.readImage();

    const resizedImage = image.resize({
      quality: 'good',
    });

    const content = resizedImage.toDataURL();

    if (!isContentAlreadyOnClipboard(content)) {
      clipboardStore[id] = image;

      mainWindow?.webContents.send('clipboard-changed', {
        id,
        content,
        type: 'image',
      });
    }
  })
  .startWatching();

app.dock.hide();

const deleteClioboardItem = (
  event: Electron.IpcMainInvokeEvent,
  data: {
    id: string;
  }
): void => {
  const hash = sha1(clipboardStore[data.id] as string).toString();

  delete clipboardStore[data.id];

  hashes = hashes.filter((h) => h !== hash);
  console.log('clipboardStore', clipboardStore);
};

const clearAllClipboardItems = (event: Electron.IpcMainInvokeEvent): void => {
  clipboardStore = {};
  hashes = [];
};

ipcMain.handle('delete-clipboard-item', deleteClioboardItem);
ipcMain.handle('clear-all-clipboard-items', clearAllClipboardItems);

app
  .whenReady()
  .then(() => {
    globalShortcut.register('CommandOrControl+I', () => {
      if (isWindowHidden) {
        mainWindow?.show();
      } else {
        mainWindow?.hide();
      }
      isWindowHidden = !isWindowHidden;
    });
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
