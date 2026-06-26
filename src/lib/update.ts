import updateNotifier from 'update-notifier'
import { isInteractive } from './interactive'
import { name, version } from '../../package.json'

function shouldSkipUpdateCheck(argv: string[]): boolean {
  const args = argv.slice(2)

  if (args.includes('upgrade')) {
    return true
  }

  if (args.includes('--version') || args.includes('-V')) {
    return true
  }

  if (args.includes('--help') || args.includes('-h')) {
    return true
  }

  return false
}

export function notifyUpdate(argv: string[] = process.argv): void {
  if (!isInteractive()) {
    return
  }

  if (shouldSkipUpdateCheck(argv)) {
    return
  }

  const notifier = updateNotifier({
    pkg: { name, version },
    updateCheckInterval: 1000 * 60 * 60 * 24,
  })

  notifier.notify({
    isGlobal: true,
    message:
      'Update available {currentVersion} → {latestVersion}\n' +
      'Run `bvm upgrade` for update instructions.',
  })
}
