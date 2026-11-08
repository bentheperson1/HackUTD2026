import React, { useCallback, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { AuthProvider } from "./lib/authContext";
import { TopBar } from "./components/TopBar";
import { NavDrawer } from "./components/NavDrawer";
import { LoginPage } from "./pages/LoginPage";
import { AdminDashboard } from "./pages/AdminDashboard";
import { MembersPage } from "./pages/MembersPage";
import { IncidentPage } from "./pages/IncidentPage";
import { WarRoomPage } from "./pages/WarRoomPage";
import { DocsPage } from "./pages/DocsPage";
import { ScopePage } from "./pages/ScopePage";
import { NotifyPage } from "./pages/NotifyPage";
import { EditorPage } from "./pages/EditorPage";
import { ExportPage } from "./pages/ExportPage";
import { DrillPage } from "./pages/DrillPage";
import { DebugPage } from "./pages/DebugPage";
import { InsurerPage } from "./pages/InsurerPage";

const AppShell: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <NavDrawer open={drawerOpen} onClose={closeDrawer} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setDrawerOpen(true)} />
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-12 pt-4 md:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/incident" replace />} />
            <Route path="/admin" element={<AdminDashboard />} />
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
            <Route path="/insurer" element={<InsurerPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
