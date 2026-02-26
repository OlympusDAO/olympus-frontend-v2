import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ACTIVITY_TABS = [
  { value: "feed", label: "Activity", path: "/cooler/activity/feed" },
  { value: "accounts", label: "Accounts", path: "/cooler/activity/accounts" },
  { value: "active-loans", label: "Active Loans", path: "/cooler/activity/active-loans" },
  { value: "defaulted-loans", label: "Defaulted Loans", path: "/cooler/activity/defaulted-loans" },
] as const;

function getActiveTab(pathname: string): string {
  const match = ACTIVITY_TABS.find((tab) => pathname === tab.path);
  return match?.value ?? "feed";
}

export function CoolerActivityLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getActiveTab(location.pathname);

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const tab = ACTIVITY_TABS.find((t) => t.value === value);
          if (tab) navigate(tab.path);
        }}
      >
        <TabsList className="rounded-full w-fit">
          {ACTIVITY_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="rounded-full">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Outlet />
    </div>
  );
}
