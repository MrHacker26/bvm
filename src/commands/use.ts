import { join } from 'node:path'
import { existsSync } from 'node:fs'
import chalk from 'chalk'
import { log } from '../lib/logger.js'
import {
  BUN_BIN_DIR,
  BUN_SYMLINK,
  BUN_VERSIONS_DIR,
  BUNX_SYMLINK,
} from '../lib/constants.js'
import { createSymlink, ensureDirectoryExists } from '../lib/file.js'
import { setupCompletions } from '../lib/utils.js'

export async function useVersion(version: string): Promise<void> {
  const versionBin = join(BUN_VERSIONS_DIR, version, 'bun')

  if (!existsSync(versionBin)) {
    log.error(`Bun version ${version} is not installed.`)
    log.info(`Run ${chalk.cyan(`bvm install ${version}`)} to install it.`)
    return
  }

  try {
    ensureDirectoryExists(BUN_BIN_DIR)
    createSymlink(versionBin, BUN_SYMLINK)
    createSymlink(versionBin, BUNX_SYMLINK)
    await setupCompletions('zsh')

    log.success(`Now using Bun ${version}`)
  } catch (err) {
    log.error(`Failed to switch Bun version: ${(err as Error).message}`)
  }
}
