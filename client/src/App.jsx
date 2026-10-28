// App.jsx: all the routes (React Router).

import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Explore from './pages/Explore.jsx';
import IssueDetail from './pages/IssueDetail.jsx';
import Track from './pages/Track.jsx';
import Impact from './pages/Impact.jsx';
import Report from './pages/Report.jsx';
import Admin from './pages/Admin.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="issues" element={<Explore />} />
        <Route path="issues/:complaintId" element={<IssueDetail />} />
        <Route path="track" element={<Track />} />
        <Route path="track/:complaintId" element={<Track />} />
        <Route path="impact" element={<Impact />} />
        <Route path="report" element={<Report />} />
        <Route path="admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
