import { twMerge } from "tailwind-merge";

type SegmentedToggleOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedToggleProps<T extends string> = {
  options: SegmentedToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/**
 * A pill-shaped toggle that switches between a small set of options, highlighting the selected one
 */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedToggleProps<T>) {
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <div
      role="radiogroup"
      className={twMerge(
        "tw:inline-flex tw:p-1 tw:rounded-lg tw:border-gray-400 tw:border tw:select-none",
        className,
      )}
    >
      <div
        className="tw:relative tw:grid"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {/* indicator */}
        <div
          className="tw:absolute tw:inset-y-0 tw:left-0 tw:rounded-lg tw:bg-blue-600 tw:transition-transform tw:duration-200 tw:ease-out"
          style={{
            width: `${100 / options.length}%`,
            transform: `translateX(${selectedIndex * 100}%)`,
          }}
        />
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={twMerge(
                "tw:relative tw:px-4! tw:py-1! tw:rounded-lg! tw:border-0! tw:bg-transparent! tw:whitespace-nowrap tw:transition-colors tw:duration-200",
                selected ? "tw:text-cloud!" : "tw:hover:text-blue-600!",
              )}
              onClick={() => {
                if (!selected) onChange(option.value);
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
