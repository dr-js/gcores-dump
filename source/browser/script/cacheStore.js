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

  // TODO: pick this out
  const KEY_REFERENCE_COUNT = '@@RC'
  const increasePairedListReferenceCount = async ([ keyList, valueList ], key, getValue) => {
    const existIndex = keyList.indexOf(key)
    let value
    if (existIndex !== -1) { // no cache, increase reference, update extra
      value = valueList[ existIndex ]
      valueList = arraySet(valueList, existIndex, { ...value, [ KEY_REFERENCE_COUNT ]: value[ KEY_REFERENCE_COUNT ] + 1 })
    } else {
      value = await getValue(key)
      keyList = arrayPush(keyList, key)
      valueList = arrayPush(valueList, { ...value, [ KEY_REFERENCE_COUNT ]: 1 })
    }
    return [ keyList, valueList, value ]
  }
  const decreasePairedListReferenceCount = async ([ keyList, valueList ], key, deleteValue) => {
    const existIndex = keyList.indexOf(key)
    if (existIndex === -1) return [ keyList, valueList ]
    const value = valueList[ existIndex ]
    if (value[ KEY_REFERENCE_COUNT ] > 1) { // no delete, drop reference
      valueList = arraySet(valueList, existIndex, { ...value, [ KEY_REFERENCE_COUNT ]: value[ KEY_REFERENCE_COUNT ] - 1 })
    } else { // delete
      keyList = arrayDelete(keyList, existIndex)
      valueList = arrayDelete(valueList, existIndex)
      await deleteValue(key, value)
    }
    return [ keyList, valueList, value ]
  }

  const initialState = {
    cacheName,
    cacheUrlList: [ /* url */ ],
    cacheInfoList: [ /* { size, timestamp, referenceCount } */ ]
  }

  const normalizeUrl = (url) => (new URL(url, location.href)).toString()

  const getCacheInfo = async (url, extra, cache) => {
    __DEV__ && console.log('[getCacheInfo]', url, extra, cache)
    await cache.add(url)
    const blob = await (await cache.match(url)).blob() // TODO: may be some lighter way te get the size?
    return { ...extra, size: blob.size, timestamp: getTimestamp() }
  }

  const createCacheStore = async (state = initialState) => {
    const { subscribe, unsubscribe, getState, setState } = createStateStore(state)
    const cache = await caches.open(state.cacheName)

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
      const [ nextCacheUrlList, nextCacheInfoList, cacheInfo ] = await increasePairedListReferenceCount([ cacheUrlList, cacheInfoList ], url, () => getCacheInfo(url, extra, cache))
      setState({ cacheUrlList: nextCacheUrlList, cacheInfoList: nextCacheInfoList })
      return cacheInfo
    }
    const getResponseByUrl = async (url) => {
      url = normalizeUrl(url)
      return cache.match(url)
    }
    const deleteByUrl = async (url) => {
      url = normalizeUrl(url)
      const { cacheUrlList, cacheInfoList } = getState()
      const [ nextCacheUrlList, nextCacheInfoList, cacheInfo ] = await decreasePairedListReferenceCount([ cacheUrlList, cacheInfoList ], url, () => cache.delete(url))
      setState({ cacheUrlList: nextCacheUrlList, cacheInfoList: nextCacheInfoList })
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
      deleteByUrl
    }
  }

  const verifyCacheState = async (state) => {
    const cache = await caches.open(state.cacheName)

    const urlSet = new Set(state.cacheUrlList)
    for (const request of await cache.keys()) {
      __DEV__ && console.log('[verifyCacheState] verify cache', urlSet.has(request.url), request.url)
      urlSet.has(request.url)
        ? urlSet.delete(request.url)
        : await cache.delete(request) // unexpected extra cache
    }

    let cacheUrlList = [ ...state.cacheUrlList ]
    let cacheInfoList = [ ...state.cacheInfoList ]
    urlSet.forEach((url) => {
      const index = cacheUrlList.indexOf(url)
      __DEV__ && console.log('[verifyCacheState] delete missing cache', url, index)
      cacheUrlList.splice(index, 1)
      cacheInfoList.splice(index, 1)
    })

    return { ...state, cacheUrlList, cacheInfoList }
  }

  return {
    initialState,
    createCacheStore,
    verifyCacheState
  }
}

export { initCacheStore }
