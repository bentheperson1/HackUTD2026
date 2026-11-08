import React from 'react';
import { Link } from 'react-router-dom';
import { Notice } from '../components/Notice';
import { PageHeader } from '../components/PageHeader';

// The live drill now runs on the Drill page; the old local-only simulator is in git history.
export const AdminDashboard: React.FC = () => (
  <div className="space-y-8">
    <PageHeader title="Command center" description="Run tabletop drills against realistic scenarios." />
    <Notice>
      Drills now run live with your whole team.{' '}
      <Link to="/drill" className="text-primary">
        Open the Drill page
      </Link>
      .
    </Notice>
  </div>
);
