import { Project } from "./components/DocumentsHandling/ProjectManagingMenu"

export interface IMyAPI {
  selectFolder: () => Promise<string>,
  readFileAsBase64: (path: string) => Promise<string>
  readFileAsText: (path: string) => Promise<string>
  saveFile: (path: string, content: string) => Promise<void>
  getProcessedFilesFromProject: (project: Project) => Promise<{
    markdown: string[],
    image: string[],
    json: string[],
    html: string[],
  }>
  readJsonFile: (path: string) => Promise<any>
  watchFile: (filePath: string) => Promise<void>;
  unwatchFile: (filePath: string) => Promise<void>;
  onFileChange: (callback: (filePath: string) => void) => () => void;
}

declare global {
  interface Window {
    myAPI: IMyAPI
  }
}