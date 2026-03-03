import React, { useId, useState } from 'react';

type CommonProps = {
  label: string;
  wrapperClassName?: string;
  disabled?: boolean;
};

type CheckboxProps = CommonProps & {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

type RadioProps = CommonProps & {
  checked: boolean;
  onChange: () => void;
  name?: string;
  value?: string;
};

const baseWrapper = 'relative rounded-2xl';
const baseBorder = 'pointer-events-none absolute inset-0 rounded-2xl border-2 transition-colors';
const baseLabel = 'pointer-events-none absolute left-4 rtl:left-auto rtl:right-4 z-[1] px-1 transition-all duration-200 ease-out';

export const FloatingLabelCheckbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  onChange,
  wrapperClassName = '',
  disabled = false,
}) => {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const floatLabel = focused || checked;
  return (
    <div className={`${baseWrapper} ${wrapperClassName}`} data-floating-label-wrapper>
      <div
        className={`${baseBorder} ${floatLabel ? 'border-primary' : 'border-primary/20 dark:border-primary/30'}`}
        aria-hidden
      />
      <label
        htmlFor={id}
        className={`${baseLabel} ${floatLabel ? 'top-0 -translate-y-1/2 text-xs font-black text-primary bg-white dark:bg-slate-900' : 'top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 dark:text-slate-500 opacity-0'}`}
      >
        {label}
      </label>
      <div className="px-4 py-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 border-2 border-transparent focus-within:bg-white dark:focus-within:bg-slate-900">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="size-5 rounded-md border-slate-300 text-primary focus:ring-primary disabled:opacity-50"
        />
      </div>
    </div>
  );
};

export const FloatingLabelRadio: React.FC<RadioProps> = ({
  label,
  checked,
  onChange,
  name,
  value,
  wrapperClassName = '',
  disabled = false,
}) => {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const floatLabel = focused || checked;
  return (
    <div className={`${baseWrapper} ${wrapperClassName}`} data-floating-label-wrapper>
      <div
        className={`${baseBorder} ${floatLabel ? 'border-primary' : 'border-primary/20 dark:border-primary/30'}`}
        aria-hidden
      />
      <label
        htmlFor={id}
        className={`${baseLabel} ${floatLabel ? 'top-0 -translate-y-1/2 text-xs font-black text-primary bg-white dark:bg-slate-900' : 'top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 dark:text-slate-500 opacity-0'}`}
      >
        {label}
      </label>
      <div className="px-4 py-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 border-2 border-transparent focus-within:bg-white dark:focus-within:bg-slate-900">
        <input
          id={id}
          type="radio"
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="size-5 rounded-full border-slate-300 text-primary focus:ring-primary disabled:opacity-50"
        />
      </div>
    </div>
  );
};

