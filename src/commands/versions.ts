import {
  formatVersionInfo,
  getCurrentBunVersion,
  getInstalledBunVersions,
} from '../lib/utils'
import { GITHUB_RELEASES_URL } from '../lib/constants'
import { log } from '../lib/logger'
import chalk from 'chalk'
import axios from 'axios'

type Release = { tag_name: string }

export function listVersions(): void {
  try {
    const currentVersion = getCurrentBunVersion()
    log.log(`Current Bun version: v${currentVersion ?? 'none'}`)

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
    const { data } = await axios.get<Release[]>(GITHUB_RELEASES_URL)
    const versions = data.map(({ tag_name }) => tag_name.replace(/^bun-v/, ''))

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
    log.error('Bun is not installed.')
    return
  }

  log.log(`Current Bun version: v${version}`)
}
