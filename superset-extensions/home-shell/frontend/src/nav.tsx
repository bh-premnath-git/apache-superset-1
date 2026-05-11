import * as React from 'react';
import {
  OverviewIcon, CompareIcon, MapIcon, BrowserIcon,
} from './icons';
import { OverviewView } from './pages/Overview';
import { ComparisonView } from './pages/Comparison';
import { DataBrowserView } from './pages/DataBrowser';
import { PrevalenceMapView } from './pages/PrevalenceMap';

export type ViewKey =
  | 'overview'
  | 'comparison'
  | 'data-browser'
  | 'prevalence';

export type NavContext = { onNavigate: (k: ViewKey) => void };

export type NavItem = {
  key: ViewKey;
  label: string;
  icon: React.ReactNode;
  render: (ctx: NavContext) => React.ReactElement;
};

export type NavSection = { heading: string; items: NavItem[] };

export const NAV_SECTIONS: NavSection[] = [
  {
    heading: 'Dashboard',
    items: [
      { key: 'overview',   label: 'Overview',        icon: <OverviewIcon />, render: (ctx) => <OverviewView onNavigate={ctx.onNavigate} /> },
      { key: 'comparison', label: 'Comparison tool', icon: <CompareIcon />,  render: () => <ComparisonView /> },
      { key: 'data-browser', label: 'Data browser',  icon: <BrowserIcon />,  render: () => <DataBrowserView /> },
      { key: 'prevalence', label: 'Prevalence map',  icon: <MapIcon />,      render: () => <PrevalenceMapView /> },
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
