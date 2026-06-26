import { join, resolve } from 'node:path'
import { existsSync, readlinkSync, rmSync } from 'node:fs'
import { confirm, isCancel, select } from '@clack/prompts'
import chalk from 'chalk'
import { log } from '../lib/logger'
import { BUN_SYMLINK, BUN_VERSIONS_DIR } from '../lib/constants'
import { isInteractive } from '../lib/interactive'
import { getCurrentBunVersion, getInstalledBunVersions } from '../lib/utils'

async function resolveVersion(version?: string): Promise<string | undefined> {
  if (version) {
    return version
  }

  if (!isInteractive()) {
    log.error('Version required in non-interactive mode.')
    log.info(`Usage: ${chalk.cyan('bvm uninstall <version>')}`)
    return undefined
  }

  const installed = getInstalledBunVersions()

  if (installed.length === 0) {
    log.error('No Bun versions installed.')
    return undefined
  }

  const current = getCurrentBunVersion()
  const selected = await select({
    message: 'Select a Bun version to uninstall',
    initialValue: installed.find((v) => v !== current) ?? installed[0],
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

async function confirmUninstall(version: string): Promise<boolean> {
  if (!isInteractive()) {
    return true
  }

  const current = getCurrentBunVersion()
  const isActive = current === version

  const confirmed = await confirm({
    message: isActive
      ? `Uninstall Bun v${version}? This is your active version.`
      : `Uninstall Bun v${version}?`,
  })

  if (isCancel(confirmed)) {
    log.warn('Cancelled.')
    return false
  }

  return confirmed
}

export async function uninstallBun(version?: string): Promise<void> {
  const resolved = await resolveVersion(version)

  if (!resolved) {
    return
  }

  const versionDir = join(BUN_VERSIONS_DIR, resolved)
  const bunBinaryPath = join(versionDir, 'bun')

  if (!existsSync(versionDir) || !existsSync(bunBinaryPath)) {
    log.warn(`Bun version ${resolved} is not installed.`)
    return
  }

  const shouldUninstall = await confirmUninstall(resolved)

  if (!shouldUninstall) {
    return
  }

  if (existsSync(BUN_SYMLINK)) {
    try {
      const target = resolve(readlinkSync(BUN_SYMLINK))
      if (target === resolve(bunBinaryPath)) {
        rmSync(BUN_SYMLINK, { force: true })
        log.log(`🔗 Removed active symlink for Bun ${resolved}.`)
      }
    } catch {
      // Ignore readlinkSync errors.
    }
  }

  try {
    rmSync(versionDir, { recursive: true, force: true })
    log.log(chalk.green(`🗑️  Bun ${resolved} has been uninstalled.`))
  } catch (err) {
    log.error(`Failed to uninstall Bun ${resolved}: ${(err as Error).message}`)
  }
}
