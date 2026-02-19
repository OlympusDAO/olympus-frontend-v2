import { Outlet } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { IconSidebar } from "@/layouts/IconSidebar";
import { SubNav } from "@/layouts/SubNav";
import { Header } from "@/layouts/Header";

export default function AppLayout() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="olympus-theme">
      <div className="flex h-screen bg-surface-bg-l1 overflow-hidden">
        {/* Desktop sidebars — hidden on mobile */}
        <div className="hidden md:flex">
          <IconSidebar />
        </div>
        <div className="hidden md:flex">
          <SubNav />
        </div>
        <main className="flex-1 min-w-0 flex flex-col overflow-y-auto bg-surface-bg-l1">
          <Header />
          <div className="flex-1 px-4 pb-4 md:px-8 md:pb-8">
            <Outlet />
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
