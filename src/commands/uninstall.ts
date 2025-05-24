import { join, resolve } from 'node:path'
import { existsSync, readlinkSync, rmSync } from 'node:fs'
import { log } from '../lib/logger'
import { BUN_SYMLINK, BUN_VERSIONS_DIR } from '../lib/constants'
import chalk from 'chalk'

export function uninstallBun(version: string): void {
  const versionDir = join(BUN_VERSIONS_DIR, version)
  const bunBinaryPath = join(versionDir, 'bun')

  if (!existsSync(versionDir) || !existsSync(bunBinaryPath)) {
    log.warn(`Bun version ${version} is not installed.`)
    return
  }

  // If the version is in use, remove the symlink.
  if (existsSync(BUN_SYMLINK)) {
    try {
      const target = resolve(readlinkSync(BUN_SYMLINK))
      if (target === resolve(bunBinaryPath)) {
        rmSync(BUN_SYMLINK, { force: true })
        log.log(`🔗 Removed active symlink for Bun ${version}.`)
      }
    } catch {
      // Ignore readlinkSync errors.
    }
  }

  try {
    rmSync(versionDir, { recursive: true, force: true })
    log.log(chalk.green(`🗑️  Bun ${version} has been uninstalled.`))
  } catch (err) {
    log.error(`Failed to uninstall Bun ${version}: ${(err as Error).message}`)
  }
}
