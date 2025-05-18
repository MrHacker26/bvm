import { homedir } from 'node:os'
import { join } from 'node:path'

export const BVM_DIR = join(homedir(), '.bvm')

export const BUN_VERSIONS_DIR = join(BVM_DIR, 'versions')
