import { Card } from "@/components/ui/card.tsx";
import { TooltipInfo } from "@/components/ui/tooltip.tsx";
import { NumberFlow } from "@/components/ui/number-flow.tsx";
import engageDarkImg from "@/assets/engage-dark.png";
import engageLightImg from "@/assets/engage-light.png";
import { ColorModeImage } from "@/components/color-mode-wrapper.tsx";
import { Icon } from "@/components/icon.tsx";

export const EngageStats = () => {
  return (
    <Card className="p-6 h-full flex flex-col">
      <div className="flex items-start justify-between relative">
        <div>
          <div className="flex items-center mb-4 gap-x-3">
            <p className="text-[20px]/[24px] font-semibold">Epoch 4</p>
            <div className="border rounded-full border-a5-b px-2 py-0.5 bg-surface-a5 flex items-center gap-x-1">
              <p className="text-secondary-t text-[15px]/[20px] font-normal">Next in</p>
              <p className=" text-[15px]/[20px]">2d : 14h : 24m</p>
            </div>
          </div>
          <div>
            <p className="text-[18px]/[24px] font-semibold mb-2">How to Get Started</p>
            <div className="max-w-73.5 pb-6">
              <div className="flex items-start gap-x-2 mb-1">
                <div className=" rounded-full border border-disabled-t min-w-4.5 h-5 flex items-center justify-center">
                  <p className="text-[9px]/[16px] font-bold">1</p>
                </div>
                <p className="text-[15px]/[20px] text-secondary-t font-normal">
                  Deposit in Convertible Deposits to accumulate Drachmas daily.
                </p>
              </div>
              <div className="flex items-start gap-x-2 mb-1">
                <div className="px-1.25 rounded-full border border-disabled-t min-w-4.5 h-5 flex items-center justify-center">
                  <p className="text-[9px]/[16px] font-bold">2</p>
                </div>
                <p className="text-[15px]/[20px] text-secondary-t font-normal">
                  At epoch end, your Drachma share determines your iOHM allocation.
                </p>
              </div>
              <div className="flex items-start gap-x-2 mb-1">
                <div className="px-1.25 rounded-full border border-disabled-t min-w-4.5 h-5 flex items-center justify-center">
                  <p className="text-[9px]/[16px] font-bold">3</p>
                </div>
                <p className="text-[15px]/[20px] text-secondary-t font-normal">
                  Claim and convert iOHM anytime during the conversion period.
                </p>
              </div>
            </div>
          </div>
        </div>
        <ColorModeImage
          className="absolute -top-10 -right-10 w-105"
          srcLight={engageLightImg}
          srcDark={engageDarkImg}
          alt="engage"
        />
      </div>
      <div className="mt-auto">
        <div className="my-4 w-full h-px bg-[linear-gradient(90deg,transparent_0%,var(--surface-a10)_10%,var(--surface-a10)_90%,transparent_100%)]" />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex-1">
            <p className="text-secondary-t text-[15px]/[20px] mb-1 font-semibold">Drachmas</p>
            <div className="flex items-center gap-x-1.5 mb-2">
              <Icon name="drachmaTokenIcon" className="size-6" />
              <NumberFlow
                value={24_241_245}
                format={{ style: "decimal", notation: "standard" }}
                className="text-[18px]/[24px] font-semibold"
              />
            </div>
            <p className="text-secondary-t text-[15px]/[20px] font-normal">By all participants</p>
          </div>
          <div className="flex-1">
            <TooltipInfo title="Drachma Accrual">Drachma Accrual</TooltipInfo>

            <p className="text-[18px]/[24px] font-semibold">Daily</p>
            <p className="text-secondary-t text-[15px]/[20px] font-normal">11:59 PM EST</p>
          </div>
          <div className="flex-1">
            <TooltipInfo title="Distribution">Distribution</TooltipInfo>
            <p className="text-[18px]/[24px] font-semibold">Weekly</p>
            <p className="text-secondary-t text-[15px]/[20px] font-normal">Mon-Wed</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
