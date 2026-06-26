import { describe, expect, test } from 'bun:test'
import { formatBytes } from './file'

describe('formatBytes', () => {
  test('formats zero bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  test('formats bytes', () => {
    expect(formatBytes(512)).toBe('512.0 B')
  })

  test('formats kilobytes', () => {
    expect(formatBytes(1536)).toBe('1.5 KB')
  })

  test('formats megabytes', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})
