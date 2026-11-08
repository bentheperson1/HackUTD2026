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
      text: 'Ransom notes appear on 3 front-desk PCs. What first?',
      choices: ['Unplug them from the network', 'Pay the ransom', 'Email IT and wait', 'Restart the PCs'],
      correct: 0,
      explanation: 'Isolate first. Disconnecting stops the spread; rebooting or paying burns your options.',
      points: 100,
    },
    {
      forRole: 'it_lead',
      text: 'Which backups do you trust first?',
      choices: ['The shared drive', 'The affected PCs', 'Offline backups kept disconnected', 'Cloud sync folders'],
      correct: 2,
      explanation: "Connected copies may already be encrypted. Offline backups are the ones the attacker can't reach.",
      points: 100,
    },
    {
      forRole: 'owner',
      text: 'Who do you call before anything else?',
      choices: ['A local news station', "Your cyber insurer's hotline", 'The attacker', 'Your landlord'],
      correct: 1,
      explanation: 'Insurers often require early notice and can bring in response specialists.',
      points: 100,
    },
    {
      forRole: null,
      text: 'The attacker emails: pay in 24 hours or patient data leaks. Reply?',
      choices: ['Negotiate directly', 'Counteroffer', 'Delete the email', "Don't reply; preserve it and loop in counsel"],
      correct: 3,
      explanation: 'Keep the evidence and let counsel and the insurer decide how to engage.',
      points: 100,
    },
    {
      forRole: 'legal',
      text: 'Patient data may be stolen. What starts the clock?',
      choices: ['Document what data, whose, and which states', 'Wait to see if it leaks', 'Notify every patient now', 'Wait for the police'],
      correct: 0,
      explanation: 'A scope record tells you which breach-notification laws and deadlines apply.',
      points: 100,
    },
    {
      forRole: 'comms',
      text: "Staff are asking what's going on. What do you send?",
      choices: ['A full technical write-up', 'A company-email blast', 'A short holding statement through your out-of-band channel', 'Nothing'],
      correct: 2,
      explanation: "Company email may be compromised. Use a channel the attacker can't read.",
      points: 100,
    },
  ] as DemoInject[],
};
