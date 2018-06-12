import { COMMON_LAYOUT, COMMON_STYLE, COMMON_SCRIPT, DR_BROWSER_SCRIPT } from 'dr-js/module/node/server/commonHTML'

import { initI18N } from './script/I18N'
import { initMainStore } from './script/mainStore'
import { initCacheStore } from './script/cacheStore'
import { initAudioStore } from './script/audioStore'
import { initRender, initRenderStatus, initCacheOperation, renderStyle, renderHTML } from './script/render'

const getHTML = ({ envObject, FAVICON_URL, MANIFEST_URL, CSS_URL, FONT_URL }) => COMMON_LAYOUT([
  `<title>G-core Dump</title>`,
  `<meta name="theme-color" content="#ffffff">`,
  `<meta name="description" content="Offline first Gadio.">`,
  `<link rel="shortcut icon" href="${FAVICON_URL}">`,
  `<link rel="manifest" href="${MANIFEST_URL}">`,
  `<link rel="stylesheet" href="${CSS_URL}" />`,
  `<link rel="preload" href="${FONT_URL}" as="font" crossorigin="anonymous" />`,
  COMMON_STYLE(),
  chromeFixStyle,
  renderStyle
], [
  renderHTML,
  COMMON_SCRIPT({ ...envObject, initI18N, initMainStore, initCacheStore, initAudioStore, initRender, initRenderStatus, initCacheOperation, onload: onLoadFunc }),
  DR_BROWSER_SCRIPT(),
  `<script>qS('#main-panel', 'Script loading…<br />代码加载中…<br />' + navigator.userAgent)</script>`
])

// TODO: Chrome PWA display standalone & fullscreen not working: https://stackoverflow.com/a/49414031
const chromeFixStyle = `<style>
html { overflow: hidden } 
body { height:100%; position:fixed; } 
</style>`

// TODO: pull out this service worker init step

// TODO: add router & support back button
// TODO: add fullscreen modal popup (setting, search)
// TODO: add keyboard shortcuts (play/pause)

const onLoadFunc = async () => {
  const {
    alert, confirm, fetch, location, navigator, localStorage, MessageChannel, Request,
    SERVICE_WORKER_URL, CACHE_CONFIG_URL, AUDIO_LIST_FETCH_URL,
    qS, cE,
    initI18N, initMainStore, initCacheStore, initAudioStore, initRender, initRenderStatus, initCacheOperation,
    Dr: {
      Common: { Error: { catchAsync }, Function: { debounce } },
      Browser: { Module: { StateStorage: { createSyncStateStorage } } }
    }
  } = window

  const T = initI18N()

  qS('#main-panel', T('step-init'))

  if (!('serviceWorker' in navigator)) return qS('#main-panel', T('feat-service-worker'))
  const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL).catch((error) => { console.error('ServiceWorker registration failed:', error) })
  if (!registration) return qS('#main-panel', T('feat-error-service-worker'))
  __DEV__ && console.log('ServiceWorker Registration succeeded:', registration)
  const resetCode = () => tryPostServiceWorker({ data: { type: 'reset-code' }, preCheck: () => navigator.onLine && confirm(T('message-reset-code')) })
    .then(deleteAudioList)
    .then(() => {
      alert(T('message-reset-code-done'))
      location.reload()
    }, () => {})
  const resetAll = () => tryPostServiceWorker({ data: { type: 'reset-all' }, preCheck: () => confirm(T('message-reset-all')) })
    .then(() => {
      localStorage.clear()
      alert(T('message-reset-all-done'))
    }, () => {})

  const tryPostServiceWorker = ({ data = {}, preCheck = () => true }) => new Promise((resolve, reject) => {
    if (!navigator.serviceWorker.controller) return reject(new Error('serviceWorker.no controller'))
    if (!preCheck()) return reject(new Error('preCheck failed'))
    const messageChannel = new MessageChannel() // for result
    messageChannel.port1.onmessage = (event) => {
      __DEV__ && console.log('service response', event.data)
      const { result, error } = event.data
      error ? reject(error) : resolve(result)
    }
    navigator.serviceWorker.controller.postMessage(data, [ messageChannel.port2 ])
  })

  qS('#main-panel', T('step-load-cache'))

  const { resourceCacheKey } = await (await fetch(CACHE_CONFIG_URL)).json()
  __DEV__ && console.log('loaded cacheConfig resourceCacheKey:', { resourceCacheKey })

  const { initialState: initialMainState, createMainStore, toStorageState } = initMainStore()
  const { createAudioStore } = initAudioStore()
  const { initialState: initialCacheState, createCacheStore } = initCacheStore(resourceCacheKey)

  const cacheStateStorage = createSyncStateStorage({ keyPrefix: '[cache-state]' })
  const cacheStore = await createCacheStore(cacheStateStorage.init(initialCacheState))
  cacheStateStorage.save(cacheStore.getState())
  __DEV__ && console.log('initialCacheState', cacheStore.getState())
  cacheStore.subscribe(debounce((state) => {
    __DEV__ && console.log('cacheStateStorage.save', state)
    cacheStateStorage.save(state)
    updateStorageStatus()
  }))

  const audioStore = createAudioStore()

  const mainStateStorage = createSyncStateStorage({ keyPrefix: '[main-state]' })
  const mainStore = createMainStore(mainStateStorage.init(initialMainState))
  await mainStore.refreshStorageStatus()
  mainStateStorage.save(toStorageState(mainStore.getState()))
  __DEV__ && console.log('initialMainState', mainStore.getState())
  mainStore.subscribe(debounce((state) => {
    __DEV__ && console.log('mainStateStorage.save', state)
    mainStateStorage.save(toStorageState(state))
  }))

  const { renderLoading, withLoading, updateLoadingStatus, asyncRenderModal, updateStorageStatus } = initRenderStatus({ mainStore, T })
  const { cacheAudioList, deleteAudioList, cacheAudio, deleteAudio } = initCacheOperation({ cacheStore, mainStore, T, updateLoadingStatus })
  const { renderAudioList, renderAudio, renderControlPanel, setFilterDownload, setFilterStar, setFilterTime, updateControlConfig } = initRender({
    audioStore, cacheStore, mainStore, T, resetCode, resetAll, withLoading, updateStorageStatus, asyncRenderModal, cacheAudio, deleteAudio
  })

  { // test AUDIO_LIST_FETCH_URL cache as first time open
    const { result } = await catchAsync(cacheStore.getResponseByUrl, new Request(AUDIO_LIST_FETCH_URL).url)
    !result && await asyncRenderModal((resolve) => [
      cE('div', { className: 'margin', innerText: T('message-welcome') }),
      cE('div', { className: 'margin', innerText: T('message-cache-audio-list') }),
      cE('button', { innerText: T('text-start-cache'), onclick: resolve })
    ])
  }

  qS('#main-panel', T('step-cache-audio-list'))
  mainStore.updateAudioListState({ audioList: await withLoading(cacheAudioList) })

  qS('#main-panel', T('step-render-ui'))

  { // set most relevant filter
    const { audioCacheStarList, audioCacheSizeMap } = mainStore.getState()
    if (Object.keys(audioCacheSizeMap).length) setFilterDownload()
    else if (audioCacheStarList.length) setFilterStar()
    else setFilterTime()
  }
  renderControlPanel()
  renderAudioList({})

  mainStore.subscribe(({ audioListState, audioState, currentPanel, isAudioListMinimize, audioCacheStarList, audioCacheSizeMap }, prevState) => {
    const isSwitchPanel = currentPanel !== prevState.currentPanel
    if (currentPanel === 'audio') {
      (isSwitchPanel || audioState !== prevState.audioState) && renderAudio()
    }
    if (currentPanel === 'audio-list') {
      if (isSwitchPanel || audioListState !== prevState.audioListState) renderAudioList({})
      else if (
        audioCacheSizeMap !== prevState.audioCacheSizeMap ||
        audioCacheStarList !== prevState.audioCacheStarList ||
        isAudioListMinimize !== prevState.isAudioListMinimize
      ) renderAudioList({ isSkipScrollReset: true })
    }
  })

  // check update
  const updateServiceWorkerController = async () => {
    __DEV__ && console.log('This page is now controlled by:', navigator.serviceWorker.controller)
    let hasUpdate = false
    if (navigator.onLine) {
      __DEV__ && console.log('check code update')
      const result = await tryPostServiceWorker({ data: { type: 'check-update' } }).catch(() => ({ isUpdate: false }))
      __DEV__ && console.log('check code update result', result)
      hasUpdate = result.isUpdate
    }
    updateControlConfig({ hasController: Boolean(navigator.serviceWorker.controller), hasUpdate })
  }
  navigator.serviceWorker.controller && await updateServiceWorkerController()
  navigator.serviceWorker.oncontrollerchange = updateServiceWorkerController

  if (__DEV__) window.DEBUG = { cacheStore, audioStore, mainStore, T, renderLoading }
}

export { getHTML }
