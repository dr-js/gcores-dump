const toRequest = (url) => (new self.Request(url))
const getLocalResponse = async (request) => { // just pull from cache, no attempt to fetch
  const matchResponse = await self.caches.match(request)
  __DEV__ && console.log('[ServiceWorker][getLocalResponse] hit:', Boolean(matchResponse), request.url)
  return matchResponse
}
const autoResponse = async (request) => await getLocalResponse(request) || self.fetch(request)

const URL_CACHE_CONFIG = '/s/cache-config.json'
const fetchCacheConfig = async () => (await self.fetch(URL_CACHE_CONFIG)).json()
const getLocalCacheConfig = async () => (await getLocalResponse(toRequest(URL_CACHE_CONFIG))).json()

const install = async () => {
  const { defaultCacheData } = await fetchCacheConfig()

  // cache by config
  __DEV__ && console.log('[ServiceWorker] cache by config', defaultCacheData)
  for (const [ cacheKey, resourceList ] of Object.entries(defaultCacheData)) {
    await (await self.caches.open(cacheKey)).addAll(resourceList) // actually equals fetch & cache
  }

  // drop legacy cache
  const cacheWhitelist = Object.keys(defaultCacheData)
  for (const key of await self.caches.keys()) {
    __DEV__ && !cacheWhitelist.includes(key) && console.log('[ServiceWorker] drop legacy cache', key)
    !cacheWhitelist.includes(key) && await self.caches.delete(key)
  }

  await self.skipWaiting()
}

const onMessage = async ({ type, payload = {} }) => {
  if (type === 'check-update') {
    const CacheConfig = await fetchCacheConfig()
    const { version } = await getLocalCacheConfig()
    __DEV__ && console.log('[ServiceWorker][onMessage] check-update', CacheConfig.version, version)
    return { type: 'check-update-complete', isUpdate: CacheConfig.version !== version }
  } else if (type === 'reset-code') {
    const { resourceCacheKey } = await getLocalCacheConfig()
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
