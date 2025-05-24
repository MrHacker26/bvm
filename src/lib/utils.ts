import { execSync } from 'node:child_process'
import { createReadStream, existsSync, readdirSync } from 'node:fs'
import {
  BUN_COMPLETION_FILE,
  BUN_DIR,
  BUN_VERSIONS_DIR,
  SHELL_CONFIGS,
} from './constants.js'
import chalk from 'chalk'
import { dirname, join } from 'node:path'
import axios from 'axios'
import { log } from './logger.js'
import { pipeline } from 'node:stream/promises'
import unzipper from 'unzipper'
import { chmod, readFile, writeFile } from 'node:fs/promises'
import { cleanPath, exists, formatBytes, streamToFile } from './file.js'
import cliProgress from 'cli-progress'

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

export function formatVersionInfo(
  version: string,
  currentVersion: string | null,
  installedVersions: Set<string>,
): string {
  const isActive = currentVersion === version
  const isInstalled = installedVersions.has(version)

  if (isActive) {
    return `${chalk.magenta('v' + version)} ${chalk.yellow('⭐ (current)')}`
  }

  if (isInstalled) {
    return `${chalk.magenta('v' + version)} ${chalk.green('✓ (installed)')}`
  }

  return `${chalk.magenta('v' + version)} ${chalk.red('✗ (not installed)')}`
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
    const response = await axios.get<NodeJS.ReadableStream>(url, {
      responseType: 'stream',
    })

    if (response.status !== 200) {
      throw new Error(`Failed to download ZIP file. Status: ${response.status}`)
    }

    const total = Number(response.headers['content-length']) || 0
    let downloaded = 0
    const progress = new cliProgress.SingleBar(
      {
        format: `${chalk.magenta('Downloading')} {bar} {percentage}% | {downloaded}/{totalSize}`,
        barCompleteChar: '█',
        barIncompleteChar: '░',
        hideCursor: true,
      },
      cliProgress.Presets.shades_classic,
    )

    if (total) {
      progress.start(total, 0, {
        downloaded: '0 B',
        totalSize: formatBytes(total),
      })
    }

    response.data.on('data', (chunk: Buffer) => {
      downloaded += chunk.length
      if (total) {
        progress.update(downloaded, {
          downloaded: formatBytes(downloaded),
          totalSize: formatBytes(total),
        })
      }
    })

    await streamToFile(response.data, zipPath)
    if (total) progress.stop()

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

    log.success(`Downloaded Bun ${chalk.bold(`v${version}`)}`)
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

export async function setupCompletions(shell: 'zsh' | 'bash'): Promise<void> {
  const bunPath = join(BUN_DIR, 'bin', 'bun')

  if (!(await exists(bunPath))) {
    log.error(`Bun binary not found at ${bunPath}, skipping completions`)
    return
  }

  try {
    execSync(`${bunPath} completions`, {
      env: {
        ...process.env,
        IS_BUN_AUTO_UPDATE: 'true',
        SHELL: shell,
      },
      stdio: 'ignore',
    })
  } catch (error) {
    log.error(`Failed to set up ${shell} completions: ${error}`)
  }
}

export async function configureShell(shell: 'zsh' | 'bash'): Promise<void> {
  const configFile = SHELL_CONFIGS[shell]
  const bunInstallLine = `export BUN_INSTALL="${BUN_DIR}"\n`
  const pathLine = `export PATH="$BUN_INSTALL/bin:$PATH"\n`
  const completionLine = `[ -s "${BUN_COMPLETION_FILE}" ] && source "${BUN_COMPLETION_FILE}"\n`

  const configPaths = Array.isArray(configFile) ? configFile : [configFile]

  for (const configPath of configPaths) {
    if (await exists(configPath)) {
      const content = await readFile(configPath, 'utf8')
      let newContent = content

      if (!content.includes('BUN_INSTALL')) {
        newContent += `\n# Bun\n${bunInstallLine}${pathLine}`
      }
      if (!content.includes(BUN_COMPLETION_FILE)) {
        newContent += `\n# Bun completions\n${completionLine}`
      }

      if (newContent !== content) {
        await writeFile(configPath, newContent)
        log.success(
          `Updated ${configPath} with Bun configuration and completions`,
        )
        break
      }
    }
  }
}
