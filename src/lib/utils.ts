import { execSync } from 'node:child_process'
import { createReadStream, existsSync, readdirSync } from 'node:fs'
import { BUN_VERSIONS_DIR } from './constants.js'
import chalk from 'chalk'
import { dirname, join } from 'node:path'
import axios from 'axios'
import { log } from './logger.js'
import { pipeline } from 'node:stream/promises'
import unzipper from 'unzipper'
import { chmod } from 'node:fs/promises'
import { cleanPath, exists, streamToFile } from './file.js'

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

function getPlatformTarget(): string {
  return `${process.platform}-${process.arch}`
}

function registerCleanup(dir: string): () => void {
  async function cleanup() {
    console.log(chalk.red('\nDownload interrupted. Cleaning up...'))
    await cleanPath(dir, true)
    process.exit(1)
  }

  process.once('SIGINT', cleanup)
  return () => process.removeListener('SIGINT', cleanup)
}

export async function downloadBun(
  version: string,
  destPath: string,
): Promise<void> {
  const target = getPlatformTarget()
  const url = `https://github.com/oven-sh/bun/releases/download/bun-v${version}/bun-${target}.zip`
  const zipPath = `${destPath}.zip`
  const destDir = dirname(destPath)
  const extractedDir = join(destDir, `bun-${target}`)
  const extractedBunPath = join(extractedDir, 'bun')

  const removeCleanupListener = registerCleanup(destDir)

  try {
    const response = await axios.get(url, { responseType: 'stream' })

    if (response.status !== 200) {
      throw new Error(`Failed to download ZIP file. Status: ${response.status}`)
    }

    await streamToFile(response.data, zipPath)

    log.log(chalk.yellow('📦 Extracting...'))

    await pipeline(
      createReadStream(zipPath),
      unzipper.Extract({ path: destDir }),
    )

    if (!(await exists(extractedBunPath))) {
      throw new Error(`Expected binary not found at ${extractedBunPath}`)
    }

    await streamToFile(createReadStream(extractedBunPath), destPath)
    await chmod(destPath, 0o755)

    await cleanPath(extractedDir, true)
    await cleanPath(zipPath)

    log.success(`Installed Bun ${chalk.bold(`v${version}`)}`)
  } catch (error) {
    log.error(
      `Failed to install Bun: ${error instanceof Error ? error.message : error}`,
    )
    await cleanPath(destDir, true)
    process.exit(1)
  } finally {
    removeCleanupListener()
  }
}
