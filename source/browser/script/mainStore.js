const initMainStore = () => {
  const {
    navigator,
    Dr: {
      Common: {
        Function: { lossyAsync },
        Immutable: {
          Object: { objectSet, objectMerge },
          StateStore: { createStateStore }
        }
      }
    }
  } = window

  const initialStorageState = {
    audioCacheStarList: [ /* audioCacheUrl */ ],
    audioCacheSizeMap: { /* [audioCacheUrl]: size */ },
    isDoneCacheRebuild: true,
    isDoneCacheVerify: true,
    isAudioListMinimize: false
    // isPlayerMinimize: false
    // playerStatus: { audioCacheUrl: '', time: 0 } // TODO: maybe save last player time
  }

  const initialState = {
    ...initialStorageState,

    // will reset & regenerate every time
    audioListState: {
      audioList: [],
      audioListFilter: { type: 'time', filterList: [] } // type = 'download|star|time|filter'
    },
    audioState: null,
    storageStatus: { value: 0, max: 0 },
    currentPanel: 'audio-list' // 'audio-list|audio'
  }

  const createMainStore = (state = initialState) => {
    const { subscribe, unsubscribe, getState, setState } = createStateStore(state)

    const getSubStateUpdate = (key, func) => (...args) => {
      const state = getState()
      setState(objectSet(state, key, func(state[ key ], ...args)))
    }
    const subStateSet = (subState, nextSubState) => nextSubState
    const subStateUpdate = (subState, nextSubState) => objectMerge(subState, nextSubState)

    const setAudioState = getSubStateUpdate('audioState', subStateSet)
    const setAudioCacheStarList = getSubStateUpdate('audioCacheStarList', subStateSet)
    const setAudioCacheSizeMap = getSubStateUpdate('audioCacheSizeMap', subStateSet)
    const setStorageStatus = getSubStateUpdate('storageStatus', subStateSet)
    const setCurrentPanel = getSubStateUpdate('currentPanel', subStateSet)
    const setIsDoneCacheRebuild = getSubStateUpdate('isDoneCacheRebuild', subStateSet)
    const setIsDoneCacheVerify = getSubStateUpdate('isDoneCacheVerify', subStateSet)

    const updateAudioListState = getSubStateUpdate('audioListState', subStateUpdate)

    const toggleAudioListMinimize = getSubStateUpdate('isAudioListMinimize', (subState) => !subState)

    const refreshStorageStatus = navigator.storage && navigator.storage.estimate
      ? lossyAsync(async () => {
        const { quota: max, usage: value } = await navigator.storage.estimate()
        setStorageStatus({ max, value })
      }).trigger
      : () => {
        const state = getState()
        const value = Object.values(state.audioCacheSizeMap).reduce((o, size) => o + size, 0)
        setStorageStatus({ max: 0, value })
      }

    return {
      subscribe,
      unsubscribe,
      getState,

      setAudioState,
      setAudioCacheStarList,
      setAudioCacheSizeMap,
      setCurrentPanel,
      setIsDoneCacheRebuild,
      setIsDoneCacheVerify,
      updateAudioListState,
      toggleAudioListMinimize,
      refreshStorageStatus
    }
  }

  const storageStateKeyList = Object.keys(initialStorageState)
  const toStorageState = (state) => storageStateKeyList.reduce((o, key) => {
    o[ key ] = state[ key ]
    return o
  }, {})

  return {
    initialState,
    createMainStore,
    toStorageState
  }
}

export { initMainStore }
