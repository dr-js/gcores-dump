import { BASIC_EXTENSION_MAP } from 'dr-js/module/common/module/MIME'
import { createPathPrefixLock } from 'dr-js/module/node/file/function'
import { createRequestListener } from 'dr-js/module/node/server/Server'
import { responderEnd, createResponderParseURL, createResponderLog, createResponderLogEnd } from 'dr-js/module/node/server/Responder/Common'
import { responderSendBufferCompress, createResponderFavicon, prepareBufferData } from 'dr-js/module/node/server/Responder/Send'
import { createResponderRouter, createRouteMap, getRouteParamAny } from 'dr-js/module/node/server/Responder/Router'
import { createResponderServeStatic } from 'dr-js/module/node/server/Responder/ServeStatic'

import { getHTML } from './browser/mainHTML'

/* s/ (static)
  audio-list.json
  audio/:key.json
  service-worker.js (pulled up for scope)
  manifest.json
  logo/:size.png
*/

const configureResponder = async ({ pathPreparedStatic, server, option, logger }) => {
  // prepare and split dumped json to fs with gzip

  const mainBufferData = prepareBufferData(getHTML({
    envObject: {
      SERVICE_WORKER_URL: '/service-worker.js',
      CACHE_CONFIG_URL: '/s/cache-config.json',
      AUDIO_LIST_FETCH_URL: '/s/audio-list.json',
      AUDIO_PATH_FETCH_URL: '/s/audio/',
      LOGO_URL: '/s/logo/512.png'
    },
    FAVICON_URL: '/s/logo/32.png',
    MANIFEST_URL: '/s/manifest.json',
    CSS_URL: '/s/font/index.css',
    FONT_URL: '/s/font/Material-Icons.woff2'
  }), BASIC_EXTENSION_MAP.html)

  const fromStatic = createPathPrefixLock(pathPreparedStatic)
  const responderServeStatic = createResponderServeStatic({ isEnableGzip: true })

  const responderLogEnd = createResponderLogEnd(logger.add)

  const routerMap = createRouteMap([
    [ '/service-worker.js', 'GET', (store) => responderServeStatic(store, fromStatic('service-worker.js')) ],
    [ '/s/*', 'GET', (store) => responderServeStatic(store, fromStatic(getRouteParamAny(store))) ],
    [ '/', 'GET', (store) => responderSendBufferCompress(store, mainBufferData) ],
    [ [ '/favicon', '/favicon.ico' ], 'GET', createResponderFavicon() ]
  ].filter(Boolean))

  server.on('request', createRequestListener({
    responderList: [
      createResponderParseURL(option),
      createResponderLog(logger.add),
      createResponderRouter(routerMap)
    ],
    responderEnd: (store) => {
      responderEnd(store)
      responderLogEnd(store)
    }
  }))
}

export { configureResponder }
