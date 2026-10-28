// context/AppContext.js
// App-wide values any component can read with useContext(AppContext):
//   booted       true once the preloader has finished
//   lang, setLang  "en" or "hi"
//   t(key, vars)   the translated string for a key ("nav.home")
//   theme, toggleTheme  "light" or "dark"

import { createContext } from 'react';

const AppContext = createContext({
  booted: true,
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
  theme: 'light',
  toggleTheme: () => {}
});

export default AppContext;
