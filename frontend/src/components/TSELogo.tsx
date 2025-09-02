import { ReactNode } from "react";

interface TSELogoProps {
  msg: string;
  children?: ReactNode;
}

/**
 * Displays the TSE lightbulb logo along with text and content below it
 */
function TSELogo({ msg, children }: TSELogoProps) {
  return (
    <div className="tw:flex tw:items-center tw:justify-center tw:min-h-screen tw:bg-teal-primary tw:text-cream-primary">
      <div className="tw:min-w-[320px] tw:flex tw:flex-col tw:gap-2">
        <h1 className="tw:flex tw:flex-col tw:items-center tw:gap-3">
          <img width="64" height="64" src="/logo512.png" alt="TSE logo" />
          {msg}
        </h1>
        {children ?? null}
      </div>
    </div>
  );
}

TSELogo.defaultProps = {
  children: undefined,
};

export default TSELogo;
