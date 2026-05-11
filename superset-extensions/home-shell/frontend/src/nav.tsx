import * as React from 'react';
import {
  OverviewIcon, CompareIcon, MapIcon,
  StatusIcon, DoorIcon, PathIcon, LayersIcon, ChartIcon,
} from './icons';
import { OverviewView } from './pages/Overview';
import { ComparisonView } from './pages/Comparison';
import { PrevalenceMapView } from './pages/PrevalenceMap';
import { CoverageView } from './pages/Coverage';
import { EntryPointsView } from './pages/EntryPoints';
import { NavigationView } from './pages/Navigation';
import { CompareCurateView } from './pages/CompareCurate';
import { VizRoadmapView } from './pages/VizRoadmap';

export type ViewKey =
  | 'overview'
  | 'comparison'
  | 'prevalence'
  | 'coverage'
  | 'entry-points'
  | 'navigation'
  | 'compare-curate'
  | 'viz-roadmap';

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
      { key: 'prevalence', label: 'Prevalence map',  icon: <MapIcon />,      render: () => <PrevalenceMapView /> },
    ],
  },
  {
    heading: 'Roadmap & context',
    items: [
      { key: 'coverage',       label: 'Coverage & status',     icon: <StatusIcon />, render: () => <CoverageView /> },
      { key: 'entry-points',   label: 'Entry points',          icon: <DoorIcon />,   render: () => <EntryPointsView /> },
      { key: 'navigation',     label: 'Navigation pathways',   icon: <PathIcon />,   render: () => <NavigationView /> },
      { key: 'compare-curate', label: 'Compare & curate',      icon: <LayersIcon />, render: () => <CompareCurateView /> },
      { key: 'viz-roadmap',    label: 'Visualization roadmap', icon: <ChartIcon />,  render: () => <VizRoadmapView /> },
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
