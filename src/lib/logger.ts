import chalk from 'chalk'

export const log = {
  log: (msg: string) => console.log(msg),
  info: (msg: string) => console.log(`${chalk.blue('i')} ${msg}`),
  success: (msg: string) => console.log(`${chalk.green('✅')} ${msg}`),
  warn: (msg: string) =>
    console.warn(`${chalk.yellow('⚠️')} ${chalk.yellow(msg)}`),
  error: (msg: string) => console.error(`${chalk.red('❌')} ${chalk.red(msg)}`),
}
