// Minimal stub — transformProps and buildQuery don't touch this module at
// test time, but controlPanel.ts imports it. Jest resolves the stub only
// when the file is actually imported.

export const sections = {
  legacyRegularTime: { label: 'Time', expanded: false, controlSetRows: [] },
  genericTime: { label: 'Time', expanded: false, controlSetRows: [] },
};

export const sharedControls: Record<string, unknown> = {
  entity: { type: 'SelectControl', label: 'Entity' },
  metric: { type: 'MetricsControl', label: 'Metric' },
  groupby: { type: 'SelectControl', label: 'Group by' },
};

export type ControlPanelConfig = Record<string, unknown>;
