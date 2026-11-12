const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rotator', {
  applyProxy: cfg => ipcRenderer.invoke('browser:proxy', cfg),
  reloadBrowser: () => ipcRenderer.invoke('browser:reload'),
  startLoop: options => ipcRenderer.invoke('automation:start', options),
  stopLoop: () => ipcRenderer.invoke('automation:stop'),
  getStatus: () => ipcRenderer.invoke('browser:status'),
  listProfiles: () => ipcRenderer.invoke('profiles:list'),
  openProfile: profileId => ipcRenderer.invoke('profiles:open', profileId),
  createAndOpenProfile: name => ipcRenderer.invoke('profiles:create-and-open', name),
  setGithubRepository: repository => ipcRenderer.invoke('settings:github-repository', repository),
  setGithubQuietThreshold: minutes => ipcRenderer.invoke('settings:github-quiet-threshold', minutes),
  setGithubPollIntervalSeconds: seconds => ipcRenderer.invoke('settings:github-poll-interval', seconds),
  setGithubToken: token => ipcRenderer.invoke('settings:github-token-save', token),
  clearGithubToken: () => ipcRenderer.invoke('settings:github-token-clear'),
  setAssistantCompletionMarker: marker => ipcRenderer.invoke('settings:assistant-completion-marker', marker),
  onProgress: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('automation:progress', listener);
    return () => ipcRenderer.removeListener('automation:progress', listener);
  }
});
