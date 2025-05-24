#!/usr/bin/env node

import { Command } from 'commander'
import { installBun } from './commands/install'
import { useVersion } from './commands/use'
import { listRemoteVersions, listVersions } from './commands/versions'
import { uninstallBun } from './commands/uninstall'

const program = new Command()

program
  .name('bvm')
  .description('Bun Version Manager - Manage multiple Bun versions')
  .version('1.0.0')

program
  .command('install <version>')
  .alias('i')
  .description('Install a specific Bun version')
  .action(installBun)

program
  .command('use <version>')
  .description('Use a specific Bun version')
  .action(useVersion)

program
  .command('uninstall <version>')
  .alias('u')
  .description('Uninstall a specific Bun version')
  .action(uninstallBun)

program
  .command('list')
  .alias('ls')
  .description('List installed Bun versions')
  .action(listVersions)

program
  .command('remote')
  .alias('r')
  .description('List remote Bun versions')
  .action(listRemoteVersions)

program.parse()
