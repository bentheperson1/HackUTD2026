import React from 'react';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';

// TODO: the drill simulator needs backend tables (drill_session, drill_player, drill_event) and reducers.
// The previous local-only version is in git history before the backend hookup.
export const AdminDashboard: React.FC = () => (
  <div className="space-y-8">
    <PageHeader title="Command center" description="Run tabletop drills against realistic scenarios." />
    <Notice>Drills are coming soon. They need backend tables before they can run.</Notice>
  </div>
);
