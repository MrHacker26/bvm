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
import { version } from '../package.json'

const program = new Command()

program
  .name('bvm')
  .description('Bun Version Manager - Manage multiple Bun versions')
  .version(version)

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
  .command('current')
  .description('Display currently activated version of Bun')
  .action(currentVersion)

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
