import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/authContext';
import { TopBar } from './components/TopBar';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
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
        <div className="min-h-screen bg-[#0B0D11] text-slate-100 flex flex-col font-sans">
          <TopBar />
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/admin" replace />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/warroom" element={<WarRoomPage />} />
              <Route path="/drill" element={<DrillPage />} />
              <Route path="/incident" element={<IncidentPage />} />
              <Route path="/members" element={<MembersPage />} />
              <Route path="/docs" element={<DocsPage />} />
              <Route path="/scope" element={<ScopePage />} />
              <Route path="/notify" element={<NotifyPage />} />
              <Route path="/editor" element={<EditorPage />} />
              <Route path="/export" element={<ExportPage />} />
              <Route path="/debug" element={<DebugPage />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
