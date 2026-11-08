import React from 'react';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';

// TODO: needs drill_session / drill_player / drill_event tables and reducers in the backend
export const DrillPage: React.FC = () => (
  <div className="space-y-8">
    <PageHeader title="Drill" description="Multiplayer crisis drill with live scoring." />
    <Notice>Drills are coming soon. They need backend tables before they can run.</Notice>
  </div>
);
