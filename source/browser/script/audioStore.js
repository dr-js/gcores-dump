const initAudioStore = () => {
  const {
    Audio,
    Dr: { Common: { Math: { clamp }, Time: { createTimer }, Immutable: { StateStore: { createStateStore } } } }
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
    const element = new Audio()
    __DEV__ && element.addEventListener('error', (event) => {
      console.log('[audio] error', event, element.error)
      reset()
    })
    element.addEventListener('loadeddata', () => {
      __DEV__ && console.log('[audio] loadeddata (first frame of the media has finished loading)', element.src)
      setState({ duration: element.duration })
    })
    element.addEventListener('ended', () => { pause() })
    element.addEventListener('play', () => {
      setState({ isPlay: true })
      startTimer()
    })
    element.addEventListener('pause', () => {
      setState({ isPlay: false })
      stopTimer()
    })

    const { subscribe, unsubscribe, getState, setState } = createStateStore(initialState)

    const { start: startTimer, stop: stopTimer } = createTimer({
      func: () => setState({ currentTime: element.currentTime }),
      delay: 500
    })

    const reset = () => {
      stopTimer()
      // element.src = '' // NOTE: do not reset to '' (will cause error: 'MEDIA_ELEMENT_ERROR: Empty src attribute')
      element.volume = 1 // NOTE: reset anyway
      element.currentTime = 0
      setState(initialState)
    }
    const play = () => { element.play() }
    const pause = () => { element.pause() }
    const setSourceUrl = (sourceUrl, info = null) => {
      if (sourceUrl === getState().sourceUrl && info === getState().info) return
      element.src = sourceUrl
      setState({ sourceUrl: sourceUrl, info })
    }
    const setTime = (currentTime) => {
      if (!getState().duration) return
      currentTime = clamp(currentTime, 0, getState().duration)
      element.currentTime = currentTime
      setState({ currentTime: currentTime })
    }

    return {
      subscribe, // should reduce listener code since tick for currentTime will be called very often
      unsubscribe,
      getState,
      reset,
      play,
      pause,
      setSourceUrl,
      setTime
    }
  }

  return {
    initialState,
    createAudioStore
  }
}

export { initAudioStore }
