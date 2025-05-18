import { homedir } from 'node:os'
import { join } from 'node:path'

export const BVM_DIR = join(homedir(), '.bvm')

export const BUN_VERSIONS_DIR = join(BVM_DIR, 'versions')

export const GITHUB_API_URL = 'https://api.github.com'

export const GITHUB_RELEASES_URL = `${GITHUB_API_URL}/repos/oven-sh/bun/releases`
