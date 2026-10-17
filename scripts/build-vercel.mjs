import { execSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))

execSync('npm run build:public && npm run build:admin', {
  cwd: root,
  stdio: 'inherit',
})

const outputDirectory = resolve(root, 'dist')
rmSync(outputDirectory, { recursive: true, force: true })
mkdirSync(outputDirectory, { recursive: true })
cpSync(resolve(root, 'apps/public/dist'), outputDirectory, { recursive: true })
cpSync(resolve(root, 'apps/admin/dist'), resolve(outputDirectory, 'admin'), { recursive: true })
