import {
  GENERAL_WASTE_SUBGROUPS,
  HAZARDOUS_CATEGORIES,
  EWASTE_CATEGORIES,
  GROUP_PREFIX,
} from '../constants/wasteCategories.js';

export default function MaterialSelect({ value, onChange, className = '' }) {
  return (
    <select
      className={`form-select w-auto text-xs py-1.5 max-w-[220px] ${className}`}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">All Materials</option>

      {/* General Waste — one optgroup per sub-group with a selectable "All [Group]" entry */}
      {Object.entries(GENERAL_WASTE_SUBGROUPS).map(([group, cats]) => (
        <optgroup key={group} label={`General — ${group}`}>
          <option value={`${GROUP_PREFIX}${group}`}>↳ All {group}</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </optgroup>
      ))}

      <optgroup label="Hazardous Waste">
        {HAZARDOUS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </optgroup>

      <optgroup label="E-Waste">
        {EWASTE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </optgroup>
    </select>
  );
}
