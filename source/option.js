import { ConfigPresetNode, prepareOption } from 'dr-js/module/node/module/Option'
import { getServerFormatConfig } from 'dr-server/module/option'

const { SinglePath, AllPath, BooleanFlag, Config } = ConfigPresetNode

const OPTION_CONFIG = {
  prefixENV: 'gcd',
  formatList: [
    Config,
    { ...BooleanFlag, name: 'help', shortName: 'h' },
    { ...BooleanFlag, name: 'version', shortName: 'v' },
    getServerFormatConfig([
      { ...SinglePath, name: 'path-prepared-static' },
      {
        ...AllPath,
        optional: true,
        name: 'file-gcores-dump',
        shortName: 'D',
        description: 'set this to load Gcores Dump files to prepared static, server will not start'
      }
    ])
  ]
}

const { parseOption, formatUsage } = prepareOption(OPTION_CONFIG)

export { parseOption, formatUsage }
