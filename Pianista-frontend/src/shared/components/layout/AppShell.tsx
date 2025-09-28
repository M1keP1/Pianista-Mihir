import { useState, type PropsWithChildren, type ReactNode } from "react";
import { NavLink } from "react-router-dom";

import BrandLogo from "@/shared/components/VS_BrandButton";
import ThemeSwitcherFab from "@/shared/components/themeSwitcher";
import PianistaFooter from "@/shared/components/footer";

export type AppShellTab = {
  to: string;
  label: string;
  icon: ReactNode;
};

export type AppShellProps = PropsWithChildren<{
  tabs: AppShellTab[];
  pastChatsSlot?: ReactNode;
  footerSlot?: ReactNode;
}>;

function cx(...parts: Array<string | undefined | false | null>) {
  return parts.filter(Boolean).join(" ");
}

export default function AppShell({
  tabs,
  children,
  pastChatsSlot,
  footerSlot,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={cx("app-shell", collapsed && "is-collapsed")}>
      <aside className="app-shell__pane" aria-label="Primary navigation">
        <div className="app-shell__brand-row">
          <BrandLogo size={72} className="app-shell__brand-button" />
          <button
            type="button"
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            aria-expanded={!collapsed}
            className="app-shell__collapse"
            onClick={() => setCollapsed((v) => !v)}
          >
            <span aria-hidden>{collapsed ? "⟩" : "⟨"}</span>
          </button>
        </div>

        <nav className="app-shell__nav">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cx("app-shell__tab", isActive && "is-active")
              }
              title={tab.label}
            >
              <span className="app-shell__tab-icon" aria-hidden>
                {tab.icon}
              </span>
              <span className="app-shell__tab-label">{tab.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="app-shell__past-chats">
          <span className="app-shell__section-title">Past Chats</span>
          {pastChatsSlot ?? (
            <div className="app-shell__past-placeholder" aria-hidden>
              Conversation history will live here soon.
            </div>
          )}
        </div>

        <div className="app-shell__pane-footer">
          <ThemeSwitcherFab variant="pane" />
        </div>
      </aside>

      <div className="app-shell__body">
        <main className="app-shell__content">{children}</main>
        <div className="app-shell__footer">
          {footerSlot ?? <PianistaFooter variant="inline" />}
        </div>
      </div>
    </div>
  );
}
