import { GENERAL_WASTE_CATEGORIES, HAZARDOUS_CATEGORIES, EWASTE_CATEGORIES } from '../constants/wasteCategories.js';

export default function MaterialSelect({ value, onChange, className = '' }) {
  return (
    <select
      className={`form-select w-auto text-xs py-1.5 max-w-[200px] ${className}`}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">All Materials (by category)</option>
      <optgroup label="General Waste">
        {GENERAL_WASTE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </optgroup>
      <optgroup label="Hazardous">
        {HAZARDOUS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </optgroup>
      <optgroup label="E-Waste">
        {EWASTE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </optgroup>
    </select>
  );
}
