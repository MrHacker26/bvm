import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { formatBytes, readBunVersion } from './file'

describe('readBunVersion', () => {
  let root: string
  let directory: string
  let nextDirectory = 0

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'bvm-version-'))
  })

  afterAll(() => {
    rmSync(root, { recursive: true, force: true })
  })

  beforeEach(() => {
    directory = join(root, String(nextDirectory++))
    mkdirSync(directory)
  })

  test('reads and normalizes whitespace and a v prefix', () => {
    writeFileSync(join(directory, '.bun-version'), '  v1.2.5\r\n')
    expect(readBunVersion(directory)).toBe('1.2.5')
  })

  test('finds the nearest file in parent directories', () => {
    const child = join(directory, 'project', 'src')
    mkdirSync(child, { recursive: true })
    writeFileSync(join(directory, '.bun-version'), '1.0.0')
    writeFileSync(join(directory, 'project', '.bun-version'), '1.2.5')
    expect(readBunVersion(child)).toBe('1.2.5')
  })

  test('returns undefined when no file exists up to the filesystem root', () => {
    expect(readBunVersion(directory)).toBeUndefined()
  })

  test.each(['latest', '1.2.5-canary.1'])('accepts %s', (version) => {
    writeFileSync(join(directory, '.bun-version'), version)
    expect(readBunVersion(directory)).toBe(version)
  })

  test.each(['', ' \n', '1.2.5\n1.2.6', '../../other', 'not-a-version'])(
    'rejects invalid contents %j without falling back to a parent',
    (content) => {
      const child = join(directory, 'project')
      mkdirSync(child)
      writeFileSync(join(directory, '.bun-version'), '1.2.5')
      writeFileSync(join(child, '.bun-version'), content)
      expect(() => readBunVersion(child)).toThrow('Invalid Bun version')
    },
  )

  test('propagates read failures rather than treating them as missing files', () => {
    mkdirSync(join(directory, '.bun-version'))
    expect(() => readBunVersion(directory)).toThrow()
  })
})

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
