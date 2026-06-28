import type { HTMLAttributes } from "react";
import "./PageContainer.css";

interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** Use a narrower max-width (680 px) — good for feed / detail pages */
  narrow?: boolean;
}

export function PageContainer({
  narrow = false,
  className = "",
  children,
  ...rest
}: PageContainerProps) {
  const cls = [
    "page-container",
    narrow && "page-container--narrow",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}
