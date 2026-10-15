// Desktop wrapper for the game (Electron). Serves the Vite build from an app://
// protocol so module scripts, fetch() and audio behave exactly as on the web.
// Run:      npm run app
// Package:  npm run package:win   (or package:linux)
const { app, BrowserWindow, protocol, net, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..', 'dist');
const SMOKE = process.argv.includes('--smoke');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

// Autoplay is fine in a desktop app: the reader already chose to open it.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Steam: connects only when an app ID is given, by the STEAM_APP_ID variable or a
// steam_appid.txt next to the executable. Test builds use 480 (Valve's "Spacewar"
// test app) until the game has its own ID. Without Steam the game runs normally.
function steamAppId() {
  if (process.env.STEAM_APP_ID) return Number(process.env.STEAM_APP_ID);
  for (const dir of [path.dirname(process.execPath), process.cwd()]) {
    try { return Number(fs.readFileSync(path.join(dir, 'steam_appid.txt'), 'utf8').trim()); } catch {}
  }
  return null;
}
const STEAM_ID = steamAppId();
let steamworks = null;
let steamStatus = { connected: false, reason: 'no Steam app ID' };
if (STEAM_ID) {
  try {
    steamworks = require('steamworks.js');
    steamworks.electronEnableSteamOverlay(); // must run before the app is ready
  } catch (e) {
    steamStatus = { connected: false, appId: STEAM_ID, reason: `Steam library failed to load: ${e.message}` };
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 450,
    backgroundColor: '#efe9da',
    title: 'Frankenstein',
    autoHideMenuBar: true,
    show: !SMOKE,
    webPreferences: { contextIsolation: true, sandbox: true, preload: path.join(__dirname, 'preload.cjs') },
  });
  win.setMenu(null);
  // F11 toggles fullscreen; everything else is handled by the page.
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    }
  });
  win.loadURL('app://game/index.html');
  return win;
}

app.whenReady().then(() => {
  if (steamworks) {
    try {
      const client = steamworks.init(STEAM_ID);
      steamStatus = { connected: true, appId: STEAM_ID, user: client.localplayer.getName() };
    } catch (e) {
      steamStatus = { connected: false, appId: STEAM_ID, reason: `Steam isn't running or refused the connection (${e.message})` };
    }
  }
  ipcMain.handle('steam-status', () => steamStatus);

  protocol.handle('app', (req) => {
    const rel = decodeURIComponent(new URL(req.url).pathname);
    const file = path.normalize(path.join(ROOT, rel));
    if (!file.startsWith(ROOT)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  createWindow();
});

app.on('window-all-closed', () => app.quit());
