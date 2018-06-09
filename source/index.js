import { configureFilePid } from 'dr-server/module/configure/filePid'
import { configureLogger } from 'dr-server/module/configure/logger'
import { configureServerBase } from 'dr-server/module/configure/serverBase'

import { parseOption, formatUsage } from './option'
import { configureResponder } from './responder'
import { prepareAudioDumpJSON } from './prepareStatic'
import { name as packageName, version as packageVersion } from '../package.json'

const runServer = async (hostname, { getOptionOptional, getSingleOption, getSingleOptionOptional }) => {
  await configureFilePid({
    filePid: getSingleOptionOptional('file-pid'),
    shouldIgnoreExistPid: getSingleOptionOptional('pid-ignore-exist')
  })

  const isHttps = getOptionOptional('https')
  const { server, start, option } = await configureServerBase({
    protocol: isHttps ? 'https:' : 'http:',
    hostname: getSingleOption('hostname'),
    port: getSingleOption('port'),
    fileSSLKey: getSingleOptionOptional('file-SSL-key'),
    fileSSLCert: getSingleOptionOptional('file-SSL-cert'),
    fileSSLChain: getSingleOptionOptional('file-SSL-chain'),
    fileSSLDHParam: getSingleOptionOptional('file-SSL-dhparam')
  })

  const logger = await configureLogger({
    pathLogDirectory: getSingleOptionOptional('path-log'),
    prefixLogFile: getSingleOptionOptional('prefix-log-file')
  })

  const version = `${packageName}@${packageVersion}`
  const fileGcoresDumpList = getOptionOptional('file-gcores-dump') || []
  const pathPreparedStatic = getSingleOptionOptional('path-prepared-static')

  await prepareAudioDumpJSON({ fileGcoresDumpList, pathPreparedStatic, version, logger })
  if (fileGcoresDumpList.length) {
    logger.add(`[PREPARE] done loading Gcores Dump, exiting...`)
    logger.end()
    return
  }

  await configureResponder({ pathPreparedStatic, server, option, logger })

  start()

  logger.add(`[SERVER UP] pid: ${process.pid}, running at: ${option.baseUrl}, version: ${version}`)
}

const main = async () => {
  const optionData = await parseOption()
  const hostname = optionData.getSingleOptionOptional('hostname')

  if (hostname) {
    await runServer(hostname, optionData).catch((error) => {
      console.warn(`[Error] server:`, error.stack || error)
      process.exit(2)
    })
  } else optionData.getOptionOptional('version') ? console.log(JSON.stringify({ packageName, packageVersion }, null, '  ')) : console.log(formatUsage())
}

main().catch((error) => {
  console.warn(formatUsage(error.stack || error, 'simple'))
  process.exit(1)
})
