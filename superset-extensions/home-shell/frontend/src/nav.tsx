import * as React from 'react';
import {
  HomeIcon, OverviewIcon, CompareIcon, MapIcon, BrowserIcon,
  RuralIcon, UrbanIcon,
} from './icons';
import { DashboardHomeView } from './pages/DashboardHome';
import { OverviewView } from './pages/Overview';
import { ComparisonView } from './pages/Comparison';
import { DataBrowserView } from './pages/DataBrowser';
import { PrevalenceMapView } from './pages/PrevalenceMap';
import { SegmentProfileView } from './pages/SegmentProfile';

export const SEGMENT_CODES = ['R1', 'R2', 'R3', 'R4', 'U1', 'U2', 'U3'] as const;
export type SegmentCode = typeof SEGMENT_CODES[number];

export type ViewKey =
  | 'home'
  | 'overview'
  | 'comparison'
  | 'data-browser'
  | 'prevalence'
  | `segment:${SegmentCode}`;

export type NavContext = { onNavigate: (k: ViewKey) => void };

export type NavItem = {
  key: ViewKey;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  render: (ctx: NavContext) => React.ReactElement;
};

export type NavSection = { heading: string; items: NavItem[] };

const SEGMENT_NAV: NavItem[] = SEGMENT_CODES.map((code) => {
  const isRural = code.startsWith('R');
  const band = isRural ? 'Rural' : 'Urban';
  return {
    key: `segment:${code}` as ViewKey,
    label: `${code} · ${band}`,
    badge: code,
    icon: isRural ? <RuralIcon /> : <UrbanIcon />,
    render: (ctx) => <SegmentProfileView code={code} onNavigate={ctx.onNavigate} />,
  };
});

// IA: segment overview → segment profiles (7) → comparison → data browser → map
// (matches CRM Segment Explorer spec; orphan scaffold pages removed from repo.)
export const NAV_SECTIONS: NavSection[] = [
  {
    heading: 'Dashboard',
    items: [
      {
        key: 'home',
        label: 'Home',
        icon: <HomeIcon />,
        render: (ctx) => <DashboardHomeView onNavigate={ctx.onNavigate} />,
      },
    ],
  },
  {
    heading: 'Segment overview',
    items: [
      {
        key: 'overview',
        label: 'All segments',
        icon: <OverviewIcon />,
        render: (ctx) => <OverviewView onNavigate={ctx.onNavigate} />,
      },
    ],
  },
  {
    heading: 'Segment profiles',
    items: SEGMENT_NAV,
  },
  {
    heading: 'Analysis',
    items: [
      { key: 'comparison', label: 'Comparison tool', icon: <CompareIcon />, render: () => <ComparisonView /> },
      { key: 'data-browser', label: 'Data browser', icon: <BrowserIcon />, render: () => <DataBrowserView /> },
      { key: 'prevalence', label: 'Prevalence map', icon: <MapIcon />, render: () => <PrevalenceMapView /> },
    ],
  },
];

export function findNavItem(key: ViewKey): NavItem | undefined {
  for (const s of NAV_SECTIONS) {
    const found = s.items.find((it) => it.key === key);
    if (found) return found;
  }
  return undefined;
}
