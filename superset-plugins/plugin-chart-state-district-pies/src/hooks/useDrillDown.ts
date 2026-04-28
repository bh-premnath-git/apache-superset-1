import { useCallback, useMemo, useState } from 'react';

import type { BreadcrumbSegment } from '../components/Breadcrumb';
import type { DistrictRow } from '../types';

export type DrillLevel = 'india' | 'state' | 'district' | 'detail';

export interface DrillState {
  level: DrillLevel;
  selectedState: string | null;
  selectedDistrict: string | null;
  breadcrumbs: BreadcrumbSegment[];
  goToIndia: () => void;
  goToState: () => void;
  goToDistrict: () => void;
  onFeatureClick: (featureKey: string) => void;
  onPieClick: (row: DistrictRow) => void;
}

/**
 * 4-level drill state machine: india -> state -> district -> detail.
 *
 * Encapsulating both the transitions and the breadcrumb projection here
 * keeps the orchestrator focused on layout and lets us unit-test the
 * navigation rules without mounting any geometry.
 */
export function useDrillDown(): DrillState {
  const [level, setLevel] = useState<DrillLevel>('india');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  const goToIndia = useCallback(() => {
    setLevel('india');
    setSelectedState(null);
    setSelectedDistrict(null);
  }, []);

  const goToState = useCallback(() => {
    setLevel('state');
    setSelectedDistrict(null);
  }, []);

  const goToDistrict = useCallback(() => {
    setLevel('district');
  }, []);

  const onFeatureClick = useCallback(
    (featureKey: string) => {
      if (level === 'india') {
        setSelectedState(featureKey);
        setLevel('state');
      } else if (level === 'state') {
        setSelectedDistrict(featureKey);
        setLevel('district');
      }
    },
    [level],
  );

  const onPieClick = useCallback(
    (row: DistrictRow) => {
      // Pie click always lands on the rich detail page. Cross-filter is
      // intentionally not emitted here — that would refresh the dashboard
      // and reset this local drill state.
      setSelectedDistrict(row.districtKey);
      setLevel('detail');
    },
    [],
  );

  const breadcrumbs = useMemo<BreadcrumbSegment[]>(() => {
    const segs: BreadcrumbSegment[] = [
      { label: 'India', onClick: level !== 'india' ? goToIndia : undefined },
    ];
    if (selectedState) {
      segs.push({
        label: selectedState,
        onClick: level !== 'state' ? goToState : undefined,
      });
    }
    if (selectedDistrict) {
      segs.push({
        label: selectedDistrict,
        onClick: level === 'detail' ? goToDistrict : undefined,
      });
    }
    if (level === 'detail') {
      segs.push({ label: 'Details' });
    }
    return segs;
  }, [level, selectedState, selectedDistrict, goToIndia, goToState, goToDistrict]);

  return {
    level,
    selectedState,
    selectedDistrict,
    breadcrumbs,
    goToIndia,
    goToState,
    goToDistrict,
    onFeatureClick,
    onPieClick,
  };
}
