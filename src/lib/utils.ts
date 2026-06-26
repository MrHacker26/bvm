import { execSync } from 'node:child_process'
import {
  createReadStream,
  existsSync,
  readdirSync,
  readFileSync,
} from 'node:fs'
import { BUN_VERSIONS_DIR, GITHUB_RELEASES_URL } from './constants'
import chalk from 'chalk'
import { dirname, join } from 'node:path'
import axios from 'axios'
import { log } from './logger'
import { pipeline } from 'node:stream/promises'
import unzipper from 'unzipper'
import { chmod } from 'node:fs/promises'
import { cleanPath, exists, formatBytes, streamToFile } from './file'
import cliProgress from 'cli-progress'
import { Release } from './types'

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
  if (!existsSync(BUN_VERSIONS_DIR)) {
    return []
  }

  return readdirSync(BUN_VERSIONS_DIR).sort(compareSemverDesc)
}

export async function getLatestBunVersion(): Promise<string | null> {
  try {
    const { data } = await axios.get<Release[]>(GITHUB_RELEASES_URL)

    if (data.length === 0) {
      log.warn('No Bun versions found.')
      return null
    }

    const latestVersion = data[0].tag_name.replace(/^bun-v/, '')

    return latestVersion
  } catch {
    log.error('Error fetching latest Bun version.')
    process.exit(1)
  }
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

function isRunningUnderRosetta(): boolean {
  try {
    return (
      execSync('sysctl -n sysctl.proc_translated', {
        encoding: 'utf8',
        stdio: ['pipe'],
      }).trim() === '1'
    )
  } catch {
    return false
  }
}

// Mirrors bun.sh/install: x64 builds require AVX2, otherwise the `-baseline`
// variant is needed. If detection fails we assume no AVX2 (baseline runs
// everywhere, just slightly slower) to avoid "illegal instruction" crashes.
function hasAvx2Support(): boolean {
  try {
    if (process.platform === 'darwin') {
      return execSync('sysctl -a', {
        encoding: 'utf8',
        stdio: ['pipe'],
      }).includes('AVX2')
    }
    if (process.platform === 'linux') {
      return readFileSync('/proc/cpuinfo', 'utf8').includes('avx2')
    }
  } catch {
    return false
  }
  return false
}

function getPlatformTarget(): string {
  const { platform, arch } = process

  let target: string

  switch (`${platform}-${arch}`) {
    case 'darwin-arm64':
      target = 'darwin-aarch64'
      break
    case 'darwin-x64':
      // A native x64 build runs under Rosetta on Apple Silicon, but the
      // arm64 build is faster, so prefer it when translation is active.
      target = isRunningUnderRosetta() ? 'darwin-aarch64' : 'darwin-x64'
      break
    case 'linux-arm64':
      target = 'linux-aarch64'
      break
    case 'linux-x64':
      target = 'linux-x64'
      break
    default:
      throw new Error(
        `Unsupported platform: ${platform}-${arch}. Only macOS and Linux are supported.`,
      )
  }

  // Alpine (and other musl-based) Linux distros need the musl build.
  if (target.startsWith('linux') && existsSync('/etc/alpine-release')) {
    target += '-musl'
  }

  // x64 CPUs without AVX2 need the baseline build.
  if (
    (target.startsWith('darwin-x64') || target.startsWith('linux-x64')) &&
    !hasAvx2Support()
  ) {
    target += '-baseline'
  }

  return target
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

export function compareSemverDesc(a: string, b: string): number {
  function parse(v: string): number[] {
    return v
      .replace(/^v/, '')
      .split('.')
      .map((n) => parseInt(n, 10) || 0)
  }
  const aParts = parse(a)
  const bParts = parse(b)

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const diff = (bParts[i] || 0) - (aParts[i] || 0)
    if (diff !== 0) {
      return diff
    }
  }

  return 0
}
