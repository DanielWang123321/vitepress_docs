import { defineConfig, UserConfig } from 'vitepress'
import { generateSidebar, withSidebar, VitePressSidebarOptions } from 'vitepress-sidebar';
import { withI18n, } from 'vitepress-i18n';
// import { VitePressI18nOptions } from 'vitepress-i18n/types.ts';

const editLinkPattern = `/:path`;
// https://vitepress.dev/reference/site-config
const vitePressConfig: UserConfig = defineConfig({
  title: "UFactory Docs",
  description: "A VitePress Site",

  lastUpdated: true,
  // outDir: '../docs-dist',
  // cleanUrls: true,
  rewrites: {
    'en/:rest*': ':rest*'
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    // nav: [
    //   { text: 'Home', link: '/' },
    //   { text: 'Examples', link: '/markdown-examples' }
    // ],
    // sidebar: generateSidebar({
    //   documentRootPath: '/',
    // }),
    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ],
    search: {
      provider: 'local'
    },
    editLink: {
      pattern: editLinkPattern
    },
  }
})

const defaultLocale: string = 'en';
const supportLocales: string[] = [defaultLocale, 'zhHans'];

const commonSidebarConfig: VitePressSidebarOptions = {
  debugPrint: false,
  manualSortFileNameByPriority: ['introduction.md', 'guide', 'advanced-usage'],
  collapsed: false,
  capitalizeFirst: true,
  useTitleFromFileHeading: true,
  useTitleFromFrontmatter: true,
  useFolderTitleFromIndexFile: true,
  frontmatterOrderDefaultValue: 9, // For 'CHANGELOG.md'
  sortMenusByFrontmatterOrder: true
};

const vitePressSidebarConfig = [
  ...supportLocales.map((lang) => {
    return {
      ...commonSidebarConfig,
      documentRootPath: `/${lang}`,
      resolvePath: defaultLocale === lang ? '/' : `/${lang}/`,
      ...(defaultLocale === lang ? {} : { basePath: `/${lang}/` })
    };
  })
];


const vitePressI18nConfig: any = {
  locales: supportLocales,
  debugPrint: false,
  rootLocale: defaultLocale,
  searchProvider: 'local',
  description: {
    en: 'VitePress Sidebar is a VitePress plugin that automatically generates sidebar menus with one setup and no hassle. Save time by easily creating taxonomies for tons of articles.',
    zhHans:
      'VitePress Sidebar是一款VitePress插件,只需一次设置即可自动生成侧边栏菜单,无需任何麻烦。轻松为大量文章创建分类,节省时间。'
  },
  themeConfig: {
    en: {
      nav: [
        {
          text: 'Official Website',
          link: 'https://ufactory.cc'
        },
        {
          text: 'Contact Us',
          link: 'https://www.ufactory.cc/contact-us/'
        },

      ]
    },
    zhHans: {
      nav: [
        {
          text: '官方网站',
          link: 'https://cn.ufactory.cc'
        },
        {
          text: '联系我们',
          link: 'https://cn.ufactory.cc/contact-us/'
        },
      ]
    }
  }
};

export default defineConfig(
  withSidebar(withI18n(vitePressConfig, vitePressI18nConfig), vitePressSidebarConfig)
);