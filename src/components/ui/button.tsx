import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  onNavigate?: () => void;
  variant?: "primary" | "secondary" | "destructive" | "light";
  children: ReactNode;
};
export function Button({
  href,
  onNavigate,
  variant = "primary",
  className = "",
  children,
  ...props
}: Props) {
  const classes = `button button-${variant} ${className}`;
  return href ? (
    <Link href={href} className={classes} onNavigate={onNavigate}>
      {children}
    </Link>
  ) : (
    <button {...props} className={classes}>
      {children}
    </button>
  );
}
