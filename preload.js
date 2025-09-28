
const { contextBridge, ipcRenderer } = require('electron');
console.log('✅ Preload loaded:', __filename);

contextBridge.exposeInMainWorld('api', {
  getPAT: () => ipcRenderer.invoke('pat:get'),
  savePAT: (pat) => ipcRenderer.invoke('pat:save', pat),
  clearPAT: () => ipcRenderer.invoke('pat:clear'),
  fetchMyWork: (jiraUrl, project, issuetype, user) => ipcRenderer.invoke('jira:fetchMyWork', { jiraUrl, project, issuetype, user }),
});

ipcRenderer.invoke('pat:get').then(p => {
  console.log("PAT from storage:", p);
  return p;
});
