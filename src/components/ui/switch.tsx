import type * as React from "react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const switchVariants = cva(
  "peer rounded-full data-checked:bg-primary-t data-unchecked:bg-surface-a10 inline-flex shrink-0 items-center transition-all outline-none disabled:cursor-not-allowed disabled:bg-surface-a3",
  {
    variants: {
      size: {
        lg: "h-[24px] w-[40px]",
        md: "h-[20px] w-[34px]",
        sm: "h-[16px] w-[26px]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

const thumbVariants = cva(
  "bg-inverted-primary-t rounded-full pointer-events-none block ring-0 transition-transform data-unchecked:translate-x-[3px] peer-disabled:bg-surface-elastic-tab",
  {
    variants: {
      size: {
        lg: "size-[18px] data-checked:translate-x-[calc(100%+1px)]",
        md: "size-[14px] data-checked:translate-x-[calc(100%+3px)]",
        sm: "size-[10px] data-checked:translate-x-[calc(100%+3px)]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

type SwitchProps = React.ComponentProps<typeof SwitchPrimitive.Root> &
  VariantProps<typeof switchVariants>;

function Switch({ className, size, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(switchVariants({ size, className }))}
      {...props}
    >
      <SwitchPrimitive.Thumb data-slot="switch-thumb" className={cn(thumbVariants({ size }))} />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
