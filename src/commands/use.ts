import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { isCancel, select } from '@clack/prompts'
import chalk from 'chalk'
import { log } from '../lib/logger'
import {
  BUN_BIN_DIR,
  BUN_SYMLINK,
  BUN_VERSIONS_DIR,
  BUNX_SYMLINK,
} from '../lib/constants'
import { createSymlink, ensureDirectoryExists } from '../lib/file'
import { setupCompletions } from '../lib/shell'
import { getCurrentBunVersion, getInstalledBunVersions } from '../lib/utils'

function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY)
}

async function resolveVersion(version?: string): Promise<string | undefined> {
  if (version) {
    return version
  }

  if (!isInteractive()) {
    log.error('Version required in non-interactive mode.')
    log.info(`Usage: ${chalk.cyan('bvm use <version>')}`)
    return undefined
  }

  const installed = getInstalledBunVersions()

  if (installed.length === 0) {
    log.error('No Bun versions installed.')
    log.info(`Run ${chalk.cyan('bvm install latest')} to install one.`)
    return undefined
  }

  const current = getCurrentBunVersion()
  const selected = await select({
    message: 'Select a Bun version to use',
    initialValue: current ?? installed[0],
    options: installed.map((v) => ({
      value: v,
      label: `v${v}`,
      hint: current === v ? 'current' : undefined,
    })),
  })

  if (isCancel(selected)) {
    log.warn('Cancelled.')
    return undefined
  }

  return selected
}

export async function useVersion(version?: string): Promise<void> {
  const resolved = await resolveVersion(version)

  if (!resolved) {
    return
  }

  const versionBin = join(BUN_VERSIONS_DIR, resolved, 'bun')

  if (!existsSync(versionBin)) {
    log.error(`Bun version ${resolved} is not installed.`)
    log.info(`Run ${chalk.cyan(`bvm install ${resolved}`)} to install it.`)
    return
  }

  try {
    ensureDirectoryExists(BUN_BIN_DIR)
    createSymlink(versionBin, BUN_SYMLINK)
    createSymlink(versionBin, BUNX_SYMLINK)
    await setupCompletions()

    log.success(`Now using Bun ${resolved}`)
  } catch (err) {
    log.error(`Failed to switch Bun version: ${(err as Error).message}`)
  }
}
