import { mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { isCancel, select, spinner } from '@clack/prompts'
import chalk from 'chalk'
import {
  BUN_VERSIONS_DIR,
  BUN_BIN_DIR,
  BUNX_SYMLINK,
  BUN_SYMLINK,
} from '../lib/constants'
import { log } from '../lib/logger'
import {
  downloadBun,
  fetchRemoteBunVersions,
  getCurrentBunVersion,
  getInstalledBunVersions,
  getLatestBunVersion,
} from '../lib/utils'
import { ensureDirectoryExists } from '../lib/file'
import { isInteractive } from '../lib/interactive'
import { useVersion } from './use'
import { autoConfigureShell } from '../lib/shell'

export function formatInstallHint(
  version: string,
  latest: string,
  installed: Set<string>,
  current: string | null,
): string | undefined {
  const hints: string[] = []

  if (version === latest) {
    hints.push('latest')
  }
  if (installed.has(version)) {
    hints.push('installed')
  }
  if (current === version) {
    hints.push('current')
  }

  return hints.length > 0 ? hints.join(', ') : undefined
}

async function resolveVersion(version?: string): Promise<string | undefined> {
  if (version) {
    if (version === 'latest') {
      try {
        const latestVersion = await getLatestBunVersion()
        if (!latestVersion) {
          return undefined
        }
        return latestVersion
      } catch {
        throw new Error('Error fetching latest Bun version.')
      }
    }
    return version
  }

  if (!isInteractive()) {
    log.error('Version required in non-interactive mode.')
    log.info(`Usage: ${chalk.cyan('bvm install <version>')}`)
    return undefined
  }

  const s = spinner()
  s.start('Fetching available Bun versions...')

  let remote: string[]

  try {
    remote = await fetchRemoteBunVersions()
    s.stop('Fetched available versions')
  } catch {
    s.stop('Failed to fetch versions')
    throw new Error('Error fetching remote Bun versions.')
  }

  if (remote.length === 0) {
    log.warn('No Bun versions found.')
    return undefined
  }

  const installed = new Set(getInstalledBunVersions())
  const current = getCurrentBunVersion()
  const latest = remote[0]

  const selected = await select({
    message: 'Select a Bun version to install',
    initialValue: latest,
    options: remote.map((v) => ({
      value: v,
      label: `v${v}`,
      hint: formatInstallHint(v, latest, installed, current),
    })),
  })

  if (isCancel(selected)) {
    log.warn('Cancelled.')
    return undefined
  }

  return selected
}

export async function installBun(version?: string): Promise<void> {
  const resolved = await resolveVersion(version)

  if (!resolved) {
    return
  }

  const versionDir = join(BUN_VERSIONS_DIR, resolved)
  const bunBinaryPath = join(versionDir, 'bun')
  const hasActiveSymlinks = existsSync(BUN_SYMLINK) && existsSync(BUNX_SYMLINK)

  if (existsSync(versionDir) && existsSync(bunBinaryPath)) {
    log.warn(`Bun ${chalk.green(`v${resolved}`)} is already installed.`)
    await useVersion(resolved)
    return
  }

  mkdirSync(versionDir, { recursive: true })

  log.log(
    `${chalk.cyan('📥 Installing')} Bun ${chalk.green(`v${resolved}`)}...`,
  )

  await downloadBun(resolved, bunBinaryPath)

  if (!hasActiveSymlinks) {
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

    await useVersion(resolved)
    return
  }

  log.success(`Installed Bun ${chalk.bold(`v${resolved}`)}`)
  await useVersion(resolved)
}
