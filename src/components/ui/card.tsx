import type React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const Card = ({ children, className = "", ...props }: CardProps) => {
  return (
    <div className={`bg-surface-bg-l2 shadow-surface-level-2 rounded-3xl ${className}`} {...props}>
      {children}
    </div>
  );
};
