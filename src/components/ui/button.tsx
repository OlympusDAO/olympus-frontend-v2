import type * as React from "react";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full font-semibold transition-all cursor-pointer disabled:pointer-events-none disabled:bg-surface-a5 disabled:text-disabled-t disabled:shadow-none [&_svg]:pointer-events-none  shrink-0 [&_svg]:shrink-0 outline-none  aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-surface-button-primary text-inverted-primary-t shadow-button-primary hover:bg-surface-button-primary-hover",
        secondary:
          "bg-surface-button-secondary shadow-button-secondary text-primary-t hover:bg-surface-button-secondary-hover",
        tertiary: "text-primary-t hover:bg-surface-a5",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        xs: "text-[12px]/[16px] h-[24px] gap-[6px] px-[12px] has-[>svg]:px-[6px] [&_svg:not([class*='size-'])]:size-[12px]",
        sm: "text-[12px]/[16px] h-[32px] gap-[8px] px-[12px] has-[>svg]:px-[8px] [&_svg:not([class*='size-'])]:size-[16px]",
        md: "text-[15px]/[20px] h-[40px] px-[12px] py-2.5 has-[>svg]:px-[10px] gap-[8px] [&_svg:not([class*='size-'])]:size-[20px]",
        lg: "text-[18px]/[24px] h-[48px] px-[20px] has-[>svg]:px-[12px] gap-[10px] [&_svg:not([class*='size-'])]:size-[24px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

function Button({
  className,
  variant,
  size,
  render,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    render?: React.ReactElement;
  }) {
  return useRender({
    defaultTagName: "button",
    render,
    props: {
      "data-slot": "button",
      className: cn(buttonVariants({ variant, size, className })),
      ...props,
    },
  });
}

export { Button, buttonVariants };
