// Landing.jsx: the home page (route "/").
// Sections: hero, service tiles, numbers, recent issues, how it works,
// community banner.
// Each section fades up as it scrolls into view (useReveal).

import { useContext, useMemo, useRef } from 'react';
import AppContext from '../context/AppContext.js';
import useLandingData from '../hooks/useLandingData.js';
import useReveal from '../hooks/useReveal.js';
import sample from '../data/landing.json';
import HeroSection from './home/HeroSection.jsx';
import QuickServices from './home/QuickServices.jsx';
import StatsBar from './home/StatsBar.jsx';
import HowItWorks from './home/HowItWorks.jsx';
import RecentIssues from './home/RecentIssues.jsx';
import CommunityBanner from './home/CommunityBanner.jsx';

export default function Landing() {
  const { booted } = useContext(AppContext);
  const pageRef = useRef(null);
  const data = useLandingData();

  // The hero card shows a live issue with a photo once the API answers.
  const heroIssue = useMemo(
    () => data.issues.find((i) => i.imageUrls && i.imageUrls.length) || sample.heroIssue,
    [data.issues]
  );

  // Start the reveals after the preloader, and again if live issues arrive.
  useReveal(pageRef, { enabled: booted, key: data.issues });

  return (
    <div ref={pageRef} className="lp-home">
      <HeroSection issue={heroIssue} start={booted} />
      <QuickServices />
      <StatsBar stats={data.stats} />
      <RecentIssues issues={data.issues} />
      <HowItWorks steps={sample.steps} />
      <CommunityBanner />
    </div>
  );
}
