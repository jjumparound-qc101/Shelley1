// Exposes the few desktop-only facts the page needs, without giving it Node access.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  steamStatus: () => ipcRenderer.invoke('steam-status'),
});
