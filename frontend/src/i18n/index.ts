import { createI18n } from 'vue-i18n'
import th from './th'
import zhTW from './zh-TW'

export default createI18n({
  legacy: false,
  locale: 'th',
  fallbackLocale: 'th',
  messages: {
    th,
    'zh-TW': zhTW,
  },
})
