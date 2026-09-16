import * as SelectPrimitive from "@radix-ui/react-select";
import { useState } from "react";

import type {
  ChangeEventHandler,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

export function FormSection({ children }: { children: ReactNode }) {
  return (
    <div className="tw:flex tw:w-full tw:flex-col tw:items-start tw:gap-[60px] tw:mt-[30px] tw:mb-[100px]">
      {children}
    </div>
  );
}

export function FormSectionLabel({ children }: { children: ReactNode }) {
  return (
    <label
      className={`tw:text-gold-75 tw:font-sometype-mono tw:text-xl tw:font-medium tw:tracking-[0.6px] tw:uppercase`}
    >
      {children}
    </label>
  );
}

export function FormBlock({ children }: { children: ReactNode }) {
  return <div className="tw:w-full">{children}</div>;
}

export function FieldRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`tw:flex tw:flex-wrap tw:gap-x-6 tw:gap-y-5 ${className}`}>{children}</div>
  );
}

export function FieldCol({
  children,
  widthClass = "tw:w-full tw:md:w-1/2",
}: {
  children: ReactNode;
  widthClass?: string;
}) {
  return <div className={widthClass}>{children}</div>;
}

export function FieldGroup({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`tw:flex tw:flex-col tw:gap-3 ${className}`}>{children}</div>;
}

const labelClass =
  "tw:font-sometype-mono tw:text-[20px]! tw:font-medium tw:tracking-[0.6px] tw:uppercase tw:transition-colors";

export function FieldLabel({
  children,
  active = false,
  invalid = false,
  invisible = false,
  htmlFor,
}: {
  children: ReactNode;
  active?: boolean;
  invalid?: boolean;
  invisible?: boolean;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`${labelClass} ${invalid ? "tw:text-error" : active ? "tw:text-gray-20" : "tw:text-gray-60"} ${invisible ? "tw:invisible" : ""}`}
    >
      {children}
    </label>
  );
}

export function HelpText({
  children,
  invalid = false,
  className = "",
}: {
  children: ReactNode;
  invalid?: boolean;
  className?: string;
}) {
  return (
    <p
      className={`${invalid ? "tw:text-error" : "tw:text-gray-60"} tw:font-stack-sans-text tw:text-sm tw:leading-[125%] tw:transition-colors ${className}`}
    >
      {children}
    </p>
  );
}
const controlClass =
  "tw:h-[57px] tw:w-full tw:border-[3px] tw:text-[20px]! tw:border-gray-60 tw:hover:border-gray-20 tw:transition-colors tw:bg-transparent tw:px-[20px] tw:py-[16px] tw:font-stack-sans-text tw:text-cream-primary tw:placeholder:text-gray-60 tw:focus:outline-none tw:focus:border-cream-primary";

export function TextInput({
  className = "",
  onChange,
  onFocus,
  onBlur,
  defaultValue,
  value,
  label,
  invalid = false,
  hint = "",
  invalidHint = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  invalid?: boolean;
  hint?: string;
  invalidHint?: string;
}) {
  const [hasValue, setHasValue] = useState(!!(value ?? defaultValue));
  const [isFocused, setIsFocused] = useState(false);

  return (
    <FieldGroup>
      {label && (
        <FieldLabel active={hasValue || isFocused} invalid={invalid}>
          {label}
        </FieldLabel>
      )}
      <input
        className={`${controlClass} ${invalid ? "tw:!border-error" : hasValue || isFocused ? "tw:!border-gray-20" : ""} ${className}`}
        defaultValue={defaultValue}
        value={value}
        onChange={(e) => {
          setHasValue(!!e.target.value);
          onChange?.(e);
        }}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {(hint || invalidHint) && <HelpText invalid={invalid}>{invalid ? invalidHint : hint}</HelpText>}
    </FieldGroup>
  );
}
TextInput.displayName = "TextInput";

export function TextArea({
  className = "",
  onChange,
  onFocus,
  onBlur,
  defaultValue,
  value,
  label,
  invalid = false,
  hint = "",
  invalidHint = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  invalid?: boolean;
  hint?: string;
  invalidHint?: string;
}) {
  const [hasValue, setHasValue] = useState(!!(value ?? defaultValue));
  const [isFocused, setIsFocused] = useState(false);

  return (
    <FieldGroup className="tw:group">
      {label && (
        <FieldLabel active={hasValue || isFocused} invalid={invalid}>
          {label}
        </FieldLabel>
      )}
      <textarea
        className={`${controlClass} tw:h-auto tw:resize-y ${invalid ? "tw:!border-error" : hasValue || isFocused ? "tw:!border-gray-20" : ""} ${className}`}
        defaultValue={defaultValue}
        value={value}
        onChange={(e) => {
          setHasValue(!!e.target.value);
          onChange?.(e);
        }}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {hint && <HelpText invalid={invalid}>{invalid ? invalidHint : hint}</HelpText>}
    </FieldGroup>
  );
}

export function AlertBanner({
  variant = "danger",
  children,
}: {
  variant?: "danger" | "warning";
  children: ReactNode;
}) {
  const styles = variant === "danger" ? "tw:text-error" : "tw:text-gold-75";
  return (
    <div role="alert" className={`tw:font-stack-sans-text tw:text-sm ${styles}`}>
      {children}
    </div>
  );
}

export function Button({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tw:flex-1 tw:cursor-pointer tw:border-[3px] tw:px-5 tw:py-[12px] tw:text-center tw:transition-colors  ${
        active
          ? "tw:border-cloud tw:text-black tw:bg-cloud"
          : "tw:border-gray-60 tw:text-gray-60 tw:hover:border-cloud tw:hover:text-cloud"
      }`}
    >
      <span className="tw:font-sometype-mono tw:text-[20px]! tw:uppercase tw:font-[500]">{children}</span>
    </button>
  );
}

export function SubmitButton({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="tw:mt-3 tw:cursor-pointer tw:font-bold tw:bg-cloud tw:px-6 tw:py-3 tw:font-sometype-mono! tw:uppercase! tw:tracking-[0.6px] tw:text-black tw:transition-colors tw:disabled:cursor-not-allowed tw:disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function Checkbox({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  checked?: boolean;
  disabled?: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <label
      htmlFor={id}
      className={`tw:group tw:flex! tw:items-center tw:gap-4 tw:font-stack-sans-text tw:text-cream-primary ${
        disabled ? "tw:cursor-not-allowed tw:opacity-50" : "tw:cursor-pointer"
      }`}
    >
      <span className="tw:relative tw:flex! tw:h-8 tw:w-8 tw:shrink-0 tw:items-center tw:justify-center tw:border-3 tw:border-gray-60 tw:transition-colors tw:group-has-[:checked]:border-[#D6D8D9] tw:hover:border-[#D6D8D9] tw:group-has-[:checked]:bg-[#D6D8D9]">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className="tw:peer tw:absolute tw:inset-0 tw:h-full tw:w-full tw:cursor-pointer tw:opacity-0 tw:disabled:cursor-not-allowed"
        />
        <svg
          width="18"
          height="14"
          viewBox="0 0 18 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="tw:pointer-events-none tw:invisible tw:text-teal-primary tw:peer-checked:visible"
        >
          <path
            d="M1 7l5 5L17 1"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="tw:text-[20px]! tw:text-gray-60 tw:group-has-[:checked]:text-cloud">{label}</span>
    </label>
  );
}

export function SwitchField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <label
      htmlFor={id}
      className="tw:flex tw:cursor-pointer tw:items-center tw:gap-3 tw:font-stack-sans-text tw:text-cream-primary"
    >
      <span className="tw:relative tw:inline-block tw:h-6 tw:w-11 tw:shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="tw:peer tw:sr-only"
        />
        <span className="tw:absolute tw:inset-0 tw:rounded-full tw:bg-gray-60 tw:transition-colors tw:peer-checked:bg-teal-secondary" />
        <span className="tw:absolute tw:top-0.5 tw:left-0.5 tw:h-5 tw:w-5 tw:rounded-full tw:bg-cream-primary tw:transition-transform tw:peer-checked:translate-x-5" />
      </span>
      {label}
    </label>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="tw:shrink-0"
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SelectField({
  name,
  value,
  onValueChange,
  required,
  label,
  invalid = false,
  placeholder = "Select",
  options,
}: {
  name?: string;
  value: string;
  onValueChange: (value: string) => void;
  required?: boolean;
  label?: string;
  invalid?: boolean;
  placeholder?: string;
  options: { value: string; label: string }[];
}) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = !!value;

  return (
    <FieldGroup>
      {label && (
        <FieldLabel active={hasValue || isFocused} invalid={invalid}>
          {label}
        </FieldLabel>
      )}
      <SelectPrimitive.Root
        name={name}
        value={value}
        onValueChange={onValueChange}
        onOpenChange={setIsFocused}
        required={required}
      >
        <SelectPrimitive.Trigger
          className={`${controlClass} tw:flex tw:cursor-pointer tw:items-center tw:justify-between tw:data-[placeholder]:text-gray-60 ${invalid ? "tw:!border-error" : hasValue || isFocused ? "tw:!border-gray-20" : ""}`}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon className="tw:ml-3 tw:text-gray-60">
            <ChevronIcon />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className="tw:z-50 tw:w-[var(--radix-select-trigger-width)] tw:border-[3px] tw:border-gray-20 tw:bg-[#08090A] tw:font-stack-sans-text"
          >
            <SelectPrimitive.Viewport>
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="tw:cursor-pointer tw:px-5 tw:py-3 tw:text-gray-60 tw:outline-none tw:text-[20px]! tw:transition-colors tw:data-[highlighted]:text-gray-20 tw:data-[state=checked]:text-gray-20"
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </FieldGroup>
  );
}
