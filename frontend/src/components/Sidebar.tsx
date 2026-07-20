import { NavLink } from "react-router-dom";
import {
  Shield,
  CircleArrowLeft,
  CircleArrowRight,
  LayoutDashboard,
  Database,
  Key,
  CircleCheck,
  Users,
  History,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
  { to: "/resources", label: "Resources", icon: <Database size={16} /> },
  { to: "/my-access", label: "My Access", icon: <Key size={16} /> },
  { to: "/approvals", label: "Approvals", icon: <CircleCheck size={16} /> },
  { to: "/groups", label: "Groups", icon: <Users size={16} /> },
  { to: "/audit-log", label: "Audit Log", icon: <History size={16} /> },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export const Sidebar = ({
  mobileOpen,
  onMobileClose,
  collapsed,
  onToggleCollapsed,
}: SidebarProps) => {
  const { user, logout } = useAuth();

  const navItems =
    user?.role === "ADMIN"
      ? [
          ...NAV_ITEMS,
          { to: "/admin", label: "Admin", icon: <Settings size={16} /> },
        ]
      : NAV_ITEMS;

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 h-screen bg-surface-raised border-r border-border-dark z-40 flex flex-col transition-all duration-200
          ${collapsed ? "lg:w-16" : "lg:w-60"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          w-60`}
      >
        <div
          className={`flex items-center justify-between py-5 border-b border-border-dark px-4 ${
            collapsed ? "lg:justify-center lg:px-2" : ""
          }`}
        >
          <span
            className={`flex items-center gap-2 text-sm font-semibold text-on-dark font-mono tracking-widest uppercase ${
              collapsed ? "lg:hidden" : ""
            }`}
          >
            <Shield className="h-5 w-5 text-brand" />
            Warrant
          </span>
          <button
            onClick={onToggleCollapsed}
            className="hidden lg:flex h-6 w-6 items-center justify-center text-on-dark-muted cursor-pointer hover:text-on-dark transition"
          >
            {collapsed ? (
              <CircleArrowRight className="h-5 w-5" />
            ) : (
              <CircleArrowLeft className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={onMobileClose}
            className="lg:hidden h-6 w-6 flex items-center justify-center text-on-dark-muted hover:text-on-dark transition"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={onMobileClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md py-2 px-3 text-sm font-mono transition
                ${collapsed ? "lg:justify-center lg:px-0 lg:gap-0" : ""}
                ${
                  isActive
                    ? "bg-brand/10 text-brand"
                    : "text-on-dark-muted hover:bg-brand/10 hover:text-brand"
                }`
              }
            >
              <span className="text-base w-4 text-center shrink-0">
                {item.icon}
              </span>
              <span className={`tracking-wide ${collapsed ? "lg:hidden" : ""}`}>
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="px-2 py-4 border-t border-border-dark">
          <div
            className={`flex items-center gap-3 px-3 py-2 ${
              collapsed ? "lg:justify-center" : ""
            }`}
          >
            <span className="h-9 w-9 rounded-full bg-brand/10 text-brand flex items-center justify-center text-sm font-semibold shrink-0">
              {user?.username?.[0]?.toUpperCase()}
            </span>
            <div className={`min-w-0 flex-1 ${collapsed ? "lg:hidden" : ""}`}>
              <p className="text-sm text-on-dark font-medium truncate">
                {user?.username}
              </p>
              <p className="text-xs text-on-dark-muted truncate">
                {user?.email}
              </p>
            </div>
            <button
              onClick={logout}
              className={`shrink-0 text-on-dark-muted cursor-pointer hover:text-on-dark transition ${
                collapsed ? "lg:hidden" : ""
              }`}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
