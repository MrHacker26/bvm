import { mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import chalk from 'chalk'
import { BUN_VERSIONS_DIR } from '../lib/constants.js'
import { log } from '../lib/logger.js'
import { downloadBun } from '../lib/utils.js'

export async function installBun(version: string) {
  const versionDir = join(BUN_VERSIONS_DIR, version)
  const bunBinaryPath = join(versionDir, 'bun')

  if (existsSync(versionDir) && existsSync(bunBinaryPath)) {
    log.warn(`Bun' ${chalk.green(`v${version}`)} is already installed.`)
    return
  }

  mkdirSync(versionDir, { recursive: true })

  log.log(`${chalk.cyan('📥 Installing')} Bun ${chalk.green(`v${version}`)}...`)

  await downloadBun(version, bunBinaryPath)
}
