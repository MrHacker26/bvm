import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  createReadStream,
  existsSync,
  readdirSync,
  readFileSync,
} from 'node:fs'
import { BUN_VERSIONS_DIR, GITHUB_RELEASES_URL } from './constants'
import chalk from 'chalk'
import { dirname, join } from 'node:path'
import { Readable } from 'node:stream'
import { log } from './logger'
import { pipeline } from 'node:stream/promises'
import unzipper from 'unzipper'
import { chmod } from 'node:fs/promises'
import { cleanPath, exists, formatBytes, streamToFile } from './file'
import cliProgress from 'cli-progress'
import { Release } from './types'

const REQUEST_HEADERS = { 'User-Agent': 'bvm-cli' }

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: REQUEST_HEADERS })

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`)
  }

  return (await response.json()) as T
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: REQUEST_HEADERS })

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`)
  }

  return response.text()
}

// The platform/arch combinations bvm supports, mapped to Bun's release
// asset naming. Suffixes like `-musl` / `-baseline` are appended at runtime.
type BunBaseTarget =
  | 'darwin-aarch64'
  | 'darwin-x64'
  | 'linux-aarch64'
  | 'linux-x64'

export type PlatformTargetOptions = {
  platform: NodeJS.Platform
  arch: NodeJS.Architecture
  isAlpine?: boolean
  hasAvx2?: boolean
  isRosetta?: boolean
}

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
  const versions = await fetchRemoteBunVersions()

  if (versions.length === 0) {
    log.warn('No Bun versions found.')
    return null
  }

  return versions[0]
}

export async function fetchRemoteBunVersions(): Promise<string[]> {
  const data = await fetchJson<Release[]>(GITHUB_RELEASES_URL)
  return data.map(({ tag_name }) => tag_name.replace(/^bun-v/, ''))
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
function detectAvx2Support(): boolean {
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

export function resolvePlatformTarget({
  platform,
  arch,
  isAlpine = false,
  hasAvx2 = true,
  isRosetta = false,
}: PlatformTargetOptions): string {
  let target: BunBaseTarget

  switch (`${platform}-${arch}`) {
    case 'darwin-arm64':
      target = 'darwin-aarch64'
      break
    case 'darwin-x64':
      target = isRosetta ? 'darwin-aarch64' : 'darwin-x64'
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

  if (target.startsWith('linux') && isAlpine) {
    target += '-musl'
  }

  if (
    (target.startsWith('darwin-x64') || target.startsWith('linux-x64')) &&
    !hasAvx2
  ) {
    target += '-baseline'
  }

  return target
}

function getPlatformTarget(): string {
  return resolvePlatformTarget({
    platform: process.platform,
    arch: process.arch,
    isAlpine: existsSync('/etc/alpine-release'),
    hasAvx2: detectAvx2Support(),
    isRosetta: isRunningUnderRosetta(),
  })
}

export function parseChecksumForFile(
  shasums: string,
  fileName: string,
): string | null {
  for (const line of shasums.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }

    const [hash, ...nameParts] = trimmed.split(/\s+/)
    const name = nameParts.join(' ')

    if (name === fileName) {
      return hash
    }
  }

  return null
}

async function fetchExpectedChecksum(
  version: string,
  zipName: string,
): Promise<string> {
  const url = `https://github.com/oven-sh/bun/releases/download/bun-v${version}/SHASUMS256.txt`
  const data = await fetchText(url)
  const expected = parseChecksumForFile(data, zipName)

  if (!expected) {
    throw new Error(`Checksum not found for ${zipName}`)
  }

  return expected
}

export async function verifyFileChecksum(
  filePath: string,
  expected: string,
): Promise<void> {
  const hash = createHash('sha256')
  await pipeline(createReadStream(filePath), hash)
  const actual = hash.digest('hex')

  if (actual !== expected) {
    throw new Error(
      'Checksum mismatch — download may be corrupted or tampered.',
    )
  }
}

function registerCleanup(dir: string, abort: () => void): () => void {
  function cleanup() {
    console.log(chalk.red('\nDownload interrupted. Cleaning up...'))
    void cleanPath(dir, true).finally(abort)
  }

  process.once('SIGINT', cleanup)
  return () => process.removeListener('SIGINT', cleanup)
}

async function downloadZipWithProgress(
  url: string,
  zipPath: string,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch(url, { signal })

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ZIP file. Status: ${response.status}`)
  }

  const total = Number(response.headers.get('content-length')) || 0
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

  const stream = Readable.fromWeb(
    response.body as Parameters<typeof Readable.fromWeb>[0],
  )

  stream.on('data', (chunk: Buffer) => {
    downloaded += chunk.length
    if (total) {
      progress.update(downloaded, {
        downloaded: formatBytes(downloaded),
        totalSize: formatBytes(total),
      })
    }
  })

  await streamToFile(stream, zipPath)
  if (total) {
    progress.stop()
  }
}

async function extractBunBinary(
  zipPath: string,
  destPath: string,
  destDir: string,
  extractedDir: string,
  extractedBunPath: string,
): Promise<void> {
  await pipeline(createReadStream(zipPath), unzipper.Extract({ path: destDir }))

  if (!(await exists(extractedBunPath))) {
    throw new Error(`Expected binary not found at ${extractedBunPath}`)
  }

  await streamToFile(createReadStream(extractedBunPath), destPath)
  await chmod(destPath, 0o755)

  await cleanPath(extractedDir, true)
  await cleanPath(zipPath)
}

export async function downloadBun(
  version: string,
  destPath: string,
): Promise<void> {
  const target = getPlatformTarget()
  const zipName = `bun-${target}.zip`
  const url = `https://github.com/oven-sh/bun/releases/download/bun-v${version}/${zipName}`
  const zipPath = `${destPath}.zip`
  const destDir = dirname(destPath)
  const extractedDir = join(destDir, `bun-${target}`)
  const extractedBunPath = join(extractedDir, 'bun')
  const controller = new AbortController()

  const removeCleanupListener = registerCleanup(destDir, () => {
    controller.abort()
  })

  try {
    await downloadZipWithProgress(url, zipPath, controller.signal)

    log.log(chalk.yellow('🔒 Verifying checksum...'))
    const expectedChecksum = await fetchExpectedChecksum(version, zipName)
    await verifyFileChecksum(zipPath, expectedChecksum)

    log.log(chalk.yellow('📦 Extracting...'))
    await extractBunBinary(
      zipPath,
      destPath,
      destDir,
      extractedDir,
      extractedBunPath,
    )

    log.success(`Downloaded Bun ${chalk.bold(`v${version}`)}`)
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('Download interrupted.')
    }

    await cleanPath(destDir, true)
    throw error
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
