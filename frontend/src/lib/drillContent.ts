// COPY of spacetimedb/src/drillContent.ts, used ONLY by offline demo mode.
// In live mode the answer key never leaves the server.
/**
 * Drill Night scenario library.
 *
 * Each scenario is a short run of "injects": a new development drops in, the
 * team picks the right move, and the server scores it when the inject closes.
 *
 * The answer key (correct + explanation) is loaded into a PRIVATE table, so
 * players can't read it from the client. The frontend keeps a copy of this
 * file only for offline demo mode.
 */

export interface DrillInjectSeed {
  title: string;
  body: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  points: number;
  /** Who would lead this decision in a real incident */
  role: string;
}

export interface DrillScenarioSeed {
  id: string;
  name: string;
  kind: 'cyber' | 'catastrophe';
  description: string;
  /** Seconds each inject stays open */
  windowSeconds: number;
  injects: DrillInjectSeed[];
}

export const DRILL_SCENARIOS: DrillScenarioSeed[] = [
  {
    id: 'ransomware',
    name: 'Ransomware Outbreak',
    kind: 'cyber',
    description: 'File shares are encrypting and a ransom note just appeared on the front desk PC.',
    windowSeconds: 45,
    injects: [
      {
        title: 'Files are turning into .lockd',
        body: 'At 7:42 AM the shared drive starts filling with .lockd files. The front desk PC shows a ransom note. Two more laptops are slowing down.',
        question: 'What is the first move?',
        options: [
          'Power off every computer in the building',
          'Disconnect affected machines from the network but leave them powered on',
          'Run a full antivirus scan on the file server',
          'Email the whole company telling them not to open attachments',
        ],
        correct: 1,
        explanation:
          'Isolate, don\'t power off. Pulling the network stops the spread while keeping memory evidence that forensics will need. Company email may be compromised, so warnings go out of band.',
        points: 100,
        role: 'it_lead',
      },
      {
        title: 'The ransom note has a deadline',
        body: 'The note demands 4 BTC within 72 hours and threatens to publish stolen files. The owner asks if paying makes this go away.',
        question: 'Who do you bring in before any decision about paying?',
        options: [
          'Nobody yet, wait to see if the backups work',
          'Your cyber insurer and outside breach counsel',
          'The attackers, to negotiate the price down',
          'Local news, to get ahead of the story',
        ],
        correct: 1,
        explanation:
          'Most cyber policies require prompt notice and pre-approval of vendors and payments. Counsel keeps the investigation privileged and checks sanctions rules before any payment.',
        points: 100,
        role: 'owner',
      },
      {
        title: 'Proof of stolen data',
        body: 'A leak site posts a sample: a spreadsheet with customer names, addresses and the last four of card numbers. Customers live in Texas and California.',
        question: 'What should Legal start right now?',
        options: [
          'Nothing until the investigation is completely finished',
          'Delete the customer database so there is nothing left to leak',
          'Map which data types and states are affected to work out notification duties',
          'Post a statement saying no data was taken',
        ],
        correct: 2,
        explanation:
          'Notification rules depend on what data was exposed and where the people live. Logging it in Scope now saves days later. Never destroy evidence, and never claim nothing was taken before you know.',
        points: 125,
        role: 'legal',
      },
      {
        title: 'Backups look clean',
        body: 'IT confirms last night\'s offline backup is intact. The attacker got in through a VPN account without MFA.',
        question: 'What has to happen before restoring?',
        options: [
          'Restore immediately, every hour down costs money',
          'Close the entry point: reset credentials, turn on MFA, patch the VPN, then restore',
          'Restore only the file server and leave the rest',
          'Buy new computers for everyone',
        ],
        correct: 1,
        explanation:
          'Restoring onto a network the attacker can still reach invites a second encryption. Fix how they got in first, then restore from the clean backup.',
        points: 125,
        role: 'it_lead',
      },
    ],
  },
  {
    id: 'phishing',
    name: 'Payroll Wire Fraud',
    kind: 'cyber',
    description: 'A spoofed "CEO" email convinced finance to wire $48,000 to a new account.',
    windowSeconds: 45,
    injects: [
      {
        title: 'The wire already went out',
        body: 'Finance wired $48,000 an hour ago after an urgent email from the "CEO" asking to pay a new vendor. The CEO says they never sent it.',
        question: 'What gives you the best chance of getting the money back?',
        options: [
          'Reply to the email asking for the money back',
          'Call your bank\'s fraud line right now to recall the wire, then report it to the FBI at ic3.gov',
          'Wait until Monday to see if it bounces',
          'Ask the new vendor to send it back',
        ],
        correct: 1,
        explanation:
          'Speed is everything. Banks can sometimes recall or freeze a wire within hours, and an IC3 report can trigger the FBI\'s Recovery Asset Team for recent transfers.',
        points: 100,
        role: 'owner',
      },
      {
        title: 'The CEO mailbox has a strange rule',
        body: 'IT finds an inbox rule on the CEO\'s account that forwards every email with "invoice" or "wire" to an outside Gmail address.',
        question: 'What does this tell you to do?',
        options: [
          'Nothing, rules like that are normal',
          'Delete the rule and move on',
          'Treat the account as taken over: reset the password, kill all sessions, check MFA, and save the rule as evidence',
          'Turn off email for the whole company for a week',
        ],
        correct: 2,
        explanation:
          'A hidden forwarding rule means someone was inside the mailbox. Resetting the password alone doesn\'t end active sessions. Screenshot and export the rule before removing it.',
        points: 100,
        role: 'it_lead',
      },
      {
        title: 'A second "vendor" calls',
        body: 'Someone calls finance saying they are the vendor and their bank details changed again. They want today\'s payment sent to a new account.',
        question: 'What is the safe way to verify?',
        options: [
          'Use the phone number in their latest email to confirm',
          'Call the vendor back using the number on file from before this incident',
          'Ask them a security question over the same call',
          'Send a small test payment first',
        ],
        correct: 1,
        explanation:
          'Callback verification only works with a number you already trusted. Anything in the new email or call may be controlled by the attacker.',
        points: 125,
        role: 'comms',
      },
      {
        title: 'Staff are asking questions',
        body: 'Employees heard "something happened with payroll" and are worried about their direct deposits.',
        question: 'How should the update go out?',
        options: [
          'From the CEO\'s email account, since everyone trusts it',
          'Through an out-of-band channel with only confirmed facts and what staff should watch for',
          'Say nothing until the bank investigation is done',
          'Post the details on the company social media page',
        ],
        correct: 1,
        explanation:
          'The compromised mailbox can\'t be trusted to send updates. Share confirmed facts only, and give people concrete next steps (watch for unusual bank-detail change requests).',
        points: 100,
        role: 'comms',
      },
    ],
  },
  {
    id: 'tornado',
    name: 'Tornado Hits the Warehouse',
    kind: 'catastrophe',
    description: 'An EF2 tornado tore the roof off the warehouse overnight. Rain is coming in.',
    windowSeconds: 45,
    injects: [
      {
        title: 'Sirens at 2:10 AM',
        body: 'A tornado crossed the industrial park overnight. The warehouse roof is partly gone. The night shift had three people on site.',
        question: 'What comes first?',
        options: [
          'Call the insurance company to start the claim',
          'Confirm all three night-shift workers are accounted for and safe',
          'Post on social media that the business is closed',
          'Send staff in to move inventory out of the rain',
        ],
        correct: 1,
        explanation:
          'Life safety before property, always. Nobody goes into a damaged structure until it has been cleared as safe.',
        points: 100,
        role: 'owner',
      },
      {
        title: 'Rain is soaking inventory',
        body: 'Everyone is safe. Rain is now pouring through the roof onto pallets that weren\'t damaged by the storm itself.',
        question: 'What protects your insurance claim?',
        options: [
          'Leave everything untouched until the adjuster arrives next week',
          'Photograph the damage, then take reasonable steps to stop more damage (tarps, moving pallets) and keep the receipts',
          'Throw out anything wet right away',
          'Start full roof repairs with any contractor available',
        ],
        correct: 1,
        explanation:
          'Policies expect you to mitigate further damage. Document first, then do reasonable temporary protection and save every receipt. Permanent repairs usually wait for the adjuster.',
        points: 125,
        role: 'insurer',
      },
      {
        title: 'Phones and email are down',
        body: 'The office phone system and on-site server lost power. Customers are expecting deliveries this morning.',
        question: 'How do you reach your team and key customers?',
        options: [
          'Wait for the power to come back',
          'Use the out-of-band crisis channel and personal phones from the roster',
          'Drive to every customer in person',
          'Ask employees to check their work email from home',
        ],
        correct: 1,
        explanation:
          'This is why the roster stores personal phone numbers and the war room runs outside company systems. It still works when the building doesn\'t.',
        points: 100,
        role: 'comms',
      },
      {
        title: 'Filing the claim',
        body: 'The insurer asks for a first notice of loss. Some records were on the server that lost power.',
        question: 'What makes the claim go fastest?',
        options: [
          'Estimate the total loss from memory',
          'Send the timestamped photo log, mitigation receipts and an inventory list built from offsite or cloud records',
          'Wait until every item is counted by hand',
          'Only report the roof, add the inventory later',
        ],
        correct: 1,
        explanation:
          'A documented timeline with photos and receipts is exactly what an adjuster needs. The incident log you have been keeping becomes the claim file.',
        points: 125,
        role: 'insurer',
      },
    ],
  },
  {
    id: 'flood',
    name: 'Server Room Flood',
    kind: 'catastrophe',
    description: 'A burst pipe and heavy rain put four inches of water in the server room.',
    windowSeconds: 45,
    injects: [
      {
        title: 'Water under the racks',
        body: 'The first person in finds water on the server room floor. The servers are still humming and one UPS is beeping.',
        question: 'What is the safe first step?',
        options: [
          'Walk in and unplug everything by hand',
          'Stay out of the water and have the power to the room cut at the breaker or by an electrician',
          'Start mopping right away',
          'Turn the servers off and on to see if they still work',
        ],
        correct: 1,
        explanation:
          'Standing water plus live power is an electrocution risk. Cut power from a safe location first, then deal with the equipment.',
        points: 100,
        role: 'it_lead',
      },
      {
        title: 'Is flood covered?',
        body: 'The owner assumes the commercial property policy will pay for everything.',
        question: 'What should you check right away?',
        options: [
          'Nothing, property insurance covers all water damage',
          'Whether the loss is a covered cause: sudden pipe bursts are often covered, rising flood water often needs a separate flood policy',
          'Whether you can describe it as a pipe burst to get coverage',
          'Only the deductible',
        ],
        correct: 1,
        explanation:
          'Many commercial property policies treat sudden pipe bursts and outside flood water differently. Report the facts accurately and let the insurer work out coverage.',
        points: 125,
        role: 'insurer',
      },
      {
        title: 'Drying out the hardware',
        body: 'The water is gone. Someone suggests powering the servers back on to see what survived.',
        question: 'What should happen instead?',
        options: [
          'Power on now, they look dry',
          'Keep them off, document them, and restore critical systems from offsite backups onto other hardware',
          'Use a hair dryer on the motherboards and try again',
          'Throw them all away before the adjuster sees them',
        ],
        correct: 1,
        explanation:
          'Powering on wet electronics can destroy them and the data on them. Keep damaged gear as evidence for the claim and get running from backups.',
        points: 100,
        role: 'it_lead',
      },
      {
        title: 'Customer data on the damaged drives',
        body: 'The damaged servers hold customer records. A cleanup contractor offers to haul them away today.',
        question: 'What is the right call?',
        options: [
          'Let them take everything, it is just trash now',
          'Keep custody until the insurer has documented them, then use a certified data-destruction vendor',
          'Sell the drives for parts',
          'Leave them in the parking lot for pickup',
        ],
        correct: 1,
        explanation:
          'Damaged drives can still be read. Hand them over only with a chain of custody and certified destruction, or a cleanup turns into a data breach.',
        points: 125,
        role: 'legal',
      },
    ],
  },
];
