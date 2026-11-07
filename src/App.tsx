import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/authContext';
import { TopBar } from './components/TopBar';
import { LoginPage } from './pages/LoginPage';
import { MembersPage } from './pages/MembersPage';
import { IncidentPage } from './pages/IncidentPage';
import { WarRoomPage } from './pages/WarRoomPage';
import { DocsPage } from './pages/DocsPage';
import { ScopePage } from './pages/ScopePage';
import { NotifyPage } from './pages/NotifyPage';
import { EditorPage } from './pages/EditorPage';
import { ExportPage } from './pages/ExportPage';
import { DrillPage } from './pages/DrillPage';
import { DebugPage } from './pages/DebugPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          <TopBar />
          <main style={{ marginTop: '16px' }}>
            <Routes>
              <Route path="/" element={<Navigate to="/warroom" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/members" element={<MembersPage />} />
              <Route path="/incident" element={<IncidentPage />} />
              <Route path="/warroom" element={<WarRoomPage />} />
              <Route path="/docs" element={<DocsPage />} />
              <Route path="/scope" element={<ScopePage />} />
              <Route path="/notify" element={<NotifyPage />} />
              <Route path="/editor" element={<EditorPage />} />
              <Route path="/export" element={<ExportPage />} />
              <Route path="/drill" element={<DrillPage />} />
              <Route path="/debug" element={<DebugPage />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
