/**
 * English copy for the 36 original Chaos cards (roadmap D).
 *
 * The base deck shipped with Vietnamese only; the UI falls back to Vietnamese when a card
 * has no English text, which left English players reading Vietnamese card bodies.
 * Keeping the translation in its own file avoids touching the Vietnamese source data.
 */
export interface ChaosCardEnCopy {
  name: string;
  tagline: string;
  flavorText: string;
  description: string;
}

export const BASE_CHAOS_CARDS_EN: Record<string, ChaosCardEnCopy> = {
  // POSITIVE
  'pos-vietlott-jackpot': {
    name: 'Vietlott Power 6/55 Jackpot',
    tagline: 'Billionaire luck',
    flavorText: 'A bright red lottery ticket lands the jackpot. Collect +$400.',
    description: 'A bright red lottery ticket lands the jackpot. Collect +$400.',
  },
  'pos-fdi-boost': {
    name: 'Semiconductor FDI Wave',
    tagline: 'Foreign capital inflows',
    flavorText: 'A global tech giant funds your startup project. Collect +$250.',
    description: 'A global tech giant funds your startup project. Collect +$250.',
  },
  'pos-green-grant': {
    name: 'Net-Zero Green City Grant',
    tagline: 'Ecological upgrade',
    flavorText: 'An international green fund upgrades one of your buildings by 1 level (or pays $150 if you own none).',
    description: 'An international green fund upgrades one of your buildings by 1 level (or pays $150 if you own none).',
  },
  'pos-tax-exemption': {
    name: 'Corporate Tax Exemption Policy',
    tagline: 'Economic stimulus',
    flavorText: 'Your project qualifies for a high-tech stimulus package. Tax refund +$150.',
    description: 'Your project qualifies for a high-tech stimulus package. Tax refund +$150.',
  },
  'pos-stimulus-package': {
    name: 'Nationwide Consumption Stimulus',
    tagline: 'Everyone gets paid',
    flavorText: 'The budget hands out cash to every citizen. Each player receives +$100.',
    description: 'The budget hands out cash to every citizen. Each player receives +$100.',
  },
  'pos-vip-flight': {
    name: 'Private Jet to Start',
    tagline: 'Fly straight home',
    flavorText: 'A private jet flies you straight to the Start Gate (tile 0) with the full +$200 salary.',
    description: 'A private jet flies you straight to the Start Gate (tile 0) with the full +$200 salary.',
  },

  // NEGATIVE
  'neg-construction-audit': {
    name: 'Surprise Construction Inspection',
    tagline: 'Permits under review',
    flavorText: 'Inspectors check your building permits. Pay a $30 fine for every build level you own.',
    description: 'Inspectors check your building permits. Pay a $30 fine for every build level you own.',
  },
  'neg-typhoon-central': {
    name: 'Central Vietnam Typhoon',
    tagline: 'Flooding and damage',
    flavorText: 'A major storm tears roofs off and floods infrastructure. Every player pays $60 into the relief fund.',
    description: 'A major storm tears roofs off and floods infrastructure. Every player pays $60 into the relief fund.',
  },
  'neg-cyber-scam': {
    name: 'Quantum Wallet Heist',
    tagline: 'Account compromised',
    flavorText: 'An international hacker cracks your e-wallet and steals $150 from you.',
    description: 'An international hacker cracks your e-wallet and steals $150 from you.',
  },
  'neg-traffic-fine': {
    name: 'Highway Speed Camera Fine',
    tagline: 'AI camera caught you',
    flavorText: 'An AI camera records your vehicle speeding on the North-South expressway. Fine: $80.',
    description: 'An AI camera records your vehicle speeding on the North-South expressway. Fine: $80.',
  },
  'neg-quarantine-order': {
    name: 'Economic Investigation Detention',
    tagline: 'Taken into custody',
    flavorText: 'Financial inspectors find suspicious cash flows and detain you at the Detention Zone (tile 10) for 2 turns!',
    description: 'Financial inspectors find suspicious cash flows and detain you at the Detention Zone (tile 10) for 2 turns!',
  },
  'neg-supply-shortage': {
    name: 'Building Material Shortage',
    tagline: 'Steel prices spike',
    flavorText: 'Cement and steel prices soar, forcing a construction surcharge of $100 on you.',
    description: 'Cement and steel prices soar, forcing a construction surcharge of $100 on you.',
  },

  // PERSONAL
  'per-robin-hack': {
    name: 'Rival Wallet Drain Attack',
    tagline: 'Malware siphons cash',
    flavorText: 'You plant malware that pulls $60 from every rival who still has cash, straight into your account.',
    description: 'You plant malware that pulls $60 from every rival who still has cash, straight into your account.',
  },
  'per-vip-charity-gala': {
    name: 'Tycoon Charity Gala',
    tagline: 'Generous magnate',
    flavorText: 'You show tycoon-class generosity and gift $40 to each rival.',
    description: 'You show tycoon-class generosity and gift $40 to each rival.',
  },
  'per-quantum-leap': {
    name: 'Quantum Warp Gate',
    tagline: 'A jump through space',
    flavorText: 'You spin up the spatial leap ring and advance 6 tiles from your current position.',
    description: 'You spin up the spatial leap ring and advance 6 tiles from your current position.',
  },
  'per-get-out-jail-card': {
    name: 'Privileged Immunity Card',
    tagline: 'A golden way out',
    flavorText: 'A golden pass that exempts you from detention. Receive 1 Get Out of Detention card.',
    description: 'A golden pass that exempts you from detention. Receive 1 Get Out of Detention card.',
  },
  'per-monopoly-hostile-takeover': {
    name: 'Hostile Corporate Takeover',
    tagline: 'Compulsory acquisition',
    flavorText: 'You buy out your rival\u2019s cheapest unbuilt (level 0) tile after paying 1.5x its base price.',
    description: 'You buy out your rival\u2019s cheapest unbuilt (level 0) tile after paying 1.5x its base price.',
  },
  'per-desperation-roulette': {
    name: 'Casino Fortune Roulette',
    tagline: 'All or nothing',
    flavorText: '50/50: stake $100. Win and collect $200; lose and the stake is gone.',
    description: '50/50: stake $100. Win and collect $200; lose and the stake is gone.',
  },

  // GLOBAL
  'glo-reverse-dimension': {
    name: 'Time Reversal (Reverse Movement)',
    tagline: 'The wheel spins backwards',
    flavorText: 'Every player moves counter-clockwise for the next 3 rounds!',
    description: 'Every player moves counter-clockwise for the next 3 rounds!',
  },
  'glo-musical-chairs': {
    name: 'Random Position Swap',
    tagline: 'Traffic chaos',
    flavorText: 'The transport grid suffers a quantum fault! Every player swaps position.',
    description: 'The transport grid suffers a quantum fault! Every player swaps position.',
  },
  'glo-hyper-inflation': {
    name: 'Urban Land Fever (Hyperinflation)',
    tagline: 'Rent storm',
    flavorText: 'Rent on every property on the board doubles (x2) for 2 rounds!',
    description: 'Rent on every property on the board doubles (x2) for 2 rounds!',
  },
  'glo-solar-emp-blackout': {
    name: 'Cosmic Solar EMP',
    tagline: 'Payments paralysed',
    flavorText: 'Payment terminals go dark: all rent is halved (x0.5) for 2 rounds.',
    description: 'Payment terminals go dark: all rent is halved (x0.5) for 2 rounds.',
  },
  'glo-golden-hour': {
    name: 'Urban Golden Hour (Double Salary)',
    tagline: 'Start bonus doubled',
    flavorText: 'The city doubles the Start Gate reward to $400 for 1 round!',
    description: 'The city doubles the Start Gate reward to $400 for 1 round!',
  },
  'glo-curfew-lockdown': {
    name: 'Citywide Curfew Lockdown',
    tagline: 'Movement restricted',
    flavorText: 'Movement is capped: each dice roll moves you at most 4 tiles this round.',
    description: 'Movement is capped: each dice roll moves you at most 4 tiles this round.',
  },

  // ECONOMIC
  'eco-real-estate-boom': {
    name: 'Thu Thiem & West Lake Land Boom',
    tagline: 'Capital real estate surges',
    flavorText: 'Rent for Hanoi and Ho Chi Minh City districts rises 1.5x for 3 rounds.',
    description: 'Rent for Hanoi and Ho Chi Minh City districts rises 1.5x for 3 rounds.',
  },
  'eco-bank-interest-hike': {
    name: 'State Bank Raises Interest Rates',
    tagline: 'Tighter credit',
    flavorText: 'Mortgage redemption interest rises by 10% (to 20%) for 3 rounds.',
    description: 'Mortgage redemption interest rises by 10% (to 20%) for 3 rounds.',
  },
  'eco-subsidized-mortgage': {
    name: 'Real Estate Credit Rescue Package',
    tagline: 'Liquidity support',
    flavorText: 'Banks lend 75% of base value against mortgages (instead of 50%) for 2 rounds.',
    description: 'Banks lend 75% of base value against mortgages (instead of 50%) for 2 rounds.',
  },
  'eco-freeze-market': {
    name: 'Market Freeze',
    tagline: 'Trading halted',
    flavorText: 'Buying new land and upgrading buildings are locked across the board for 1 round.',
    description: 'Buying new land and upgrading buildings are locked across the board for 1 round.',
  },
  'eco-transport-boom': {
    name: 'High-Speed Rail Opening Gala',
    tagline: 'Transport infrastructure booms',
    flavorText: 'All four national transport hubs charge double rent (x2) for 3 rounds!',
    description: 'All four national transport hubs charge double rent (x2) for 3 rounds!',
  },
  'eco-utility-energy-tax': {
    name: 'Power & Water Price Adjustment',
    tagline: 'Essential utilities',
    flavorText: 'Rent for EVN and SAWACO doubles for 2 rounds!',
    description: 'Rent for EVN and SAWACO doubles for 2 rounds!',
  },

  // LEGENDARY
  'leg-robin-hood': {
    name: 'Wealth Rebalance (Robin Hood)',
    tagline: 'Take from the rich, give to the poor',
    flavorText: 'The player with the highest net worth transfers 25% of their cash to the player with the lowest!',
    description: 'The player with the highest net worth transfers 25% of their cash to the player with the lowest!',
  },
  'leg-mega-earthquake': {
    name: 'Mega Earthquake Levels Buildings',
    tagline: 'Seismic shock',
    flavorText: 'Every property on the board with level >= 1 loses one build level!',
    description: 'Every property on the board with level >= 1 loses one build level!',
  },
  'leg-black-hole-warp': {
    name: 'Black Hole Gravity Well',
    tagline: 'A vortex pulls everyone in',
    flavorText: 'Every player is sucked onto the same tile: the one with the highest upgrade value!',
    description: 'Every player is sucked onto the same tile: the one with the highest upgrade value!',
  },
  'leg-deathmatch-duel': {
    name: 'One-on-One Deathmatch Duel',
    tagline: 'Dice of life and death',
    flavorText: 'You and the richest player roll two dice against each other. The lower score pays $300 to the winner!',
    description: 'You and the richest player roll two dice against each other. The lower score pays $300 to the winner!',
  },
  'leg-national-jubilee': {
    name: 'National Debt Jubilee',
    tagline: 'All mortgages wiped',
    flavorText: 'Every mortgaged property on the board is released free of charge!',
    description: 'Every mortgaged property on the board is released free of charge!',
  },
  'leg-alien-mothership': {
    name: 'Alien Mothership Invasion',
    tagline: 'Landmark 81 blockaded',
    flavorText: 'An alien mothership blockades Landmark 81 (tile 39), turning it into a Chaos Gate that collects no rent for 5 rounds!',
    description: 'An alien mothership blockades Landmark 81 (tile 39), turning it into a Chaos Gate that collects no rent for 5 rounds!',
  },
};
