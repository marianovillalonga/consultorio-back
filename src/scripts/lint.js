import fs from 'fs/promises'
import path from 'path'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectDir = path.resolve(scriptDir, '../..')
const scanDirs = ['src', 'tests']

const collectJsFiles = async (dirPath) => {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const files = []

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)
        if (entry.isDirectory()) {
            files.push(...await collectJsFiles(fullPath))
            continue
        }
        if (entry.isFile() && fullPath.endsWith('.js')) {
            files.push(fullPath)
        }
    }

    return files
}

const main = async () => {
    const files = []
    for (const dir of scanDirs) {
        files.push(...await collectJsFiles(path.join(projectDir, dir)))
    }

    for (const filePath of files) {
        const result = spawnSync(process.execPath, ['--check', filePath], {
            stdio: 'inherit'
        })
        if (result.status !== 0) {
            process.exit(result.status || 1)
        }
    }

    console.log(`Lint backend OK: ${files.length} archivos revisados`)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
