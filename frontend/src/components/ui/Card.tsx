import type { HTMLAttributes, ElementType } from "react";
import "./Card.css";

interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Adds a hover lift/shadow effect */
  hoverable?: boolean;
  /** HTML element to render as (default: "div") */
  as?: ElementType;
}

export function Card({
  hoverable = false,
  as: Tag = "div",
  className = "",
  children,
  ...rest
}: CardProps) {
  const cls = [
    "card",
    hoverable && "card--hoverable",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  );
}
