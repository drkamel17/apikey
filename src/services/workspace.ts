const IDB_NAME = 'ai-api-key-manager'
const IDB_STORE = 'handles'
const HANDLE_KEY = 'agentWorkspace'

const idb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

const idbSet = async (key: string, value: unknown) => {
  const db = await idb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

const idbGet = async <T>(key: string): Promise<T | undefined> => {
  const db = await idb()
  const value = await new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly')
    const req = tx.objectStore(IDB_STORE).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return value
}

const idbDel = async (key: string) => {
  const db = await idb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export type WorkspaceStatus = 'unsupported' | 'empty' | 'needs-permission' | 'ready'

class Workspace {
  private dir: FileSystemDirectoryHandle | null = null
  private pending: FileSystemDirectoryHandle | null = null
  public status: WorkspaceStatus = 'empty'
  public name = ''
  public onChange: (() => void) | null = null

  supportsFS(): boolean {
    return typeof window !== 'undefined' && typeof (window as any).showDirectoryPicker === 'function'
  }

  isReady(): boolean {
    return this.status === 'ready' && this.dir !== null
  }

  async init(): Promise<WorkspaceStatus> {
    if (!this.supportsFS()) {
      this.status = 'unsupported'
      return this.status
    }
    try {
      const handle = await idbGet<FileSystemDirectoryHandle>(HANDLE_KEY)
      if (handle) {
        const perm = await (handle as any).queryPermission?.({ mode: 'readwrite' })
        if (perm === 'granted') {
          this.dir = handle
          this.name = handle.name
          this.status = 'ready'
          return this.status
        }
        this.pending = handle
        this.name = handle.name
        this.status = 'needs-permission'
        return this.status
      }
    } catch {
      /* fall through */
    }
    this.status = 'empty'
    return this.status
  }

  async pick(): Promise<boolean> {
    const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
    this.dir = handle
    this.pending = null
    await idbSet(HANDLE_KEY, handle)
    this.name = handle.name
    this.status = 'ready'
    this.onChange?.()
    return true
  }

  async resume(): Promise<boolean> {
    if (!this.pending) return false
    const perm = await (this.pending as any).requestPermission({ mode: 'readwrite' })
    if (perm !== 'granted') return false
    this.dir = this.pending
    this.pending = null
    this.name = this.dir.name
    this.status = 'ready'
    this.onChange?.()
    return true
  }

  async forget() {
    await idbDel(HANDLE_KEY)
    this.dir = null
    this.pending = null
    this.name = ''
    this.status = 'empty'
    this.onChange?.()
  }

  private require(): FileSystemDirectoryHandle {
    if (!this.dir) throw new Error('No workspace folder selected')
    return this.dir
  }

  private split(path: string): string[] {
    return path.replace(/\\/g, '/').split('/').filter((p) => p && p !== '.')
  }

  private async resolveDir(path: string, create = false): Promise<FileSystemDirectoryHandle> {
    let dir = this.require()
    for (const part of this.split(path)) {
      dir = await dir.getDirectoryHandle(part, { create })
    }
    return dir
  }

  private async resolveFile(path: string, create = false): Promise<FileSystemFileHandle> {
    const parts = this.split(path)
    const name = parts.pop()
    if (!name) throw new Error('Invalid file path')
    const dir = parts.length ? await this.resolveDir(parts.join('/'), create) : this.require()
    return dir.getFileHandle(name, { create })
  }

  async list(path = '', recursive = false): Promise<string[]> {
    const start = path ? await this.resolveDir(path) : this.require()
    const out: string[] = []
    const walk = async (dir: FileSystemDirectoryHandle, prefix: string) => {
      for await (const entry of (dir as any).entries() as AsyncIterable<[string, FileSystemHandle]>) {
        const [name, handle] = entry
        if (name === 'ai-api-keys.json') continue
        const rel = prefix ? `${prefix}/${name}` : name
        if (handle.kind === 'directory') {
          out.push(`${rel}/`)
          if (recursive) await walk(handle as FileSystemDirectoryHandle, rel)
        } else {
          out.push(rel)
        }
      }
    }
    await walk(start, path)
    return out.sort()
  }

  async read(path: string): Promise<string> {
    const fh = await this.resolveFile(path)
    const file = await fh.getFile()
    return await file.text()
  }

  async write(path: string, content: string): Promise<void> {
    const fh = await this.resolveFile(path, true)
    const writable = await (fh as any).createWritable()
    await writable.write(content)
    await writable.close()
  }

  async mkdir(path: string): Promise<void> {
    await this.resolveDir(path, true)
  }
}

export const workspace = new Workspace()
