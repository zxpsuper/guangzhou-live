// 主题配置
export const themeConfig = {
  // 站点信息
  siteMeta: {
    // 站点标题
    title: "广州百晓生",
    // 站点描述
    description: "一个懂广州、懂吃喝玩乐、懂年轻人的本地生活号",
    // 站点logo
    logo: "/images/logo/logo.webp",
    // 站点地址
    site: "https://guangzhou.suporka.site",
    // 语言
    lang: "zh-CN",
    // 作者
    author: {
      name: "小皮咖",
      cover: "/images/logo/logo.webp",
      email: "zxpscau@163.com",
      link: "https://suporka.site",
    },
  },
  // 备案信息
  icp: "",
  // 建站日期
  since: "2026-05-20",
  // 每页文章数据
  postSize: 8,
  // inject
  inject: {
    // 头部
    // https://vitepress.dev/zh/reference/site-config#head
    header: [
      // favicon
      ["link", { rel: "icon", href: "/favicon.ico" }],
      // RSS
      [
        "link",
        {
          rel: "alternate",
          type: "application/rss+xml",
          title: "RSS",
          href: "https://guangzhou.suporka.site/rss.xml",
        },
      ],
      // 预载 CDN
      [
        "link",
        {
          crossorigin: "",
          rel: "preconnect",
          href: "https://s1.hdslb.com",
        },
      ],
      [
        "link",
        {
          crossorigin: "",
          rel: "preconnect",
          href: "https://mirrors.sustech.edu.cn",
        },
      ],
      // HarmonyOS font
      [
        "link",
        {
          crossorigin: "anonymous",
          rel: "stylesheet",
          href: "https://s1.hdslb.com/bfs/static/jinkela/long/font/regular.css",
        },
      ],
      [
        "link",
        {
          crossorigin: "anonymous",
          rel: "stylesheet",
          href: "https://mirrors.sustech.edu.cn/cdnjs/ajax/libs/lxgw-wenkai-screen-webfont/1.7.0/style.css",
        },
      ],
      // iconfont
      [
        "link",
        {
          crossorigin: "anonymous",
          rel: "stylesheet",
          href: "https://cdn2.codesign.qq.com/icons/g5ZpEgx3z4VO6j2/latest/iconfont.css",
        },
      ],
      // Embed code
      ["link", { rel: "preconnect", href: "https://use.sevencdn.com" }],
      ["link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" }],
      [
        "link",
        {
          crossorigin: "anonymous",
          href: "https://use.sevencdn.com/css2?family=Fira+Code:wght@300..700&display=swap",
          rel: "stylesheet",
        },
      ],
      // 预载 DocSearch
      [
        "link",
        {
          href: "https://X5EBEZB53I-dsn.algolia.net",
          rel: "preconnect",
          crossorigin: "",
        },
      ],
    ],
  },
  // 导航栏菜单
  nav: [
    {
      text: "文库",
      items: [
        { text: "文章列表", link: "/pages/archives", icon: "article" },
        { text: "全部分类", link: "/pages/categories", icon: "folder" },
        { text: "全部标签", link: "/pages/tags", icon: "hashtag" },
        
      ],
    },
    // {
    //   text: "专栏",
    //   items: [
    //     { text: "技术分享", link: "/pages/categories/技术分享", icon: "technical" },
    //     { text: "我的项目", link: "/pages/project", icon: "code" },
    //     { text: "效率工具", link: "/pages/tools", icon: "tools" },
    //   ],
    // },
    // {
    //   text: "友链",
    //   items: [
    //     { text: "友链鱼塘", link: "/pages/friends", icon: "fish" },
    //     { text: "友情链接", link: "/pages/link", icon: "people" },
    //   ],
    // },
    // {
    //   text: "我的",
    //   items: [
    //     { text: "畅所欲言", link: "/pages/message", icon: "chat" },
    //     { text: "致谢名单", link: "/pages/thanks", icon: "reward" },
    //     { text: "关于本站", link: "/pages/about", icon: "contacts" },
    //   ],
    // },
  ],
  // 导航栏菜单 - 左侧
  navMore: [
    {
      name: "博客",
      list: [
        {
          icon: "/images/logo/logo.webp",
          name: "主站",
          url: "/",
        },
        // {
        //   icon: "/images/logo/logo.webp",
        //   name: "博客镜像站",
        //   url: "https://blog-backup.imsyy.top/",
        // },
      ],
    },
    // {
    //   name: "项目",
    //   list: [
    //     {
    //       icon: "/images/logo/logo.webp",
    //       name: "Curve",
    //       url: "https://github.com/imsyy/vitepress-theme-curve",
    //     },
    //     {
    //       icon: "https://pic.efefee.cn/uploads/2024/04/07/66124f5fc63c8.png",
    //       name: "SPlayer",
    //       url: "https://github.com/imsyy/SPlayer",
    //     },
    //     {
    //       icon: "https://pic.efefee.cn/uploads/2024/04/08/6613465358077.png",
    //       name: "Snavigation",
    //       url: "https://github.com/imsyy/SPlayer",
    //     },
    //     {
    //       icon: "/images/logo/logo.webp",
    //       name: "Home",
    //       url: "https://github.com/imsyy/home",
    //     },
    //     {
    //       icon: "https://pic.efefee.cn/uploads/2024/04/08/661346d418ad7.png",
    //       name: "DailyHotApi",
    //       url: "https://github.com/imsyy/DailyHotApi",
    //     },
    //     {
    //       icon: "https://pic.efefee.cn/uploads/2024/04/08/66134722586fa.png",
    //       name: "site-status",
    //       url: "https://github.com/imsyy/site-status",
    //     },
    //   ],
    // },
  ],
  // 封面配置
  cover: {
    // 是否开启双栏布局
    twoColumns: true,
    // 是否开启封面显示
    showCover: {
      // 是否开启封面显示 文章不设置cover封面会显示异常，可以设置下方默认封面
      enable: true,
      // 封面布局方式: left | right | both
      coverLayout: 'both',
      // 默认封面(随机展示)
      defaultCover: [
        'https://picsum.photos/800/400?random=1',
        'https://picsum.photos/800/400?random=2',
        'https://picsum.photos/800/400?random=3'
      ]
    }
  },
  // 页脚信息
  footer: {
    // 社交链接（请确保为偶数个）
    social: [
      // {
      //   icon: "email",
      //   link: "mailto:one@imsyy.top",
      // },
      // {
      //   icon: "github",
      //   link: "https://www.github.com/imsyy/",
      // },
      // {
      //   icon: "telegram",
      //   link: "https://t.me/bottom_user",
      // },
      // {
      //   icon: "bilibili",
      //   link: "https://space.bilibili.com/98544142",
      // },
      // {
      //   icon: "qq",
      //   link: "https://res.abeim.cn/api/qq/?qq=1539250352",
      // },
      // {
      //   icon: "twitter-x",
      //   link: "https://twitter.com/iimmsyy",
      // },
    ],
    // sitemap
    sitemap: [
      // {
      //   text: "博客",
      //   items: [
      //     { text: "近期文章", link: "/" },
      //     { text: "全部分类", link: "/pages/categories" },
      //     { text: "全部标签", link: "/pages/tags" },
      //     { text: "文章归档", link: "/pages/archives", newTab: true },
      //   ],
      // },
      // {
      //   text: "项目",
      //   items: [
      //     { text: "Home", link: "https://github.com/imsyy/home/", newTab: true },
      //     { text: "SPlayer", link: "https://github.com/imsyy/SPlayer/", newTab: true },
      //     { text: "DailyHotApi", link: "https://github.com/imsyy/DailyHotApi/", newTab: true },
      //     { text: "Snavigation", link: "https://github.com/imsyy/Snavigation/", newTab: true },
      //   ],
      // },
      // {
      //   text: "专栏",
      //   items: [
      //     { text: "技术分享", link: "/pages/categories/技术分享" },
      //     { text: "我的项目", link: "/pages/project" },
      //     { text: "效率工具", link: "/pages/tools" },
      //   ],
      // },
      // {
      //   text: "页面",
      //   items: [
      //     { text: "畅所欲言", link: "/pages/message" },
      //     { text: "关于本站", link: "/pages/about" },
      //     { text: "隐私政策", link: "/pages/privacy" },
      //     { text: "版权协议", link: "/pages/cc" },
      //   ],
      // },
      // {
      //   text: "服务",
      //   items: [
      //     { text: "站点状态", link: "https://status.imsyy.top/", newTab: true },
      //     { text: "一个导航", link: "https://nav.imsyy.top/", newTab: true },
      //     { text: "站点订阅", link: "https://blog.imsyy.top/rss.xml", newTab: true },
      //     {
      //       text: "反馈投诉",
      //       link: "https://eqnxweimkr5.feishu.cn/share/base/form/shrcnCXCPmxCKKJYI3RKUfefJre",
      //       newTab: true,
      //     },
      //   ],
      // },
    ],
  },
  // 评论
  comment: {
    enable: true,
    // 评论系统选择
    // artalk / twikoo
    type: "twikoo",
    // artalk
    // https://artalk.js.org/
    artalk: {
      site: "",
      server: "",
    },
    // twikoo
    // https://twikoo.js.org/
    twikoo: {
      // 必填，若不想使用 CDN，可以使用 pnpm add twikoo 安装并引入
      js: "https://mirrors.sustech.edu.cn/cdnjs/ajax/libs/twikoo/1.6.39/twikoo.all.min.js",
      envId: "https://twikoo-netlify-suporka.netlify.app",
      // 环境地域，默认为 ap-shanghai，腾讯云环境填 ap-shanghai 或 ap-guangzhou；Vercel 环境不填
      region: "",
      lang: "zh-CN",
    },
  },
  // 侧边栏
  aside: {
    // 站点简介
    hello: {
      enable: true,
      text: "广州、美食、探店、城市观察、热点评论、广州生活、年轻人生活方式。",
    },
    // 目录
    toc: {
      enable: true,
    },
    // 标签
    tags: {
      enable: true,
    },
    // 倒计时
    countDown: {
      enable: false,
      // 倒计时日期
      data: {
        name: "春节",
        date: "2027-02-06",
      },
    },
    // 站点数据
    siteData: {
      enable: true,
    },
  },
  // 友链
  friends: {
    // 友链朋友圈
    circleOfFriends: "",
    // 动态友链
    dynamicLink: {
      server: "",
      app_token: "",
      table_id: "",
    },
  },
  // 音乐播放器
  // https://github.com/imsyy/Meting-API
  music: {
    enable: true,
    // url
    url: "https://api.i-meto.com/meting/api",
    // id
    id: 630710167,
    // netease / tencent / kugou
    server: "netease",
    // playlist / album / song
    type: "playlist",
  },
  // 搜索
  // https://www.algolia.com/
  search: {
    enable: true,
    appId: "CY4ROR5QIL",
    apiKey: "5c79bb902e1a7c944948329899c56534",
  },
  // 打赏
  rewardData: {
    enable: false,
    // 微信二维码
    wechat: "https://pic.efefee.cn/uploads/2024/04/07/66121049d1e80.webp",
    // 支付宝二维码
    alipay: "https://pic.efefee.cn/uploads/2024/04/07/661206631d3b5.webp",
  },
  // 图片灯箱
  fancybox: {
    enable: true,
    js: "https://mirrors.sustech.edu.cn/cdnjs/ajax/libs/fancyapps-ui/5.0.36/fancybox/fancybox.umd.min.js",
    css: "https://mirrors.sustech.edu.cn/cdnjs/ajax/libs/fancyapps-ui/5.0.36/fancybox/fancybox.min.css",
  },
  // 外链中转
  jumpRedirect: {
    enable: true,
    // 排除类名
    exclude: [
      "cf-friends-link",
      "upyun",
      "icp",
      "author",
      "rss",
      "cc",
      "power",
      "social-link",
      "link-text",
      "travellings",
      "post-link",
      "report",
      "more-link",
      "skills-item",
      "right-menu-link",
      "link-card",
    ],
  },
  // 站点统计
  tongji: {
    "51la": "3PzWKibdvw7ngBWx",
  },
};
