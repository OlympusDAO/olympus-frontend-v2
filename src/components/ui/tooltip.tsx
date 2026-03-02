import * as React from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { cn } from "@/lib/utils";
import { RiInformationFill } from "@remixicon/react";
import { useIsMobile } from "@/lib/hooks/use-mobile.ts";

function TooltipProvider({
  delay = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    />
  );
}

function TooltipCore({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 8,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Positioner> & {
  children?: React.ReactNode;
}) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className="z-50 w-max h-max origin-(--transform-origin)"
        {...props}
      >
        <TooltipPrimitive.Popup
          className={cn(
            "shadow-tooltip rounded-lg animate-in fade-in-0 zoom-in-95 data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            className
          )}
        >
          <div className="p-2 text-xs clip-corners-4 clip-border-4 after:bg-separator-bottom-b bg-surface-tooltip rounded-lg">
            {children}
          </div>
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

interface ITooltipProps
  extends React.ComponentPropsWithoutRef<typeof TooltipCore> {
  title: React.ReactNode;
  triggerProps?: React.ComponentPropsWithoutRef<
    typeof TooltipPrimitive.Trigger
  >;
  contentProps?: React.ComponentPropsWithoutRef<
    typeof TooltipPrimitive.Positioner
  >;
  classNameContent?: string;
  className?: string;
}

function Tooltip({
  children,
  title,
  triggerProps,
  classNameContent,
  contentProps,
  ...props
}: ITooltipProps) {
  const { isMobile } = useIsMobile();
  const [open, setOpen] = React.useState(false);

  const mobileProps = isMobile
    ? {
        open,
        onOpenChange: (nextOpen: boolean) => setOpen(nextOpen),
        ...props,
      }
    : props;

  const mobileTriggerProps = isMobile
    ? {
        onClick: (e: React.MouseEvent) => {
          e.preventDefault();
          setOpen(!open);
        },
        ...triggerProps,
      }
    : triggerProps;

  return (
    <TooltipProvider delay={100}>
      <TooltipCore {...mobileProps}>
        <TooltipTrigger render={<span className="inline-flex" />} {...mobileTriggerProps}>
          {children}
        </TooltipTrigger>
        <TooltipContent
          className={cn(
            "font-normal max-w-[250px] text-center",
            classNameContent
          )}
          {...contentProps}
        >
          {title}
        </TooltipContent>
      </TooltipCore>
    </TooltipProvider>
  );
}

function TooltipInfo({
  children,
  title,
  triggerProps,
  classNameContent,
  contentProps,
  className,
  ...props
}: ITooltipProps) {
  return (
    <div className="flex items-center gap-x-1">
      <p className={`${cn(className, "text-secondary-t")}`}>{children}</p>
      <Tooltip
        classNameContent={classNameContent}
        triggerProps={triggerProps}
        title={title}
        contentProps={contentProps}
        {...props}
      >
        <RiInformationFill
          size={16}
          className="cursor-pointer text-tertiary-t transition-colors hover:text-secondary-t"
        />
      </Tooltip>
    </div>
  );
}

export {
  TooltipCore,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  Tooltip,
  TooltipInfo,
};
