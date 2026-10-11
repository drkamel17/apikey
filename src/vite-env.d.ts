/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  interface Window {
    electronAPI?: {
      saveFile: (filename: string, content: string) => Promise<any>
      openFile: () => Promise<any>
      showMessage: (message: string, type?: string) => Promise<any>
      on: (channel: string, callback: (...args: any[]) => void) => void
      removeListener: (channel: string, callback: (...args: any[]) => void) => void
      platform: NodeJS.Platform
    }
  }
}