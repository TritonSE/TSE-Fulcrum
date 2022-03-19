import { HTMLAttributes } from "react";

function CenteredPaddedBox({ style, children }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
        ...style,
      }}
    >
      <div>{children}</div>
    </div>
  );
}

export default CenteredPaddedBox;
