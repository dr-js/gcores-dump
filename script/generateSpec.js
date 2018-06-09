import { resolve } from 'path'
import { writeFileSync } from 'fs'

import { runMain } from 'dev-dep-tool/library/__utils__'
import { getLogger } from 'dev-dep-tool/library/logger'
import { createExportParser } from 'dev-dep-tool/library/ExportIndex/parseExport'
import { generateExportInfo } from 'dev-dep-tool/library/ExportIndex/generateInfo'
import { renderMarkdownFileLink, renderMarkdownExportPath } from 'dev-dep-tool/library/ExportIndex/renderMarkdown'

import { stringIndentLine } from 'dr-js/module/common/format'
import { getDirectoryContent, walkDirectoryContent } from 'dr-js/module/node/file/Directory'

import { formatUsage } from 'source/option'

const PATH_ROOT = resolve(__dirname, '..')
const fromRoot = (...args) => resolve(PATH_ROOT, ...args)

const collectSourceRouteMap = async ({ logger }) => {
  const { parseExport, getSourceRouteMap } = createExportParser({ logger })
  await walkDirectoryContent(await getDirectoryContent(fromRoot('source')), (path, name) => parseExport(resolve(path, name)))
  return getSourceRouteMap()
}

const renderMarkdownBinOptionFormat = () => [
  renderMarkdownFileLink('source/option.js'),
  '> ```',
  stringIndentLine(formatUsage(), '> '),
  '> ```'
]

runMain(async (logger) => {
  logger.log(`collect sourceRouteMap`)
  const sourceRouteMap = await collectSourceRouteMap({ logger })

  logger.log(`generate exportInfo`)
  const exportInfoMap = generateExportInfo({ sourceRouteMap })

  logger.log(`output: SPEC.md`)
  writeFileSync(fromRoot('SPEC.md'), [
    '# Specification',
    '',
    '* [Export Path](#export-path)',
    '* [Bin Option Format](#bin-option-format)',
    '',
    '#### Export Path',
    ...renderMarkdownExportPath({ exportInfoMap, rootPath: PATH_ROOT }),
    '',
    '#### Bin Option Format',
    ...renderMarkdownBinOptionFormat(),
    ''
  ].join('\n'))
}, getLogger('generate-export'))
