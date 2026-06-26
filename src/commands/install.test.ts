import { describe, expect, test } from 'bun:test'
import { formatInstallHint } from './install'

describe('formatInstallHint', () => {
  const latest = '1.2.5'
  const installed = new Set(['1.2.5', '1.1.0'])

  test('returns latest hint for the newest release', () => {
    expect(formatInstallHint('1.2.5', latest, installed, '1.2.5')).toBe(
      'latest, installed, current',
    )
  })

  test('returns installed hint for an older installed version', () => {
    expect(formatInstallHint('1.1.0', latest, installed, '1.2.5')).toBe(
      'installed',
    )
  })

  test('returns undefined for a remote-only version', () => {
    expect(formatInstallHint('1.0.0', latest, installed, '1.2.5')).toBe(
      undefined,
    )
  })

  test('combines latest and installed when not current', () => {
    expect(formatInstallHint('1.2.5', latest, installed, '1.1.0')).toBe(
      'latest, installed',
    )
  })
})
