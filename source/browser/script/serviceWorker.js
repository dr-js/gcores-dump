const initServiceWorker = () => {
  const { navigator, MessageChannel } = window

  const isServiceWorkerAvailable = () => ('serviceWorker' in navigator)

  const tryRegisterServiceWorker = async (SERVICE_WORKER_URL) => {
    if (!navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL)
      __DEV__ && console.log('ServiceWorker Registration succeeded:', registration)
    } else __DEV__ && console.log('ServiceWorker found, skip register')
  }

  const tryPostServiceWorker = ({ data = {}, preCheck = () => true }) => new Promise((resolve, reject) => {
    if (!navigator.serviceWorker.controller) return reject(new Error('serviceWorker.no controller'))
    if (!preCheck()) return reject(new Error('preCheck failed'))
    const messageChannel = new MessageChannel() // for result
    messageChannel.port1.onmessage = (event) => {
      __DEV__ && console.log('service response', event.data)
      const { result, error } = event.data
      error ? reject(error) : resolve(result)
    }
    navigator.serviceWorker.controller.postMessage(data, [ messageChannel.port2 ])
  })

  return {
    isServiceWorkerAvailable,
    tryRegisterServiceWorker,
    tryPostServiceWorker
  }
}

export { initServiceWorker }
