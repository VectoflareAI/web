import { getPermalink, getBlogPermalink } from './utils/permalinks';

export const headerData = {
  links: [
    {
      text: '首页',
      href: getPermalink('/'),
      links: [
        {
          text: '网站服务',
          href: getPermalink('/website-service'),
        },
        {
          text: '客户数据库搭建',
          href: getPermalink('/customer-database-build'),
        },
        {
          text: 'GEO优化',
          href: getPermalink('/GEO-service'),
        },
        {
          text: '品牌推广',
          href: getPermalink('/brand-service'),
        },
      ],
    },
    {
      text: '研发中心',
      href: getPermalink('/r-d-center'),
    },
    {
      text: '产品中心',
      href: getPermalink('/products'),
      links: [
        {
          text: '工作流定制',
          href: getPermalink('/workflow'),
        },
        {
          text: '专业工具定制',
          href: getPermalink('/tools'),
        },
      ],
    },
    {
      text: '技术支持',
      href: getPermalink('/service-center'),
      links: [
        {
          text: '关于我们',
          href: getPermalink('/about'),
        },
        {
          text: '联系我们',
          href: getPermalink('/contact'),
        },
        {
          text: '新闻',
          href: getBlogPermalink(),
        },
      ],
    },
    {
      text: '社交媒体',
      href: getPermalink('/social-media'),
    },
  ],
  actions: [{ text: '获取报价', href: getPermalink('/contact'), target: '_blank' }],
};

export const footerData = {
  links: [
    {
      title: '产品服务',
      links: [
        { text: '工作流定制', href: getPermalink('/workflow') },
        { text: '专业工具定制', href: getPermalink('/tools') },
      ],
    },
    {
      title: '关于',
      links: [
        { text: '关于我们', href: getPermalink('/about') },
        { text: '研发中心', href: getPermalink('/r-d-center') },
        { text: '新闻', href: getBlogPermalink() },
      ],
    },
    {
      title: '支持',
      links: [
        { text: '联系我们', href: getPermalink('/contact') },
        { text: '服务条款', href: getPermalink('/terms') },
        { text: '隐私政策', href: getPermalink('/privacy') },
      ],
    },
  ],
  secondaryLinks: [],
  socialLinks: [
    {
      ariaLabel: '微信视频号',
      icon: 'tabler:brand-wechat',
      href: 'https://weixin.qq.com/cgi-bin/readtemplate?action=gotohome&t=weixin&lang=zh_CN',
    },
    { ariaLabel: '抖音', icon: 'tabler:brand-tiktok', href: 'https://www.douyin.com/user/' },
    { ariaLabel: '小红书', icon: 'tabler:brand-reddit', href: 'https://www.xiaohongshu.com/user/' },
    { ariaLabel: 'Github', icon: 'tabler:brand-github', href: 'https://github.com/VectoflareAI/web' },
  ],
  footNote: `
    &copy; <span id="footer-year"></span> By Vectoflare. All Rights Reserved.
  `,
};
