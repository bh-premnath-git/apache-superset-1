import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ui, SIDEBAR_WIDTH } from './theme';
import { NAV_SECTIONS, NavSection, ViewKey } from './nav';
import { api, useFetch } from './api';
import { CRM_DATA_VERSION_LABEL } from './crm';

const COLLAPSED_SIDEBAR_WIDTH = 64;
const LS_COLLAPSED = 'crm_sidebar_collapsed';
const LS_SECTIONS = 'crm_sidebar_open_sections';

// Per-segment badge color, keyed by CRM readiness tier (code suffix).
// Mirrors Overview segment styling.
function badgeStyle(badge: string): { bg: string; fg: string } {
  if (badge === 'R1' || badge === 'U1') return { bg: '#e5e7eb', fg: '#374151' };
  if (badge === 'R2' || badge === 'U2') return { bg: '#dbeafe', fg: '#1e3a8a' };
  if (badge === 'R3')                    return { bg: '#f3e8ff', fg: '#6b21a8' };
  // R4 / U3 — most constrained
  return { bg: '#fce7f3', fg: '#9d174d' };
}

function readBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === '1';
  } catch {
    return fallback;
  }
}

function writeBool(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    /* noop */
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

function sectionKeyOf(section: NavSection): string {
  return section.heading.toLowerCase().replace(/\s+/g, '-');
}

function findActiveSectionKey(active: ViewKey): string | null {
  for (const s of NAV_SECTIONS) {
    if (s.items.some((it) => it.key === active)) return sectionKeyOf(s);
  }
  return null;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
        transition: 'transform 140ms ease',
        opacity: 0.65,
      }}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CollapseToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: collapsed ? 'rotate(180deg)' : 'none',
        transition: 'transform 160ms ease',
      }}
      aria-hidden
    >
      <path d="M15 6l-6 6 6 6" />
      <path d="M21 4v16" opacity="0.55" />
    </svg>
  );
}

export function Sidebar({ active, onSelect }: {
  active: ViewKey;
  onSelect: (k: ViewKey) => void;
}) {
  const [collapsed, setCollapsed] = useState<boolean>(() => readBool(LS_COLLAPSED, false));
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    readJson<Record<string, boolean>>(LS_SECTIONS, {}),
  );

  const segments = useFetch(() => api.segments(), []);
  const shareByCode = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of segments.data?.segments ?? []) map[r.segment] = r.share_pct;
    return map;
  }, [segments.data]);

  // Ensure the section that contains the active item is always open so the
  // user can see where they are after navigation.
  const activeSectionKey = useMemo(() => findActiveSectionKey(active), [active]);
  useEffect(() => {
    if (!activeSectionKey) return;
    setOpenSections((cur) => (cur[activeSectionKey] === false ? { ...cur, [activeSectionKey]: true } : cur));
  }, [activeSectionKey]);

  useEffect(() => {
    writeBool(LS_COLLAPSED, collapsed);
  }, [collapsed]);

  useEffect(() => {
    writeJson(LS_SECTIONS, openSections);
  }, [openSections]);

  const isSectionOpen = useCallback(
    (key: string) => openSections[key] !== false,
    [openSections],
  );
  const toggleSection = useCallback(
    (key: string) => setOpenSections((cur) => ({ ...cur, [key]: !isSectionOpen(key) })),
    [isSectionOpen],
  );

  const width = collapsed ? COLLAPSED_SIDEBAR_WIDTH : SIDEBAR_WIDTH;

  return (
    <aside
      style={{
        width,
        boxSizing: 'border-box',
        background: ui.color.sidebar,
        color: ui.color.sidebarText,
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${ui.color.border}`,
        transition: 'width 160ms ease',
        flexShrink: 0,
      }}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 8,
          padding: collapsed ? '16px 0 12px' : '18px 16px 12px',
          borderBottom: `1px solid rgba(148,163,184,0.18)`,
          minHeight: 56,
          boxSizing: 'border-box',
        }}
      >
        {!collapsed && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.1,
              textTransform: 'uppercase',
              color: ui.color.sidebarTextMuted,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            CRM Segment Explorer
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: '1px solid rgba(148,163,184,0.25)',
            background: 'rgba(148,163,184,0.08)',
            color: ui.color.sidebarText,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <CollapseToggleIcon collapsed={collapsed} />
        </button>
      </div>

      {/* ── Nav body ─────────────────────────────────────────────────────── */}
      <nav
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: collapsed ? '8px 0' : '8px 0 12px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {NAV_SECTIONS.map((section, sIdx) => {
          const skey = sectionKeyOf(section);
          const open = collapsed ? true : isSectionOpen(skey);
          const sectionHasActive = section.items.some((it) => it.key === active);
          return (
            <div
              key={section.heading}
              style={{
                marginTop: sIdx === 0 ? 4 : collapsed ? 6 : 10,
                paddingTop: collapsed && sIdx > 0 ? 6 : 0,
                borderTop:
                  collapsed && sIdx > 0
                    ? `1px solid rgba(148,163,184,0.15)`
                    : 'none',
              }}
            >
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => toggleSection(skey)}
                  aria-expanded={open}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '8px 18px',
                    background: 'transparent',
                    border: 'none',
                    color: sectionHasActive ? ui.color.sidebarText : ui.color.sidebarTextMuted,
                    cursor: 'pointer',
                    fontFamily: ui.font,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: 1.1,
                    textTransform: 'uppercase',
                  }}
                >
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {section.heading}
                  </span>
                  <ChevronIcon open={open} />
                </button>
              )}
              {open &&
                section.items.map((item) => {
                  const isActive = item.key === active;
                  const isSegmentItem =
                    typeof item.key === 'string' && item.key.startsWith('segment:');
                  const bs = item.badge ? badgeStyle(item.badge) : null;
                  const share = item.badge ? shareByCode[item.badge] : undefined;
                  const tooltip =
                    item.badge && Number.isFinite(share)
                      ? `${item.label} — ${share!.toFixed(1)}%`
                      : item.label;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onSelect(item.key)}
                      title={collapsed ? tooltip : item.label}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        gap: collapsed ? 0 : 12,
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: collapsed ? '8px 0' : '8px 18px',
                        background: isActive
                          ? ui.color.sidebarActive
                          : 'transparent',
                        color: ui.color.sidebarText,
                        border: 'none',
                        borderLeft: collapsed
                          ? 'none'
                          : `3px solid ${isActive ? ui.color.accent : 'transparent'}`,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: ui.font,
                        fontSize: 13.5,
                        fontWeight: isActive ? 600 : 400,
                        lineHeight: 1.2,
                      }}
                    >
                      {/* Collapsed accent indicator on the left edge */}
                      {collapsed && isActive && (
                        <span
                          aria-hidden
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 6,
                            bottom: 6,
                            width: 3,
                            borderRadius: '0 2px 2px 0',
                            background: ui.color.accent,
                          }}
                        />
                      )}
                      {collapsed && isSegmentItem && bs ? (
                        // Compact CRM code pill — keeps R1/R2/R3/R4/U1/U2/U3 distinguishable
                        // in the rail without the repeated rural/urban silhouette.
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            width: 30,
                            height: 24,
                            borderRadius: 6,
                            background: bs.bg,
                            color: bs.fg,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: isActive
                              ? `1px solid rgba(255,255,255,0.35)`
                              : `1px solid transparent`,
                          }}
                        >
                          {item.badge}
                        </span>
                      ) : (
                        <span
                          aria-hidden
                          style={{
                            display: 'inline-flex',
                            opacity: isActive ? 1 : 0.75,
                            width: 18,
                            justifyContent: 'center',
                          }}
                        >
                          {item.icon}
                        </span>
                      )}
                      {!collapsed && (
                        <span
                          style={{
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.label}
                        </span>
                      )}
                      {!collapsed && bs && !isSegmentItem && item.badge && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: bs.bg,
                            color: bs.fg,
                            minWidth: 28,
                            textAlign: 'center',
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                      {!collapsed && isSegmentItem && Number.isFinite(share) && (
                        <span
                          style={{
                            fontSize: 11,
                            color: ui.color.sidebarTextMuted,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {share!.toFixed(1)}%
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          );
        })}
      </nav>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      {!collapsed && (
        <div
          style={{
            padding: '12px 16px 16px',
            fontSize: 10,
            lineHeight: 1.4,
            color: ui.color.sidebarTextMuted,
            borderTop: `1px solid rgba(148,163,184,0.2)`,
          }}
        >
          {CRM_DATA_VERSION_LABEL}
        </div>
      )}
    </aside>
  );
}
