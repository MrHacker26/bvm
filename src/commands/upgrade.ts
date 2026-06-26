import chalk from 'chalk'
import { log } from '../lib/logger'
import { version } from '../../package.json'

const UPGRADE_COMMANDS = [
  { manager: 'npm', command: 'npm update -g bunvm' },
  { manager: 'pnpm', command: 'pnpm update -g bunvm' },
  { manager: 'yarn', command: 'yarn global upgrade bunvm' },
  { manager: 'bun', command: 'bun update -g bunvm' },
] as const

export function upgradeBvm(): void {
  log.log(`Current bvm version: ${chalk.green(`v${version}`)}`)
  log.log('')
  log.log('To update bvm, run one of:')
  log.log('')

  for (const { manager, command } of UPGRADE_COMMANDS) {
    log.log(`  ${chalk.cyan(manager.padEnd(5))} ${command}`)
  }
}
