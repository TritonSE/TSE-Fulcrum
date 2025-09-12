export type Variant = "success" | "danger" | "warning";

interface AlertProps {
  className?: string;
  variant: Variant;
  onClose?: () => void;
  children: React.ReactNode;
}

export default function Alert({ variant, className, onClose, children }: AlertProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case "success":
        return "tw:bg-green-50 tw:border-green-200 tw:text-green-800";
      case "danger":
        return "tw:bg-red-50 tw:border-red-200 tw:text-red-800";
      case "warning":
        return "tw:bg-yellow-50 tw:border-yellow-200 tw:text-yellow-800";
      default:
        return "tw:bg-gray-50 tw:border-gray-200 tw:text-gray-800";
    }
  };

  return (
    <div
      className={`
        tw:px-4 tw:py-3 tw:mb-4 tw:border tw:rounded-md tw:relative tw:w-100
        ${getVariantClasses()}
        ${className || ""}
      `}
      role="alert"
    >
      {children}
      {onClose && (
        <button
          type="button"
          className="tw:absolute tw:top-1 tw:right-2 tw:text-lg tw:font-bold tw:leading-none tw:bg-transparent tw:border-0 tw:cursor-pointer tw:opacity-50 hover:tw:opacity-75"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      )}
    </div>
  );
}
