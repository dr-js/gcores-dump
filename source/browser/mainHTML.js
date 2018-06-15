import { COMMON_LAYOUT, COMMON_STYLE, COMMON_SCRIPT, DR_BROWSER_SCRIPT } from 'dr-js/module/node/server/commonHTML'

import { initI18N } from './script/I18N'
import { initServiceWorker } from './script/serviceWorker'
import { initMainStore } from './script/mainStore'
import { initCacheStore } from './script/cacheStore'
import { initAudioStore } from './script/audioStore'
import { initCacheOperation } from './script/cacheOperation'

import { initRenderModal } from './render/renderModal'
import { initRender, renderStyle, renderHTML } from './render/render'

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
  COMMON_SCRIPT({
    ...envObject,

    initI18N,
    initServiceWorker,
    initMainStore,
    initCacheStore,
    initAudioStore,
    initCacheOperation,

    initRenderModal,
    initRender,

    onload: onLoadFunc
  }),
  DR_BROWSER_SCRIPT(),
  `<script>qS('#main-panel', 'Script loading…<br />代码加载中…<br />' + navigator.userAgent)</script>`
])

// TODO: Chrome PWA display standalone & fullscreen not working: https://stackoverflow.com/a/49414031
const chromeFixStyle = `<style>
html { overflow: hidden }
body { height:100%; position:fixed; }
</style>`

// TODO: NEXT: add router & support back button
// TODO: NEXT: pull author data up to audio list

const onLoadFunc = async () => {
  const {
    alert, confirm, fetch, location, navigator, localStorage,
    SERVICE_WORKER_URL, CACHE_CONFIG_URL, AUDIO_LIST_FETCH_URL,
    qS, cE,
    initI18N, initServiceWorker, initMainStore, initCacheStore, initAudioStore, initCacheOperation,
    initRenderModal, initRender,
    Dr: {
      Common: {
        Error: { catchAsync },
        Function: { debounce, lossyAsync }
      },
      Browser: {
        Module: { StateStorage: { createSyncStateStorage } }
      }
    }
  } = window

  const T = initI18N()
  const { cacheAudioListRedundantCheck, cacheAudioList, deleteAudioList, cacheAudio, deleteAudio } = initCacheOperation({ T })
  const { renderLoading, withLoading, updateLoadingStatus, asyncRenderModal, updateStorageStatus } = initRenderModal({ T })

  document.title = T('text-gcores-dump')

  qS('#main-panel', T('step-init'))

  // TODO: pull out this service worker init step
  const { isServiceWorkerAvailable, tryRegisterServiceWorker, tryPostServiceWorker } = initServiceWorker()
  if (!isServiceWorkerAvailable()) return qS('#main-panel', T('feat-service-worker'))
  try { await tryRegisterServiceWorker(SERVICE_WORKER_URL) } catch (error) {
    console.error('ServiceWorker registration failed:', error)
    return qS('#main-panel', T('feat-error-service-worker'))
  }
  const resetRebuild = lossyAsync(async () => {
    await tryPostServiceWorker({ data: { type: 'reset-code' }, preCheck: () => navigator.onLine && confirm(T('message-reset-rebuild')) })
    await deleteAudioList({ cacheStore })
    mainStore.setIsDoneCacheVerify(false)
    mainStore.setIsDoneCacheRebuild(false)
    createSyncStateStorage({ keyPrefix: '[cache-state]' }).save(cacheStore.getState())
    createSyncStateStorage({ keyPrefix: '[main-state]' }).save(toStorageState(mainStore.getState()))
    alert(T('message-reset-rebuild-done'))
    location.reload()
  }).trigger
  const resetCode = lossyAsync(async () => {
    await tryPostServiceWorker({ data: { type: 'reset-code' }, preCheck: () => navigator.onLine && confirm(T('message-reset-code')) })
    await deleteAudioList({ cacheStore })
    mainStore.setIsDoneCacheVerify(false)
    createSyncStateStorage({ keyPrefix: '[cache-state]' }).save(cacheStore.getState())
    createSyncStateStorage({ keyPrefix: '[main-state]' }).save(toStorageState(mainStore.getState()))
    alert(T('message-reset-code-done'))
    location.reload()
  }).trigger
  const resetAll = lossyAsync(async () => {
    await tryPostServiceWorker({ data: { type: 'reset-all' }, preCheck: () => confirm(T('message-reset-all')) })
    localStorage.clear()
    alert(T('message-reset-all-done'))
  }).trigger

  qS('#main-panel', T('step-load-cache'))

  const { resourceCacheKey } = await (await fetch(CACHE_CONFIG_URL)).json()
  __DEV__ && console.log('loaded cacheConfig resourceCacheKey:', { resourceCacheKey })

  const { initialState: initialCacheState, createCacheStore, verifyCacheState } = initCacheStore(resourceCacheKey)
  const { initialState: initialMainState, createMainStore, toStorageState } = initMainStore()
  const { createAudioStore } = initAudioStore()

  const mainStore = await (async () => {
    const mainStateStorage = createSyncStateStorage({ keyPrefix: '[main-state]' })
    const mainStore = createMainStore(mainStateStorage.init(initialMainState))
    await mainStore.refreshStorageStatus()
    mainStateStorage.save(toStorageState(mainStore.getState()))
    __DEV__ && console.log('initialMainState', mainStore.getState())
    mainStore.subscribe(debounce((state) => {
      __DEV__ && console.log('mainStateStorage.save', state)
      mainStateStorage.save(toStorageState(state))
    }))
    return mainStore
  })()

  const cacheStore = await (async () => {
    const cacheStateStorage = createSyncStateStorage({ keyPrefix: '[cache-state]' })
    const cacheStore = await createCacheStore(cacheStateStorage.init(initialCacheState))
    cacheStateStorage.save(cacheStore.getState())
    __DEV__ && console.log('initialCacheState', cacheStore.getState())
    cacheStore.subscribe(debounce((state) => {
      __DEV__ && console.log('cacheStateStorage.save', state)
      cacheStateStorage.save(state)
      updateStorageStatus({ mainStore })
    }))
    return cacheStore
  })()

  { // test AUDIO_LIST_FETCH_URL cache as first time open
    const { result } = await catchAsync(cacheStore.getResponseByUrl, AUDIO_LIST_FETCH_URL)
    !result && await asyncRenderModal((resolve) => [
      cE('div', { className: 'margin', innerText: T('message-welcome') }),
      cE('div', { className: 'margin', innerText: T('message-cache-audio-list') }),
      cE('button', { innerText: T('text-start-cache'), onclick: resolve })
    ])
  }

  await withLoading(cacheAudioList, { mainStore, cacheStore, updateLoadingStatus })

  if (!mainStore.getState().isDoneCacheRebuild) {
    qS('#main-panel', T('step-cache-rebuild'))
    const { audioCacheSizeMap } = mainStore.getState()
    const cacheStore = await createCacheStore(initialCacheState)
    await cacheAudioList({ mainStore, cacheStore })
    await withLoading(async () => {
      const audioCacheUrlList = Object.keys(audioCacheSizeMap)
      for (let index = 0, indexMax = audioCacheUrlList.length; index < indexMax; index++) {
        const updateLoadingStatusRebuild = (operation, subject, current, total, size) => updateLoadingStatus(
          `[${index + 1}/${indexMax}]${T('text-rebuilding-cache')}\n${operation}`, subject, current, total, size
        )
        const audioCacheUrl = audioCacheUrlList[ index ]
        await cacheAudio({ mainStore, cacheStore, audioCacheUrl, updateLoadingStatus: updateLoadingStatusRebuild })
      }
    })
    mainStore.setIsDoneCacheRebuild(true)
    createSyncStateStorage({ keyPrefix: '[cache-state]' }).save(cacheStore.getState())
    createSyncStateStorage({ keyPrefix: '[main-state]' }).save(toStorageState(mainStore.getState()))
    alert(T('message-cache-rebuild-done'))
    location.reload()
  }

  if (!mainStore.getState().isDoneCacheVerify) {
    qS('#main-panel', T('step-cache-audio-list'))
    const cacheState = await verifyCacheState(cacheStore.getState())
    mainStore.setIsDoneCacheVerify(true)
    createSyncStateStorage({ keyPrefix: '[cache-state]' }).save(cacheState)
    createSyncStateStorage({ keyPrefix: '[main-state]' }).save(toStorageState(mainStore.getState()))
    location.reload()
  }

  const audioStore = createAudioStore()

  qS('#main-panel', T('step-render-ui'))
  const { renderAudioList, renderAudio, renderControlPanel, setFilterDownload, setFilterStar, setFilterTime, updateControlConfig } = initRender({
    audioStore, cacheStore, mainStore, T, resetRebuild, resetCode, resetAll, withLoading, updateLoadingStatus, updateStorageStatus, asyncRenderModal, cacheAudio, deleteAudio
  })

  await cacheAudioListRedundantCheck({ cacheStore })
  mainStore.updateAudioListState({ audioList: await (await cacheStore.getResponseByUrl(AUDIO_LIST_FETCH_URL)).json() })

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

  if (__DEV__) window.DEBUG = Object.assign(window.DEBUG || {}, { cacheStore, audioStore, mainStore, T, renderLoading })
}

export { getHTML }
