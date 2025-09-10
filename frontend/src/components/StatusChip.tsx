interface StatusChipProps {
  color: string;
  text: string;
}

/**
 * A chip that displays an applicant/review status, given the provided color and text
 */
export function StatusChip({ color, text }: StatusChipProps) {
  return (
    <div
      className="tw:px-2 tw:py-1 tw:rounded-2xl tw:w-fit tw:whitespace-nowrap"
      style={{
        color,
        border: `1px solid ${color}`,
      }}
    >
      {text}
    </div>
  );
}
