import React from "react";
import "./BottomTabBar.css";

export type TabId = "home" | "stats" | "tournaments" | "profile";

export interface TabBadge {
  tabId: TabId;
  count: number;
}

interface BottomTabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  badges?: TabBadge[];
}

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: "home", icon: "🏠", label: "Início" },
  { id: "stats", icon: "📊", label: "Stats" },
  { id: "tournaments", icon: "🏆", label: "Torneios" },
  { id: "profile", icon: "👤", label: "Perfil" },
];

const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onTabChange,
  badges = [],
}) => {
  const getBadgeCount = (tabId: TabId): number => {
    const badge = badges.find((b) => b.tabId === tabId);
    return badge?.count ?? 0;
  };

  return (
    <nav className="bottom-tab-bar" data-testid="bottom-tab-bar" role="tablist">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const badgeCount = getBadgeCount(tab.id);

        return (
          <button
            key={tab.id}
            className={`bottom-tab-item${isActive ? " bottom-tab-item--active" : ""}`}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            aria-selected={isActive}
            aria-label={tab.label}
            data-testid={`tab-${tab.id}`}
          >
            <span className="bottom-tab-icon">{tab.icon}</span>
            <span className="bottom-tab-label">{tab.label}</span>
            {badgeCount > 0 && (
              <span
                className="bottom-tab-badge"
                data-testid={`badge-${tab.id}`}
              >
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default BottomTabBar;
