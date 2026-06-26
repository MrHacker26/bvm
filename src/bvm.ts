#!/usr/bin/env node

import { Command } from 'commander'
import { installBun } from './commands/install'
import { useVersion } from './commands/use'
import {
  listRemoteVersions,
  listVersions,
  currentVersion,
} from './commands/versions'
import { uninstallBun } from './commands/uninstall'
import { upgradeBvm } from './commands/upgrade'
import { log } from './lib/logger'
import { notifyUpdate } from './lib/update'
import { version } from '../package.json'

notifyUpdate()

const program = new Command()

function runCommand(action: () => void | Promise<void>): void {
  Promise.resolve(action()).catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred.'
    log.error(message)
    process.exit(1)
  })
}

program
  .name('bvm')
  .description('Bun Version Manager - Manage multiple Bun versions')
  .version(version)

program
  .command('install [version]')
  .alias('i')
  .description('Install a specific Bun version (interactive if omitted)')
  .action((version?: string) => runCommand(() => installBun(version)))

program
  .command('use [version]')
  .description('Use a specific Bun version (interactive if omitted)')
  .action((version?: string) => runCommand(() => useVersion(version)))

program
  .command('uninstall [version]')
  .alias('u')
  .description('Uninstall a specific Bun version (interactive if omitted)')
  .action((version?: string) => runCommand(() => uninstallBun(version)))

program
  .command('current')
  .description('Display currently activated version of Bun')
  .action(() => runCommand(currentVersion))

program
  .command('list')
  .alias('ls')
  .description('List installed Bun versions')
  .action(() => runCommand(listVersions))

program
  .command('remote')
  .alias('r')
  .description('List remote Bun versions')
  .action(() => runCommand(listRemoteVersions))

program
  .command('upgrade')
  .description('Show how to update bvm to the latest version')
  .action(() => runCommand(upgradeBvm))

program.parse()
