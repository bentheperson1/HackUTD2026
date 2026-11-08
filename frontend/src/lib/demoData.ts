export interface PlainGuidanceCard {
  role: string;
  primaryAction: string;
  plainSteps: string[];
  doNotDoThis: string;
}

/** One short checklist per role. Plain words: people reading this are under stress. */
export const ROLE_GUIDANCE_CARDS: PlainGuidanceCard[] = [
  {
    role: 'Owner',
    primaryAction: 'Coordinates the response and contacts the insurer.',
    plainSteps: [
      'Tell everyone to talk only in Outpost, not company email or Slack.',
      'Call your cyber insurance company.',
      'Tell staff not to talk to reporters or post online.',
    ],
    doNotDoThis: "Don't pay or contact the attackers.",
  },
  {
    role: 'IT lead',
    primaryAction: 'Disconnects affected machines from the network without turning them off.',
    plainSteps: [
      'Unplug network cables and turn off Wi-Fi.',
      'Unplug any USB or backup drives.',
      'Take photos of any ransom notes on screens.',
    ],
    doNotDoThis: "Don't restart or wipe computers, because that destroys evidence.",
  },
  {
    role: 'Legal',
    primaryAction: 'Brings in a breach lawyer and tracks whose data was affected.',
    plainSteps: [
      'Call your outside breach lawyer.',
      'Write down which states affected people live in.',
      'Keep notes of what happened and when.',
    ],
    doNotDoThis: "Don't make public statements yet.",
  },
  {
    role: 'Comms',
    primaryAction: 'Handles messages to staff and questions from reporters.',
    plainSteps: [
      'Write a short statement for staff saying you are aware of the problem and working on it.',
      'Collect personal phone numbers for company leaders.',
      'Send any calls from reporters to Legal.',
    ],
    doNotDoThis: "Don't promise a date when things will be fixed.",
  },
];

/** Which checklist belongs to each role. Guests follow the closest staff role. */
export const CARD_FOR_ROLE: Record<string, number> = {
  owner: 0,
  insurer: 0,
  it_lead: 1,
  legal: 2,
  outside_counsel: 2,
  comms: 3,
};
