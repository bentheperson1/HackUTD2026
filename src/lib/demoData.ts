export interface SimulationScenario {
  id: string;
  title: string;
  subtitle: string;
  threatActor: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  durationMinutes: number;
  description: string;
  businessImpact: string;
  injects: SimulationInject[];
}

export interface SimulationInject {
  minute: string;
  timeOffsetSeconds: number;
  title: string;
  source: string;
  narrative: string;
  targetRole: string;
  recommendedAction: string;
  points: number;
  mistakeWarning: string;
}

export interface PlainGuidanceCard {
  role: string;
  icon: string;
  primaryAction: string;
  plainSteps: string[];
  doNotDoThis: string;
}

export const DEMO_SCENARIOS: SimulationScenario[] = [
  {
    id: 'ransomware-alpha',
    title: '8:00 AM Ransomware Outbreak',
    subtitle: 'LockBit 3.0 network encryption & extortion',
    threatActor: 'LockBit Affiliate Group #44',
    severity: 'CRITICAL',
    durationMinutes: 15,
    description: 'Accounting staff report all files on the central server have been renamed with .lock extensions. A skull desktop wallpaper demands 5 Bitcoin in 48 hours.',
    businessImpact: 'Order fulfillment paralyzed. Invoicing systems offline. Customer PII potentially viewed.',
    injects: [
      {
        minute: '00:00',
        timeOffsetSeconds: 0,
        title: 'Initial Outbreak Alarm',
        source: 'Reception & Billing Workstation',
        narrative: 'Staff cannot open QuickBooks or customer files. A text file "RESTORE_FILES.txt" appears on all desktop screens.',
        targetRole: 'IT Lead',
        recommendedAction: 'Disconnect Ethernet cables from the server rack immediately. Keep server power ON to preserve RAM memory forensics.',
        points: 50,
        mistakeWarning: 'DO NOT shut down server power. Turning off power destroys volatile RAM evidence required by cyber insurance forensic adjusters.',
      },
      {
        minute: '03:30',
        timeOffsetSeconds: 210,
        title: 'Dark Web Proof-of-Breach Published',
        source: 'Tor Leak Site Monitor',
        narrative: 'Threat actors post a screenshot showing 3 customer records with Texas addresses and credit numbers as proof of exfiltration.',
        targetRole: 'Legal & Compliance',
        recommendedAction: 'Log compromised category in Scope as "Exfiltrated" for Texas. State statutory deadline clock starts.',
        points: 75,
        mistakeWarning: 'DO NOT negotiate or message the hackers directly. Only authorized incident response negotiators should initiate contact.',
      },
      {
        minute: '07:15',
        timeOffsetSeconds: 435,
        title: 'Media Inquiry Received',
        source: 'Local News Reporter via Phone',
        narrative: 'A regional technology blog tweets: "Rumors of cyber attack at Acme Logistics. Customer data exposed?" Reporter requests immediate statement.',
        targetRole: 'Communications',
        recommendedAction: 'Release pre-approved Holding Statement: "We are actively investigating an isolated IT anomaly with external forensic experts."',
        points: 60,
        mistakeWarning: 'NEVER say "No customer data was breached" or "Everything is secure" before forensic investigation is officially signed off.',
      },
      {
        minute: '11:00',
        timeOffsetSeconds: 660,
        title: 'Cyber Insurance Notification Window',
        source: 'Policy Underwriter Protocol',
        narrative: 'Policy CYB-2026-981 requires formal First Notice of Loss (FNOL) within 24 hours of suspected unauthorized access.',
        targetRole: 'Business Owner (Admin)',
        recommendedAction: 'Generate and submit First Notice of Loss (FNOL) draft to underwriter to preserve claims coverage.',
        points: 100,
        mistakeWarning: 'Failure to provide timely notice can void coverage for recovery costs and forensic vendor fees.',
      },
    ],
  },
  {
    id: 'phishing-wire',
    title: 'Executive Email Compromise & Wire Fraud',
    subtitle: 'CEO impersonation redirecting $180,000 vendor payment',
    threatActor: 'SilentLibrarian BEC Ring',
    severity: 'HIGH',
    durationMinutes: 12,
    description: 'Finance clerk receives an urgent wire transfer request seemingly from the CEO while travelling. Email forwarding rules discovered in Microsoft 365.',
    businessImpact: 'Immediate cash loss risk. Unauthorized email mailbox access to supplier contracts.',
    injects: [
      {
        minute: '00:00',
        timeOffsetSeconds: 0,
        title: 'Fraudulent Payment Flagged by Bank',
        source: 'Chase Commercial Treasury Alert',
        narrative: 'Bank calls asking to verify verbal authorization for $180,000 wire to an offshore escrow entity.',
        targetRole: 'Business Owner',
        recommendedAction: 'Issue immediate "Fraud Recall" order to financial institution within the 72-hour SWIFT clawback window.',
        points: 50,
        mistakeWarning: 'Do not reply via email. Call bank representative using independently verified phone numbers from corporate card.',
      },
    ],
  },
];

export const ROLE_GUIDANCE_CARDS: PlainGuidanceCard[] = [
  {
    role: 'Business Owner / Incident Commander',
    icon: 'ShieldAlert',
    primaryAction: 'Declare Incident & Appoint Spokesperson',
    plainSteps: [
      'Announce that all internal crisis communication moves to Drill Night (off company email/Slack).',
      'Contact outside cyber insurance claims representative to trigger approved forensic team.',
      'Instruct all staff that no one talks to reporters or posts on personal social media.',
    ],
    doNotDoThis: 'Do NOT pay ransom or contact hackers without certified forensic negotiator counsel.',
  },
  {
    role: 'IT & Systems Lead',
    icon: 'ServerCrash',
    primaryAction: 'Sever Network Trunks (Keep Power ON)',
    plainSteps: [
      'Unplug network cables from switches and disable Wi-Fi access points.',
      'Physically disconnect any USB hard drives or external backup storage.',
      'Take photos of any ransom notes on computer monitors for evidentiary proof.',
    ],
    doNotDoThis: 'Do NOT reboot servers or wipe machines. Wiping destroys proof needed for insurance claims.',
  },
  {
    role: 'Legal & Risk Counsel',
    icon: 'Scale',
    primaryAction: 'Trigger Privileged Forensic Triage',
    plainSteps: [
      'Formally engage external incident response counsel under attorney-client privilege.',
      'Review Texas Business & Commerce Code § 521 (60-day notification requirement).',
      'Begin documenting chronological timeline for regulatory disclosure defense.',
    ],
    doNotDoThis: 'Do NOT publish public blame statements before scope of actual data compromise is confirmed.',
  },
  {
    role: 'Communications & HR',
    icon: 'Megaphone',
    primaryAction: 'Deploy Approved Holding Statement',
    plainSteps: [
      'Prepare 1-paragraph holding statement for employees, customers, and media.',
      'Establish personal phone contact tree for company leadership.',
      'Monitor social media mentions and forward reporter inquiries to legal counsel.',
    ],
    doNotDoThis: 'Never promise a specific restoration date or give unverified reassurance.',
  },
];

