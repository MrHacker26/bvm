import { readdirSync } from 'node:fs'
import { getCurrentBunVersion } from '../lib/utils.js'
import { BUN_VERSIONS_DIR } from '../lib/constants.js'
import { log } from '../lib/logger.js'
import chalk from 'chalk'

export function listVersions() {
  try {
    const currentVersion = getCurrentBunVersion()
    log.log(`Current Bun version: ${currentVersion ?? 'none'}`)

    const versions = readdirSync(BUN_VERSIONS_DIR)
    log.log(chalk.green('🚀 Installed Bun versions:\n'))
    versions.forEach((version) => {
      if (version === currentVersion) {
        log.log(
          `  ${chalk.magenta('v' + version)} (current) ${chalk.yellow('⭐')}`,
        )
      } else {
        log.log(`  ${chalk.magenta('v' + version)}`)
      }
    })
  } catch {
    log.error('No Bun versions installed yet.')
  }
}

export function listRemoteVersions() {
  // TODO: Implement listRemoteVersions function.
}
