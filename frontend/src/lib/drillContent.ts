// Offline DEMO copy of the drill seeded by backend/spacetimedb/Seed.cs (SeedRansomwareScenario).
// Live mode never uses this: the real script and answer key live in the private DrillInject table.
import type { Role } from './types';

export interface DemoInject {
  forRole: Role | null;
  text: string;
  choices: string[];
  correct: number;
  explanation: string;
  points: number;
}

export const DEMO_SCENARIO = {
  id: 'ransomware-basic',
  name: 'Ransomware at the front desk',
  kind: 'ransomware',
  minutes: 15,
  injects: [
    {
      forRole: null,
      text: 'Ransom notes appear on 3 front-desk PCs. What do you do first?',
      choices: ['Unplug them from the network', 'Pay the ransom', 'Email IT and wait', 'Restart the PCs'],
      correct: 0,
      explanation: 'Disconnecting the PCs stops the ransomware from spreading. Restarting them can destroy evidence, and paying does not guarantee you get your files back.',
      points: 100,
    },
    {
      forRole: 'it_lead',
      text: 'Which backups should you trust first?',
      choices: ['The shared drive', 'The affected PCs', 'Offline backups kept disconnected', 'Cloud sync folders'],
      correct: 2,
      explanation: "Backups that stay connected to the network may already be encrypted. Offline backups are out of the attacker's reach.",
      points: 100,
    },
    {
      forRole: 'owner',
      text: 'Who do you call before anyone else?',
      choices: ['A local news station', "Your cyber insurer's hotline", 'The attacker', 'Your landlord'],
      correct: 1,
      explanation: 'Most cyber insurers require early notice, and they can connect you with response specialists.',
      points: 100,
    },
    {
      forRole: null,
      text: 'The attacker emails saying patient data will be leaked unless you pay within 24 hours. How do you respond?',
      choices: ['Negotiate directly', 'Counteroffer', 'Delete the email', "Don't reply. Save the email and tell your lawyer"],
      correct: 3,
      explanation: 'Keep the email as evidence. Your lawyer and insurer will decide whether and how to respond.',
      points: 100,
    },
    {
      forRole: 'legal',
      text: 'Patient data may have been stolen. What should you do first?',
      choices: ['Record what data was taken, whose it was, and which states they live in', 'Wait to see if it leaks', 'Notify every patient now', 'Wait for the police'],
      correct: 0,
      explanation: 'Knowing what data was taken and where those people live tells you which notification laws and deadlines apply.',
      points: 100,
    },
    {
      forRole: 'comms',
      text: "Staff are asking what's going on. What do you send?",
      choices: ['A full technical write-up', 'A company-email blast', 'A short statement sent through a channel outside company email', 'Nothing'],
      correct: 2,
      explanation: "Company email may be compromised, so use a channel the attacker can't read.",
      points: 100,
    },
  ] as DemoInject[],
};
