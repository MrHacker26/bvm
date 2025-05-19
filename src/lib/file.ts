import { createWriteStream } from 'node:fs'
import { rm, stat, unlink } from 'node:fs/promises'
import { log } from './logger.js'

export async function streamToFile(
  readable: NodeJS.ReadableStream,
  path: string,
) {
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
  isDir: boolean = false,
): Promise<void> {
  try {
    await stat(path)
    if (isDir) {
      await rm(path, { recursive: true, force: true })
    } else {
      await unlink(path)
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
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
