import { resolve } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { loadLocalJSON } from 'dr-js/module/node/resource'
import { createDirectory } from 'dr-js/module/node/file/File'
import { getFileList } from 'dr-js/module/node/file/Directory'
import { modify } from 'dr-js/module/node/file/Modify'
import { compressFileList } from 'dr-js/module/node/file/Compress'

/* s/ (static)
  audio/:key.json // will merge on load
  audio-list.json // will merge on load
  cache-config.json // version will be rewrite to match package.json
  manifest.json
  service-worker.js // pulled up for scope
  logo/:size.png
*/

const prepareAudioDumpJSON = async ({ fileGcoresDumpList = [], pathPreparedStatic, version, logger }) => {
  await createDirectory(pathPreparedStatic)

  // NOTE: the path will be the output of 'source-static'
  await modify.copy(resolve(__dirname, '../static'), pathPreparedStatic)

  // will rewrite cache-config.json
  const pathCacheConfig = resolve(pathPreparedStatic, 'cache-config.json')
  writeFileSync(pathCacheConfig, JSON.stringify({ ...JSON.parse(readFileSync(pathCacheConfig, { encoding: 'utf8' })), version }))

  // TODO: split pack audio list by every 3 month?
  const pathAudioList = resolve(pathPreparedStatic, 'audio-list.json')
  let audioList = []

  try {
    audioList = JSON.parse(readFileSync(pathAudioList, { encoding: 'utf8' }))
  } catch (error) { __DEV__ && console.warn('failed to load existing audioList') }

  if (fileGcoresDumpList.length) {
    for (const fileGcoresDump of fileGcoresDumpList) {
      logger.add(`[PREPARE] loading Gcores Dump file: ${fileGcoresDump}`)
      const { pageDataList, radioDataList } = await loadLocalJSON(fileGcoresDump)

      // just concat, will deduplicate & sort later
      audioList = [ ...pageDataList, ...audioList ]

      // NOTE: split pack each audio
      await createDirectory(resolve(pathPreparedStatic, 'audio'))
      for (const radioData of radioDataList) {
        writeFileSync(
          resolve(pathPreparedStatic, 'audio', `${encodeURIComponent(radioData.url)}.json`),
          JSON.stringify(radioData)
        )
      }

      logger.add(`[PREPARE] loaded Gcores Dump file: ${fileGcoresDump}, pageDataList: ${pageDataList.length}, radioDataList: ${radioDataList.length}`)
    }

    // update audio-list.json
    const existUrlSet = new Set()
    audioList = audioList
      .filter(({ url }) => existUrlSet.has(url) ? false : existUrlSet.add(url)) // deduplicate
      .sort((a, b) => Date.parse(b) - Date.parse(a)) // sort
    writeFileSync(pathAudioList, JSON.stringify(audioList))
    logger.add(`[PREPARE] result audioList: ${audioList.length}`)
  }

  if (!audioList.length) throw new Error('[Error] empty audioList, load some Gcores Dump file first')

  for (const filePath of await getFileList(pathPreparedStatic)) {
    filePath.endsWith('.gz') && await modify.delete(filePath) // delete old gzip file
  }

  await compressFileList({ fileList: await getFileList(pathPreparedStatic) })
}

export { prepareAudioDumpJSON }
