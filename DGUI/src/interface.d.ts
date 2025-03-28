export interface IMyAPI {
  selectFolder: () => Promise<string>,
  readFileAsBase64: (path: string) => Promise<string>
  readFileAsText: (path: string) => Promise<string>
  saveFile: (path: string, content: string) => Promise<void>
}

declare global {
  interface Window {
    myAPI: IMyAPI
  }
}