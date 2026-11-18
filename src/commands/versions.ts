import { confirm, isCancel, select, spinner } from '@clack/prompts'
import chalk from 'chalk'
import {
  formatVersionsTable,
  fetchRemoteBunVersions,
  getCurrentBunVersion,
  getInstalledBunVersions,
  getVersionStatus,
} from '../lib/utils'
import { isInteractive } from '../lib/interactive'
import { log } from '../lib/logger'
import { installBun } from './install'
import { useVersion } from './use'

function printVersionsTable(
  title: string,
  versions: string[],
  currentVersion: string | null,
  installedVersions: Set<string>,
): void {
  log.log(chalk.green(title))
  log.log('')
  log.log(formatVersionsTable(versions, currentVersion, installedVersions))
}

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

    printVersionsTable(
      'Installed Bun versions:',
      versions,
      currentVersion,
      new Set(versions),
    )
  } catch {
    log.error('No Bun versions installed yet.')
  }
}

async function browseRemoteVersions(
  versions: string[],
  currentVersion: string | null,
  installedVersions: Set<string>,
): Promise<void> {
  const latest = versions[0]
  const selected = await select({
    message: 'Browse remote Bun versions',
    initialValue: latest,
    options: versions.map((version) => ({
      value: version,
      label: `v${version}`,
      hint: getVersionStatus(version, currentVersion, installedVersions),
    })),
  })

  if (isCancel(selected)) {
    log.warn('Cancelled.')
    return
  }

  const status = getVersionStatus(selected, currentVersion, installedVersions)

  if (status === 'current') {
    log.success(`Already using Bun ${chalk.bold(`v${selected}`)}`)
    return
  }

  if (status === 'installed') {
    const shouldUse = await confirm({
      message: `Switch to Bun v${selected}?`,
      initialValue: true,
    })

    if (isCancel(shouldUse) || !shouldUse) {
      log.warn('Cancelled.')
      return
    }

    await useVersion(selected)
    return
  }

  const shouldInstall = await confirm({
    message: `Install Bun v${selected}?`,
    initialValue: true,
  })

  if (isCancel(shouldInstall) || !shouldInstall) {
    log.warn('Cancelled.')
    return
  }

  await installBun(selected)
}

export async function listRemoteVersions(): Promise<void> {
  try {
    const s = isInteractive() ? spinner() : null
    s?.start('Fetching remote Bun versions...')

    let versions: string[]

    try {
      versions = await fetchRemoteBunVersions()
      s?.stop(`Fetched ${versions.length} versions`)
    } catch (error) {
      s?.stop('Failed to fetch versions')
      throw error
    }

    if (versions.length === 0) {
      log.warn('No Bun versions found remotely.')
      return
    }

    const installedVersions = getInstalledBunVersions()
    const installedVersionsSet = new Set(installedVersions)
    const activeVersion = getCurrentBunVersion()

    if (isInteractive()) {
      await browseRemoteVersions(versions, activeVersion, installedVersionsSet)
      return
    }

    printVersionsTable(
      'Available Bun versions:',
      versions,
      activeVersion,
      installedVersionsSet,
    )
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
