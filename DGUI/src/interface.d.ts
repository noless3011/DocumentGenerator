export interface IMyAPI {
  selectFolder: () => Promise<string>,
  readFile: (path: string) => Promise<string>
}

declare global {
  interface Window {
    myAPI: IMyAPI
  }
}