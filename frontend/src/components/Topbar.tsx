import { useLocation } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";

interface TopbarProps {
  onMenuClick: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/resources": "Resources",
  "/my-access": "My Access",
  "/approvals": "Approvals",
  "/groups": "Groups",
  "/audit-log": "Audit Log",
  "/admin": "Admin",
};

const getPageTitle = (pathname: string): string => {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/resources/")) return "Resource Detail";
  if (pathname.startsWith("/groups/")) return "Group Detail";
  return "";
};

export const Topbar = ({ onMenuClick }: TopbarProps) => {
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  return (
    <header className="sticky top-0 z-20 bg-bg/80 backdrop-blur border-b border-border-dark">
      <div className="flex items-center justify-between gap-4 px-4 lg:px-8 py-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden h-8 w-8 flex items-center justify-center text-on-dark-muted cursor-pointer hover:text-on-dark transition shrink-0"
        >
          ☰
        </button>
        <div className="flex-1">
          {pageTitle && (
            <p className="text-sm font-mono uppercase tracking-widest text-on-dark-muted">
              {pageTitle}
            </p>
          )}
        </div>
        <NotificationBell />
      </div>
    </header>
  );
};
