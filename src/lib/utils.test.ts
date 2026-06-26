import { describe, expect, test } from 'bun:test'
import {
  compareSemverDesc,
  formatVersionInfo,
  parseChecksumForFile,
  resolvePlatformTarget,
} from './utils'

describe('compareSemverDesc', () => {
  test('sorts newer versions first', () => {
    expect(compareSemverDesc('1.0.9', '1.0.10')).toBeGreaterThan(0)
    expect(compareSemverDesc('1.0.10', '1.0.9')).toBeLessThan(0)
  })

  test('treats equal versions as equal', () => {
    expect(compareSemverDesc('1.2.3', '1.2.3')).toBe(0)
  })

  test('handles v prefix', () => {
    expect(compareSemverDesc('v1.0.0', '1.0.1')).toBeGreaterThan(0)
  })

  test('compares major versions', () => {
    expect(compareSemverDesc('1.9.9', '2.0.0')).toBeGreaterThan(0)
  })
})

describe('formatVersionInfo', () => {
  test('marks the active version', () => {
    const output = formatVersionInfo('1.0.0', '1.0.0', new Set(['1.0.0']))
    expect(output).toContain('(current)')
  })

  test('marks installed versions', () => {
    const output = formatVersionInfo('1.0.0', '1.0.1', new Set(['1.0.0']))
    expect(output).toContain('(installed)')
  })

  test('marks remote-only versions', () => {
    const output = formatVersionInfo('1.0.0', '1.0.1', new Set(['1.0.1']))
    expect(output).toContain('(not installed)')
  })
})

describe('resolvePlatformTarget', () => {
  test('maps darwin arm64', () => {
    expect(resolvePlatformTarget({ platform: 'darwin', arch: 'arm64' })).toBe(
      'darwin-aarch64',
    )
  })

  test('maps darwin x64', () => {
    expect(resolvePlatformTarget({ platform: 'darwin', arch: 'x64' })).toBe(
      'darwin-x64',
    )
  })

  test('prefers aarch64 under rosetta', () => {
    expect(
      resolvePlatformTarget({
        platform: 'darwin',
        arch: 'x64',
        isRosetta: true,
      }),
    ).toBe('darwin-aarch64')
  })

  test('maps linux arm64', () => {
    expect(resolvePlatformTarget({ platform: 'linux', arch: 'arm64' })).toBe(
      'linux-aarch64',
    )
  })

  test('maps linux x64', () => {
    expect(resolvePlatformTarget({ platform: 'linux', arch: 'x64' })).toBe(
      'linux-x64',
    )
  })

  test('appends musl on alpine linux', () => {
    expect(
      resolvePlatformTarget({
        platform: 'linux',
        arch: 'x64',
        isAlpine: true,
      }),
    ).toBe('linux-x64-musl')
  })

  test('appends baseline when avx2 is unavailable', () => {
    expect(
      resolvePlatformTarget({
        platform: 'linux',
        arch: 'x64',
        hasAvx2: false,
      }),
    ).toBe('linux-x64-baseline')
  })

  test('rejects unsupported platforms', () => {
    expect(() =>
      resolvePlatformTarget({ platform: 'win32', arch: 'x64' }),
    ).toThrow('Only macOS and Linux are supported')
  })
})

describe('parseChecksumForFile', () => {
  const shasums = `abc123def456  bun-darwin-aarch64.zip
789ghi012jkl  bun-linux-x64.zip`

  test('finds checksum for a matching file', () => {
    expect(parseChecksumForFile(shasums, 'bun-darwin-aarch64.zip')).toBe(
      'abc123def456',
    )
  })

  test('returns null when file is missing', () => {
    expect(parseChecksumForFile(shasums, 'bun-linux-arm64.zip')).toBeNull()
  })
})
