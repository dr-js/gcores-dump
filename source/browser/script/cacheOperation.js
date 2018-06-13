const initCacheOperation = ({ T }) => {
  const {
    alert,
    confirm,
    AUDIO_LIST_FETCH_URL,
    Dr: { Common: { Error: { catchAsync }, Immutable: { Object: { objectSet, objectDelete } } } }
  } = window

  const cacheAudioListRedundantCheck = async ({ cacheStore }) => {
    // TODO: PATCH: REMOVE-LATER: redundant verify for older versions (reference count error)
    if (!await cacheStore.getResponseByUrl(AUDIO_LIST_FETCH_URL)) {
      console.log('[FIX] patch reference count error')
      while (cacheStore.hasUrl(AUDIO_LIST_FETCH_URL)) await cacheStore.deleteByUrl(AUDIO_LIST_FETCH_URL)
      await cacheStore.addByUrl(AUDIO_LIST_FETCH_URL, { type: 'audio-list-info' }).catch((error) => alert(`${T('message-cache-audio-list-failed')}\n${error}`))
    }
  }

  const cacheAudioList = async ({ mainStore, cacheStore, updateLoadingStatus }) => {
    if (!cacheStore.hasUrl(AUDIO_LIST_FETCH_URL)) await cacheStore.addByUrl(AUDIO_LIST_FETCH_URL, { type: 'audio-list-info' }).catch((error) => alert(`${T('message-cache-audio-list-failed')}\n${error}`))
    else await cacheAudioListRedundantCheck({ cacheStore })
    const audioList = await (await cacheStore.getResponseByUrl(AUDIO_LIST_FETCH_URL)).json()

    let sumSize = 0
    for (let index = 0, indexMax = audioList.length; index < indexMax; index++) {
      const { imageUrl } = audioList[ index ]
      updateLoadingStatus && updateLoadingStatus(T('text-loading-cache'), T('res-audio-list-image'), index, indexMax, sumSize)
      const { result: cacheInfo } = cacheStore.getInfoByUrl(imageUrl) || await catchAsync(cacheStore.addByUrl, imageUrl, { type: 'audio-list-image' })
      if (cacheInfo) sumSize += cacheInfo.size
    }
    await mainStore.refreshStorageStatus()
  }
  const deleteAudioList = async ({ cacheStore }) => catchAsync(cacheStore.deleteByUrl, AUDIO_LIST_FETCH_URL)

  const cacheAudio = async ({ mainStore, cacheStore, audioCacheUrl, updateLoadingStatus }) => {
    await cacheStore.addByUrl(audioCacheUrl, { type: 'audio-info' })
    const { imageUrl, authorDataList = [], radioTimelineList = [], radioUrl, radioUrlFetchBlocked } = await (await cacheStore.getResponseByUrl(audioCacheUrl)).json()

    const taskList = []
    taskList.push([ imageUrl, { type: 'audio-image' } ])
    for (const { avatarUrl } of authorDataList) avatarUrl && taskList.push([ avatarUrl, { type: 'audio-author-image' } ])
    for (const { imageUrl } of radioTimelineList) imageUrl && taskList.push([ imageUrl, { type: 'audio-timeline-image' } ])
    !radioUrlFetchBlocked && taskList.push([ radioUrl, { type: 'audio-data' } ])

    let sumSize = await cacheStore.getInfoByUrl(audioCacheUrl).size
    for (let index = 0, indexMax = taskList.length; index < indexMax; index++) {
      const [ url, extra ] = taskList[ index ]
      updateLoadingStatus && updateLoadingStatus(T('text-loading-cache'), T(`res-${extra.type}`) || url, index, indexMax, sumSize)
      const { result: cacheInfo } = await catchAsync(cacheStore.addByUrl, url, extra)
      if (cacheInfo) sumSize += cacheInfo.size
    }
    await mainStore.refreshStorageStatus()

    mainStore.setAudioCacheSizeMap(objectSet(mainStore.getState().audioCacheSizeMap, audioCacheUrl, sumSize))

    radioUrlFetchBlocked && alert(T('message-audio-fetch-blocked'))
  }
  const deleteAudio = async ({ mainStore, cacheStore, audioCacheUrl }) => {
    if (!cacheStore.hasUrl(audioCacheUrl)) return
    if (!confirm(T('message-delete-audio'))) return
    const { imageUrl, authorDataList = [], radioTimelineList = [], radioUrl } = await (await cacheStore.getResponseByUrl(audioCacheUrl)).json()

    const taskList = []
    taskList.push(radioUrl)
    taskList.push(imageUrl)
    for (const { avatarUrl } of authorDataList) avatarUrl && taskList.push(avatarUrl)
    for (const { imageUrl } of radioTimelineList) imageUrl && taskList.push(imageUrl)
    taskList.push(audioCacheUrl)

    for (let index = 0, indexMax = taskList.length; index < indexMax; index++) {
      const url = taskList[ index ]
      await catchAsync(cacheStore.deleteByUrl, url)
      await mainStore.refreshStorageStatus()
    }

    mainStore.setAudioCacheSizeMap(objectDelete(mainStore.getState().audioCacheSizeMap, audioCacheUrl))
  }

  return {
    cacheAudioListRedundantCheck,
    cacheAudioList,
    deleteAudioList,
    cacheAudio,
    deleteAudio
  }
}

export { initCacheOperation }
