import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppColors,
  AppPalette,
  AppSpacing,
  NeoButton,
  NeoChip,
  NeoDialog,
  NeoImage,
  NeoRows,
  NeoStatBar,
  NeoTag,
  useColorScheme,
  useResponsive,
  WireFrame,
} from "../theme/AppTheme";

import shadowSoldier from "../assets/shadows/shadow-soldier.png";
import shadowArcher from "../assets/shadows/shadow-archer.png";
import shadowMage from "../assets/shadows/shadow-mage.png";
import shadowWolf from "../assets/shadows/shadow-wolf.png";
import shadowAnt from "../assets/shadows/shadow-ant.png";
import shadowGuard from "../assets/shadows/shadow-guard.png";
import igris from "../assets/shadows/igris.png";
import iron from "../assets/shadows/iron.png";
import tank from "../assets/shadows/tank.png";
import tusk from "../assets/shadows/tusk.png";
import baruka from "../assets/shadows/baruka.png";
import kaisel from "../assets/shadows/kaisel.png";
import bellion from "../assets/shadows/bellion.png";
import beru from "../assets/shadows/beru.png";
import kamish from "../assets/shadows/kamish.png";

type ViewMode = "grid" | "list";

// Shadow army ranks (tabs)
const CATEGORIES = ["soldier", "elite", "marshal"] as const;
const RANK_LABELS: Record<(typeof CATEGORIES)[number], string> = {
  soldier: "Soldiers",
  elite: "Elites",
  marshal: "Marshals",
};

// Combat class (type chips)
const KINDS = ["knight", "tank", "mage", "assassin", "beast"] as const;

// Race / origin (filter panel)
const ORIGINS = ["human", "beast", "insect", "dragon", "elf", "orc"] as const;
const FILTERS = ["default", ...ORIGINS] as const;

const SORT_LABELS = {
  default: "Default",
  id: "Id",
  name: "Name",
  category: "Rank",
} as const;

type Category = (typeof CATEGORIES)[number];
type Kind = (typeof KINDS)[number];
type Origin = (typeof ORIGINS)[number];
type Filter = (typeof FILTERS)[number];
type SortKey = keyof typeof SORT_LABELS;

const SORT_OPTIONS = (Object.keys(SORT_LABELS) as SortKey[]).map((value) => ({
  value,
  label: SORT_LABELS[value],
}));

const STAT_COLORS = [AppColors.coral, AppColors.mustard, AppColors.lime];
const STAT_LABELS = ["Attack", "Defense", "Mana"];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ==========================================
// SAMPLE DATA — Jin-Woo's Shadow Army
// ==========================================

interface Item {
  id: number;
  code: string;
  name: string;
  suffix: string;
  category: Category; // rank
  origin: Origin;
  type: Kind; // class
  stats: [number, number, number]; // attack, defense, mana
  level: number;
  description: string;
  image?: string;
}

const ITEMS: Item[] = [
  // ---- Soldiers ----
  { id: 1, code: "SHD-001", name: "Shadow Soldier", suffix: "Rank-and-file", category: "soldier", origin: "human", type: "knight", stats: [45, 40, 30], level: 10, description: "The backbone of the army. Weak alone, but terrifying when summoned in huge numbers.", image: shadowSoldier },
  { id: 2, code: "SHD-002", name: "Shadow Archer", suffix: "Ranged support", category: "soldier", origin: "human", type: "assassin", stats: [58, 25, 35], level: 12, description: "Picks off targets from a distance while the front line holds.", image: shadowArcher },
  { id: 3, code: "SHD-003", name: "Shadow Mage", suffix: "Spell caster", category: "soldier", origin: "human", type: "mage", stats: [60, 20, 72], level: 14, description: "Fragile, but backs up the soldiers with steady waves of dark magic.", image: shadowMage },
  { id: 4, code: "SHD-004", name: "Shadow Wolf", suffix: "Pack hunter", category: "soldier", origin: "beast", type: "beast", stats: [60, 32, 40], level: 13, description: "Fast and relentless. Hunts in packs and runs down fleeing enemies.", image: shadowWolf },
  { id: 5, code: "SHD-005", name: "Shadow Ant", suffix: "Swarm unit", category: "soldier", origin: "insect", type: "beast", stats: [52, 46, 28], level: 15, description: "Cheap, tough and numerous. Overwhelms targets by sheer volume.", image: shadowAnt },
  { id: 6, code: "SHD-006", name: "Shadow Guard", suffix: "Shield bearer", category: "soldier", origin: "human", type: "tank", stats: [30, 68, 42], level: 16, description: "Holds the line and protects the squishier shadows behind it.", image: shadowGuard },

  // ---- Elites ----
  { id: 7, code: "SHD-007", name: "Igris", suffix: "Blood-red Knight", category: "elite", origin: "human", type: "knight", stats: [92, 78, 60], level: 70, description: "Jin-Woo's most devoted knight, a swordsman who guards his master's back.", image: igris },
  { id: 8, code: "SHD-008", name: "Iron", suffix: "Heavy Vanguard", category: "elite", origin: "human", type: "tank", stats: [76, 88, 62], level: 60, description: "A brute-force frontliner who bulldozes through enemies with raw weight.", image: iron },
  { id: 9, code: "SHD-009", name: "Tank", suffix: "Bear Titan", category: "elite", origin: "beast", type: "tank", stats: [82, 92, 66], level: 62, description: "A giant bear with enormous strength and near-unshakable durability.", image: tank },
  { id: 10, code: "SHD-010", name: "Tusk", suffix: "High Orc Mage", category: "elite", origin: "orc", type: "mage", stats: [88, 55, 95], level: 75, description: "Orc spellcaster whose heavy magic can turn the tide of a battle.", image: tusk },
  { id: 11, code: "SHD-011", name: "Baruka", suffix: "Ice Elf", category: "elite", origin: "elf", type: "mage", stats: [85, 60, 92], level: 78, description: "A graceful elf who fights with a freezing, ice-based style.", image: baruka },
  { id: 12, code: "SHD-012", name: "Kaisel", suffix: "Sky Wyvern", category: "elite", origin: "dragon", type: "beast", stats: [86, 70, 80], level: 72, description: "A winged mount that carries Jin-Woo across the battlefield at speed.", image: kaisel },

  // ---- Marshals ----
  { id: 13, code: "SHD-013", name: "Bellion", suffix: "Grand Marshal", category: "marshal", origin: "human", type: "knight", stats: [99, 97, 92], level: 100, description: "The strongest shadow and the army's supreme commander.", image: bellion },
  { id: 14, code: "SHD-014", name: "Beru", suffix: "Ant King", category: "marshal", origin: "insect", type: "assassin", stats: [97, 85, 90], level: 95, description: "Ferocious, fast and fiercely loyal. A monarch-class fighter in his own right.", image: beru },
  { id: 15, code: "SHD-015", name: "Kamish", suffix: "Calamity Dragon", category: "marshal", origin: "dragon", type: "beast", stats: [98, 94, 88], level: 98, description: "A legendary dragon whose raw power once threatened entire nations.", image: kamish },
];

// ==========================================
// SMALL COMPONENTS
// ==========================================

function MiniStats({ stats }: { stats: Item["stats"] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
      {STAT_LABELS.map((label, i) => (
        <span key={label} style={{ color: STAT_COLORS[i], fontWeight: 800, fontSize: 13 }}>
          {label.slice(0, 3).toUpperCase()} {stats[i]}
        </span>
      ))}
    </div>
  );
}

// ==========================================
// DETAIL CONTENT (shown inside NeoDialog)
// ==========================================

function ShadowDetail({
  item,
  related,
  isDark,
  onSelect,
}: {
  item: Item;
  related: Item[];
  isDark: boolean;
  onSelect: (id: number) => void;
}) {
  const palette = isDark ? AppPalette.dark : AppPalette.light;

  const rows: [string, string][] = [
    ["Rank", RANK_LABELS[item.category]],
    ["Origin", cap(item.origin)],
    ["Class", cap(item.type)],
    ["Level", `Lv. ${item.level}`],
  ];

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <NeoImage src={item.image} alt={item.name} size={120} isDark={isDark} />
        <div style={{ minWidth: 0 }}>
          <div style={{ color: palette.ink, opacity: 0.7, fontWeight: 700, fontSize: 14 }}>{item.code}</div>
          <div style={{ color: palette.ink, fontWeight: 900, fontSize: 24, lineHeight: 1.2 }}>{item.name}</div>
          <div style={{ color: palette.ink, fontWeight: 600, fontSize: 15, marginTop: 2 }}>{item.suffix}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <NeoTag text={RANK_LABELS[item.category]} isDark={isDark} />
            <NeoTag text={cap(item.type)} isDark={isDark} />
            <NeoTag text={cap(item.origin)} isDark={isDark} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "16px 0" }}>
        {STAT_LABELS.map((label, i) => (
          <NeoStatBar
            key={label}
            label={label}
            value={item.stats[i]}
            color={STAT_COLORS[i]}
            isDark={isDark}
          />
        ))}
      </div>

      {/* Description */}
      <p style={{ color: palette.ink, fontWeight: 600, fontSize: 16, lineHeight: 1.5, margin: "12px 0" }}>
        {item.description}
      </p>

      {/* Rows */}
      <NeoRows rows={rows} isDark={isDark} />

      {/* Related */}
      {related.length > 0 && (
        <div style={{ marginTop: AppSpacing.md }}>
          <div style={{ color: palette.ink, fontWeight: 800, fontSize: 15, marginBottom: 8 }}>
            Fellow shadows ({related.length})
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }}>
            {related.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelect(r.id)}
                aria-label={`Open ${r.name}`}
                style={{
                  border: `2px solid ${AppColors.ink}`,
                  borderRadius: 12,
                  backgroundColor: palette.chip,
                  padding: 6,
                  width: 96,
                  flexShrink: 0,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <NeoImage src={r.image} alt={r.name} size={56} isDark={isDark} />
                <span style={{ color: palette.ink, fontSize: 11, fontWeight: 700 }}>{r.code}</span>
                <span style={{ color: palette.ink, fontSize: 11, fontWeight: 600 }}>{r.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ==========================================
// PAGE
// ==========================================

export default function DataScreen() {
  const navigate = useNavigate();
  const responsive = useResponsive();

  const isDark = useColorScheme() === "dark";
  const palette = isDark ? AppPalette.dark : AppPalette.light;

  const [view, setView] = useState<ViewMode>("grid");
  const [category, setCategory] = useState<Category>("soldier");
  const [type, setType] = useState<Kind | null>(null); // null = all classes
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState<Filter>("default");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    document.documentElement.style.backgroundColor = palette.background;
    document.body.style.backgroundColor = palette.background;
  }, [palette.background]);

  // Apply rank tab, class chip, search, origin filter, then sort
  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    const list = ITEMS.filter((it) => {
      if (it.category !== category) return false;
      if (type && it.type !== type) return false;
      if (filter !== "default" && it.origin !== filter) return false;
      if (q && !`${it.name} ${it.code} ${it.suffix} ${it.description}`.toLowerCase().includes(q)) return false;
      return true;
    });

    if (sortKey !== "default") {
      list.sort((a, b) => {
        const cmp =
          sortKey === "id"
            ? a.id - b.id
            : sortKey === "name"
            ? a.name.localeCompare(b.name)
            : CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.id - b.id;
        return order === "asc" ? cmp : -cmp;
      });
    } else if (order === "desc") {
      list.reverse();
    }

    return list;
  }, [category, type, search, filter, sortKey, order]);

  const selectedItem = ITEMS.find((it) => it.id === selectedId) ?? null;
  const relatedItems = selectedItem
    ? ITEMS.filter((it) => it.category === selectedItem.category && it.id !== selectedItem.id).slice(0, 3)
    : [];

  const controlStyle: React.CSSProperties = {
    height: 44,
    border: `2px solid ${AppColors.ink}`,
    borderRadius: 12,
    backgroundColor: palette.chip,
    color: palette.ink,
    fontSize: 16,
    fontWeight: 700,
    padding: "0 12px",
    boxSizing: "border-box",
    outline: "none",
  };

  const groupLabel: React.CSSProperties = { color: palette.ink, fontWeight: 800, fontSize: 13, marginBottom: 6 };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 12,
        paddingBottom: AppSpacing.lg,
        backgroundColor: palette.background,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: responsive.dashboardWidth,
          padding: responsive.pagePadding,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12, marginBottom: AppSpacing.sm }}>
          <NeoButton label="Back" color={AppColors.coral} onPressed={() => navigate("/")} />
          <h1
            style={{
              color: palette.title,
              fontWeight: 900,
              letterSpacing: 1.5,
              fontSize: responsive.isDesktop ? 32 : 22,
              margin: 0,
            }}
          >
            Shadow Army
          </h1>
          <h1
            style={{
              color: palette.title,
              fontWeight: 900,
              letterSpacing: 1.5,
              fontSize: responsive.isDesktop ? 16 : 16,
              margin: 0,
            }}
          >
            (Sample Catalog)
          </h1>
        </div>

        {/* Controls */}
        <WireFrame color={palette.card} style={{ marginBottom: AppSpacing.md }} padding={AppSpacing.sm}>
          <div style={{ display: "flex", flexDirection: "column", gap: AppSpacing.sm }}>
            {/* Rank tabs */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CATEGORIES.map((c) => (
                <NeoButton key={c} label={RANK_LABELS[c]} fontSize={14} isDark={category === c} onPressed={() => setCategory(c)} />
              ))}
            </div>

            {/* Search */}
            <input
              type="search"
              placeholder="Search shadows"
              aria-label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ ...controlStyle, width: "100%" }}
            />
            <div style={{ color: palette.ink, opacity: 0.75, fontSize: 12, fontWeight: 600, marginTop: -6 }}>
              Search by name, title or description.
            </div>

            {/* Class chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              <div style={{ color: palette.ink, opacity: 1, fontSize: 18, fontWeight: 600 }}>Class:</div>
              {KINDS.map((v) => (
                <NeoChip
                  key={v}
                  label={v}
                  active={type === v}
                  onPressed={() => setType(type === v ? null : v)}
                />
              ))}
            </div>

            {/* Sort, view, filter toggle */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <select
                aria-label="Sort by"
                style={controlStyle}
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
              >
                {SORT_OPTIONS.map((o) => (
                  <option color={AppColors.oatmilk} key={o.value} value={o.value}>
                    Sort: {o.label}
                  </option>
                ))}
              </select>
              <NeoButton
                label={order === "asc" ? "Asc" : "Desc"}
                fontSize={14}
                isDark={order === "asc"}
                onPressed={() => setOrder(order === "asc" ? "desc" : "asc")}
              />
              <NeoButton
                label="Filters"
                fontSize={14}
                isDark={showFilters}
                onPressed={() => setShowFilters(!showFilters)}
              />
              <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                <NeoButton label="Grid" fontSize={14} isDark={view === "grid"} onPressed={() => setView("grid")} />
                <NeoButton label="List" fontSize={14} isDark={view === "list"}  onPressed={() => setView("list")} />
              </div>
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div style={{ display: "flex", flexDirection: "column", gap: AppSpacing.sm }}>
                <div>
                  <div style={groupLabel}>Origin</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {FILTERS.map((v) => (
                      <NeoChip key={v} label={v} active={filter === v} onPressed={() => setFilter(v)} />
                    ))}
                  </div>
                </div>
                <div>
                  <NeoButton
                    label="Reset"
                    fontSize={13}
                    onPressed={() => {
                      setFilter("default");
                      setType(null);
                      setSearch("");
                      setSortKey("default");
                      setOrder("asc");
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </WireFrame>

        <div style={{ color: palette.ink, fontWeight: 700, fontSize: 14, marginBottom: AppSpacing.sm, paddingLeft: 4 }}>
          Showing {visibleItems.length} shadows from {RANK_LABELS[category]}
        </div>

        {/* Empty state */}
        {visibleItems.length === 0 && (
          <WireFrame color={palette.card} padding={AppSpacing.md} margin={0}>
            <div style={{ color: palette.ink, fontWeight: 700, textAlign: "center" }}>
              No shadows match your search or filters.
            </div>
          </WireFrame>
        )}

        {/* Grid view */}
        {view === "grid" && visibleItems.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${responsive.gridColumns}, minmax(0, 1fr))`,
              gap: AppSpacing.md,
              paddingRight: 6,
              paddingBottom: 6,
            }}
          >
            {visibleItems.map((it) => {
              const open = () => setSelectedId(it.id);
              return (
                <div
                  key={it.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`View details for ${it.name}`}
                  onClick={open}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), open())}
                  style={{ cursor: "pointer" }}
                >
                  <WireFrame color={palette.card} margin={0} padding={AppSpacing.sm}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
                      <NeoImage src={it.image} alt={it.name} size={152} isDark={isDark} />
                      <div style={{ color: palette.ink, opacity: 0.7, fontWeight: 700, fontSize: 12 }}>{it.code}</div>
                      <div style={{ color: palette.ink, fontWeight: 800, fontSize: 17, lineHeight: 1.2 }}>{it.name}</div>
                      <div style={{ color: palette.ink, fontWeight: 600, fontSize: 12 }}>{it.suffix}</div>
                      <MiniStats stats={it.stats} />
                    </div>
                  </WireFrame>
                </div>
              );
            })}
          </div>
        )}

        {/* List view */}
        {view === "list" && visibleItems.length > 0 && (
          <WireFrame color={palette.card} padding={0} margin={0}>
            <div style={{ overflowX: "auto", borderRadius: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", color: palette.ink, fontSize: 15 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: `2px solid ${palette.ink}` }}>
                    {["", "Code", "Name", "Class", "Origin", "ATK", "DEF", "MANA", "Lv"].map((h, i) => (
                      <th key={i} style={{ padding: "10px 12px", fontWeight: 800, whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((it) => {
                    const open = () => setSelectedId(it.id);
                    return (
                      <tr
                        key={it.id}
                        tabIndex={0}
                        onClick={open}
                        onKeyDown={(e) => e.key === "Enter" && open()}
                        style={{ cursor: "pointer", borderBottom: `1px solid ${palette.ink}33` }}
                      >
                        <td style={{ padding: "6px 12px" }}>
                          <NeoImage src={it.image} alt={it.name} size={36} isDark={isDark} />
                        </td>
                        <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>{it.code}</td>
                        <td style={{ padding: "6px 12px", fontWeight: 700, whiteSpace: "nowrap" }}>{it.name}</td>
                        <td style={{ padding: "6px 12px", textTransform: "capitalize" }}>{it.type}</td>
                        <td style={{ padding: "6px 12px", textTransform: "capitalize" }}>{it.origin}</td>
                        <td style={{ padding: "6px 12px" }}>{it.stats[0]}</td>
                        <td style={{ padding: "6px 12px" }}>{it.stats[1]}</td>
                        <td style={{ padding: "6px 12px" }}>{it.stats[2]}</td>
                        <td style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>{it.level}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </WireFrame>
        )}
      </div>

      {selectedItem && (
        <NeoDialog
          ariaLabel={`${selectedItem.name} details`}
          isDark={isDark}
          maxWidth={responsive.dialogWidth(560)}
          onClose={() => setSelectedId(null)}
        >
          <ShadowDetail
            item={selectedItem}
            related={relatedItems}
            isDark={isDark}
            onSelect={setSelectedId}
          />
        </NeoDialog>
      )}
    </div>
  );
}