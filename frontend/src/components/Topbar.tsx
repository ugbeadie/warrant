import { NotificationBell } from "./NotificationBell";

interface TopbarProps {
  onMenuClick: () => void;
}

export const Topbar = ({ onMenuClick }: TopbarProps) => {
  return (
    <header className="sticky top-0 z-20 bg-bg/80 backdrop-blur border-b border-border-dark">
      <div className="flex items-center justify-between gap-4 px-4 lg:px-8 py-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden h-8 w-8 flex items-center justify-center text-on-dark-muted hover:text-on-dark transition shrink-0"
        >
          ☰
        </button>
        {/* //TODO:REMOVE SEARCH BAR AND PLACE BELL TO RIGHT */}
        <div className="flex-1 max-w-md">
          <div className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">
              ⌕
            </span>
            <input
              type="text"
              placeholder="Search resources, users..."
              className="w-full rounded-md border border-border-dark bg-surface-raised pl-9 pr-3 py-2 text-sm text-on-dark font-mono placeholder:text-on-dark-muted outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>
        <NotificationBell />
      </div>
    </header>
  );
};
