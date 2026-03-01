import React, { useId, useState } from 'react';

const baseInputClass =
  'w-full px-4 py-3.5 rounded-2xl border-2 bg-slate-50/50 dark:bg-slate-800/50 text-sm md:text-base font-bold placeholder:text-xs md:placeholder:text-sm placeholder:font-medium outline-none transition-all shadow-inner text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500';

export interface FloatingLabelInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'placeholder'> {
  /** Label shown above when focused or when value is not empty */
  label: string;
  /** Placeholder when empty and unfocused (defaults to label) */
  placeholder?: string;
  /** Extra class for the wrapper */
  wrapperClassName?: string;
}

const FloatingLabelInput = React.forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  (
    {
      label,
      placeholder,
      value,
      className = '',
      wrapperClassName = '',
      id: idProp,
      onFocus,
      onBlur,
      ...rest
    },
    ref
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const [focused, setFocused] = useState(false);
    const hasValue = value != null && String(value).trim() !== '';
    const floatLabel = focused || hasValue;
    const displayPlaceholder = placeholder ?? label;

    return (
      <div
        className={`relative rounded-2xl ${wrapperClassName}`}
        data-floating-label-wrapper
      >
        {/* Border with notch: when label floats, it overlaps top border */}
        <div
          className={`
            pointer-events-none absolute inset-0 rounded-2xl border-2 transition-colors
            ${floatLabel ? 'border-primary' : 'border-primary/20 dark:border-primary/30'}
          `}
          aria-hidden
        />
        <label
          htmlFor={id}
          className={`
            pointer-events-none absolute left-4 rtl:left-auto rtl:right-4 z-[1] px-1
            transition-all duration-200 ease-out
            ${floatLabel
              ? 'top-0 -translate-y-1/2 text-xs font-black text-primary bg-white dark:bg-slate-900'
              : 'top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 dark:text-slate-500 opacity-0'}
          `}
        >
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          value={value}
          placeholder={floatLabel ? undefined : displayPlaceholder}
          className={`
            ${baseInputClass}
            border-transparent focus:border-transparent
            focus:bg-white dark:focus:bg-slate-900
            pt-[1.1rem]
            ${floatLabel ? 'placeholder:opacity-0' : ''}
            ${className}
          `}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
      </div>
    );
  }
);

FloatingLabelInput.displayName = 'FloatingLabelInput';

const baseTextareaClass =
  'w-full px-4 py-3.5 rounded-2xl border-2 min-h-[110px] bg-slate-50/50 dark:bg-slate-800/50 text-sm md:text-base font-bold placeholder:text-xs md:placeholder:text-sm placeholder:font-medium outline-none transition-all shadow-inner text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-y';

export interface FloatingLabelTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'placeholder'> {
  label: string;
  placeholder?: string;
  wrapperClassName?: string;
}

const FloatingLabelTextarea = React.forwardRef<
  HTMLTextAreaElement,
  FloatingLabelTextareaProps
>(
  (
    {
      label,
      placeholder,
      value,
      className = '',
      wrapperClassName = '',
      id: idProp,
      onFocus,
      onBlur,
      ...rest
    },
    ref
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const [focused, setFocused] = useState(false);
    const hasValue = value != null && String(value).trim() !== '';
    const floatLabel = focused || hasValue;
    const displayPlaceholder = placeholder ?? label;

    return (
      <div
        className={`relative rounded-2xl ${wrapperClassName}`}
        data-floating-label-wrapper
      >
        <div
          className={`
            pointer-events-none absolute inset-0 rounded-2xl border-2 transition-colors
            ${floatLabel ? 'border-primary' : 'border-primary/20 dark:border-primary/30'}
          `}
          aria-hidden
        />
        <label
          htmlFor={id}
          className={`
            pointer-events-none absolute left-4 rtl:left-auto rtl:right-4 z-[1] px-1
            transition-all duration-200 ease-out
            ${floatLabel
              ? 'top-0 -translate-y-1/2 text-xs font-black text-primary bg-white dark:bg-slate-900'
              : 'top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 dark:text-slate-500 opacity-0'}
          `}
        >
          {label}
        </label>
        <textarea
          ref={ref}
          id={id}
          value={value}
          placeholder={floatLabel ? undefined : displayPlaceholder}
          className={`
            ${baseTextareaClass}
            border-transparent focus:border-transparent
            focus:bg-white dark:focus:bg-slate-900
            pt-[1.1rem]
            ${floatLabel ? 'placeholder:opacity-0' : ''}
            ${className}
          `}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
      </div>
    );
  }
);

FloatingLabelTextarea.displayName = 'FloatingLabelTextarea';

export { FloatingLabelTextarea };
export default FloatingLabelInput;
