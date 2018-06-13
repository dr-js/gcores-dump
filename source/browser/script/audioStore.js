const initAudioStore = () => {
  const {
    cE,
    Dr: {
      Common: {
        Math: { clamp },
        Function: { createInsideOutPromise },
        Time: { createTimer },
        Immutable: { StateStore: { createStateStore } }
      }
    }
  } = window

  const initialState = {
    info: null, // to check which audio it is
    sourceUrl: '',
    currentTime: 0,
    duration: 0,
    isPlay: false
  }

  const createAudioStore = () => {
    // Audio on Mobile Devices won't play without user interaction.
    // But, the user only has to push play once per audio element
    // so we keep a single audio element and reuse

    // TODO: HACK: maybe just the Audio() and src? check: https://stackoverflow.com/a/50491480
    const audioElement = cE('audio')
    const sourceElement = cE('source')

    audioElement.appendChild(sourceElement)

    if (__DEV__) window.DEBUG = Object.assign(window.DEBUG || {}, { audioElement, sourceElement })

    // sourceElement.src = '<your blob url>'
    // sourceElement.type = 'audio/mp3' // or whatever

    __DEV__ && audioElement.addEventListener('error', (event) => {
      console.log('[audio] error', event, audioElement.error)
      reset()
    })
    audioElement.addEventListener('loadeddata', () => {
      __DEV__ && console.log('[audio] loadeddata (first frame of the media has finished loading)', sourceElement.src)
      setState({ duration: audioElement.duration })
    })
    audioElement.addEventListener('ended', () => { pause() })
    audioElement.addEventListener('stalled', () => { audioElement.load() }) // TODO: HACK: check https://stackoverflow.com/a/21778782
    audioElement.addEventListener('play', () => {
      setState({ isPlay: true })
      startTimer()
    })
    audioElement.addEventListener('pause', () => {
      setState({ isPlay: false })
      stopTimer()
    })

    const { subscribe, unsubscribe, getState, setState } = createStateStore(initialState)

    const { start: startTimer, stop: stopTimer } = createTimer({
      func: () => setState({ currentTime: audioElement.currentTime }),
      delay: 500
    })

    const reset = () => {
      stopTimer()
      // sourceElement.src = '' // NOTE: do not reset to '' (will cause error: 'MEDIA_ELEMENT_ERROR: Empty src attribute')
      audioElement.volume = 1 // NOTE: reset anyway, use you buttons/keyboard to set system volume
      audioElement.currentTime = 0
      setState(initialState)
    }
    const play = () => { audioElement.play() }
    const pause = () => { audioElement.pause() }
    const setSource = (sourceUrl = '', sourceType = '', info = null) => {
      if (sourceUrl === getState().sourceUrl && info === getState().info) return
      sourceElement.src = sourceUrl
      sourceElement.type = sourceType
      audioElement.load() // TODO: check needed?
      setState({ sourceUrl: sourceUrl, info })
    }
    const setTime = (currentTime) => {
      if (!getState().duration) return
      currentTime = clamp(currentTime, 0, getState().duration)
      audioElement.currentTime = currentTime
      setState({ currentTime: currentTime })
    }
    const getLoadPromise = async () => {
      if (getState().duration) return
      const { promise, resolve } = createInsideOutPromise()
      subscribe(({ duration }) => duration && resolve())
      setTimeout(resolve, 1000) // 10sec, just not waiting too long (mobile may be slow for big audio files)
      await promise
      unsubscribe(resolve)
    }

    return {
      subscribe, // should reduce listener code since tick for currentTime will be called very often
      unsubscribe,
      getState,
      reset,
      play,
      pause,
      setSource,
      setTime,
      getLoadPromise
    }
  }

  return {
    initialState,
    createAudioStore
  }
}

export { initAudioStore }
