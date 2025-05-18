import { execSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { BUN_VERSIONS_DIR } from './constants.js'
import chalk from 'chalk'

export function getCurrentBunVersion(): string | null {
  try {
    const output = execSync('bun --version', {
      encoding: 'utf8',
      stdio: ['pipe'],
    }).trim()
    return output || null
  } catch {
    return null
  }
}

export function getInstalledBunVersions(): string[] {
  return existsSync(BUN_VERSIONS_DIR) ? readdirSync(BUN_VERSIONS_DIR) : []
}

export function formatVersionStr(
  version: string,
  currentVersion: string | null,
  installedVersionsSet: Set<string>,
) {
  const isActive = currentVersion === version
  const installed = installedVersionsSet.has(version)

  if (isActive) {
    return `  ${chalk.magenta('v' + version)} (current) ${chalk.yellow('⭐')}`
  }
  if (installed) {
    return `  ${chalk.magenta('v' + version)} ${chalk.green('(installed)')}`
  }
  return `  ${chalk.magenta('v' + version)} ${chalk.red('(not installed)')}`
}
