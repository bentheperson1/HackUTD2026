import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/authContext';
import { Masthead } from './components/Masthead';
import { Footer } from './components/Footer';
import { NextActionBar, NextPlaceLink } from './components/NextAction';
import { LegalPage } from './pages/LegalPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { MembersPage } from './pages/MembersPage';
import { IncidentPage } from './pages/IncidentPage';
import { ChatPage } from './pages/ChatPage';
import { DocsPage } from './pages/DocsPage';
import { ScopePage } from './pages/ScopePage';
import { EditorPage } from './pages/EditorPage';
import { ExportPage } from './pages/ExportPage';
import { DrillPage } from './pages/DrillPage';
import { DebugPage } from './pages/DebugPage';

const AppShell: React.FC = () => {
  const location = useLocation();
  const { mode, isSignedIn } = useAuth();
  // Braces matter: newer browsers return a Promise from scrollTo, and React would treat it as a cleanup function
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Live mode: you must sign in with a roster phone before entering the app
  if (mode === 'live' && !isSignedIn) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-bg text-fg">
      <Masthead />
      <main className="page-root mx-auto w-full max-w-[1240px] px-4 pt-6 pb-20 md:px-8">
        <div className="mb-10">
          <NextActionBar />
        </div>
        <Outlet />
        <NextPlaceLink />
      </main>
      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/legal" element={<LegalPage />} />
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/incident" replace />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/warroom" element={<Navigate to="/chat" replace />} />
            <Route path="/drill" element={<DrillPage />} />
            <Route path="/incident" element={<IncidentPage />} />
            <Route path="/members" element={<MembersPage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/scope" element={<ScopePage />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/export" element={<ExportPage />} />
            <Route path="/debug" element={<DebugPage />} />
            <Route path="*" element={<Navigate to="/incident" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
