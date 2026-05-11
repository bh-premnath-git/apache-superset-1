import * as React from 'react';
import { ui, SIDEBAR_WIDTH } from './theme';
import { NAV_SECTIONS, ViewKey } from './nav';

export function Sidebar({ active, onSelect }: {
  active: ViewKey;
  onSelect: (k: ViewKey) => void;
}) {
  return (
    <aside style={{
      width: SIDEBAR_WIDTH,
      background: ui.color.sidebar,
      color: ui.color.sidebarText,
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 0',
      borderRight: `1px solid ${ui.color.border}`,
    }}>
      <div style={{ padding: '0 20px 16px', fontSize: 13, color: ui.color.sidebarTextMuted, letterSpacing: 1, textTransform: 'uppercase' }}>
        India Segmentation
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column' }}>
        {NAV_SECTIONS.map((section, sIdx) => (
          <div key={section.heading} style={{ marginTop: sIdx === 0 ? 0 : 14 }}>
            <div style={{
              padding: '6px 20px',
              fontSize: 10,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              color: ui.color.sidebarTextMuted,
              opacity: 0.7,
            }}>
              {section.heading}
            </div>
            {section.items.map((item) => {
              const isActive = item.key === active;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelect(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 20px',
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
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
