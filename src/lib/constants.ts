import { homedir } from 'node:os'
import { join } from 'node:path'

export const BUN_DIR = join(homedir(), '.bun')

export const BUN_BIN_DIR = join(BUN_DIR, 'bin')

export const BUN_SYMLINK = join(BUN_BIN_DIR, 'bun')

export const BUNX_SYMLINK = join(BUN_BIN_DIR, 'bunx')

export const BVM_DIR = join(homedir(), '.bvm')

export const BUN_VERSIONS_DIR = join(BVM_DIR, 'versions')

export const GITHUB_API_URL = 'https://api.github.com'

export const GITHUB_RELEASES_URL = `${GITHUB_API_URL}/repos/oven-sh/bun/releases`

export const BUN_COMPLETION_FILE = join(BUN_DIR, '_bun')
