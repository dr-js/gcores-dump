# G-cores dump

```js
{
  // dump page & radio data from `https://www.g-cores.com`
  // need to paste to latest Chrome/Firefox console, with page origin under `https://www.g-cores.com` (to prevent CORS fetch error)

  // // step dump
  // dumpPageList(`https://www.g-cores.com/categories/12/originals?page=`, 1, 17) // dump Gadio pro
  // dumpPageList(`https://www.g-cores.com/categories/53/originals?page=`, 1, 1) // dump Gadio story
  // dumpRadioPage(`https://www.g-cores.com/radios/98710`)
  // dumpRadioPage(`https://www.g-cores.com/radios/14462`) // old non alioss audio

  // // mass dump
  // massDump(`https://www.g-cores.com/categories/12/originals?page=`, 1, 17) // dump all Gadio pro
  // massDump(`https://www.g-cores.com/categories/12/originals?page=`, 1, 3) // or dump 3 pages of Gadio pro

  const initGcoresDump = () => {
    const { Dr: { Common: { Math: { getSampleRange }, Error: { catchSync, catchAsync } }, Browser: { Resource: { createDownloadBlob } } } } = window

    const fetchHtmlDOM = async (url) => {
      const response = await window.fetch(url)
      const htmlString = await response.text()
      return (new window.DOMParser())
        .parseFromString(htmlString, 'text/html')
    }

    const normalizeHtmlText = (string = '') => string.trim().replace(/\s+/g, ' ')

    // Page list

    const dumpPageList = async (urlPrefix, from, to) => {
      console.log('dumpPageList:', { urlPrefix, from, to })
      const pageDataList = []
      for (const url of getSampleRange(from, to).map((index) => `${urlPrefix}${index}`)) {
        console.log('fetching page list:', url)
        const { documentElement } = await fetchHtmlDOM(url)
        // console.log('fetch page list success')
        for (const pageThumbDOM of documentElement.querySelectorAll('div.showcase')) {
          const { result: pageData, error } = catchSync(getPageDataFromPageThumbDOM, pageThumbDOM)
          error && console.warn('failed to dump page list', pageThumbDOM, error)
          if (error) continue
          pageDataList.push(pageData)
          // console.log('get page:', pageData.title, pageData.url)
        }
      }
      return pageDataList
    }
    const getPageDataFromPageThumbDOM = (pageThumbDOM) => ({
      url: pageThumbDOM.querySelector('div.showcase_text a').href, // `https://www.g-cores.com/radios/98710`
      imageUrl: pageThumbDOM.querySelectorAll('img')[ 0 ].src, // `https://image.g-cores.com/ed04d003-0e4f-4185-8c2d-19d327da9e1e.jpg?x-oss-process=style/original_hs`
      title: normalizeHtmlText(pageThumbDOM.querySelector('div.showcase_text a').textContent), // `《奥秘》——当一个奇幻世界发生工业革命，它会是什么样子？`
      titleSecondary: normalizeHtmlText(pageThumbDOM.querySelector('div.showcase_info').textContent), // `《奥秘：蒸汽与魔法》，一款毛病特别多但又拥有奇异魅力的CRPG`
      time: normalizeHtmlText([ ...pageThumbDOM.querySelector('div.showcase_time').childNodes ].pop().nodeValue), // `2018-05-25`
      tag: normalizeHtmlText(pageThumbDOM.querySelector('div.showcase_time a').textContent) // `Gadio Story vol.15`
    })

    // Radio page

    const dumpRadioPage = async (url) => {
      console.log('fetching radio page:', url)
      const { documentElement: pageDOM } = await fetchHtmlDOM(url)
      // console.log('fetch radio page success')
      const { result: radioData, error } = await catchAsync(getRadioDataFromPageDOM, pageDOM)
      error && console.warn('failed to dump radio page', pageDOM, error)
      return error ? null : radioData
    }
    const getRadioDataFromPageDOM = async (pageDOM) => {
      const {
        url, // `https://www.g-cores.com/radios/98710`
        title, // `《奥秘》——当一个奇幻世界发生工业革命，它会是什么样子？`
        description: titleSecondary // `《奥秘：蒸汽与魔法》，一款毛病特别多但又拥有奇异魅力的CRPG`
        // seems missing, bug?
        // image: imageUrl // `https://alioss.g-cores.com/uploads/radio/ed04d003-0e4f-4185-8c2d-19d327da9e1e_hl.jpg`
      } = Object.assign(...(
        Array.from(pageDOM.querySelectorAll('meta'))
          .filter((e) => e.attributes.property)
          .map(({ attributes: { property }, content }) => ({
            [ property.value.split(':').pop() ]: content
          }))
      ))

      // "https://image.g-cores.com/ed04d003-0e4f-4185-8c2d-19d327da9e1e.jpg?x-oss-process=style/original_hl"
      const imageUrl = pageDOM.querySelector('.swiper-container .img-responsive').src

      const authorListDOM = pageDOM.querySelector('.story_djs_items') // optional authorList
      const authorDataList = authorListDOM
        ? Array.from(pageDOM.querySelector('.story_djs_items').children)
          .map((e) => {
            const name = normalizeHtmlText([ ...e.childNodes ].pop().nodeValue) // `位面旅行者G`
            const url = e.href // https://www.g-cores.com/users/20778
            const avatarUrl = e.querySelector('img').src // `https://alioss.g-cores.com/uploads/user/ec29b13b-0a22-404c-a7cf-a63d1ac4d37f_normal.png`
            return { name, url, avatarUrl }
          })
        : []

      const {
        audioId: radioId, // 98710
        mediaSrc: radioSourceData, // {"mp3":["https://alioss.g-cores.com/uploads/audio/11d8710a-51cf-4af0-b398-07e12e960b2b.mp3"]}
        timelines: radioTimelineRawList // [{"id":73318,"media_id":1242,"at":24,"title":"开场 BGM","asset":{"url":"/uploads/timeline/442bc10b-8b4f-443f-93d2-133d15968daf.png","limit":{"url":"/uploads/timeline/442bc10b-8b4f-443f-93d2-133d15968daf_limit.png"}},"content":"大家现在听到的开场 BGM 是出自《奥秘》原声的《Arcanum》","quote_href":"https://www.xiami.com/play?ids=/song/playlist/id/1771862115/object_name/default/object_id/0#loaded","created_at":"2018-05-24T14:07:16.000+08:00","updated_at":"2018-05-24T20:50:31.000+08:00"}]
      } = window.eval( // eslint-disable-line no-eval
        Array.from(pageDOM.querySelectorAll('script'))
          .find((e) => !e.src && e.text.includes('timelines') && e.text.includes('mediaSrc'))
          .text
          .match(/\({[^]+?}\)/)[ 0 ]
      )

      // test radio source
      //   access:
      //     await fetch('https://alioss.g-cores.com/uploads/audio/11d8710a-51cf-4af0-b398-07e12e960b2b.mp3', { method: 'HEAD', mode: 'cors' })
      //   no access (throw error):
      //     await fetch('https://cdn.lizhi.fm/audio/2015/03/10/18516569099888646_hd.mp3', { method: 'HEAD', mode: 'cors' })
      const radioUrl = Object.values(radioSourceData)[ 0 ][ 0 ]
      const { error } = await catchAsync(window.fetch, radioUrl, { method: 'HEAD', mode: 'cors' })
      const radioUrlFetchBlocked = Boolean(error)

      const radioTimelineList = radioTimelineRawList.map(({
        at: time, // 24,
        title, // '开场 BGM',
        asset: {
          url: imageUrl // '/uploads/timeline/442bc10b-8b4f-443f-93d2-133d15968daf.png',
          // limit: { url: '/uploads/timeline/442bc10b-8b4f-443f-93d2-133d15968daf_limit.png' }
        },
        content, // '大家现在听到的开场 BGM 是出自《奥秘》原声的《Arcanum》',
        quote_href: linkUrl // 'https://www.xiami.com/play?ids=/song/playlist/id/1771862115/object_name/default/object_id/0#loaded',
      }) => ({
        time, // in seconds
        imageUrl: imageUrl && `https://alioss.g-cores.com${imageUrl}`, // lock origin
        title,
        content,
        linkUrl // optional
      }))

      return { 
        url,
        title,
        titleSecondary,
        imageUrl,
        authorDataList,
        radioId,
        radioSourceData,
        radioTimelineList,
        radioUrl,
        radioUrlFetchBlocked
      }
    }

    const massDump = async (urlPrefix, from, to) => {
      const pageDataList = await dumpPageList(urlPrefix, from, to)
      console.log(`[massDump] pageDataList count: ${pageDataList.length}`)

      const radioDataList = []
      for (let index = 0, indexMax = pageDataList.length; index < indexMax; index++) {
        const { url } = pageDataList[ index ]
        console.log(`[massDump] [${index}/${indexMax}] radio: ${url}`)
        const radioData = await dumpRadioPage(url)
        radioData && radioDataList.push(radioData)
      }

      const fileName = `[GcoresDump][${(new Date()).toISOString()}]${urlPrefix}[${from}-${to}]`
      const dumpData = { timestamp: Date.now(), argument: { urlPrefix, from, to }, pageDataList, radioDataList }
      const dumpString = JSON.stringify(dumpData)

      console.log(`[massDump] file char count ${dumpString.length}`)
      createDownloadBlob(`${fileName.replace(/[^\w[\]]+/g, '-')}.json`, [ dumpString ], 'application/json') // TODO: DEPRECATED method

      console.log(`[massDump] done. pageDataList: ${pageDataList.length}, radioDataList: ${radioDataList.length}`)
      return { fileName, dumpData }
    }

    return { dumpPageList, dumpRadioPage, massDump }
  }

  document.body.appendChild(Object.assign(document.createElement('script'), {
    src: 'https://cdn.jsdelivr.net/npm/dr-js@0.15.0/library/Dr.browser.js',
    onerror: (error) => console.error('=== Dump script load failed ==\n', error),
    onload: async () => {
      const { dumpPageList, dumpRadioPage, massDump } = initGcoresDump()
      Object.assign(window, { dumpPageList, dumpRadioPage, massDump })
      console.log('== Dump script ready ==')
    }
  }))
}
```
