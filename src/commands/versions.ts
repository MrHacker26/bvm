import {
  formatVersionInfo,
  fetchRemoteBunVersions,
  getCurrentBunVersion,
  getInstalledBunVersions,
} from '../lib/utils'
import { log } from '../lib/logger'
import chalk from 'chalk'

export function listVersions(): void {
  try {
    const currentVersion = getCurrentBunVersion()
    log.log(
      `Current Bun version: ${currentVersion ? `v${currentVersion}` : 'none'}`,
    )

    const versions = getInstalledBunVersions()

    if (versions.length === 0) {
      log.warn('No Bun versions installed yet.')
      return
    }

    log.log(chalk.green('🚀 Installed Bun versions:\n'))
    versions.forEach((version) => {
      log.log(formatVersionInfo(version, currentVersion, new Set(versions)))
    })
  } catch {
    log.error('No Bun versions installed yet.')
  }
}

export async function listRemoteVersions(): Promise<void> {
  try {
    const versions = await fetchRemoteBunVersions()

    if (versions.length === 0) {
      log.warn('No Bun versions found remotely.')
      return
    }

    const installedVersions = getInstalledBunVersions()
    const installedVersionsSet = new Set(installedVersions)
    const activeVersion = getCurrentBunVersion()

    log.log(chalk.green('🚀 Available Bun versions:\n'))
    versions.forEach((version) => {
      log.log(formatVersionInfo(version, activeVersion, installedVersionsSet))
    })
  } catch (err) {
    log.error(
      `Error fetching remote versions: ${err instanceof Error ? err.message : err}`,
    )
  }
}

export function currentVersion(): void {
  const version = getCurrentBunVersion()

  if (version === null) {
    log.error(
      'No Bun version is currently active. Install one with: bvm install <version>',
    )
    return
  }

  log.log(`Current Bun version: v${version}`)
}
