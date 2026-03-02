import React from "react";
import "./FilterChips.css";

export type MatchFilter = "all" | "live" | "finished" | "pending";

interface FilterChipsProps {
  activeFilter: MatchFilter;
  onFilterChange: (filter: MatchFilter) => void;
  counts: Record<MatchFilter, number>;
}

const FILTERS: { id: MatchFilter; label: string; liveStyle?: boolean }[] = [
  { id: "all", label: "Todas" },
  { id: "live", label: "🔴 Ao Vivo", liveStyle: true },
  { id: "finished", label: "Finalizadas" },
  { id: "pending", label: "Aguardando" },
];

const FilterChips: React.FC<FilterChipsProps> = ({
  activeFilter,
  onFilterChange,
  counts,
}) => {
  return (
    <div className="filter-chips" data-testid="filter-chips" role="tablist">
      {FILTERS.map((filter) => {
        const isActive = activeFilter === filter.id;
        const count = counts[filter.id];

        return (
          <button
            key={filter.id}
            className={[
              "filter-chip",
              isActive ? "filter-chip--active" : "",
              filter.liveStyle ? "filter-chip--live" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onFilterChange(filter.id)}
            role="tab"
            aria-selected={isActive}
            data-testid={`filter-${filter.id}`}
          >
            {filter.label}
            {count > 0 && <span className="filter-chip-count">({count})</span>}
          </button>
        );
      })}
    </div>
  );
};

export default FilterChips;
