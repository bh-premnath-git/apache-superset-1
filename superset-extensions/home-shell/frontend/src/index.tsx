import * as React from 'react';
import { useState } from 'react';
// Superset 6.x ships React 17 as its host runtime and only shares the base
// `react-dom` module via Module Federation (not the `react-dom/client`
// subpath). Use the legacy ReactDOM.render API.
import * as ReactDOM from 'react-dom';

import { ui, NAV_HEIGHT } from './theme';
import { Sidebar } from './Sidebar';
import { ViewKey, findNavItem } from './nav';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// ── Routing ──────────────────────────────────────────────────────────────────
// Superset's welcome page is mounted at /superset/welcome/. Some deployments
// also redirect bare "/" to it. We render on either.
const WELCOME_PATHS = ['/superset/welcome/', '/superset/welcome', '/'];

function isWelcomeRoute(pathname: string): boolean {
  return WELCOME_PATHS.some(
    (p) => pathname === p || pathname.replace(/\/$/, '') === p.replace(/\/$/, ''),
  );
}

// ── Shell ────────────────────────────────────────────────────────────────────
function HomeShell() {
  const [view, setView] = useState<ViewKey>('overview');
  const active = findNavItem(view);

  return (
    <div style={{
      position: 'fixed',
      top: NAV_HEIGHT,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      background: ui.color.surfaceMuted,
      fontFamily: ui.font,
      zIndex: 50,
    }}>
      <Sidebar active={view} onSelect={setView} />
      <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {active ? active.render({ onNavigate: setView }) : null}
      </main>
    </div>
  );
}

// ── Mount lifecycle ──────────────────────────────────────────────────────────
const MOUNT_ID = 'my-org-home-shell-root';

function ensureMountEl(): HTMLElement {
  let el = document.getElementById(MOUNT_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = MOUNT_ID;
    document.body.appendChild(el);
  }
  return el;
}

function renderIfWelcome(): void {
  if (typeof document === 'undefined') return;
  const el = ensureMountEl();
  if (isWelcomeRoute(window.location.pathname)) {
    // Hide the underlying welcome content so our shell doesn't double-render.
    document.body.style.overflow = 'hidden';
    ReactDOM.render(<HomeShell />, el);
  } else {
    document.body.style.overflow = '';
    ReactDOM.unmountComponentAtNode(el);
  }
}

// SPA navigation interception. React Router calls history.pushState; the
// browser does not fire popstate for that, so we monkey-patch to detect.
function installRouteListener(): void {
  if ((window as any).__myOrgHomeShellRouteHooked) return;
  (window as any).__myOrgHomeShellRouteHooked = true;

  const fire = () => window.dispatchEvent(new Event('myorg:locationchange'));
  const origPush = history.pushState;
  const origReplace = history.replaceState;
  history.pushState = function (...args: Parameters<typeof origPush>) {
    const ret = origPush.apply(this, args);
    fire();
    return ret;
  };
  history.replaceState = function (...args: Parameters<typeof origReplace>) {
    const ret = origReplace.apply(this, args);
    fire();
    return ret;
  };
  window.addEventListener('popstate', fire);
  window.addEventListener('myorg:locationchange', renderIfWelcome);
}

export function mount(): void {
  if (typeof document === 'undefined') return;
  installRouteListener();
  renderIfWelcome();
}

// Superset's ExtensionsLoader calls container.get('./index') then invokes the
// returned factory with zero arguments. We expose default + side-effect.
export default function activate(): void {
  mount();
}

if (typeof window !== 'undefined') {
  try {
    mount();
  } catch (err) {
    // Never throw from a Module Federation container.
    // eslint-disable-next-line no-console
    console.error('[home-shell] mount failed', err);
  }
}
