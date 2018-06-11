const initCacheStore = (cacheName) => {
  const {
    location,
    caches,
    Dr: {
      Common: {
        Time: { getTimestamp },
        Immutable: {
          Array: { arraySet, arrayPush, arrayDelete },
          StateStore: { createStateStore }
        }
      }
    }
  } = window

  const initialState = {
    cacheName,
    cacheUrlList: [ /* url */ ],
    cacheInfoList: [ /* { size, timestamp, referenceCount } */ ]
  }

  const normalizeUrl = (url) => (new URL(url, location.href)).toString()

  const createCacheStore = async (state = initialState) => {
    const cache = await caches.open(state.cacheName)

    // need to verify cache first
    const urlSet = new Set(state.cacheUrlList)
    for (const request of await cache.keys()) {
      __DEV__ && console.log('[CacheStore] verify cache', urlSet.has(request.url), request.url)
      urlSet.has(request.url)
        ? urlSet.delete(request.url)
        : await cache.delete(request) // unexpected extra cache
    }

    let cacheUrlList = [ ...state.cacheUrlList ]
    let cacheInfoList = [ ...state.cacheInfoList ]
    urlSet.forEach((url) => {
      const index = cacheUrlList.indexOf(url)
      __DEV__ && console.log('[CacheStore] delete missing cache', url, index)
      cacheUrlList.splice(index, 1)
      cacheInfoList.splice(index, 1)
    })

    const { subscribe, unsubscribe, getState, setState } = createStateStore({ ...state, cacheUrlList, cacheInfoList })

    const hasUrl = (url) => {
      url = normalizeUrl(url)
      return getState().cacheUrlList.includes(url)
    }
    const getInfoByUrl = (url) => {
      url = normalizeUrl(url)
      const { cacheUrlList, cacheInfoList } = getState()
      const existIndex = cacheUrlList.indexOf(url)
      return existIndex !== -1 ? cacheInfoList[ existIndex ] : undefined
    }
    const addByUrl = async (url, extra = {}) => {
      url = normalizeUrl(url)
      const { cacheUrlList, cacheInfoList } = getState()
      __DEV__ && console.log('[CacheStore] addByUrl', url)
      const existIndex = cacheUrlList.indexOf(url)
      if (existIndex !== -1) { // no cache, increase reference, update extra
        const { size, timestamp, referenceCount } = cacheInfoList[ existIndex ]
        const cacheInfo = { ...extra, size, timestamp, referenceCount: referenceCount + 1 }
        setState({ cacheInfoList: arraySet(cacheInfoList, existIndex, cacheInfo) })
        return cacheInfo
      } else {
        await cache.add(url)
        const blob = await getBlobByUrl(url) // TODO: may be some lighter way te get the size?
        const cacheInfo = { ...extra, size: blob.size, timestamp: getTimestamp(), referenceCount: 1 }
        setState({ cacheUrlList: arrayPush(cacheUrlList, url), cacheInfoList: arrayPush(cacheInfoList, cacheInfo) })
        return cacheInfo
      }
    }
    const getResponseByUrl = async (url) => {
      url = normalizeUrl(url)
      return cache.match(url)
    }
    const getBlobByUrl = async (url) => {
      url = normalizeUrl(url)
      const response = await cache.match(url)
      return response.blob()
    }
    const getJsonByUrl = async (url) => {
      url = normalizeUrl(url)
      const response = await cache.match(url)
      return response.json()
    }
    const deleteByUrl = async (url) => {
      url = normalizeUrl(url)
      const { cacheUrlList, cacheInfoList } = getState()
      const existIndex = cacheUrlList.indexOf(url)
      if (existIndex === -1) return
      __DEV__ && console.log('[CacheStore] deleteByUrl', url)
      const cacheInfo = cacheInfoList[ existIndex ]
      if (cacheInfo.referenceCount >= 2) { // no delete, drop reference
        setState({ cacheInfoList: arraySet(cacheInfoList, existIndex, { ...cacheInfo, referenceCount: cacheInfo.referenceCount - 1 }) })
      } else {
        setState({ cacheUrlList: arrayDelete(cacheUrlList, existIndex), cacheInfoList: arrayDelete(cacheInfoList, existIndex) })
        await cache.delete(url)
      }
      return cacheInfo
    }

    return {
      subscribe,
      unsubscribe,
      getState,
      hasUrl,
      getInfoByUrl,
      addByUrl,
      getResponseByUrl,
      getBlobByUrl,
      getJsonByUrl,
      deleteByUrl
    }
  }

  return {
    initialState,
    createCacheStore
  }
}

export { initCacheStore }
