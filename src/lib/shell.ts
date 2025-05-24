import { homedir } from 'node:os'
import { join } from 'node:path'
import { log } from './logger.js'
import { readFile, writeFile } from 'node:fs/promises'
import { BUN_COMPLETION_FILE, BUN_DIR, BUN_SYMLINK } from './constants.js'
import { exists } from './file.js'
import { execSync } from 'node:child_process'
import { Shell } from './types'

export async function setupCompletions(): Promise<void> {
  if (!(await exists(BUN_SYMLINK))) {
    log.error(`Bun binary not found at ${BUN_SYMLINK}, skipping completions`)
    return
  }

  const shell = getShell()

  if (!shell) {
    log.warn('Unknown shell. Please manually set up Bun completions.')
    return
  }

  try {
    execSync(`${BUN_SYMLINK} completions`, {
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

function getShell(): Shell | null {
  const shellPath = process.env.SHELL ?? ''
  if (shellPath.includes('bash')) return 'bash'
  if (shellPath.includes('zsh')) return 'zsh'
  if (shellPath.includes('fish')) return 'fish'
  return null
}

export function getShellConfigPath(shell: Shell): string[] {
  const home = homedir()
  switch (shell) {
    case 'bash': {
      const xdg = process.env.XDG_CONFIG_HOME
      return [
        join(home, '.bashrc'),
        join(home, '.bash_profile'),
        ...(xdg
          ? [
              join(xdg, '.bashrc'),
              join(xdg, '.bash_profile'),
              join(xdg, 'bashrc'),
              join(xdg, 'bash_profile'),
            ]
          : []),
      ]
    }
    case 'zsh':
      return [join(home, '.zshrc')]
    case 'fish':
      return [join(home, '.config', 'fish', 'config.fish')]
    default:
      return []
  }
}

async function configureShell(shell: Shell): Promise<void> {
  const bunInstallLine = `export BUN_INSTALL="${BUN_DIR}"\n`
  const pathLine = `export PATH="$BUN_INSTALL/bin:$PATH"\n`
  const completionLine = `[ -s "${BUN_COMPLETION_FILE}" ] && source "${BUN_COMPLETION_FILE}"\n`

  if (shell === 'fish') {
    const configFile = join(homedir(), '.config', 'fish', 'config.fish')
    const fishLines = [
      `set --export BUN_INSTALL "${BUN_DIR}"`,
      `set --export PATH "$BUN_INSTALL/bin" $PATH`,
    ]
    if (await exists(configFile)) {
      const content = await readFile(configFile, 'utf8')
      const missingLines = fishLines.filter((line) => !content.includes(line))
      if (missingLines.length) {
        await writeFile(configFile, `\n# bun\n${missingLines.join('\n')}\n`, {
          flag: 'a',
        })
        log.success(`Updated ${configFile} with Bun config`)
      }
    }
    return
  }

  const configPaths = getShellConfigPath(shell)

  for (const configPath of configPaths) {
    if (await exists(configPath)) {
      const content = await readFile(configPath, 'utf8')
      let updated = false
      let newContent = content

      if (!content.includes('BUN_INSTALL')) {
        newContent += `\n# bun\n${bunInstallLine}${pathLine}`
        updated = true
      }

      if (!content.includes(BUN_COMPLETION_FILE)) {
        newContent += `\n# bun completions\n${completionLine}`
        updated = true
      }

      if (updated) {
        await writeFile(configPath, newContent)
        log.success(`Updated ${configPath} with Bun configuration`)
      }
      return
    }
  }

  log.warn(`No writable ${shell} config file found. Please add manually.`)
}

export async function autoConfigureShell(): Promise<void> {
  const shell = getShell()
  if (!shell) {
    log.warn('Unknown shell. Please manually add Bun to your shell config.')
    return
  }

  await configureShell(shell)
}
