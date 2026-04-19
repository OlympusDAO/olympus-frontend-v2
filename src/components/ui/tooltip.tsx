import * as React from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { cn } from "@/lib/utils";
import { RiInformationLine } from "@remixicon/react";
import { useIsMobile } from "@/lib/hooks/use-mobile.ts";

function TooltipProvider({ delay = 0, ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} {...props} />;
}
function TooltipCore({ ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}
function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "bg-surface-tooltip shadow-tooltip text-sm/5 font-medium text-primary-t data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 rounded-[20px] px-3 py-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2 z-50 w-fit max-w-60 origin-(--transform-origin)",
            className,
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

interface ITooltipProps
  extends Omit<React.ComponentPropsWithoutRef<typeof TooltipCore>, "children"> {
  children?: React.ReactNode;
  title: React.ReactNode;
  triggerProps?: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>;
  contentProps?: React.ComponentProps<typeof TooltipContent>;
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
          className={cn("font-normal max-w-[250px] text-center", classNameContent)}
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
      <span className={cn(className, "text-secondary-t font-semibold")}>{children}</span>
      <Tooltip
        classNameContent={classNameContent}
        triggerProps={triggerProps}
        title={title}
        contentProps={contentProps}
        {...props}
      >
        <RiInformationLine
          size={16}
          className="cursor-pointer text-tertiary-t transition-colors hover:text-secondary-t"
        />
      </Tooltip>
    </div>
  );
}

export { TooltipCore, TooltipTrigger, TooltipContent, TooltipProvider, Tooltip, TooltipInfo };
