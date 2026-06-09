// ─── General Waste sub-groups ─────────────────────────────────────────────
export const GENERAL_WASTE_SUBGROUPS = {
  'Packaging & Paper': [
    'Package Carton',
    'Master Carton',
    'Wooden Pallet',
  ],
  'Plastics': [
    'Plastic Tray (Pet)',
    'Plastic Wheels',
    'Damaged Plastic / General Plastic',
    'Polymer (Rubber/Plastics)',
  ],
  'Plastics EPR': [
    'Cat I – Rigid Plastic (Spool/Wheel Scrap)',
    'Cat I – Rigid Plastic (Strips)',
    'Cat I – Rigid Plastic (Seal Caps)',
    'Cat I – Rigid Plastic (Damaged Pallet)',
    'Cat II – Flexible (Foam)',
    'Cat II – Flexible (Component Feeder Waste)',
    'Cat II – Flexible (Reels)',
    'Cat II – Flexible (Packaging Cover)',
    'Cat II – Flexible (Bubble Wrap)',
    'Cat II – Flexible (Tape)',
    'Cat II – Flexible (Plastic Tray/PET)',
    'Cat III – Multilayer (Foam+Plastic Sheet Pallet)',
    'Cat III – Multilayer (ESD Covers)',
    'Cat III – Multilayer (Slicing Tape)',
    'Cat III – Multilayer (Anti-static Bags)',
    'Cat III – Multilayer (Thermocol)',
  ],
  'Metals': [
    'Iron and Steel',
    'Casting Iron',
    'Aluminium Scrap',
    'Steel MS/SS',
    'PA with Aluminium',
  ],
  'Copper': [
    'Copper Scrap',
    'Copper/Brass',
    'PA with Copper',
  ],
  'Electronic Scrap': [
    'E-waste PCBA (Edge Cutting)',
    'E-Components (SMT Reels/BGA/Mosfet)',
    'Optical Fibre Cable',
  ],
  'General / Misc': [
    'Rubbish Waste',
    'Glass Waste',
    'Assets',
  ],
};

// Flat list (for backward compat — same strings, same DB values)
export const GENERAL_WASTE_CATEGORIES = Object.values(GENERAL_WASTE_SUBGROUPS).flat();

export const HAZARDOUS_SUBGROUPS = {
  'Category 5 – Liquid Waste': [
    '5.1 – Used/Spent Oil',
    '5.2 – Wastes or Residues',
  ],
  'Category 31 – Process Waste': [
    '31.1 – Process Residue & Waste',
  ],
  'Category 33 – Containers': [
    '33.1 – Empty Barrels/Containers/Liners (contaminated)',
  ],
};

export const EWASTE_SUBGROUPS = {
  'PCB & Components': [
    'Edge Cutting',
    'PCB With Components',
    'Blank PCB',
  ],
  'IT Equipment': [
    'CPU',
    'Desktop',
    'Server',
    'Others',
  ],
};

export const HAZARDOUS_CATEGORIES = Object.values(HAZARDOUS_SUBGROUPS).flat();
export const EWASTE_CATEGORIES = Object.values(EWASTE_SUBGROUPS).flat();

export const ALL_CATEGORIES = [
  ...GENERAL_WASTE_CATEGORIES,
  ...HAZARDOUS_CATEGORIES,
  ...EWASTE_CATEGORIES,
];

// ─── Nested sub-groups within a top-level group (e.g. Cat I/II/III inside Plastics EPR) ───
export const NESTED_SUBGROUPS = {
  'Plastics EPR': {
    'Cat I – Rigid Plastic': [
      'Cat I – Rigid Plastic (Spool/Wheel Scrap)',
      'Cat I – Rigid Plastic (Strips)',
      'Cat I – Rigid Plastic (Seal Caps)',
      'Cat I – Rigid Plastic (Damaged Pallet)',
    ],
    'Cat II – Flexible': [
      'Cat II – Flexible (Foam)',
      'Cat II – Flexible (Component Feeder Waste)',
      'Cat II – Flexible (Reels)',
      'Cat II – Flexible (Packaging Cover)',
      'Cat II – Flexible (Bubble Wrap)',
      'Cat II – Flexible (Tape)',
      'Cat II – Flexible (Plastic Tray/PET)',
    ],
    'Cat III – Multilayer': [
      'Cat III – Multilayer (Foam+Plastic Sheet Pallet)',
      'Cat III – Multilayer (ESD Covers)',
      'Cat III – Multilayer (Slicing Tape)',
      'Cat III – Multilayer (Anti-static Bags)',
      'Cat III – Multilayer (Thermocol)',
    ],
  },
};

// ─── Group prefix used for sub-group selections ────────────────────────────
export const GROUP_PREFIX = 'grp:';

/** Return the human-readable label for a material value (category or group). */
export function materialLabel(value) {
  if (!value) return '';
  return value.startsWith(GROUP_PREFIX) ? value.slice(GROUP_PREFIX.length) : value;
}

/**
 * Given a material select value (individual category string OR "grp:GroupName"),
 * return the array of individual category strings to filter by.
 */
export function resolveCategories(value) {
  if (!value) return [];
  if (value.startsWith(GROUP_PREFIX)) {
    const groupName = value.slice(GROUP_PREFIX.length);
    return GENERAL_WASTE_SUBGROUPS[groupName] ?? [];
  }
  return [value];
}
