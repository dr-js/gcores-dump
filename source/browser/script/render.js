const renderStyle = `<style>
body { font-family: 'Open Sans','Helvetica Neue',Arial,'Hiragino Sans GB','Microsoft YaHei','WenQuanYi Micro Hei',sans-serif; }

.flex-row { display: flex; flex-flow: row; }
.flex-column { display: flex; flex-flow: column; }
.flex-center { display: flex; align-items: center; justify-content: center; }

#loading { position: absolute; top: 0; left: 0; display: flex; flex-flow: column; align-items: center; justify-content: center; width: 100vw; height: 100vh; opacity: 0; z-index: 256; transition: opacity 1s ease; }
#loading-status { min-width: 180px; white-space: pre-wrap; text-align: center; box-shadow: 0 0 2px 0 #666; z-index: 1; }
#loading-mask { position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; background: #eee; opacity: 0.5; }

#control-sort-download,
#control-sort-star,
#control-sort-time,
#control-sort-filter { display: flex; align-items: center; }
#control-storage-status { user-select: none; display: flex; align-items: center; }

.control-panel-audio-list { display: flex; flex-flow: row wrap; align-content: start; justify-content: center; padding: 12px 4px; }

.audio-list-item { position: relative; margin: 8px; height: 180px; max-width: 90vw; width: 360px; }
.audio-list-image,
.audio-list-info  { position: absolute; max-width: 85vw; width: 340px; border-radius: 4px; }
.audio-list-image { left: 0; top: 0; max-height: 160px; box-shadow: 0 0 2px 0 #666; }
.audio-list-info { right: 0; bottom: 0; display: flex; flex-flow: column; align-items: stretch; padding: 2px 4px; height: 160px; background: linear-gradient(120deg, rgba(255, 255, 255, 0.8), #fff); box-shadow: 0 0 2px 0 #666, inset 0 0 32px 0 #fff; text-align: right; }
.audio-list-info.minimize { width: auto; height: auto; }

.audio-list-info-title { margin: 8px 0; font-size: 18px; font-weight: bold; }
.audio-list-info-title-secondary { overflow: hidden; flex: 1; font-size: 14px; color: #222; }

.control-panel-audio { padding: 0 8px; }

.audio-author-info { display: flex; flex-flow: row wrap; justify-content: space-around; padding: 4px; }
.audio-author { display: flex; flex-flow: column; align-items: center; justify-content: center; margin: 4px; min-width: 64px; }
.audio-author img { width: 48px; height: 48px; border-radius: 4px; box-shadow: 0 0 2px 0 #666; }
.audio-timeline-item { overflow: hidden; margin: 16px auto; display: flex; flex-flow: row wrap; max-width: 960px; border-radius: 4px; box-shadow: 0 0 2px 0 #666; }
.audio-timeline-image { flex-shrink: 1; align-self: start; max-width: 480px; width: 100%; max-height: 320px; object-fit: contain; object-position: center; background: #222; }
.audio-timeline-info { flex: 1; display: flex; flex-flow: column; padding: 4px; }
.audio-timeline-info-content { margin: 4px 0; padding: 4px 0; border-top: 1px solid #ddd; }

.player-slider { position: relative; margin: 0 16px; height: 24px; }
.player-slider-thumb { position: absolute; margin: 0 -16px; width: 32px; height: 100%; border-radius: 4px; background: #bbb; box-shadow: inset 0 0 2px 0 #222; }
.player-slider-thumb::after { content: attr(data-seeking); display: none; position: absolute; left: 50%; bottom: 120%; transform: translateX(-50%); padding: 4px; border-radius: 4px; background: #eee; }
.player-slider-thumb[data-seeking] { background: #ddd; }
.player-slider-thumb[data-seeking]::after { display: block; }

.player-main { height: 84px; box-shadow: inset 0 0 2px 0 #666; background: #fff; }
.player-image { max-width: calc(100% - 200px); height: 100%; object-fit: cover; object-position: left; }
.player-info { flex: 1; overflow: hidden; display: flex; flex-flow: column; align-items: stretch; height: 100%; text-align: center; }
.player-info-title { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
</style>`

const renderHTML = [
  `<div id="control-panel" style="overflow: hidden; display: flex; flex-flow: row nowrap; box-shadow: 0 0 12px 0 #666; z-index: 1;"></div>`,
  `<div id="main-panel" class="flex-center" style="overflow: auto; flex: 1; min-height: 0;">No script yet...</div>`,
  `<div id="sub-control-panel" style="overflow: visible; position: relative; display: flex; flex-flow: column nowrap; background: #eee; box-shadow: 0 0 12px 0 #666; z-index: 1;"></div>`
].join('\n')

const initRender = ({
  audioStore, cacheStore, mainStore,
  T,
  resetCode, resetAll,
  withLoading, updateStorageStatus,
  cacheAudio, deleteAudio
}) => {
  const {
    prompt,
    open,
    location,
    URL,
    AUDIO_PATH_FETCH_URL,
    qS,
    cE,
    aCL,
    mECN,
    mEA,
    Dr: {
      Common: {
        Format,
        Error: { catchSync },
        Function: { lossyAsync },
        Math: { clamp },
        Immutable: { transformCache, Array: { arrayMatchPush, arrayMatchDelete } }
      },
      Browser: { Input: { PointerEvent: { POINTER_EVENT_TYPE, applyPointerEventListener } } }
    }
  } = window

  const createFlexDiv = () => cE('div', { style: 'flex: 1;' })
  const createFlexRow = (...args) => cE('div', { className: 'flex-row' }, args)
  const createIconButton = (icon, extra = {}) => cE('button', { className: 'material-icons', innerText: icon, ...extra })
  const createIcon = (icon) => cE('div', { className: 'material-icons', innerText: icon })

  // ==================================================================================================================
  // ==================================================================================================================

  const renderAudioList = ({ isSkipScrollReset = false }) => {
    const mainPanel = qS('#main-panel', '')
    mainPanel.className = 'control-panel-audio-list'
    if (!isSkipScrollReset) mainPanel.scrollTop = 0

    const { audioListState: { audioList, audioListFilter }, isAudioListMinimize, audioCacheSizeMap, audioCacheStarList } = mainStore.getState()
    const { cacheUrlList, cacheInfoList } = cacheStore.getState()
    const audioListFiltered = filterAudioListCached(audioList, audioListFilter, audioCacheStarList, cacheUrlList, cacheInfoList)

    for (const info of audioListFiltered) {
      const { url, imageUrl, title, titleSecondary, time, tag } = info
      const audioCacheUrl = getAudioCacheUrl(url)
      const cacheSize = audioCacheSizeMap[ audioCacheUrl ]
      const isStar = audioCacheStarList.includes(audioCacheUrl)
      mainPanel.appendChild(cE('div', { className: 'audio-list-item' }, [
        cE('img', { className: 'audio-list-image', src: imageUrl }),
        cE('div', { className: !isAudioListMinimize ? 'audio-list-info' : 'audio-list-info minimize' }, [
          !isAudioListMinimize && createFlexRow(
            cE('div', { className: 'flex-center', innerText: time }),
            createFlexDiv(),
            cE('div', { className: 'flex-center', innerText: tag })
          ),
          !isAudioListMinimize && cE('div', { className: 'audio-list-info-title', innerText: title }),
          !isAudioListMinimize && cE('div', { className: 'audio-list-info-title-secondary', innerText: titleSecondary }),
          createFlexRow(
            createFlexDiv(),
            cacheSize && cE('div', { className: 'flex-center', innerText: `${Format.binary(cacheSize)}B` }),
            !cacheSize && createIconButton('cloud_download', { onclick: () => withLoading(cacheAudio, audioCacheUrl) }),
            cacheSize && createIconButton('play_arrow', { onclick: () => switchToAudio(audioCacheUrl) }),
            cacheSize && createIconButton('delete', { onclick: () => withLoading(deleteAudio, audioCacheUrl) }),
            isStar && createIconButton('star', { onclick: () => unstarUrl(audioCacheUrl) }),
            !isStar && createIconButton('star_border', { onclick: () => starUrl(audioCacheUrl) }),
            createIconButton('open_in_new', { onclick: () => open(url) })
          )
        ])
      ]))
    }

    updateControlPanel()
    updatePlayerLocate({})
  }
  const getAudioCacheUrl = (url) => `${location.origin}${AUDIO_PATH_FETCH_URL}${encodeURIComponent(url)}.json`
  const withEnhancedAudioList = (audioList, urlList, getData, func) => func(
    audioList.map((info) => [ info, getData(urlList.indexOf(getAudioCacheUrl(info.url))) ])
  ).map(([ v ]) => v)
  const filterAudioListCached = transformCache((audioList, audioListFilter, audioCacheStarList, cacheUrlList, cacheInfoList) => {
    switch (audioListFilter.type) {
      case 'download':
        return withEnhancedAudioList(
          audioList,
          cacheUrlList,
          (index) => index !== -1 && cacheInfoList[ index ],
          (enhancedAudioList) => enhancedAudioList.filter(([ , cacheInfo ]) => cacheInfo).sort(([ , a ], [ , b ]) => b.timestamp - a.timestamp) // bigger(time cached) first
        )
      case 'star':
        return withEnhancedAudioList(
          audioList,
          audioCacheStarList,
          (index) => index,
          (enhancedAudioList) => enhancedAudioList.filter(([ , index ]) => index !== -1).sort(([ , a ], [ , b ]) => b - a) // bigger(starred) first
        )
      case 'time':
        return audioList.sort((a, b) => Date.parse(b.time) - Date.parse(a.time)) // bigger first
      case 'filter': {
        const { filterList } = audioListFilter
        const getMatchCount = ({ title = '', titleSecondary = '', tag = '' }) => filterList.reduce((o, v) => {
          title.toLowerCase().includes(v) && o++
          titleSecondary.toLowerCase().includes(v) && o++
          tag.toLowerCase().includes(v) && o++
          return o
        }, 0)
        return audioList.reduce((o, info) => {
          const matchCount = getMatchCount(info)
          matchCount && o.push([ info, matchCount ])
          return o
        }, [])
          .sort(([ , matchCountA ], [ , matchCountB ]) => matchCountB - matchCountA)
          .map(([ info ]) => info)
      }
    }
  })
  const starUrl = (audioCacheUrl) => { mainStore.setAudioCacheStarList(arrayMatchPush(mainStore.getState().audioCacheStarList, audioCacheUrl)) }
  const unstarUrl = (audioCacheUrl) => { mainStore.setAudioCacheStarList(arrayMatchDelete(mainStore.getState().audioCacheStarList, audioCacheUrl)) }

  // ==================================================================================================================
  // ==================================================================================================================

  const renderAudio = () => {
    const mainPanel = qS('#main-panel', '')
    mainPanel.className = 'control-panel-audio'
    mainPanel.scrollTop = 0 // reset scroll

    const { audioState: { radioUrl, imageUrl, url, title, titleSecondary, authorDataList = [], radioTimelineList = [] } } = mainStore.getState()

    mainPanel.appendChild(cE('div', { className: 'audio-timeline-item', tabIndex: 0 }, [
      cE('img', { className: 'audio-timeline-image', src: imageUrl }),
      cE('div', { className: 'audio-timeline-info' }, [
        cE('h2', { innerText: title }),
        cE('div', { className: 'audio-timeline-info-content', innerText: titleSecondary }),
        authorDataList.length && cE('div', { className: 'audio-author-info' }, authorDataList.map(({ name, avatarUrl }) => cE('div', { className: 'audio-author' }, [
          cE('img', { className: 'audio-author-image', src: avatarUrl }),
          cE('p', { innerText: name })
        ]))),
        createFlexDiv(),
        createFlexRow(
          createFlexDiv(),
          createIconButton('open_in_new', { onclick: () => open(url) }),
          createIconButton('save_alt', { onclick: () => open(radioUrl) })
        )
      ])
    ]))

    const timelineDivList = [ /* { radioTimeline, element } */ ]
    for (const radioTimeline of radioTimelineList) {
      const { time, imageUrl, title, content, linkUrl } = radioTimeline
      const element = mainPanel.appendChild(cE('div', { className: 'audio-timeline-item', tabIndex: 0 }, [
        cE('img', { className: 'audio-timeline-image', src: imageUrl }),
        cE('div', { className: 'audio-timeline-info' }, [
          createFlexRow(
            cE('h4', { innerText: title }),
            createFlexDiv(),
            cE('span', { innerText: Format.mediaTime(time) })
          ),
          cE('div', { className: 'audio-timeline-info-content', innerText: content }),
          createFlexDiv(),
          createFlexRow(
            createFlexDiv(),
            linkUrl && createIconButton('open_in_new', { onclick: () => open(linkUrl) }),
            // createIconButton('play_arrow', { onclick: () => setAudio(time) })
            createIconButton('play_arrow', { onclick: () => openAudioPanel({ radioUrl, time, locateTimeline }) })
          )
        ])
      ]))
      timelineDivList.push({ time, element })
    }
    timelineDivList.sort((a, b) => a.time - b.time)

    const locateTimeline = () => {
      const { currentTime } = audioStore.getState()
      let currentElement = timelineDivList[ 0 ] && timelineDivList[ 0 ].element
      for (const { time, element } of timelineDivList) {
        if (currentTime < time) return currentElement && currentElement.focus()
        currentElement = element
      }
    }

    // const setAudio = (time = undefined) => {
    //   if (radioUrl !== audioStore.getState().info) return openAudioPanel({ radioUrl, time, locateTimeline })
    //   if (time !== undefined) audioStore.setTime(time)
    //   updatePlayerLocate({ locateTimeline })
    // }

    // setAudio()
    openAudioPanel({ radioUrl, locateTimeline })

    updateControlPanel()
  }

  // ==================================================================================================================
  // ==================================================================================================================

  const renderControlPanel = () => aCL(qS('#control-panel'), [
    createIconButton('cloud_download', { id: 'control-sort-download', onclick: setFilterDownload }),
    createIconButton('star', { id: 'control-sort-star', onclick: setFilterStar }),
    createIconButton('view_list', { id: 'control-sort-time', onclick: setFilterTime }),
    createIconButton('search', { id: 'control-sort-filter', onclick: setFilterFilter }),
    createIconButton('', { id: 'control-minimize', onclick: mainStore.toggleAudioListMinimize }),
    createIconButton('arrow_back', { id: 'control-to-audio-list', onclick: switchToAudioList }),
    createFlexDiv(),
    cE('div', { id: 'control-storage-status', className: 'button', disabled: true }, [ createIcon('archive'), cE('div', { id: 'storage-status' }) ])
  ])
  const setFilterStar = () => setAudioListFilter({ type: 'star' })
  const setFilterDownload = () => setAudioListFilter({ type: 'download' })
  const setFilterTime = () => setAudioListFilter({ type: 'time' })
  const setFilterFilter = () => {
    const filterList = (prompt(T('message-enter-filter')) || '').toLowerCase().split(/[\s'"-,.，。]/).filter(Boolean)
    filterList.length && setAudioListFilter({ type: 'filter', filterList })
  }

  const updateControlPanel = () => {
    const { audioListState: { audioListFilter }, currentPanel, isAudioListMinimize, audioCacheSizeMap, audioCacheStarList } = mainStore.getState()
    const styleDisplayAudioList = styleDisplay(currentPanel === 'audio-list')
    const styleDisplayAudio = styleDisplay(currentPanel === 'audio')
    qS('#control-sort-download').style.display = styleDisplay(currentPanel === 'audio-list' && Object.keys(audioCacheSizeMap).length)
    qS('#control-sort-download').disabled = audioListFilter.type === 'download'
    mECN(qS('#control-sort-download'), audioListFilter.type === 'download', 'select')
    qS('#control-sort-star').style.display = styleDisplay(currentPanel === 'audio-list' && Object.keys(audioCacheStarList).length)
    qS('#control-sort-star').disabled = audioListFilter.type === 'star'
    mECN(qS('#control-sort-star'), audioListFilter.type === 'star', 'select')
    qS('#control-sort-time').style.display = styleDisplayAudioList
    qS('#control-sort-time').disabled = audioListFilter.type === 'time'
    mECN(qS('#control-sort-time'), audioListFilter.type === 'time', 'select')
    qS('#control-sort-filter').style.display = styleDisplayAudioList
    mECN(qS('#control-sort-filter'), audioListFilter.type === 'filter', 'select')
    qS('#control-minimize').innerHTML = isAudioListMinimize ? 'flip_to_back' : 'flip_to_front'
    qS('#control-minimize').style.display = styleDisplayAudioList
    qS('#control-to-audio-list').style.display = styleDisplayAudio

    updateStorageStatus()
  }
  const styleDisplay = (visible) => visible ? '' : 'none'

  const updateControlConfig = ({ hasController = false, hasUpdate = false }) => {
    const storageStatus = qS('#control-storage-status')
    if (storageStatus) {
      mECN(qS('#control-storage-status'), hasUpdate, 'select')
      storageStatus.children[ 0 ].innerHTML = hasUpdate ? 'new_releases' : 'archive'
      storageStatus.onclick = hasController ? (event) => { event.preventDefault() || resetCode() } : null
      storageStatus.oncontextmenu = hasController ? (event) => { event.preventDefault() || resetAll() } : null
      mEA(storageStatus, !hasController, 'disabled')
    }
  }

  // ==================================================================================================================
  // ==================================================================================================================

  const renderSubControlPanel = () => {
    __DEV__ && console.log(`[renderSubControlPanel] sourceUrl`, audioStore.getState().sourceUrl)
    if (!audioStore.getState().sourceUrl) return qS('#sub-control-panel', '')

    const { audioState: { title, imageUrl } } = mainStore.getState()

    if (qS('.player-info-title')) { // fast reset
      qS('.player-info-title').innerText = title
      qS('.player-image').src = imageUrl
      return
    }

    aCL(qS('#sub-control-panel', ''), [
      cE('div', { className: 'player-slider' }, [ cE('div', { className: 'player-slider-thumb' }) ]),
      cE('div', { className: 'player-main flex-row' }, [
        cE('img', { className: 'player-image', src: imageUrl }),
        cE('div', { className: 'player-info' }, [
          createFlexDiv(),
          cE('b', { className: 'player-info-title', innerText: title }),
          cE('p', { className: 'player-progress', innerText: '--/--' }),
          createFlexRow(
            createFlexDiv(),
            createIconButton('more_horiz', { id: 'player-control-play' }),
            createIconButton('', { id: 'player-locate' }),
            createIconButton('close', { onclick: () => { closeAudioPanel() } }),
            createFlexDiv()
          ),
          createFlexDiv()
        ])
      ])
    ])

    const closeAudioPanel = () => {
      removeEnhancedPointerEventListener()
      audioStore.pause()
      audioStore.setSourceUrl('', null)
    }

    const slider = qS('.player-slider')
    const sliderThumb = qS('.player-slider-thumb')

    const { START, MOVE, END, CANCEL } = POINTER_EVENT_TYPE
    const calcProgress = ({ point }) => {
      const { left, width } = slider.getBoundingClientRect()
      return width ? clamp((point.x - left) / width, 0, 1) : 0
    }
    const removeEnhancedPointerEventListener = applyPointerEventListener({
      element: slider,
      isGlobal: true,
      isCancelOnOutOfBound: false,
      onEvent: (type, event, calcState) => {
        event.preventDefault()
        const eventState = calcState(event)
        const progress = calcProgress(eventState)
        const time = audioStore.getState().duration * progress
        if (type === START || type === MOVE) {
          mEA(sliderThumb, true, 'data-seeking', Format.mediaTime(time))
          sliderThumb.style.left = Format.percent(progress)
        }
        if (type === END || type === CANCEL) {
          mEA(sliderThumb, false, 'data-seeking')
          audioStore.setTime(time)
        }
      }
    })
  }
  audioStore.subscribe((state, prevState) => {
    state.sourceUrl !== prevState.sourceUrl && renderSubControlPanel()
    state.sourceUrl !== prevState.sourceUrl && prevState.sourceUrl && catchSync(() => URL.revokeObjectURL(prevState.sourceUrl))

    const { currentTime, duration, isPlay } = state

    const sliderThumb = qS('.player-slider-thumb')
    if (sliderThumb && !sliderThumb.hasAttribute('data-seeking')) {
      sliderThumb.style.left = Format.percent(duration ? clamp(currentTime / duration, 0, 1) : 0)
    }
    const controlPlay = qS('#player-control-play')
    if (controlPlay) {
      controlPlay.innerHTML = isPlay ? 'pause' : 'play_arrow'
      controlPlay.onclick = isPlay ? audioStore.pause : audioStore.play
    }
    const progress = qS('.player-progress')
    if (progress) {
      progress.innerText = `${Format.mediaTime(currentTime)}/${Format.mediaTime(duration)}`
    }
  })
  const updatePlayerLocate = ({ locateTimeline = null }) => {
    const playerLocate = qS('#player-locate')
    __DEV__ && console.log(`[updatePlayerLocate] playerLocate`, Boolean(playerLocate), 'locateTimeline', Boolean(locateTimeline))
    if (!playerLocate) return
    playerLocate.innerHTML = locateTimeline ? 'my_location' : 'playlist_play'
    playerLocate.onclick = locateTimeline || (() => switchToAudio(getAudioCacheUrl(mainStore.getState().audioState.url)))
  }

  const switchToAudioList = () => { mainStore.setCurrentPanel('audio-list') }
  const setAudioListFilter = (audioListFilter) => { mainStore.updateAudioListState({ audioListFilter }) }

  const switchToAudio = lossyAsync(async (audioCacheUrl) => {
    const audioState = await cacheStore.getJsonByUrl(audioCacheUrl)
    mainStore.updateAudioState(audioState)
    mainStore.setCurrentPanel('audio')
  }).trigger

  const openAudioPanel = lossyAsync(async ({ radioUrl, time, locateTimeline }) => {
    if (radioUrl !== audioStore.getState().info) {
      __DEV__ && console.log('[loadAudio]', radioUrl)
      try {
        const audioBlob = await cacheStore.getBlobByUrl(radioUrl)
        const objectUrl = URL.createObjectURL(audioBlob)
        audioStore.setSourceUrl(objectUrl, radioUrl)
      } catch (error) {
        __DEV__ && console.warn('[loadAudio] use radioUrl directly, failed to get objectUrl from radioUrl:', radioUrl, error)
        audioStore.setSourceUrl(radioUrl, radioUrl)
      }
      audioStore.play()
    }
    if (time !== undefined) {
      await audioStore.getLoadPromise()
      audioStore.setTime(time)
    }
    renderSubControlPanel()
    updatePlayerLocate({ locateTimeline })
  }).trigger

  return { renderAudioList, renderAudio, renderControlPanel, setFilterDownload, setFilterStar, setFilterTime, updateControlConfig }
}

const initRenderStatus = ({ mainStore, T }) => {
  const { qS, cE, Dr: { Common: { Format, Error: { catchAsync } } } } = window

  const renderLoading = (isLoading) => {
    if (!isLoading) return qS('#loading') && qS('#loading').remove()
    !qS('#loading') && document.body.appendChild(cE('div', { id: 'loading' }, [
      cE('div', { id: 'loading-status', className: 'button', innerText: T('text-loading') }),
      cE('div', { id: 'loading-mask' })
    ]))
    setTimeout(() => { if (qS('#loading')) qS('#loading').style.opacity = 1 }, 200)
  }

  const withLoading = async (func, ...args) => {
    renderLoading(true)
    const { result, error } = await catchAsync(func, ...args)
    renderLoading(false)
    if (error) throw error
    return result
  }

  const stringShorten = (string = '') => string.length > 48
    ? `${string.slice(0, 16)}...${string.slice(-16)}`
    : string

  const updateLoadingStatus = (operation, subject, current, total, size) => {
    const loadingStatus = qS('#loading-status')
    if (loadingStatus) loadingStatus.innerText = `[${current}/${total} - ${Format.binary(size)}B]\n${operation}\n${stringShorten(subject)}`
  }

  const updateStorageStatus = () => {
    const { storageStatus: { value, max } } = mainStore.getState()
    const storageStatusText = qS('#storage-status')
    if (storageStatusText) storageStatusText.innerText = max ? `${Format.binary(value)}B` : `~${Format.binary(value)}B`
  }

  return { renderLoading, withLoading, updateLoadingStatus, updateStorageStatus }
}

const initCacheOperation = ({ cacheStore, mainStore, T, updateLoadingStatus }) => {
  const {
    alert,
    confirm,
    Request,
    AUDIO_LIST_FETCH_URL,
    Dr: { Common: { Error: { catchAsync }, Immutable: { Object: { objectSet, objectDelete } } } }
  } = window

  const cacheFetchJSON = async (url, extra) => {
    url = new Request(url).url
    !cacheStore.hasUrl(url) && await cacheStore.addByUrl(url, extra)
    return cacheStore.getJsonByUrl(url)
  }

  const cacheAudioList = async () => {
    const audioList = await cacheFetchJSON(AUDIO_LIST_FETCH_URL, { type: 'audio-list-info' })
    let sumSize = 0
    for (let index = 0, indexMax = audioList.length; index < indexMax; index++) {
      const { imageUrl } = audioList[ index ]
      updateLoadingStatus(T('text-loading-cache'), T('res-audio-list-image'), index, indexMax, sumSize)
      await catchAsync(cacheStore.addByUrl, imageUrl, { type: 'audio-list-image' })
      const { result: cacheInfo } = await catchAsync(cacheStore.addByUrl, imageUrl, { type: 'audio-list-image' })
      if (cacheInfo) sumSize += cacheInfo.size
    }
    await mainStore.refreshStorageStatus()
    return audioList
  }
  const deleteAudioList = async () => catchAsync(cacheStore.deleteByUrl, AUDIO_LIST_FETCH_URL)

  const cacheAudio = async (audioCacheUrl) => {
    const audio = await cacheFetchJSON(audioCacheUrl, { type: 'audio-info' })
    const { imageUrl, authorDataList = [], radioTimelineList = [], radioUrl, radioUrlFetchBlocked } = audio

    const taskList = []
    taskList.push([ audioCacheUrl, { type: 'audio-info' } ]) // already cached, just for the size stat
    taskList.push([ imageUrl, { type: 'audio-image' } ])
    for (const { avatarUrl } of authorDataList) avatarUrl && taskList.push([ avatarUrl, { type: 'audio-author-image' } ])
    for (const { imageUrl } of radioTimelineList) imageUrl && taskList.push([ imageUrl, { type: 'audio-timeline-image' } ])
    !radioUrlFetchBlocked && taskList.push([ radioUrl, { type: 'audio-data' } ])

    let sumSize = 0
    for (let index = 0, indexMax = taskList.length; index < indexMax; index++) {
      const [ url, extra ] = taskList[ index ]
      updateLoadingStatus(T('text-loading-cache'), T(`res-${extra.type}`) || url, index, indexMax, sumSize)
      const { result: cacheInfo } = await catchAsync(cacheStore.addByUrl, url, extra)
      if (cacheInfo) sumSize += cacheInfo.size
    }
    await mainStore.refreshStorageStatus()

    mainStore.setAudioCacheSizeMap(objectSet(mainStore.getState().audioCacheSizeMap, audioCacheUrl, sumSize))

    radioUrlFetchBlocked && alert(T('message-audio-fetch-blocked'))

    return audio
  }
  const deleteAudio = async (audioCacheUrl) => {
    if (!cacheStore.hasUrl(audioCacheUrl)) return
    if (!confirm(T('message-delete-audio'))) return
    const { imageUrl, authorDataList = [], radioTimelineList = [], radioUrl } = await cacheStore.getJsonByUrl(audioCacheUrl)

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

  return { cacheAudioList, deleteAudioList, cacheAudio, deleteAudio }
}

export {
  renderStyle,
  renderHTML,
  initRender,
  initRenderStatus,
  initCacheOperation
}
