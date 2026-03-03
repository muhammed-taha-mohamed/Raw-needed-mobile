import React, { useId, useState } from 'react';
import Dropdown, { DropdownOption } from './Dropdown';
import { MODAL_DROPDOWN_TRIGGER_CLASS } from './modalTheme';

interface FloatingLabelDropdownProps {
  label: string;
  placeholder?: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isRtl?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  noResultsText?: string;
  showClear?: boolean;
  wrapperClassName?: string;
}

const FloatingLabelDropdown: React.FC<FloatingLabelDropdownProps> = ({
  label,
  placeholder,
  options,
  value,
  onChange,
  disabled = false,
  isRtl = false,
  searchable = false,
  searchPlaceholder,
  noResultsText,
  showClear = true,
  wrapperClassName = '',
}) => {
  const generatedId = useId();
  const [focused, setFocused] = useState(false);
  const hasValue = value != null && String(value).trim() !== '';
  const floatLabel = focused || hasValue;
  const displayPlaceholder = placeholder ?? label;

  return (
    <div className={`relative rounded-2xl ${wrapperClassName}`} data-floating-label-wrapper>
      <div
        className={`
          pointer-events-none absolute inset-0 rounded-2xl border-2 transition-colors
          ${floatLabel ? 'border-primary' : 'border-primary/20 dark:border-primary/30'}
        `}
        aria-hidden
      />
      <label
        htmlFor={generatedId}
        className={`
          pointer-events-none absolute ${isRtl ? 'right-4' : 'left-4'} z-[1] px-1
          transition-all duration-200 ease-out
          ${floatLabel
            ? 'top-0 -translate-y-1/2 text-xs font-black text-primary bg-white dark:bg-slate-900'
            : 'top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 dark:text-slate-500 opacity-0'}
        `}
      >
        {label}
      </label>
      <div
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <Dropdown
          options={options}
          value={value}
          onChange={onChange}
          disabled={disabled}
          isRtl={isRtl}
          searchable={searchable}
          searchPlaceholder={searchPlaceholder}
          noResultsText={noResultsText}
          showClear={showClear}
          placeholder={displayPlaceholder}
          /** Make trigger look like input but without adding external labels */
          triggerClassName={`${MODAL_DROPDOWN_TRIGGER_CLASS} bg-transparent border-transparent`}
        />
      </div>
    </div>
  );
};

export default FloatingLabelDropdown;
