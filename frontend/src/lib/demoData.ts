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
    primaryAction: 'Take charge',
    plainSteps: [
      'Tell everyone to talk only in Outpost, not company email or Slack.',
      'Call your cyber insurance company.',
      'Tell staff not to talk to reporters or post online.',
    ],
    doNotDoThis: "Don't pay or contact the attackers.",
  },
  {
    role: 'IT lead',
    primaryAction: 'Cut the network, keep power on',
    plainSteps: [
      'Unplug network cables and turn off Wi-Fi.',
      'Unplug any USB or backup drives.',
      'Take photos of any ransom notes on screens.',
    ],
    doNotDoThis: "Don't restart or wipe computers. That destroys evidence.",
  },
  {
    role: 'Legal',
    primaryAction: 'Bring in a lawyer',
    plainSteps: [
      'Call your outside breach lawyer.',
      'Write down which states affected people live in.',
      'Keep notes of what happened and when.',
    ],
    doNotDoThis: "Don't make public statements yet.",
  },
  {
    role: 'Comms',
    primaryAction: 'Keep people informed',
    plainSteps: [
      'Write a short holding statement.',
      'Collect personal phone numbers for leaders.',
      'Send any reporter calls to Legal.',
    ],
    doNotDoThis: "Don't promise when things will be fixed.",
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
