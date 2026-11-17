import {
  createWriteStream,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { rm, stat, unlink } from 'node:fs/promises'
import { log } from './logger'

export function readBunVersion(startDir = process.cwd()): string | undefined {
  let directory = resolve(startDir)

  while (true) {
    const versionFile = join(directory, '.bun-version')
    let contents: string

    try {
      contents = readFileSync(versionFile, 'utf8')
    } catch (error) {
      if (
        !(error instanceof Error && 'code' in error && error.code === 'ENOENT')
      ) {
        throw error
      }

      const parent = dirname(directory)
      if (parent === directory) {
        return undefined
      }
      directory = parent
      continue
    }

    const version = contents.trim().replace(/^v/, '')
    if (
      !/^(?:latest|\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)$/.test(
        version,
      )
    ) {
      throw new Error(
        `Invalid Bun version in ${versionFile}. Expected a version such as 1.4.4 or latest.`,
      )
    }

    return version
  }
}

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
  if (bytes === 0) {
    return '0 B'
  }
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

export function ensureDirectoryExists(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

// Unlike existsSync, this detects dangling symlinks (links whose target no
// longer exists), since lstat inspects the link itself instead of following it.
export function pathExists(path: string): boolean {
  try {
    lstatSync(path)
    return true
  } catch {
    return false
  }
}

export function removeExistingLink(path: string): void {
  if (pathExists(path)) {
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
