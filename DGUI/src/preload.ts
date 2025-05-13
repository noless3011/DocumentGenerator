// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require('electron');

interface Project {
  id: string;
  base_dir: string;
  // Add other properties as needed
}

interface ProcessedFiles {
  markdown: string[];
  image: string[];
  json: string[];
  html: string[]; // Added html
}

// Simple logging to verify preload is running
console.log('Preload script is running');

contextBridge.exposeInMainWorld('myAPI', {
  selectFolder: (): Promise<string> => ipcRenderer.invoke('dialog:openDirectory'),
  readFileAsBase64: (path: string): Promise<string> => ipcRenderer.invoke('file:readFileAsBase64', path),
  readFileAsText: (path: string): Promise<string> => ipcRenderer.invoke('file:readFileAsText', path),
  readJsonFile: (path: string): Promise<any> => ipcRenderer.invoke('file:readJsonFile', path),
  saveFile: (path: string, content: string): Promise<void> => ipcRenderer.invoke('file:saveFile', path, content),
  // Use the correct IPC channel name that matches the main process handler
  getProcessedFilesFromProject: (project: Project): Promise<ProcessedFiles> => 
    ipcRenderer.invoke('view:processedFileFromProject', project),
  watchFile: (filePath: string): Promise<void> => ipcRenderer.invoke('watch-file', filePath),
  unwatchFile: (filePath: string): Promise<void> => ipcRenderer.invoke('unwatch-file', filePath),
  onFileChanged: (callback: (filePath: string) => void) => {
    const handler = (_event: any, filePath: string) => callback(filePath);
    ipcRenderer.on('file-changed', handler);
    // Return a cleanup function to remove the listener
    return () => {
      ipcRenderer.removeListener('file-changed', handler);
    };
  },
  onFileChange: (callback: (filePath: string) => void) => {
    const listener = (_event: any, filePath: string) => callback(filePath);
    ipcRenderer.on('file-changed', listener);
    // Return a function to remove the listener
    return () => {
      ipcRenderer.removeListener('file-changed', listener);
    };
  },
});