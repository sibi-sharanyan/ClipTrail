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
import { promises as fs } from 'fs';
import express from 'express';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

let isWindowHidden = false;
const expressApp = express();
const port = 3800;
expressApp.use(express.static('image_cache'));

expressApp.listen(port, () => {
  console.log(`Image server listening on port ${port}`);
});

interface IClipboardItem {
  id: string;
  type: string;
  content: string;
  hash: string;
  image?: Electron.NativeImage;
  isPinned: boolean;
}

let clipboardStore: IClipboardItem[] = [];

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

ipcMain.handle('copy-to-clipboard', async (event, data) => {
  const { id, type } = data;

  console.log('copy-to-clipboard', data);

  if (clipboardStore.length === 0) {
    return;
  }

  const clipboardItem = clipboardStore.find((item) => item.id === id);

  if (!clipboardItem) {
    return;
  }

  if (type === 'text') {
    clipboard.writeText(clipboardItem.content as string);
  } else {
    clipboard.writeImage(clipboardItem.image as Electron.NativeImage);
  }
});

ipcMain.handle('pin-item', async (event, data) => {
  const { id, type } = data;

  const clipboardItem = clipboardStore.find((item) => item.id === id);

  if (!clipboardItem) {
    return;
  }

  clipboardItem.isPinned = !clipboardItem.isPinned;

  mainWindow?.webContents.send('clipboard-changed', clipboardStore);
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
    frame: true,
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

      mainWindow?.webContents.send('clipboard-changed', clipboardStore);
    }
  })
  .on('image-changed', async () => {
    const id = uuidv4();
    const image = extendedClipboard.readImage();

    console.log(
      'app-path',
      app.getAppPath(),
      app.getPath('pictures'),
      path.join(app.getAppPath(), '..', '..', 'assets')
    );
    fs.writeFile(
      `${path.join(app.getAppPath(), '..', '..', 'image_cache')}/${id}.png`,
      image.toPNG()
    );

    const resizedImage = image.resize({
      quality: 'good',
    });

    const content = resizedImage.toDataURL();
    const hash = sha1(content).toString();

    if (!clipboardStore.find((item) => item.hash === hash)) {
      clipboardStore.push({
        id,
        content: `http://localhost:${port}/${id}.png`,
        hash: sha1(content).toString(),
        isPinned: false,
        image,
        type: 'image',
      });

      mainWindow?.webContents.send('clipboard-changed', clipboardStore);
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
  const { id } = data;

  clipboardStore = clipboardStore.filter((item) => item.id !== id);
  mainWindow?.webContents.send('clipboard-changed', clipboardStore);
};

const clearAllClipboardItems = (event: Electron.IpcMainInvokeEvent): void => {
  clipboardStore = clipboardStore.filter((item) => item.isPinned);
  mainWindow?.webContents.send('clipboard-changed', clipboardStore);
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
