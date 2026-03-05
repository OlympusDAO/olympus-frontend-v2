import type * as React from "react";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center justify-center w-full", {
  variants: {
    variant: {
      filled: "rounded-full font-semibold w-max  text-center",
      ghost: "border text-[10px]/[14px] font-medium rounded-full  w-max",
    },
    color: {
      orange: "",
      blue: "",
      green: "",
      red: "",
      gray: "",
    },
    size: {
      sm: "h-5 py-[3px] px-[6px] text-[10px]/[14px]",
      md: "h-5 py-[2px] px-[8px] text-[12px]/[16px]",
      lg: "h-6 py-[2px] px-[8px] text-[15px]/[20px]",
    },
  },
  defaultVariants: {
    variant: "filled",
    color: "orange",
    size: "sm",
  },
  compoundVariants: [
    {
      variant: "filled",
      color: "orange",
      className: "bg-yellow/20 text-yellow",
    },
    {
      variant: "filled",
      color: "blue",
      className: "bg-blue/20 text-blue",
    },
    {
      variant: "filled",
      color: "green",
      className: "bg-green/20 text-green",
    },
    {
      variant: "filled",
      color: "red",
      className: "bg-red/20 text-red",
    },
    {
      variant: "filled",
      color: "gray",
      className: "bg-surface-a5 text-secondary-t",
    },
    {
      variant: "ghost",
      color: "orange",
      className: "border-orange/20 text-orange",
    },
    {
      variant: "ghost",
      color: "blue",
      className: "border-blue/20 text-blue",
    },
    {
      variant: "ghost",
      color: "green",
      className: "border-green/20 text-green",
    },
    {
      variant: "ghost",
      color: "red",
      className: "border-red/20 text-red",
    },
    {
      variant: "ghost",
      color: "gray",
      className: "border-surface-a10 text-secondary-t",
    },
  ],
});

function Badge({
  className,
  variant,
  color,
  size,
  render,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { render?: React.ReactElement }) {
  return useRender({
    defaultTagName: "span",
    render,
    props: {
      "data-slot": "badge",
      className: cn(badgeVariants({ variant, color, size }), className),
      ...props,
    },
  });
}

export { Badge, badgeVariants };
