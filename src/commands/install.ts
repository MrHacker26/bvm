import { mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import chalk from 'chalk'
import {
  BUN_VERSIONS_DIR,
  BUN_BIN_DIR,
  BUNX_SYMLINK,
  BUN_SYMLINK,
} from '../lib/constants.js'
import { log } from '../lib/logger.js'
import { downloadBun } from '../lib/utils.js'
import { ensureDirectoryExists } from '../lib/file.js'
import { useVersion } from './use.js'
import { autoConfigureShell } from '../lib/shell.js'

export async function installBun(version: string): Promise<void> {
  const versionDir = join(BUN_VERSIONS_DIR, version)
  const bunBinaryPath = join(versionDir, 'bun')

  if (existsSync(versionDir) && existsSync(bunBinaryPath)) {
    log.warn(`Bun ${chalk.green(`v${version}`)} is already installed.`)
    return
  }

  mkdirSync(versionDir, { recursive: true })

  log.log(`${chalk.cyan('📥 Installing')} Bun ${chalk.green(`v${version}`)}...`)

  await downloadBun(version, bunBinaryPath)

  if (!existsSync(BUN_SYMLINK) || !existsSync(BUNX_SYMLINK)) {
    log.warn(
      `No previously installed Bun versions found. Setting up environment...`,
    )

    ensureDirectoryExists(BUN_BIN_DIR)

    try {
      await autoConfigureShell()
    } catch (err) {
      log.error(
        `Failed to configure shell: ${(err as Error).message}. Please set up completions manually.`,
      )
    }

    await useVersion(version)
    return
  }

  log.success(`Installed Bun ${chalk.bold(`v${version}`)}`)
}
