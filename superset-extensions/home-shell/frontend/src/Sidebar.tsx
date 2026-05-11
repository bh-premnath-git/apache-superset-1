import * as React from 'react';
import { useMemo, useState } from 'react';
import { ui, SIDEBAR_WIDTH } from './theme';
import { NAV_SECTIONS, ViewKey, SegmentCode, SEGMENT_CODES } from './nav';
import { api, useFetch } from './api';
import { useCrm } from './crm';

const COLLAPSED_SIDEBAR_WIDTH = 72;

export function Sidebar({ active, onSelect }: {
  active: ViewKey;
  onSelect: (k: ViewKey) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const segments = useFetch(() => api.segments(), []);
  const crm = useCrm();

  const shareByCode = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of segments.data?.segments ?? []) map[r.segment] = r.share_pct;
    return map;
  }, [segments.data]);

  // Badge palette per segment — sourced from the CRM tier seed via
  // useCrm(); falls back to the neutral surface palette if CRM content
  // hasn't loaded yet.
  const badgeStyle = (badge: string): { bg: string; fg: string } => {
    if (!(SEGMENT_CODES as readonly string[]).includes(badge) || !crm) {
      return { bg: ui.color.surfaceMuted, fg: ui.color.text };
    }
    const brief = crm.segmentByCode.get(badge as SegmentCode);
    if (!brief) return { bg: ui.color.surfaceMuted, fg: ui.color.text };
    return { bg: brief.tier_badge_bg, fg: brief.tier_badge_color };
  };

  return (
    <aside style={{
      width: collapsed ? COLLAPSED_SIDEBAR_WIDTH : SIDEBAR_WIDTH,
      boxSizing: 'border-box',
      background: ui.color.sidebar,
      color: ui.color.sidebarText,
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 0',
      borderRight: `1px solid ${ui.color.border}`,
      overflowX: 'hidden',
      overflowY: 'auto',
      position: 'relative',
      transition: 'width 160ms ease',
    }}>
      <button
        type="button"
        onClick={() => setCollapsed((next) => !next)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position: 'absolute',
          top: 18,
          right: 10,
          width: 26,
          height: 26,
          borderRadius: 999,
          border: `1px solid ${ui.color.border}`,
          background: ui.color.surface,
          color: ui.color.text,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          lineHeight: 1,
          zIndex: 2,
        }}
      >
        {collapsed ? '›' : '‹'}
      </button>
      {!collapsed && (
        <div style={{ padding: '0 20px 16px', fontSize: 13, color: ui.color.sidebarTextMuted, letterSpacing: 1, textTransform: 'uppercase' }}>
          CRM Segment Explorer
        </div>
      )}
      <nav style={{ display: 'flex', flexDirection: 'column' }}>
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={section.heading} style={{ marginTop: sIdx === 0 ? 0 : 18 }}>
            {!collapsed && (
              <div style={{
                padding: '0 20px 8px',
                fontSize: 11,
                color: ui.color.sidebarTextMuted,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}>
                {section.heading}
              </div>
            )}
            {section.items.map((item) => {
              const isActive = item.key === active;
              const share = item.badge ? shareByCode[item.badge] : undefined;
              const bs = item.badge ? badgeStyle(item.badge) : null;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelect(item.key)}
                  title={item.badge && Number.isFinite(share) ? `${item.label} ${item.badge} — ${share!.toFixed(1)}%` : item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: collapsed ? 0 : 12,
                    padding: collapsed ? '12px 0' : '10px 20px',
                    boxSizing: 'border-box',
                    background: isActive ? ui.color.sidebarActive : 'transparent',
                    color: ui.color.sidebarText,
                    border: 'none',
                    borderLeft: `3px solid ${isActive ? ui.color.accent : 'transparent'}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: ui.font,
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 400,
                    width: '100%',
                  }}
                >
                  <span style={{ display: 'inline-flex', opacity: isActive ? 1 : 0.7 }}>
                    {item.icon}
                  </span>
                  {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
                  {!collapsed && bs && (
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
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
