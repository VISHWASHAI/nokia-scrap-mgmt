export const GENERAL_WASTE_CATEGORIES = [
  'Package Carton',
  'Wooden Pallet',
  'Master Carton',
  'Rubbish Waste',
  'Plastic Tray (Pet)',
  'Plastic Wheels',
  'Damaged Plastic / General Plastic',
  'Glass Waste',
  'Iron and Steel',
  'Casting Iron',
  'Copper Scrap',
  'Optical Fibre Cable',
  'Aluminium Scrap',
  'Steel MS/SS',
  'Copper/Brass',
  'E-waste PCBA (Edge Cutting)',
  'PA with Aluminium',
  'PA with Copper',
  'E-Components (SMT Reels/BGA/Mosfet)',
  'Polymer (Rubber/Plastics)',
  'Assets',
  // Plastics EPR
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
];

export const HAZARDOUS_CATEGORIES = [
  '5.1 – Used/Spent Oil',
  '5.2 – Wastes or Residues',
  '31.1 – Process Residue & Waste',
  '33.1 – Empty Barrels/Containers/Liners (contaminated)',
];

export const EWASTE_CATEGORIES = [
  'Edge Cutting',
  'PCB With Components',
  'Blank PCB',
  'CPU',
  'Desktop',
  'Server',
  'Others',
];

export const ALL_CATEGORIES = [
  ...GENERAL_WASTE_CATEGORIES,
  ...HAZARDOUS_CATEGORIES,
  ...EWASTE_CATEGORIES,
];
