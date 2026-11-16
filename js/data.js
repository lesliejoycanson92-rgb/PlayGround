/* BLOBSMITH — game data
 * All part stats are additive; the builder turns them into a physics body.
 */

export const MATERIALS = {
  rubber: {
    name: 'Rubber', icon: '◍', color: '#ffb545',
    desc: 'Grippy, springy, forgiving.', mass: 1, bounce: 4, grip: 2, def: 0, control: 2,
  },
  metal: {
    name: 'Metal', icon: '◈', color: '#b9c6d6',
    desc: 'Heavy plating. Hits hard, turns slow.', mass: 1.4, bounce: -1, grip: 0, def: 3, control: -1,
  },
  jelly: {
    name: 'Jelly', icon: '◉', color: '#ff7ac8',
    desc: 'Wobbly and weirdly precise.', mass: 0.78, bounce: 5, grip: 2, def: -1, control: 4,
  },
  stone: {
    name: 'Stone', icon: '⬢', color: '#9aa3a8',
    desc: 'An immovable object. Mostly.', mass: 1.65, bounce: -4, grip: 1, def: 6, control: -2,
  },
};

export const PATTERNS = [
  { id: 'solid', name: 'Solid' },
  { id: 'split', name: 'Split' },
  { id: 'dots', name: 'Dots' },
  { id: 'stripes', name: 'Stripes' },
  { id: 'swirl', name: 'Swirl' },
  { id: 'checker', name: 'Checker' },
  { id: 'stars', name: 'Stars' },
  { id: 'hazard', name: 'Hazard' },
];

export const TEXTURES = [
  { id: 'gloss', name: 'Gloss', desc: 'Wet candy shine.' },
  { id: 'matte', name: 'Matte', desc: 'Soft studio finish.' },
  { id: 'pearl', name: 'Pearl', desc: 'Shifts with the light.' },
  { id: 'grit', name: 'Grit', desc: 'Scuffed and serious.' },
];

export const EYES = [
  { id: 'round', name: 'Round' },
  { id: 'wide', name: 'Wide' },
  { id: 'sleepy', name: 'Sleepy' },
  { id: 'visor', name: 'Visor' },
  { id: 'star', name: 'Starstruck' },
  { id: 'grumpy', name: 'Grumpy' },
];

export const MOUTHS = [
  { id: 'smile', name: 'Smile' },
  { id: 'grin', name: 'Grin' },
  { id: 'fangs', name: 'Fangs' },
  { id: 'ooo', name: 'Ooo' },
  { id: 'flat', name: 'Flat' },
  { id: 'zigzag', name: 'Zigzag' },
];

export const VOICES = [
  { id: 'squeak', name: 'Squeak', pitch: 1.65, wave: 'triangle' },
  { id: 'baritone', name: 'Baritone', pitch: 0.62, wave: 'sine' },
  { id: 'glitch', name: 'Glitch', pitch: 1.1, wave: 'square' },
  { id: 'choir', name: 'Choir', pitch: 0.9, wave: 'sine' },
];

export const MOODS = {
  angry: {
    name: 'Angry', icon: '≋', color: '#ff5d5d',
    desc: '+30% damage · −18% control',
    dmg: 1.3, control: 0.82, def: 0.95, speed: 1.05, luck: 1,
  },
  calm: {
    name: 'Calm', icon: '◡', color: '#67e8f9',
    desc: '+28% defense · −6% speed',
    dmg: 0.9, control: 1.15, def: 1.28, speed: 0.94, luck: 1,
  },
  scared: {
    name: 'Scared', icon: '!', color: '#f7d154',
    desc: '+22% speed · −25% damage',
    dmg: 0.75, control: 0.95, def: 0.88, speed: 1.22, luck: 1,
  },
  bold: {
    name: 'Bold', icon: '▲', color: '#ffb545',
    desc: '+12% mass · +12% dash',
    dmg: 1.1, control: 0.97, def: 1.02, speed: 0.98, luck: 1, mass: 1.12, dash: 1.12,
  },
  giddy: {
    name: 'Giddy', icon: '✦', color: '#ff9ed2',
    desc: '+35% luck · −8% defense',
    dmg: 1, control: 1.05, def: 0.92, speed: 1.03, luck: 1.35,
  },
};

export const CORES = {
  fire: {
    name: 'Fire', icon: '🔥', color: '#ff6b3d', energy: 8,
    desc: 'Burn aura. Dash leaves a damaging trail.',
    ability: 'fire', abilityName: 'Flashfire',
    abilityDesc: 'Blast a ring of flame that burns nearby rivals.',
    dmg: 1.15, speed: 1, def: 1, control: 1, mass: 1,
  },
  ice: {
    name: 'Ice', icon: '❄', color: '#67e8f9', energy: 7,
    desc: 'Chill aura. Frozen rivals lose control.',
    ability: 'ice', abilityName: 'Cold Snap',
    abilityDesc: 'Freeze the ground, slowing every rival nearby.',
    dmg: 0.95, speed: 1, def: 1.15, control: 1.1, mass: 1,
  },
  electric: {
    name: 'Electric', icon: '⚡', color: '#c084fc', energy: 8,
    desc: 'Static charge. Dashes arc between targets.',
    ability: 'zap', abilityName: 'Chain Storm',
    abilityDesc: 'Arc lightning through up to three rivals.',
    dmg: 1.05, speed: 1.08, def: 1, control: 1, mass: 1,
  },
  gravity: {
    name: 'Gravity', icon: '◉', color: '#8b5cf6', energy: 9,
    desc: 'Heavy core. Pulls rivals and loot toward you.',
    ability: 'gravity', abilityName: 'Event Pull',
    abilityDesc: 'Yank every rival toward your center of mass.',
    dmg: 1, speed: 1, def: 1.08, control: 1, mass: 1.12,
  },
};

export const PACKS = {
  limbs: { name: 'Limbs', color: '#ffb545', icon: '🦵' },
  weapons: { name: 'Weapons', color: '#ff6b5b', icon: '⚔' },
  face: { name: 'Face Tech', color: '#67e8f9', icon: '👁' },
  movement: { name: 'Movement', color: '#a7f36b', icon: '🚀' },
  weird: { name: 'Weird', color: '#ff9ed2', icon: '✦' },
};

const STAT_KEYS = ['dmg', 'speed', 'grip', 'def', 'bounce', 'control', 'luck', 'dash'];

function g(pack, name, visual, color, stats, blurb, rarity = 1, starter = false, tags = []) {
  const base = {};
  for (const k of STAT_KEYS) base[k] = 0;
  return {
    id: `${pack}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
    pack, name, visual, color, stats: { ...base, ...stats },
    blurb, rarity, starter, tags,
    mass: stats.mass ?? 4,
    energy: stats.energy ?? 3,
  };
}

/* 5 packs x 20 gadgets = 100 */
export const GADGETS = [
  /* ── LIMBS ─────────────────────────────────────────────── */
  g('limbs', 'Spring Heels', 'spring', '#ffb545', { mass: 4, energy: 2, bounce: 3, speed: 2 }, 'Store a little hop in every step.', 1, true, ['hop']),
  g('limbs', 'Gorilla Arms', 'arm', '#c98a5b', { mass: 8, energy: 3, dmg: 5, grip: 1 }, 'Long arms. Shorter arguments.', 1, true, ['contact']),
  g('limbs', 'Sprint Legs', 'leg', '#a7f36b', { mass: 6, energy: 4, speed: 5 }, 'Built for the last lap.', 1, true, []),
  g('limbs', 'Glider Wings', 'wing', '#67e8f9', { mass: 3, energy: 5, speed: 3, control: 3 }, 'Catch air, stay smug.', 2, false, ['hover']),
  g('limbs', 'Octo-Tendrils', 'tentacle', '#c084fc', { mass: 5, energy: 3, grip: 5, control: 3 }, 'Eight opinions about traction.', 2, false, []),
  g('limbs', 'Piston Boots', 'spring', '#ff8a4c', { mass: 7, energy: 4, dash: 4, bounce: 2 }, 'Compression, then consequences.', 2, false, ['hop']),
  g('limbs', 'Tank Treads', 'tread', '#8b97a6', { mass: 14, energy: 3, grip: 6, def: 3, speed: -3 }, 'Makes every floor a suggestion.', 2, false, []),
  g('limbs', 'Rubber Arms', 'arm', '#ff9ed2', { mass: 4, energy: 2, bounce: 4, grip: 2 }, 'Stretchy. Slappy. Reliable.', 1, false, []),
  g('limbs', 'Crab Claws', 'claw', '#ff6b5b', { mass: 6, energy: 3, dmg: 4, grip: 3 }, 'Pinch first, ask later.', 2, false, ['contact']),
  g('limbs', 'Feather Wings', 'wing', '#e8e4da', { mass: 2, energy: 4, speed: 4, bounce: 2 }, 'Light as a rumour.', 2, false, ['hover']),
  g('limbs', 'Anchor Legs', 'leg', '#7c8894', { mass: 12, energy: 2, def: 4, speed: -4, grip: 2 }, 'You are the obstacle now.', 2, false, []),
  g('limbs', 'Coil Tail', 'tail', '#ffb545', { mass: 4, energy: 2, control: 4, bounce: 2 }, 'Steers like a happy question mark.', 1, false, []),
  g('limbs', 'Spider Limbs', 'leg', '#8b5cf6', { mass: 5, energy: 3, grip: 4, speed: 2 }, 'Eight tiny career decisions.', 2, false, []),
  g('limbs', 'Jet Knees', 'leg', '#ff8a4c', { mass: 5, energy: 5, speed: 5, dash: 3 }, 'Knees that say “now”.', 3, false, []),
  g('limbs', 'Bubble Feet', 'spring', '#9be7ff', { mass: 2, energy: 2, bounce: 5 }, 'Please do not pop.', 1, false, ['hop']),
  g('limbs', 'Iron Shoulders', 'arm', '#b9c6d6', { mass: 10, energy: 3, def: 5, dmg: 1 }, 'Room for chips. And grudges.', 2, false, []),
  g('limbs', 'Hummingbird Wings', 'wing', '#5ce1c6', { mass: 2, energy: 6, speed: 6 }, 'A blur with an attitude.', 3, false, ['hover']),
  g('limbs', 'Grapple Arm', 'hook', '#ffb545', { mass: 5, energy: 5, dash: 5, grip: 2, control: 1 }, 'The floor is not the only option.', 2, false, ['grapple']),
  g('limbs', 'Walker Stilts', 'leg', '#d7b98e', { mass: 3, energy: 3, speed: 3, control: 1 }, 'Tall, elegant, slightly unstable.', 1, false, []),
  g('limbs', 'Titan Fist', 'arm', '#ff5d5d', { mass: 12, energy: 5, dmg: 8, dash: 3 }, 'One fist. Zero negotiation.', 3, false, ['contact']),

  /* ── WEAPONS ───────────────────────────────────────────── */
  g('weapons', 'Spike Ring', 'spike', '#b9c6d6', { mass: 8, energy: 3, dmg: 6, def: 1 }, 'The classic. Still pointy.', 1, true, ['contact']),
  g('weapons', 'War Hammer', 'hammer', '#c98a5b', { mass: 12, energy: 5, dmg: 5, dash: 3 }, 'Diplomacy, but round.', 2, false, ['contact']),
  g('weapons', 'Buzz Saw', 'saw', '#e8e4da', { mass: 9, energy: 5, dmg: 7, speed: -1 }, 'It hums because it is happy.', 2, false, ['contact']),
  g('weapons', 'Tail Whip', 'tail', '#ff9ed2', { mass: 6, energy: 3, dmg: 5, control: 2 }, 'A rude little follow-through.', 1, false, ['contact']),
  g('weapons', 'Ball Cannon', 'cannon', '#8b97a6', { mass: 8, energy: 6, dmg: 4 }, 'Fires spare balls. Do not ask.', 2, false, ['projectile']),
  g('weapons', 'Morning Star', 'orb', '#ff6b5b', { mass: 14, energy: 5, dmg: 8 }, 'Optimism with spikes.', 3, false, ['contact']),
  g('weapons', 'Rail Spike', 'spike', '#a7f36b', { mass: 7, energy: 4, dmg: 3, dash: 6 }, 'Straight lines, big feelings.', 2, false, ['contact']),
  g('weapons', 'Battle Axe', 'blade', '#ffb545', { mass: 10, energy: 4, dmg: 7 }, 'A haircut for bad ideas.', 2, false, ['contact']),
  g('weapons', 'Pile Bunker', 'hammer', '#ff8a4c', { mass: 13, energy: 6, dmg: 4, dash: 9 }, 'Delayed. Regretted.', 3, false, ['contact']),
  g('weapons', 'Bladed Disc', 'saw', '#67e8f9', { mass: 7, energy: 4, dmg: 5, speed: 2 }, 'A frisbee with a plan.', 2, false, ['contact']),
  g('weapons', 'Meteor Flail', 'orb', '#ff5d5d', { mass: 16, energy: 6, dmg: 9, speed: -2 }, 'Orbital nuisance.', 3, false, ['contact']),
  g('weapons', 'Frost Cleaver', 'blade', '#9be7ff', { mass: 9, energy: 4, dmg: 5, def: 2 }, 'A cold cut.', 3, false, ['contact', 'slow']),
  g('weapons', 'Magma Maul', 'hammer', '#ff6b3d', { mass: 12, energy: 5, dmg: 7 }, 'Everything is a forge if you try.', 3, false, ['contact', 'burn']),
  g('weapons', 'Chain Hook', 'hook', '#8b97a6', { mass: 6, energy: 4, dmg: 3, dash: 4 }, 'Pulls friends closer.', 2, false, ['grapple', 'contact']),
  g('weapons', 'Sonic Ram', 'spike', '#5ce1c6', { mass: 11, energy: 4, dmg: 3, dash: 7 }, 'A very loud headbutt.', 2, false, ['contact']),
  g('weapons', 'Twin Daggers', 'blade', '#e8e4da', { mass: 4, energy: 3, dmg: 4, speed: 2 }, 'Small, fast, personal.', 1, false, ['contact']),
  g('weapons', 'Bear Trap', 'saw', '#c98a5b', { mass: 8, energy: 3, dmg: 2, def: 3 }, 'A hug with teeth.', 2, false, ['thorns']),
  g('weapons', 'Crescent Blade', 'blade', '#c084fc', { mass: 6, energy: 4, dmg: 6, control: 2 }, 'Stab, but make it art.', 2, false, ['contact']),
  g('weapons', 'Doom Drill', 'drill', '#ff8a4c', { mass: 12, energy: 6, dmg: 8, grip: 1 }, 'Bores through excuses.', 3, false, ['contact']),
  g('weapons', 'Singularity Spear', 'spike', '#8b5cf6', { mass: 15, energy: 8, dmg: 10, dash: 2 }, 'A point so sharp it has gravity.', 3, false, ['contact', 'pull']),

  /* ── FACE TECH ─────────────────────────────────────────── */
  g('face', 'Laser Eyes', 'eye', '#ff5d5d', { mass: 3, energy: 6, dmg: 3 }, 'Eye contact, weaponised.', 2, true, ['projectile']),
  g('face', 'Sonar Dome', 'antenna', '#67e8f9', { mass: 2, energy: 4, control: 4 }, 'Pings the room. Hates surprises.', 1, false, []),
  g('face', 'X-Ray Lens', 'eye', '#a7f36b', { mass: 2, energy: 5, luck: 3, control: 2 }, 'Sees through walls, not excuses.', 2, false, []),
  g('face', 'Fangs', 'fang', '#e8e4da', { mass: 3, energy: 2, dmg: 4 }, 'A smile with an agenda.', 1, false, ['contact']),
  g('face', 'Third Eye', 'eye', '#c084fc', { mass: 2, energy: 5, control: 4, luck: 3 }, 'Double the blinking.', 3, false, []),
  g('face', 'Hypno Gaze', 'eye', '#ff9ed2', { mass: 2, energy: 5, control: 3 }, 'Rivals forget which way is forward.', 2, false, ['slow']),
  g('face', 'Heat Vision', 'eye', '#ff6b3d', { mass: 3, energy: 6, dmg: 4 }, 'A warm look, literally.', 2, false, ['burn']),
  g('face', 'Cyclops Beam', 'eye', '#ffb545', { mass: 3, energy: 7, dmg: 5, dash: 1 }, 'One eye, no blink, big beam.', 3, false, ['projectile']),
  g('face', 'Shock Grill', 'fang', '#f7d154', { mass: 3, energy: 4, dmg: 3, def: 2 }, 'Static between every tooth.', 2, false, ['contact']),
  g('face', 'Whisper Antenna', 'antenna', '#5ce1c6', { mass: 1, energy: 3, control: 3, luck: 2 }, 'Hears the odds. Usually wrong.', 1, false, []),
  g('face', 'Battle Visor', 'eye', '#8b97a6', { mass: 3, energy: 3, def: 3, control: 2 }, 'Reads damage. Delivers more.', 2, false, []),
  g('face', 'Toxin Glands', 'fang', '#a7f36b', { mass: 3, energy: 4, dmg: 3 }, 'A spicy surprise.', 2, false, ['contact', 'burn']),
  g('face', 'Echo Jaw', 'fang', '#67e8f9', { mass: 4, energy: 3, dmg: 3, control: 2 }, 'Shouts in sonar. Rude.', 1, false, ['contact']),
  g('face', 'Stare Down', 'eye', '#ff5d5d', { mass: 2, energy: 3, dmg: 2, control: 3 }, 'Wins some fights before impact.', 1, false, []),
  g('face', 'Nova Mouth', 'orb', '#ff8a4c', { mass: 3, energy: 7, dmg: 4 }, 'Sings in a damaging key.', 3, false, ['projectile']),
  g('face', 'Lucky Brow', 'antenna', '#f7d154', { mass: 1, energy: 4, luck: 5 }, 'Suspiciously well-groomed.', 2, false, []),
  g('face', 'Predator Eyes', 'eye', '#ffb545', { mass: 2, energy: 4, dmg: 3, speed: 1 }, 'Follows the juiciest target.', 2, false, []),
  g('face', 'Iron Teeth', 'fang', '#b9c6d6', { mass: 5, energy: 3, dmg: 3, def: 2 }, 'Dentist-proof. Everything-proof.', 2, false, ['contact']),
  g('face', 'Signal Horn', 'antenna', '#5ce1c6', { mass: 2, energy: 3, speed: 2, control: 2 }, 'Honks encouragement.', 1, false, []),
  g('face', 'Truth Seer', 'eye', '#8b5cf6', { mass: 1, energy: 5, luck: 4, def: 1 }, 'Knows the loot table. Won’t say.', 3, false, []),

  /* ── MOVEMENT ──────────────────────────────────────────── */
  g('movement', 'Rocket Pack', 'rocket', '#ff8a4c', { mass: 5, energy: 5, speed: 5, dash: 4 }, 'Two rockets, one direction.', 2, true, []),
  g('movement', 'Jump Pads', 'spring', '#a7f36b', { mass: 4, energy: 3, bounce: 6 }, 'Gravity is a suggestion.', 1, false, ['hop']),
  g('movement', 'Grappling Hook', 'hook', '#ffb545', { mass: 4, energy: 5, dash: 3, control: 2 }, 'Swing first. Land eventually.', 2, false, ['grapple']),
  g('movement', 'Hover Coils', 'orb', '#67e8f9', { mass: 3, energy: 5, speed: 2, control: 3 }, 'Skims the floor like a rumour.', 2, false, ['hover']),
  g('movement', 'Turbo Jets', 'rocket', '#ff6b3d', { mass: 5, energy: 6, speed: 6 }, 'Subtlety at unreasonable speed.', 3, false, []),
  g('movement', 'Roller Skates', 'tread', '#ff9ed2', { mass: 3, energy: 3, speed: 4, grip: 2 }, 'Four tiny wheels of chaos.', 1, false, []),
  g('movement', 'Burst Thrusters', 'rocket', '#ffb545', { mass: 4, energy: 6, dash: 7 }, 'All the dash. Half the brakes.', 3, false, []),
  g('movement', 'Pogo Ring', 'spring', '#5ce1c6', { mass: 3, energy: 3, bounce: 7 }, 'Boing is a lifestyle.', 2, false, ['hop']),
  g('movement', 'Wind Sails', 'wing', '#e8e4da', { mass: 2, energy: 4, speed: 4, control: 2 }, 'Loud, fast, slightly lost.', 2, false, []),
  g('movement', 'Magnet Skids', 'magnet', '#ff5d5d', { mass: 5, energy: 3, grip: 5 }, 'The floor is a close friend.', 2, false, []),
  g('movement', 'Phase Wheels', 'tread', '#c084fc', { mass: 4, energy: 5, speed: 4, control: 3 }, 'Half here. Fully fast.', 3, false, ['hover']),
  g('movement', 'Bounce Boots', 'spring', '#ffb545', { mass: 3, energy: 3, bounce: 5, speed: 2 }, 'Every step is a small rebellion.', 1, false, ['hop']),
  g('movement', 'Warp Kite', 'wing', '#8b5cf6', { mass: 3, energy: 5, speed: 3, dash: 5 }, 'A kite with somewhere to be.', 3, false, []),
  g('movement', 'Gyro Ball', 'orb', '#8b97a6', { mass: 6, energy: 4, control: 6 }, 'Spins so you don’t have to.', 2, false, []),
  g('movement', 'Afterburner', 'rocket', '#ff5d5d', { mass: 6, energy: 7, speed: 7, dmg: 2 }, 'The exhaust is also a weapon.', 3, false, ['burn']),
  g('movement', 'Glide Fins', 'wing', '#5ce1c6', { mass: 2, energy: 4, bounce: 3, control: 4 }, 'Small fins, large confidence.', 1, false, ['hover']),
  g('movement', 'Repulsor Ring', 'orb', '#67e8f9', { mass: 4, energy: 5, def: 3, speed: 2 }, 'Pushes the world politely away.', 2, false, ['shield']),
  g('movement', 'Catapult Coil', 'spring', '#c98a5b', { mass: 8, energy: 5, bounce: 8, dash: 3 }, 'A medieval solution to corners.', 3, false, ['hop']),
  g('movement', 'Tether Anchor', 'hook', '#8b97a6', { mass: 7, energy: 4, grip: 4, def: 3 }, 'Stops you. Sometimes stops them.', 2, false, ['grapple']),
  g('movement', 'Quantum Drive', 'rocket', '#8b5cf6', { mass: 5, energy: 9, speed: 8, dash: 6 }, 'Arrives before the question.', 3, false, []),

  /* ── WEIRD ─────────────────────────────────────────────── */
  g('weird', 'Shield Bubble', 'bubble', '#67e8f9', { mass: 3, energy: 6, def: 6 }, 'Soap, but with tenure.', 2, true, ['shield']),
  g('weird', 'Decoy Clone', 'orb', '#ff9ed2', { mass: 2, energy: 7, control: 2, luck: 2 }, 'A second you. Worse manners.', 3, false, ['regen']),
  g('weird', 'Black Hole Charm', 'orb', '#8b5cf6', { mass: 5, energy: 8, dmg: 2, control: 2 }, 'A pocket-sized problem.', 3, false, ['pull']),
  g('weird', 'Magnet Core', 'magnet', '#ff5d5d', { mass: 3, energy: 5, luck: 2 }, 'Collects shinies and enemies.', 2, false, ['magnet']),
  g('weird', 'Party Hat', 'hat', '#f7d154', { mass: 1, energy: 3, luck: 6 }, 'Objectively the best stat source.', 1, false, ['luck']),
  g('weird', 'Lucky Coin', 'orb', '#ffb545', { mass: 1, energy: 2, luck: 5 }, 'Heads: loot. Tails: slightly more loot.', 1, false, ['luck']),
  g('weird', 'Disco Ball', 'orb', '#c084fc', { mass: 3, energy: 4, control: 2, luck: 3 }, 'Crowd favourite. Retina hazard.', 1, false, []),
  g('weird', 'Rubber Duck', 'orb', '#f7d154', { mass: 2, energy: 2, bounce: 3, luck: 3 }, 'Squeaks in the face of danger.', 1, false, []),
  g('weird', 'Tiny Moon', 'orb', '#b9c6d6', { mass: 6, energy: 5, def: 2, dmg: 1 }, 'Orbits you. Owns the tides.', 2, false, []),
  g('weird', 'Golden Tooth', 'fang', '#f7d154', { mass: 1, energy: 3, luck: 4, dmg: 2 }, 'Bites are 20% more profitable.', 2, false, ['contact']),
  g('weird', 'Fortune Cookie', 'orb', '#e8e4da', { mass: 1, energy: 2, luck: 7 }, '“A big win is in your near future.”', 2, false, ['luck']),
  g('weird', 'Bouncy Castle', 'bubble', '#ff9ed2', { mass: 6, energy: 4, bounce: 5, def: 2 }, 'Inflated confidence, physically.', 2, false, ['shield']),
  g('weird', 'Glitter Cannon', 'cannon', '#ff9ed2', { mass: 4, energy: 6, dmg: 2, luck: 2 }, 'Fires sparkle. Sparkle hurts.', 2, false, ['projectile']),
  g('weird', 'Slow Clock', 'orb', '#67e8f9', { mass: 3, energy: 5, control: 4, def: 2 }, 'Aura of “five more minutes”.', 2, false, ['slow']),
  g('weird', 'Mirror Shard', 'blade', '#b9c6d6', { mass: 2, energy: 4, def: 4, luck: 2 }, 'Reflects bad decisions.', 2, false, ['thorns']),
  g('weird', 'Confetti Mine', 'orb', '#ff6b5b', { mass: 3, energy: 5, dmg: 3, bounce: 2 }, 'Celebration, detonation-adjacent.', 2, false, []),
  g('weird', 'Wobble Spring', 'spring', '#a7f36b', { mass: 3, energy: 2, bounce: 4, control: -2 }, 'Your centre of mass has opinions.', 1, false, ['hop']),
  g('weird', 'Alien Pebble', 'orb', '#5ce1c6', { mass: 2, energy: 4, control: 3, luck: 3 }, 'Whispers coordinates. Probably.', 2, false, []),
  g('weird', 'Golden Clover', 'orb', '#a7f36b', { mass: 1, energy: 3, luck: 8 }, 'Extremely rare. Extremely smug.', 3, false, ['luck']),
  g('weird', 'Event Horizon', 'orb', '#8b5cf6', { mass: 7, energy: 9, def: 3, dmg: 2 }, 'A tiny apocalypse on a chain.', 3, false, ['pull']),
];

export const GADGET_MAP = Object.fromEntries(GADGETS.map((gadget) => [gadget.id, gadget]));
export const STARTER_GADGETS = GADGETS.filter((gadget) => gadget.starter).map((gadget) => gadget.id);

export const FORGE_UPGRADES = {
  mass: {
    name: 'Mass Bay', icon: '⬓', color: '#ffb545', max: 5,
    desc: '+15 mass budget per level.', cost: (lvl) => 140 + lvl * 110,
    detail: (lvl) => `+${lvl * 15} MASS`,
  },
  energy: {
    name: 'Energy Cell', icon: '◈', color: '#67e8f9', max: 5,
    desc: '+10 energy budget per level.', cost: (lvl) => 120 + lvl * 95,
    detail: (lvl) => `+${lvl * 10} ENERGY`,
  },
  motor: {
    name: 'Motor Wind', icon: '⟳', color: '#a7f36b', max: 5,
    desc: '+7 speed and +8 dash per level.', cost: (lvl) => 100 + lvl * 80,
    detail: (lvl) => `+${lvl * 7} SPEED`,
  },
  armor: {
    name: 'Hull Polish', icon: '⬢', color: '#b9c6d6', max: 5,
    desc: '+12% defense per level.', cost: (lvl) => 110 + lvl * 90,
    detail: (lvl) => `+${lvl * 12}% DEF`,
  },
  luck: {
    name: 'Loot Magnet', icon: '✦', color: '#ff9ed2', max: 5,
    desc: '+12% scrap and better drops.', cost: (lvl) => 90 + lvl * 75,
    detail: (lvl) => `+${lvl * 12}% LOOT`,
  },
};

export const COLOR_SWATCHES = [
  '#ffb545', '#ff6b3d', '#ff5d5d', '#ff9ed2', '#c084fc',
  '#8b5cf6', '#63b3ff', '#67e8f9', '#5ce1c6', '#a7f36b',
  '#ffe98a', '#f5efe4', '#9aa3a8', '#4a5563', '#232a34', '#0d1117',
];

export const DEFAULT_CONFIG = {
  name: 'PIP',
  size: 1,
  weight: 1,
  squash: 0.35,
  material: 'rubber',
  bounce: 6,
  grip: 6,
  color: '#ffb545',
  accent: '#ff6b3d',
  pattern: 'split',
  glow: 0.35,
  texture: 'gloss',
  eyes: 'wide',
  mouth: 'grin',
  mood: 'bold',
  voice: 'squeak',
  core: 'fire',
  gadgets: ['limbs_spring_heels', 'weapons_spike_ring', 'weird_party_hat'],
  rotation: 0,
  mirror: false,
  resize: 1,
  paint: '#ff6b3d',
};

export const DEFAULT_UPGRADES = { mass: 0, energy: 0, motor: 0, armor: 0, luck: 0 };

export const RIVALS = [
  {
    name: 'RUSTY', title: 'Scrapyard veteran',
    config: {
      ...DEFAULT_CONFIG, name: 'RUSTY', material: 'metal', color: '#d07a45', accent: '#4a5563',
      pattern: 'hazard', glow: 0.18, eyes: 'grumpy', mouth: 'flat', mood: 'angry', core: 'fire',
      size: 1.05, weight: 1.15, bounce: 4, grip: 7,
      gadgets: ['weapons_spike_ring', 'weapons_war_hammer', 'limbs_iron_shoulders', 'face_iron_teeth'],
      rotation: 12, mirror: true, resize: 1.05, squash: 0.2,
    },
  },
  {
    name: 'GLOWPOP', title: 'Lobby sweetheart',
    config: {
      ...DEFAULT_CONFIG, name: 'GLOWPOP', material: 'jelly', color: '#ff9ed2', accent: '#67e8f9',
      pattern: 'stars', glow: 0.8, eyes: 'star', mouth: 'ooo', mood: 'giddy', core: 'electric',
      size: 0.94, weight: 0.8, bounce: 8, grip: 6,
      gadgets: ['movement_pogo_ring', 'weird_disco_ball', 'weird_party_hat', 'face_laser_eyes'],
      rotation: -20, mirror: true, resize: 1, squash: 0.5,
    },
  },
  {
    name: 'NEEDLE', title: 'Ring tactician',
    config: {
      ...DEFAULT_CONFIG, name: 'NEEDLE', material: 'metal', color: '#b9c6d6', accent: '#ff5d5d',
      pattern: 'stripes', glow: 0.25, eyes: 'visor', mouth: 'zigzag', mood: 'calm', core: 'ice',
      size: 0.9, weight: 0.95, bounce: 5, grip: 9,
      gadgets: ['weapons_spike_ring', 'weapons_buzz_saw', 'movement_roller_skates', 'face_battle_visor'],
      rotation: 0, mirror: false, resize: 1.1, squash: 0.15,
    },
  },
  {
    name: 'MOTH', title: 'Too fast to read',
    config: {
      ...DEFAULT_CONFIG, name: 'MOTH', material: 'rubber', color: '#a7f36b', accent: '#8b5cf6',
      pattern: 'swirl', glow: 0.5, eyes: 'sleepy', mouth: 'smile', mood: 'scared', core: 'electric',
      size: 0.86, weight: 0.7, bounce: 7, grip: 8,
      gadgets: ['limbs_feather_wings', 'movement_burst_thrusters', 'face_whisper_antenna', 'weird_lucky_coin'],
      rotation: 40, mirror: true, resize: 0.95, squash: 0.4,
    },
  },
  {
    name: 'TITAN', title: 'Arena champion',
    config: {
      ...DEFAULT_CONFIG, name: 'TITAN', material: 'stone', color: '#7c8894', accent: '#ffb545',
      pattern: 'checker', glow: 0.3, eyes: 'grumpy', mouth: 'fangs', mood: 'bold', core: 'gravity',
      size: 1.2, weight: 1.35, bounce: 3, grip: 6,
      gadgets: ['limbs_titan_fist', 'weapons_meteor_flail', 'movement_tether_anchor', 'weird_tiny_moon', 'face_iron_teeth'],
      rotation: 18, mirror: true, resize: 1.15, squash: 0.1,
    },
  },
];

export const BUILD_TAGS = [
  { label: 'HEAVY HITTER', test: (s) => s.phys.damage >= 21, color: '#ff6b5b' },
  { label: 'SPEED DEMON', test: (s) => s.phys.maxSpeed >= 290, color: '#a7f36b' },
  { label: 'TANK', test: (s) => s.phys.defense >= 9, color: '#b9c6d6' },
  { label: 'BOUNCE LORD', test: (s) => s.phys.bounce >= 0.85, color: '#67e8f9' },
  { label: 'GLUE', test: (s) => s.phys.grip >= 12, color: '#ffb545' },
  { label: 'LUCKY', test: (s) => s.phys.luck >= 1.7, color: '#ff9ed2' },
  { label: 'GLASS CANNON', test: (s) => s.phys.damage >= 18 && s.phys.defense <= 3, color: '#c084fc' },
];
