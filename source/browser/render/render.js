const renderStyle = `<style>
body { font-family: 'Open Sans', 'Helvetica Neue', Arial, 'Hiragino Sans GB', 'Microsoft YaHei', 'WenQuanYi Micro Hei', sans-serif; }

.margin { margin: 4px; }
.flex-row { display: flex; flex-flow: row; align-items: center; }
.flex-column { display: flex; flex-flow: column; justify-content: center; }

.main-initial { display: flex; flex-flow: column; align-items: center; justify-content: center; }

#loading, #modal { position: absolute; top: 0; left: 0; display: flex; flex-flow: column; align-items: center; justify-content: center; width: 100vw; height: 100vh; }
#loading-mask, #modal-mask { position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; background: #eee; opacity: 0.5; }
#loading-main, #modal-main { overflow-y: auto; margin: 8px; padding: 4px; max-width: 90vw; min-width: 180px; border-radius: 4px; white-space: pre-wrap; text-align: center; background: #fff; box-shadow: 0 0 2px 0 #666; z-index: 1; }

#loading { opacity: 0; z-index: 256; transition: opacity 1s ease; }
#modal { z-index: 128; }

#control-sort-download,
#control-sort-star,
#control-sort-time,
#control-sort-filter { display: flex; align-items: center; }
#control-storage-status { user-select: none; display: flex; align-items: center; }

.control-panel-audio-list { display: flex; flex-flow: row wrap; align-content: start; justify-content: center; padding: 12px 4px; }

.audio-list-item { position: relative; margin: 8px; height: 180px; max-width: 90vw; width: 340px; }
.audio-list-image,
.audio-list-info { position: absolute; max-width: 85vw; width: 320px; max-height: 180px; border-radius: 4px; }
.audio-list-image { left: 0; top: 0; box-shadow: 0 0 2px 0 #666; }
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
  `<div id="main-panel" class="main-initial" style="overflow: auto; flex: 1; min-height: 0;">No script yet…<br />未加载代码…</div>`,
  `<div id="sub-control-panel" style="overflow: visible; position: relative; display: flex; flex-flow: column nowrap; background: #eee; box-shadow: 0 0 12px 0 #666; z-index: 1;"></div>`
].join('\n')

const initRender = ({
  audioStore, cacheStore, mainStore,
  T,
  resetRebuild, resetCode, resetAll,
  withLoading, updateLoadingStatus, updateStorageStatus, asyncRenderModal,
  cacheAudio, deleteAudio
}) => {
  const {
    open, location, Blob, URL,
    AUDIO_PATH_FETCH_URL,
    LOGO_URL,
    qS, cE, aCL, mECN, mEA,
    Dr: {
      Common: {
        Format,
        Error: { catchSync },
        Function: { lossyAsync },
        Math: { clamp },
        Immutable: { transformCache, Array: { arrayMatchPush, arrayMatchDelete, arraySplitChunk } }
      },
      Browser: {
        Input: {
          PointerEvent: { POINTER_EVENT_TYPE, applyPointerEventListener },
          KeyCommand: { createKeyCommandHub }
        }
      }
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

    const { audioListState: { audioList, audioListChunkIndex, audioListFilter }, isAudioListMinimize, audioCacheSizeMap, audioCacheStarList } = mainStore.getState()
    const { cacheUrlList, cacheInfoList } = cacheStore.getState()
    const audioListFiltered = filterAudioListCached(audioList, audioListFilter, audioCacheStarList, cacheUrlList, cacheInfoList)

    // chunk page
    const CHUNK_SIZE = 30
    const audioListFilteredChunkList = arraySplitChunk(audioListFiltered, CHUNK_SIZE)
    audioListFilteredChunkList.length > 1 && mainPanel.appendChild(cE(
      'div',
      { style: 'flex: 1 1 100%; display: flex; flex-flow: row wrap; align-items: center; justify-content: center;' },
      audioListFilteredChunkList.map((v, index) => cE('button', {
        className: index === audioListChunkIndex ? 'select' : '',
        innerText: `${index * CHUNK_SIZE + 1}`,
        onclick: () => setAudioListChunkIndex(index)
      }))
    ))

    for (const info of audioListFilteredChunkList[ audioListChunkIndex ]) {
      const { url, imageUrl, title, titleSecondary, time, tag } = info
      const audioCacheUrl = getAudioCacheUrl(url)
      const cacheSize = audioCacheSizeMap[ audioCacheUrl ]
      const isStar = audioCacheStarList.includes(audioCacheUrl)
      mainPanel.appendChild(cE('div', { className: 'audio-list-item' }, [
        cE('img', { className: 'audio-list-image', src: imageUrl }),
        cE('div', { className: !isAudioListMinimize ? 'audio-list-info' : 'audio-list-info minimize' }, [
          !isAudioListMinimize && createFlexRow(
            cE('div', { className: 'flex-row', innerText: time }),
            createFlexDiv(),
            cE('div', { className: 'flex-row', innerText: tag })
          ),
          !isAudioListMinimize && cE('div', { className: 'audio-list-info-title', innerText: title }),
          !isAudioListMinimize && cE('div', { className: 'audio-list-info-title-secondary', innerText: titleSecondary }),
          createFlexRow(
            createFlexDiv(),
            cacheSize && cE('div', { className: 'flex-row', innerText: `${Format.binary(cacheSize)}B` }),
            !cacheSize && createIconButton('cloud_download', { onclick: () => withLoading(cacheAudio, { mainStore, cacheStore, audioCacheUrl, updateLoadingStatus }) }),
            cacheSize && createIconButton('play_arrow', { onclick: () => switchToAudio(audioCacheUrl) }),
            cacheSize && createIconButton('delete', { onclick: () => withLoading(deleteAudio, { mainStore, cacheStore, audioCacheUrl }) }),
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

    const timelineDivTitle = mainPanel.appendChild(cE('div', { className: 'audio-timeline-item', tabIndex: 0 }, [
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
        imageUrl && cE('img', { className: 'audio-timeline-image', src: imageUrl }),
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
            createIconButton('play_arrow', { onclick: () => openAudioPanel({ radioUrl, time, locateTimeline }) })
          )
        ])
      ]))
      timelineDivList.push({ time, element })
    }
    timelineDivList.sort((a, b) => a.time - b.time)

    const locateTimeline = () => {
      const { currentTime } = audioStore.getState()
      let currentElement = timelineDivTitle
      for (const { time, element } of timelineDivList) {
        if (currentTime < time) break
        currentElement = element
      }
      currentElement && currentElement.focus()
    }

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
    cE('button', { id: 'control-storage-status', onclick: () => renderConfigModal({}) }, [ createIcon('settings'), cE('div', { id: 'storage-status' }) ])
  ])
  const setFilterStar = () => setAudioListFilter({ type: 'star' })
  const setFilterDownload = () => setAudioListFilter({ type: 'download' })
  const setFilterTime = () => setAudioListFilter({ type: 'time' })
  const setFilterFilter = lossyAsync(() => asyncRenderModal((resolve) => {
    const setFilter = () => resolve(qS('#filter-input').value)
    setTimeout(() => qS('#filter-input') && qS('#filter-input').focus(), 200)
    keyCommandHubFilter.addKeyCommand({ id: 'search-confirm', checkMap: { key: 'Enter' }, callback: setFilter })
    keyCommandHubFilter.start()
    keyCommandHubPlayer.stop() // TODO: untangle this code
    return [
      cE('label', { for: 'filter-input', className: 'margin', innerText: T('message-enter-filter') }),
      cE('input', { id: 'filter-input', className: 'margin' }),
      createFlexRow(
        createFlexDiv(),
        createIconButton('search', { onclick: setFilter }),
        createIconButton('clear', { onclick: () => resolve('') })
      )
    ]
  }, (filterText) => {
    keyCommandHubFilter.deleteKeyCommand({ id: 'search-confirm' })
    keyCommandHubFilter.stop()
    keyCommandHubPlayer.start()
    const filterList = (filterText || '').toLowerCase().split(/[\s'"-,.，。]/).filter(Boolean)
    filterList.length && setAudioListFilter({ type: 'filter', filterList })
  })).trigger
  const keyCommandHubFilter = createKeyCommandHub({})

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

    updateStorageStatus({ mainStore })
  }
  const styleDisplay = (visible) => visible ? '' : 'none'

  const updateControlConfig = ({ hasController = false, hasUpdate = false }) => {
    const storageStatus = qS('#control-storage-status')
    if (storageStatus) {
      mECN(storageStatus, hasUpdate, 'select')
      storageStatus.onclick = () => renderConfigModal({ hasController, hasUpdate })
      storageStatus.children[ 0 ].innerHTML = hasUpdate ? 'new_releases' : 'settings'
    }
  }
  const renderConfigModal = lossyAsync(({ hasController, hasUpdate }) => asyncRenderModal((resolve) => {
    const { storageStatus: { value, max } } = mainStore.getState()
    return [
      cE('h3', { className: 'margin', innerText: T('text-gcores-dump') }),
      cE('img', { src: LOGO_URL, style: 'margin: 2px auto; width: 64px; height: 64px;' }),
      createFlexRow(
        cE('p', { className: 'margin', innerText: `${T('text-storage-status')}:` }),
        createFlexDiv(),
        cE('b', { className: 'margin', innerText: max ? `${Format.binary(value)}B/${Format.binary(max)}B` : `${Format.binary(value)}B` })
      ),
      cE('div', { className: 'margin' }),
      createFlexRow(
        createIconButton('open_in_new', { onclick: () => { open('https://www.g-cores.com') } }),
        cE('div', { innerText: T('text-official-link') })
      ),
      createFlexRow(
        createIconButton('open_in_new', { onclick: () => { open('https://www.g-cores.com/articles/99114') } }),
        cE('div', { innerText: T('text-article-link') })
      ),
      createFlexRow(
        createIconButton('open_in_new', { onclick: () => { open('https://developer.mozilla.org/Apps/Progressive') } }),
        cE('div', { innerText: T('text-pwa-link') })
      ),
      cE('div', { className: 'margin' }),
      createFlexRow(
        createFlexDiv(),
        createIconButton(hasUpdate ? 'new_releases' : 'autorenew', { onclick: resetCode, disabled: !hasController }),
        createIconButton('bug_report', { onclick: resetRebuild, disabled: !hasController }),
        createIconButton('delete_forever', { onclick: resetAll, disabled: !hasController }),
        createIconButton('clear', { onclick: resolve })
      )
    ]
  })).trigger

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
            createIconButton('more_horiz', { id: 'player-control-play', onclick: togglePlayer }),
            createIconButton('', { id: 'player-locate' }),
            createIconButton('fast_rewind', { onclick: () => stepPlayerTime(-30) }),
            createIconButton('fast_forward', { onclick: () => stepPlayerTime(+30) }),
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
      audioStore.setSource()
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
  const setAudioListChunkIndex = (audioListChunkIndex) => { mainStore.updateAudioListState({ audioListChunkIndex }) }
  const setAudioListFilter = (audioListFilter) => { mainStore.updateAudioListState({ audioListFilter, audioListChunkIndex: 0 }) }

  const togglePlayer = () => {
    const { sourceUrl, isPlay } = audioStore.getState()
    sourceUrl && audioStore[ isPlay ? 'pause' : 'play' ]()
  }
  const stepPlayerTime = (stepTime) => {
    const { sourceUrl, currentTime } = audioStore.getState()
    sourceUrl && audioStore.setTime(currentTime + stepTime)
  }

  const keyCommandHubPlayer = createKeyCommandHub({})
  keyCommandHubPlayer.addKeyCommand({ checkMap: { key: 'Enter' }, callback: togglePlayer })
  keyCommandHubPlayer.addKeyCommand({ checkMap: { key: ' ' }, callback: togglePlayer })
  keyCommandHubPlayer.addKeyCommand({ checkMap: { key: 'ArrowLeft' }, callback: () => stepPlayerTime(-10) })
  keyCommandHubPlayer.addKeyCommand({ checkMap: { key: 'ArrowRight' }, callback: () => stepPlayerTime(+10) })
  mainStore.subscribe(({ audioListState, audioState, currentPanel, isAudioListMinimize, audioCacheStarList, audioCacheSizeMap }, prevState) => {
    if (audioState !== prevState.audioState) audioState ? keyCommandHubPlayer.start() : keyCommandHubPlayer.stop()
  })

  const switchToAudio = lossyAsync(async (audioCacheUrl) => {
    const audioState = await (await cacheStore.getResponseByUrl(audioCacheUrl)).json()
    mainStore.setAudioState(audioState)
    mainStore.setCurrentPanel('audio')
  }).trigger

  const openAudioPanel = lossyAsync(async ({ radioUrl, time, locateTimeline }) => {
    if (radioUrl !== audioStore.getState().info) {
      __DEV__ && console.log('[loadAudio]', radioUrl)
      const response = await cacheStore.getResponseByUrl(radioUrl)
      const responseBlob = await response.blob() // TODO: some how this cache blob get empty type (''), manually reset now, fetch blob seems fine, though
      const responseType = response.headers.get('content-type')
      const blob = responseBlob.type === responseType
        ? responseBlob
        : new Blob([ responseBlob ], { type: responseType })
      const objectUrl = URL.createObjectURL(blob)
      audioStore.setSource(objectUrl, responseType, radioUrl)
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

export {
  renderStyle,
  renderHTML,
  initRender
}
