import type * as React from "react";

import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";

const alertVariants = cva(
  "relative w-full border w-max grid grid-cols-[0_1fr] has-[>svg]:gap-x-[8px] gap-y-[4px] items-start [&>svg]:size-4 [&>svg]:text-current [&>svg]:self-center",
  {
    variants: {
      variant: {
        default: "",
        compact: "",
      },
      size: {
        md: "",
        sm: "",
      },
      type: {
        info: "",
        warning: "",
        error: "",
        success: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
    compoundVariants: [
      {
        variant: "default",
        size: "md",
        className: "p-[12px] has-[>svg]:grid-cols-[1rem_1fr] rounded-[16px]",
      },
      {
        variant: "default",
        size: "sm",
        className: "p-[8px] has-[>svg]:grid-cols-[1rem_1fr] rounded-[16px]",
      },
      {
        variant: "compact",
        size: "md",
        className: "py-[10px] px-[16px] has-[>svg]:grid-cols-[1rem_1fr] rounded-full",
      },
      {
        variant: "compact",
        size: "sm",
        className: "py-[8px] px-[12px] has-[>svg]:grid-cols-[1rem_1fr] rounded-full",
      },
      {
        type: "info",
        className: "bg-blue/10 border-blue/5 [&>svg]:text-blue",
      },
      {
        type: "warning",
        className: "bg-orange/10 border-orange/5 [&>svg]:text-orange",
      },
      {
        type: "error",
        className: "bg-red/10 border-red/5 [&>svg]:text-red",
      },
      {
        type: "success",
        className: "bg-green/10 border-green/5 [&>svg]:text-green",
      },
    ],
  },
);

function Alert({
  className,
  variant,
  size,
  type,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant, size, type }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "text-primary-t col-start-2 min-h-1 text-[15px]/[20px] font-semibold",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-secondary-t col-start-2 grid justify-items-start gap-4 text-[15px]/[20px] font-normal [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
