import type React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Card = ({ children, className = "", ...props }: CardProps) => {
  return (
    <div
      className={`bg-surface-bg-l2 shadow-[var(--shadow-card)] dark:shadow-[var(--shadow-card-dark)] rounded-3xl ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
