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
}

declare global {
  interface Window {
    myAPI: IMyAPI
  }
}