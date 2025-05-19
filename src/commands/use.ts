import { join } from 'node:path'
import { existsSync, symlinkSync } from 'node:fs'
import chalk from 'chalk'
import { log } from '../lib/logger.js'
import { BUN_BIN_DIR, BUN_SYMLINK, BUN_VERSIONS_DIR } from '../lib/constants.js'
import { ensureDirectoryExists, removeExistingLink } from '../lib/file.js'

export function useVersion(version: string) {
  const versionBin = join(BUN_VERSIONS_DIR, version, 'bun')

  if (!existsSync(versionBin)) {
    log.error(`Bun version ${version} is not installed.`)
    log.info(`Run ${chalk.cyan(`bvm install ${version}`)} to install it.`)
    return
  }

  try {
    ensureDirectoryExists(BUN_BIN_DIR)
    removeExistingLink(BUN_SYMLINK)
    symlinkSync(versionBin, BUN_SYMLINK)

    log.success(`Now using Bun ${version}`)
  } catch (err) {
    log.error(`Failed to switch Bun version: ${(err as Error).message}`)
  }
}
