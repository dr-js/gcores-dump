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

  const initialState = {
    audioListState: {
      audioList: [],
      audioListFilter: {
        type: 'time', // 'download|star|time|filter'
        filterList: []
      }
    },
    audioState: null,

    currentPanel: 'audio-list', // 'audio-list|audio'
    isAudioListMinimize: false,
    isPlayerMinimize: false,
    audioCacheStarList: [ /* audioCacheUrl */ ],
    audioCacheSizeMap: { /* [audioCacheUrl]: size */ },
    storageStatus: { value: 0, max: 0 }
    // playerStatus: { audioCacheUrl: '', time: 0 } // TODO: maybe save last player time
  }

  const createMainStore = (state = initialState) => {
    const { subscribe, unsubscribe, getState, setState } = createStateStore(state)

    const updateAudioListState = (audioListState) => {
      const state = getState()
      setState(objectSet(state, 'audioListState', objectMerge(state.audioListState, audioListState)))
    }
    const updateAudioState = (audioState) => {
      const state = getState()
      setState(objectSet(state, 'audioState', audioState))
    }
    const setCurrentPanel = (currentPanel) => {
      const state = getState()
      setState(objectSet(state, 'currentPanel', currentPanel))
    }
    const toggleAudioListMinimize = () => {
      const state = getState()
      setState(objectSet(state, 'isAudioListMinimize', !state.isAudioListMinimize))
    }
    const setAudioCacheStarList = (audioCacheStarList) => {
      const state = getState()
      setState(objectSet(state, 'audioCacheStarList', audioCacheStarList))
    }
    const setAudioCacheSizeMap = (audioCacheSizeMap) => {
      const state = getState()
      setState(objectSet(state, 'audioCacheSizeMap', audioCacheSizeMap))
    }
    const refreshStorageStatus = navigator.storage && navigator.storage.estimate
      ? lossyAsync(async () => {
        const { quota: max, usage: value } = await navigator.storage.estimate()
        setState(objectSet(getState(), 'storageStatus', { max, value }))
      }).trigger
      : () => {
        const state = getState()
        const value = Object.values(state.audioCacheSizeMap).reduce((o, size) => o + size, 0)
        setState(objectSet(state, 'storageStatus', { max: 0, value }))
      }

    return {
      subscribe,
      unsubscribe,
      getState,
      updateAudioListState,
      updateAudioState,
      setCurrentPanel,
      toggleAudioListMinimize,
      setAudioCacheStarList,
      setAudioCacheSizeMap,
      refreshStorageStatus

    }
  }

  const toStorageState = ({
    isAudioListMinimize, isPlayerMinimize, audioCacheSizeMap, audioCacheStarList
  }) => ({
    isAudioListMinimize, isPlayerMinimize, audioCacheSizeMap, audioCacheStarList
  })

  return {
    initialState,
    createMainStore,
    toStorageState
  }
}

export { initMainStore }
