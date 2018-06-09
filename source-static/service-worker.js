const getCacheConfig = async () => {
  const response = await autoResponse(new self.Request('/s/cache-config.json'))
  return response.json()
}

const install = async () => {
  const { defaultCacheData } = await getCacheConfig()

  // cache by config
  __DEV__ && console.log('[ServiceWorker] cache by config', defaultCacheData)
  for (const [ cacheKey, resourceList ] of Object.entries(defaultCacheData)) {
    await (await self.caches.open(cacheKey)).addAll(resourceList)
  }

  // drop legacy cache
  const cacheWhitelist = Object.keys(defaultCacheData)
  for (const key of await self.caches.keys()) {
    __DEV__ && !cacheWhitelist.includes(key) && console.log('[ServiceWorker] drop legacy cache', key)
    !cacheWhitelist.includes(key) && await self.caches.delete(key)
  }

  await self.skipWaiting()
}

// just pull from cache
const autoResponse = async (request) => {
  const matchResponse = await self.caches.match(request)
  __DEV__ && console.log('[ServiceWorker][autoResponse] hit:', Boolean(matchResponse), request.url)
  return matchResponse || self.fetch(request)
}

const onMessage = async ({ type, payload }) => {
  if (type === 'check-update') {
    const responseData = await (await self.fetch('/s/cache-config.json')).json()
    const cacheResponseData = await (await autoResponse(new self.Request('/s/cache-config.json'))).json()
    __DEV__ && console.log('[ServiceWorker][onMessage] check-update', responseData.version, cacheResponseData.version)
    return { type: 'check-update-complete', isUpdate: responseData.version !== cacheResponseData.version }
  } else if (type === 'reset-code') {
    const { resourceCacheKey } = await getCacheConfig()
    for (const key of await self.caches.keys()) key !== resourceCacheKey && await self.caches.delete(key)
    await self.registration.unregister()
    return { type: 'reset-code-complete' }
  } else if (type === 'reset-all') {
    for (const key of await self.caches.keys()) await self.caches.delete(key)
    await self.registration.unregister()
    return { type: 'reset-all-complete' }
  }
}

self.addEventListener('install', (event) => { event.waitUntil(install()) })
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()) })
self.addEventListener('fetch', (event) => { event.respondWith(autoResponse(event.request)) })
self.addEventListener('message', (event) => {
  onMessage(event.data)
    .then((result) => ({ result }), (error) => ({ error: error.stack || error.toString() }))
    .then((response) => event.ports[ 0 ].postMessage(response))
})
