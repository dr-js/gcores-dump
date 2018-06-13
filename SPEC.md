# Specification

* [Export Path](#export-path)
* [Bin Option Format](#bin-option-format)

#### Export Path
+ 📄 [source/option.js](source/option.js)
  - `formatUsage`, `parseOption`
+ 📄 [source/prepareStatic.js](source/prepareStatic.js)
  - `prepareAudioDumpJSON`
+ 📄 [source/responder.js](source/responder.js)
  - `configureResponder`
+ 📄 [source/browser/mainHTML.js](source/browser/mainHTML.js)
  - `getHTML`
+ 📄 [source/browser/render/render.js](source/browser/render/render.js)
  - `initRender`, `renderHTML`, `renderStyle`
+ 📄 [source/browser/render/renderModal.js](source/browser/render/renderModal.js)
  - `initRenderModal`
+ 📄 [source/browser/script/I18N.js](source/browser/script/I18N.js)
  - `initI18N`
+ 📄 [source/browser/script/audioStore.js](source/browser/script/audioStore.js)
  - `initAudioStore`
+ 📄 [source/browser/script/cacheOperation.js](source/browser/script/cacheOperation.js)
  - `initCacheOperation`
+ 📄 [source/browser/script/cacheStore.js](source/browser/script/cacheStore.js)
  - `initCacheStore`
+ 📄 [source/browser/script/mainStore.js](source/browser/script/mainStore.js)
  - `initMainStore`
+ 📄 [source/browser/script/serviceWorker.js](source/browser/script/serviceWorker.js)
  - `initServiceWorker`

#### Bin Option Format
📄 [source/option.js](source/option.js)
> ```
> CLI Usage:
>   --config -c [OPTIONAL] [ARGUMENT=1]
>       # from JSON: set to 'path/to/config.json'
>       # from ENV: set to 'env'
>   --help -h [OPTIONAL] [ARGUMENT=0+]
>       set to enable
>   --version -v [OPTIONAL] [ARGUMENT=0+]
>       set to enable
>   --hostname -H [OPTIONAL] [ARGUMENT=1]
>     --port -P [OPTIONAL-CHECK] [ARGUMENT=1]
>     --https -S [OPTIONAL-CHECK] [ARGUMENT=0+]
>         set to enable
>       --file-SSL-key [OPTIONAL-CHECK] [ARGUMENT=1]
>       --file-SSL-cert [OPTIONAL-CHECK] [ARGUMENT=1]
>       --file-SSL-chain [OPTIONAL-CHECK] [ARGUMENT=1]
>       --file-SSL-dhparam [OPTIONAL-CHECK] [ARGUMENT=1]
>     --path-log [OPTIONAL-CHECK] [ARGUMENT=1]
>       --prefix-log-file [OPTIONAL-CHECK] [ARGUMENT=1]
>     --file-pid [OPTIONAL-CHECK] [ARGUMENT=1]
>       --pid-ignore-exist [OPTIONAL-CHECK] [ARGUMENT=0+]
>           set to enable
>     --path-prepared-static [OPTIONAL-CHECK] [ARGUMENT=1]
>     --file-gcores-dump -D [OPTIONAL-CHECK] [ARGUMENT=1+]
>         set this to load Gcores Dump files to prepared static, server will not start
> ENV Usage:
>   "
>     #!/usr/bin/env bash
>     export GCD_CONFIG="[OPTIONAL] [ARGUMENT=1]"
>     export GCD_HELP="[OPTIONAL] [ARGUMENT=0+]"
>     export GCD_VERSION="[OPTIONAL] [ARGUMENT=0+]"
>     export GCD_HOSTNAME="[OPTIONAL] [ARGUMENT=1]"
>     export GCD_PORT="[OPTIONAL-CHECK] [ARGUMENT=1]"
>     export GCD_HTTPS="[OPTIONAL-CHECK] [ARGUMENT=0+]"
>     export GCD_FILE_SSL_KEY="[OPTIONAL-CHECK] [ARGUMENT=1]"
>     export GCD_FILE_SSL_CERT="[OPTIONAL-CHECK] [ARGUMENT=1]"
>     export GCD_FILE_SSL_CHAIN="[OPTIONAL-CHECK] [ARGUMENT=1]"
>     export GCD_FILE_SSL_DHPARAM="[OPTIONAL-CHECK] [ARGUMENT=1]"
>     export GCD_PATH_LOG="[OPTIONAL-CHECK] [ARGUMENT=1]"
>     export GCD_PREFIX_LOG_FILE="[OPTIONAL-CHECK] [ARGUMENT=1]"
>     export GCD_FILE_PID="[OPTIONAL-CHECK] [ARGUMENT=1]"
>     export GCD_PID_IGNORE_EXIST="[OPTIONAL-CHECK] [ARGUMENT=0+]"
>     export GCD_PATH_PREPARED_STATIC="[OPTIONAL-CHECK] [ARGUMENT=1]"
>     export GCD_FILE_GCORES_DUMP="[OPTIONAL-CHECK] [ARGUMENT=1+]"
>   "
> JSON Usage:
>   {
>     "config": [ "[OPTIONAL] [ARGUMENT=1]" ],
>     "help": [ "[OPTIONAL] [ARGUMENT=0+]" ],
>     "version": [ "[OPTIONAL] [ARGUMENT=0+]" ],
>     "hostname": [ "[OPTIONAL] [ARGUMENT=1]" ],
>     "port": [ "[OPTIONAL-CHECK] [ARGUMENT=1]" ],
>     "https": [ "[OPTIONAL-CHECK] [ARGUMENT=0+]" ],
>     "fileSSLKey": [ "[OPTIONAL-CHECK] [ARGUMENT=1]" ],
>     "fileSSLCert": [ "[OPTIONAL-CHECK] [ARGUMENT=1]" ],
>     "fileSSLChain": [ "[OPTIONAL-CHECK] [ARGUMENT=1]" ],
>     "fileSSLDhparam": [ "[OPTIONAL-CHECK] [ARGUMENT=1]" ],
>     "pathLog": [ "[OPTIONAL-CHECK] [ARGUMENT=1]" ],
>     "prefixLogFile": [ "[OPTIONAL-CHECK] [ARGUMENT=1]" ],
>     "filePid": [ "[OPTIONAL-CHECK] [ARGUMENT=1]" ],
>     "pidIgnoreExist": [ "[OPTIONAL-CHECK] [ARGUMENT=0+]" ],
>     "pathPreparedStatic": [ "[OPTIONAL-CHECK] [ARGUMENT=1]" ],
>     "fileGcoresDump": [ "[OPTIONAL-CHECK] [ARGUMENT=1+]" ],
>   }
> ```
