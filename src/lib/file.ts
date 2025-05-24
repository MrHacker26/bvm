import {
  createWriteStream,
  existsSync,
  lstatSync,
  mkdirSync,
  rmSync,
  symlinkSync,
} from 'node:fs'
import { rm, stat, unlink } from 'node:fs/promises'
import { log } from './logger'

export async function streamToFile(
  readable: NodeJS.ReadableStream,
  path: string,
): Promise<void> {
  const writer = createWriteStream(path)
  await new Promise<void>((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
    readable.pipe(writer)
  })
}

export async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

export async function cleanPath(
  path: string,
  isDirectory = false,
): Promise<void> {
  try {
    if (await exists(path)) {
      if (isDirectory) {
        await rm(path, { recursive: true, force: true })
      } else {
        await unlink(path)
      }
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code !== 'ENOENT') {
      log.warn(`Failed to clean path: ${path}`)
    }
  }
}

export function formatBytes(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

export function ensureDirectoryExists(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

export function removeExistingLink(path: string): void {
  if (existsSync(path)) {
    const isSymlink = lstatSync(path).isSymbolicLink()
    try {
      rmSync(path, { force: true })
      if (!isSymlink) {
        log.warn(`Replaced non-symlink file at ${path}`)
      }
    } catch (error) {
      log.warn(
        `Couldn't remove existing file at ${path}: ${(error as Error).message}`,
      )
    }
  }
}

export function createSymlink(src: string, dest: string): void {
  if (existsSync(src)) {
    removeExistingLink(dest)
    symlinkSync(src, dest)
  }
}
