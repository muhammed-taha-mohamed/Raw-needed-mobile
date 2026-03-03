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
  /** Optional error message; when present, shows error state */
  error?: string | null;
  /** Optional helper text shown under the field (when no error) */
  helperText?: string;
  /** Leading icon (Material Symbols name) */
  leadingIcon?: string;
  /** Trailing help icon (Material Symbols name) */
  helpIcon?: string;
  /** Click handler for help icon */
  onHelpClick?: () => void;
  /** RTL layout (affects icon positions) */
  isRtl?: boolean;
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
      error = null,
      helperText,
      leadingIcon,
      helpIcon,
      onHelpClick,
      isRtl = false,
      ...rest
    },
    ref
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const [focused, setFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const hasValue = value != null && String(value).trim() !== '';
    const floatLabel = focused || hasValue;
    const displayPlaceholder = placeholder ?? label;
    const isPassword = (rest.type === 'password');
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : rest.type;
    const hasTrailingControl = Boolean(helpIcon) || isPassword;
    const borderColor =
      error
        ? 'border-red-500'
        : floatLabel
          ? 'border-primary'
          : 'border-primary/20 dark:border-primary/30';
    const labelColor =
      error ? 'text-red-600' : 'text-primary';
    const describedBy = error ? `${id}-error` : (helperText ? `${id}-help` : undefined);

    return (
      <div className={`relative rounded-2xl ${wrapperClassName}`} data-floating-label-wrapper>
        {/* Border with notch: when label floats, it overlaps top border */}
        <div className={`pointer-events-none absolute inset-0 rounded-2xl border-2 transition-colors ${borderColor}`} aria-hidden />
        <label
          htmlFor={id}
          className={`
            pointer-events-none absolute left-4 rtl:left-auto rtl:right-4 z-[1] px-1
            transition-all duration-200 ease-out
            ${floatLabel
              ? `top-0 -translate-y-1/2 text-xs font-black ${labelColor} bg-white dark:bg-slate-900`
              : 'top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 dark:text-slate-500 opacity-0'}
          `}
        >
          {label}
        </label>
        {leadingIcon && (
          <span
            className={`material-symbols-outlined absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300 transition-colors ${focused ? 'text-primary' : ''}`}
          >
            {leadingIcon}
          </span>
        )}
        {hasTrailingControl && (
          <div className={`absolute ${isRtl ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 flex items-center gap-2`}>
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-slate-400 hover:text-primary transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            )}
            {helpIcon && (
              <button
                type="button"
                onClick={onHelpClick}
                className="text-slate-400 hover:text-primary transition-colors"
                aria-label="Help"
                tabIndex={-1}
              >
                <span className="material-symbols-outlined text-[18px]">{helpIcon}</span>
              </button>
            )}
          </div>
        )}
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
            ${leadingIcon ? (isRtl ? 'pr-12' : 'pl-12') : ''}
            ${hasTrailingControl ? (isRtl ? 'pl-12' : 'pr-12') : ''}
            ${floatLabel ? 'placeholder:opacity-0' : ''}
            ${className}
          `}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          type={inputType}
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
        {error ? (
          <p id={`${id}-error`} className={`mt-1 text-[10px] font-bold ${isRtl ? 'text-right' : 'text-left'} text-red-600`}>
            {error}
          </p>
        ) : (
          helperText ? (
            <p id={`${id}-help`} className={`mt-1 text-[10px] font-bold ${isRtl ? 'text-right' : 'text-left'} text-slate-400`}>
              {helperText}
            </p>
          ) : null
        )}
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
