const initI18N = () => {
  const { navigator } = window
  const textData = {
    'language': [ 'EN', '汉' ],
    'default': [ 'text-missing', '文本缺失' ],

    'feat-service-worker': [ 'ServiceWorker support is expected, please retry with some modern Browser.', '缺少 ServiceWorker 支持，请使用更现代的浏览器重试' ],
    'feat-error-service-worker': [ 'ServiceWorker registration failed, please retry with some modern Browser.', '注册 ServiceWorker 失败，请使用更现代的浏览器重试' ],

    'step-init': [ 'Initializing…', '初始化中…' ],
    'step-load-cache': [ 'Load Cache…', '读取缓存数据…' ],
    'step-cache-audio-list': [ 'Cache Audio List…', '缓存列表数据…' ],
    'step-render-ui': [ 'Render UI…', '渲染界面…' ],

    'message-reset-code': [ 'Reset code data for update?', '清除代码缓存以进行更新？' ],
    'message-reset-code-done': [ 'Reset code data complete', '代码缓存已清除，下次加载应用会进行更新' ],
    'message-reset-all': [ '☢☢☢ Reset all cached data? This is for removing app ☢☢☢', '☢☢☢ 清除所有缓存数据？此操作用于卸载应用 ☢☢☢' ],
    'message-reset-all-done': [ 'Reset data complete, app will re-initialize on next load', '缓存数据已清除，下次加载应用会重新初始化' ],
    'message-enter-filter': [ 'enter words to match separated by space', '输入查询关键词，以空格分隔' ],
    'message-delete-audio': [ 'Delete cached audio?', '清除音频缓存？' ],
    'message-audio-fetch-blocked': [ 'This audio source can not be cached, offline play unavailable', '不支持缓存该音频文件源，仅可在线播放' ],

    'text-loading': [ 'loading…', '加载中…' ],
    'text-loading-cache': [ 'Downloading to cache…', '下载资源到缓存…' ],

    'res-audio-list-info': [ 'Audio List Info', '目录信息' ],
    'res-audio-list-image': [ 'Audio List Image', '目录图片资源' ],
    'res-audio-info': [ 'Audio Info', '音频信息' ],
    'res-audio-image': [ 'Audio Image', '音频图片' ],
    'res-audio-author-image': [ 'Audio Host Image', '音频主持人图片' ],
    'res-audio-timeline-image': [ 'Audio Timeline Image', '音频时间轴图片' ],
    'res-audio-data': [ 'Audio Source (big file)', '音频文件（大文件）' ]
  }
  const useTextIndex = __DEV__ || (navigator.language || '').toLowerCase().includes('zh') ? 1 : 0
  return (key) => (textData[ key ] && textData[ key ][ useTextIndex ]) || textData[ 'default' ][ useTextIndex ]
}

export { initI18N }