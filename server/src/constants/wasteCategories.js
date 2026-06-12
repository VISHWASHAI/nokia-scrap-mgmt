// Canonical category lists — must match client/src/constants/wasteCategories.js
// and the lists used in excel.service.js.

export const GENERAL_CATEGORIES = [
  'Package Carton', 'Master Carton', 'Wooden Pallet',
  'Plastic Tray (Pet)', 'Plastic Wheels', 'Damaged Plastic / General Plastic',
  'Polymer (Rubber/Plastics)',
  'Cat I – Rigid Plastic (Spool/Wheel Scrap)', 'Cat I – Rigid Plastic (Strips)',
  'Cat I – Rigid Plastic (Seal Caps)', 'Cat I – Rigid Plastic (Damaged Pallet)',
  'Cat II – Flexible (Foam)', 'Cat II – Flexible (Component Feeder Waste)',
  'Cat II – Flexible (Reels)', 'Cat II – Flexible (Packaging Cover)',
  'Cat II – Flexible (Bubble Wrap)', 'Cat II – Flexible (Tape)',
  'Cat II – Flexible (Plastic Tray/PET)',
  'Cat III – Multilayer (Foam+Plastic Sheet Pallet)', 'Cat III – Multilayer (ESD Covers)',
  'Cat III – Multilayer (Slicing Tape)', 'Cat III – Multilayer (Anti-static Bags)',
  'Cat III – Multilayer (Thermocol)',
  'Iron and Steel', 'Casting Iron', 'Aluminium Scrap', 'Steel MS/SS', 'PA with Aluminium',
  'Copper Scrap', 'Copper/Brass', 'PA with Copper',
  'E-waste PCBA (Edge Cutting)', 'E-Components (SMT Reels/BGA/Mosfet)', 'Optical Fibre Cable',
  'Rubbish Waste', 'Glass Waste', 'Assets',
];

export const HAZARDOUS_CATEGORIES = [
  '5.1 – Used/Spent Oil',
  '5.2 – Wastes or Residues',
  '31.1 – Process Residue & Waste',
  '33.1 – Empty Barrels/Containers/Liners (contaminated)',
];

export const EWASTE_CATEGORIES = [
  'Edge Cutting', 'PCB With Components', 'Blank PCB',
  'CPU', 'Desktop', 'Server', 'Others',
];

export const ALL_CATEGORIES = [
  ...GENERAL_CATEGORIES.map(c => ({ category: c, waste_type: 'GENERAL' })),
  ...HAZARDOUS_CATEGORIES.map(c => ({ category: c, waste_type: 'HAZARDOUS' })),
  ...EWASTE_CATEGORIES.map(c => ({ category: c, waste_type: 'EWASTE' })),
];

/** Return the waste_type for an exact category name, or null if unknown. */
export function wasteTypeForCategory(category) {
  return ALL_CATEGORIES.find(c => c.category === category)?.waste_type ?? null;
}
