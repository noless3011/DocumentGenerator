// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import {contextBridge, ipcRenderer} from 'electron'

contextBridge.exposeInMainWorld('myAPI', {
  selectFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
  readFileAsBase64: (path: string) => ipcRenderer.invoke('file:readFileAsBase64', path),
  readFileAsText: (path: string) => ipcRenderer.invoke('file:readFileAsText', path),
  saveFile: (path: string, content: string) => ipcRenderer.invoke('file:saveFile', path, content)
  
})
