import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const cli = fileURLToPath(new URL('../bvm.ts', import.meta.url))

describe('project version commands', () => {
  let directory: string
  let home: string
  let project: string

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'bvm-commands-'))
    home = join(directory, 'home')
    project = join(directory, 'project')
    mkdirSync(home)
    mkdirSync(join(project, 'src'), { recursive: true })
    const versionDir = join(home, '.bvm', 'versions', '1.2.5')
    mkdirSync(versionDir, { recursive: true })
    writeFileSync(join(versionDir, 'bun'), '')
  })

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true })
  })

  function run(command: string, version?: string) {
    return spawnSync(
      process.execPath,
      [cli, command, ...(version ? [version] : [])],
      {
        cwd: join(project, 'src'),
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          SHELL: '',
          NO_UPDATE_NOTIFIER: '1',
        },
      },
    )
  }

  test.each(['use', 'install'])(
    '%s selects an inherited version in non-interactive mode',
    (command) => {
      writeFileSync(join(project, '.bun-version'), 'v1.2.5\n')
      const result = run(command)
      expect(result.status).toBe(0)
      expect(result.stdout).toContain('Now using Bun 1.2.5')
      for (const binary of ['bun', 'bunx']) {
        expect(readlinkSync(join(home, '.bun', 'bin', binary))).toBe(
          join(home, '.bvm', 'versions', '1.2.5', 'bun'),
        )
      }
    },
  )

  test.each(['use', 'install'])(
    '%s gives explicit arguments priority over invalid project files',
    (command) => {
      writeFileSync(join(project, '.bun-version'), 'invalid')
      const result = run(command, '1.2.5')
      expect(result.status).toBe(0)
      expect(result.stdout).toContain('Now using Bun 1.2.5')
    },
  )
})
