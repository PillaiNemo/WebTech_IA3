// data/navLinks.js
// The side navigation, shared by the desktop sidebar and the mobile menu.
// labelKey is looked up in data/i18n/*.json, icon in components/Icon.jsx.
// to: a React route. hashLink: a section of the home page.
// href: one of the plain HTML pages in /static (a normal link, not a route).

export const NAV_GROUPS = [
  {
    titleKey: 'side.services',
    links: [
      { to: '/', labelKey: 'nav.home', icon: 'home', end: true },
      { to: '/report', labelKey: 'nav.report', icon: 'file' },
      { to: '/track', labelKey: 'nav.track', icon: 'route' },
      { to: '/issues', labelKey: 'nav.explore', icon: 'map' }
    ]
  },
  {
    titleKey: 'side.info',
    links: [
      { to: '/impact', labelKey: 'nav.impact', icon: 'chart' },
      { to: { pathname: '/', hash: '#how' }, labelKey: 'nav.how', icon: 'help', hashLink: true },
      { href: '/static/about.html', labelKey: 'footer.about', icon: 'info' },
      { href: '/static/contact.html', labelKey: 'footer.contact', icon: 'mail' }
    ]
  }
];
