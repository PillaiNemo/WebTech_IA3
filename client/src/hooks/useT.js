// hooks/useT.js
// Shortcut: const t = useT();  t('nav.home')  ->  "Home" or "होम"

import { useContext } from 'react';
import AppContext from '../context/AppContext.js';

export default function useT() {
  return useContext(AppContext).t;
}
