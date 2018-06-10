import { resolve } from 'path'
import { execSync } from 'child_process'

import { argvFlag, runMain } from 'dev-dep-tool/library/__utils__'
import { getLogger } from 'dev-dep-tool/library/logger'
import { wrapFileProcessor, fileProcessorBabel } from 'dev-dep-tool/library/fileProcessor'
import { initOutput, packOutput, publishOutput } from 'dev-dep-tool/library/commonOutput'
import { getUglifyESOption, minifyFileListWithUglifyEs } from 'dev-dep-tool/library/uglify'

import { binary as formatBinary } from 'dr-js/module/common/format'
import { getFileList } from 'dr-js/module/node/file/Directory'
import { modify } from 'dr-js/module/node/file/Modify'

const PATH_ROOT = resolve(__dirname, '..')
const PATH_OUTPUT = resolve(__dirname, '../output-gitignore')
const fromRoot = (...args) => resolve(PATH_ROOT, ...args)
const fromOutput = (...args) => resolve(PATH_OUTPUT, ...args)
const execOptionRoot = { cwd: fromRoot(), stdio: argvFlag('quiet') ? [ 'ignore', 'ignore' ] : 'inherit', shell: true }

const buildOutput = async ({ logger: { padLog } }) => {
  padLog(`build library`)
  execSync('npm run build-library', execOptionRoot)

  padLog(`build static`)
  execSync('npm run build-static', execOptionRoot)

  padLog('generate export info')
  execSync(`npm run script-generate-spec`, execOptionRoot)
}

const processOutput = async ({ packageJSON, logger }) => {
  const { padLog, log } = logger

  const fileList = [
    ...await getFileList(fromOutput())
  ].filter((path) => path.endsWith('.js') && !path.endsWith('.test.js'))

  padLog(`minify output`)
  let sizeCodeReduceModule = await minifyFileListWithUglifyEs({ fileList, option: getUglifyESOption({}), rootPath: PATH_OUTPUT, logger })

  log(`process output`)
  const processBabel = wrapFileProcessor({ processor: fileProcessorBabel, logger })
  for (const filePath of fileList) sizeCodeReduceModule += await processBabel(filePath)
  log(`output size reduce: ${formatBinary(sizeCodeReduceModule)}B`)
}

runMain(async (logger) => {
  const packageJSON = await initOutput({ fromRoot, fromOutput, logger })

  logger.padLog(`copy bin`)
  await modify.copy(fromRoot('source-bin/index.js'), fromOutput('bin/index.js'))
  if (!argvFlag('pack')) return

  await buildOutput({ logger })
  await processOutput({ packageJSON, logger })

  const pathPackagePack = await packOutput({ fromRoot, fromOutput, logger })
  await publishOutput({ flagList: process.argv, packageJSON, pathPackagePack, logger })
}, getLogger(process.argv.slice(2).join('+'), argvFlag('quiet')))
