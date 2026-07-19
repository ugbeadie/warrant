import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "▤" },
  { to: "/resources", label: "Resources", icon: "◆" },
  { to: "/my-access", label: "My Access", icon: "⚿" },
  { to: "/approvals", label: "Approvals", icon: "✓" },
  { to: "/groups", label: "Groups", icon: "◈" },
  { to: "/audit-log", label: "Audit Log", icon: "≡" },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar = ({ mobileOpen, onMobileClose }: SidebarProps) => {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const navItems =
    user?.role === "ADMIN"
      ? [...NAV_ITEMS, { to: "/admin", label: "Admin", icon: "⚙" }]
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
        <div className="flex items-center justify-between px-4 py-5 border-b border-border-dark">
          {!collapsed && (
            <span className="flex items-center gap-2 text-sm font-semibold text-on-dark font-mono tracking-widest uppercase">
              <Shield className="h-5 w-5 text-brand" />
              Warrant
            </span>
          )}
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className="hidden lg:flex h-6 w-6 items-center justify-center text-on-dark-muted cursor-pointer hover:text-on-dark transition"
          >
            {collapsed ? "»" : "«"}
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
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-mono transition
                ${isActive ? "bg-brand text-white" : "text-on-dark-muted hover:bg-border-dark hover:text-on-dark"}`
              }
            >
              <span className="text-base w-4 text-center shrink-0">
                {item.icon}
              </span>
              {!collapsed && (
                <span className="tracking-wide">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-2 py-4 border-t border-border-dark">
          <div
            className={`flex items-center gap-3 px-3 py-2 ${collapsed ? "justify-center" : ""}`}
          >
            <span className="h-7 w-7 rounded-full bg-border-dark flex items-center justify-center text-xs font-mono text-on-dark shrink-0">
              {user?.username?.[0]?.toUpperCase()}
            </span>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs text-on-dark truncate font-mono">
                  {user?.username}
                </p>
                <button
                  onClick={logout}
                  className="text-[11px] text-on-dark-muted hover:text-danger transition"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
