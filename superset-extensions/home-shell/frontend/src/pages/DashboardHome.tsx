import * as React from 'react';
import { useEffect, useState } from 'react';
import { ui } from '../theme';
import { api, useFetch } from '../api';
import { ViewKey, SegmentCode, SEGMENT_CODES } from '../nav';
import { useCrm } from '../crm';

// Screen 1 — Dashboard Home (post-login).
//
// Personalised entry point. Surfaces the user's saved segments, last viewed
// district, and any in-progress comparison. State is persisted to
// localStorage so a returning user doesn't see a blank slate.

const STORAGE = {
  savedSegments: 'crm.home.savedSegments',
  lastDistrict: 'crm.home.lastDistrict',
  comparisonDraft: 'crm.home.comparisonDraft',
  org: 'crm.home.org',
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function fmtInt(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return Math.round(n).toLocaleString('en-IN');
}

function QuickCard({
  title,
  body,
  cta,
  onClick,
  badge,
}: {
  title: string;
  body: React.ReactNode;
  cta: string;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        background: ui.color.surface,
        border: `1px solid ${ui.color.border}`,
        borderRadius: 12,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        cursor: 'pointer',
        fontFamily: ui.font,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <strong style={{ fontSize: 14, color: ui.color.text }}>{title}</strong>
        {badge && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 999,
              background: ui.color.surfaceMuted,
              color: ui.color.text,
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <div style={{ fontSize: 12, color: ui.color.textMuted, lineHeight: 1.5, flex: 1 }}>{body}</div>
      <span style={{ marginTop: 4, fontSize: 13, fontWeight: 600, color: ui.color.chipText }}>
        {cta} →
      </span>
    </button>
  );
}

function StepCard({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        background: ui.color.surface,
        border: `1px solid ${ui.color.border}`,
        borderRadius: 10,
        padding: 14,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: ui.color.surfaceMuted,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          color: ui.color.text,
          flexShrink: 0,
        }}
      >
        {n}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <strong style={{ fontSize: 13, color: ui.color.text }}>{title}</strong>
        <span style={{ fontSize: 12, color: ui.color.textMuted, lineHeight: 1.5 }}>{body}</span>
      </div>
    </div>
  );
}

export function DashboardHomeView({ onNavigate }: { onNavigate?: (k: ViewKey) => void } = {}) {
  const summary = useFetch(() => api.summary(), []);
  const crm = useCrm();

  const [saved, setSaved] = useState<SegmentCode[]>(() =>
    readJson<SegmentCode[]>(STORAGE.savedSegments, []).filter((s): s is SegmentCode =>
      (SEGMENT_CODES as readonly string[]).includes(s),
    ),
  );
  const [lastDistrict, setLastDistrict] = useState<{ state: string; district: string } | null>(() =>
    readJson(STORAGE.lastDistrict, null),
  );
  const [draft, setDraft] = useState<SegmentCode[]>(() =>
    readJson<SegmentCode[]>(STORAGE.comparisonDraft, []).filter((s): s is SegmentCode =>
      (SEGMENT_CODES as readonly string[]).includes(s),
    ),
  );
  const [org, setOrg] = useState<string>(() => readJson<string>(STORAGE.org, ''));

  // Re-sync from storage when other tabs / pages mutate it.
  useEffect(() => {
    const onStorage = () => {
      setSaved(readJson(STORAGE.savedSegments, []));
      setLastDistrict(readJson(STORAGE.lastDistrict, null));
      setDraft(readJson(STORAGE.comparisonDraft, []));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isNewUser = saved.length === 0 && !lastDistrict && draft.length === 0;

  const states = summary.data?.states_focus ?? ['Bihar', 'Madhya Pradesh', 'Jharkhand'];

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Greeting */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: ui.color.text }}>
              {org ? `Welcome back, ${org}` : 'Welcome to the CRM Segment Explorer'}
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: ui.color.textMuted }}>
              Focus geography: {states.join(' · ')}.{' '}
              {summary.data && (
                <>
                  {fmtInt(summary.data.weighted_households)} weighted households across{' '}
                  {fmtInt(summary.data.districts_covered)} districts.
                </>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.4,
                padding: '4px 10px',
                borderRadius: 999,
                background: ui.color.chip,
                color: ui.color.chipText,
              }}
            >
              CRM M1 · HCES 2023-24
            </span>
            <input
              value={org}
              placeholder="Your organisation"
              onChange={(e) => {
                setOrg(e.target.value);
                try {
                  localStorage.setItem(STORAGE.org, JSON.stringify(e.target.value));
                } catch {
                  /* ignore */
                }
              }}
              style={{
                padding: '6px 10px',
                fontSize: 12,
                border: `1px solid ${ui.color.border}`,
                borderRadius: 6,
                background: ui.color.surface,
                color: ui.color.text,
                fontFamily: ui.font,
                width: 180,
              }}
            />
          </div>
        </div>
      </section>

      {/* M2 banner placeholder */}
      <div
        style={{
          padding: '10px 14px',
          background: ui.color.surfaceMuted,
          border: `1px solid ${ui.color.border}`,
          borderRadius: 8,
          fontSize: 12,
          color: ui.color.textMuted,
        }}
      >
        <strong style={{ color: ui.color.text }}>M2 — Behavioural + outcome data</strong> is in
        development and will be released as a new version layer alongside M1.
      </div>

      {/* Quick access cards */}
      <section>
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: ui.color.text,
            borderTop: `2px solid ${ui.color.text}`,
            paddingTop: 12,
          }}
        >
          Pick up where you left off
        </h2>
        <div
          style={{
            marginTop: 14,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 12,
          }}
        >
          <QuickCard
            title="Your saved segments"
            badge={saved.length ? `${saved.length}` : undefined}
            body={
              saved.length === 0 ? (
                'Bookmark a segment from its profile page to keep it here.'
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {saved.map((s) => {
                    const brief = crm?.segmentByCode.get(s);
                    return (
                      <span
                        key={s}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: brief?.tier_badge_bg ?? ui.color.surfaceMuted,
                          color: brief?.tier_badge_color ?? ui.color.text,
                        }}
                      >
                        {s}
                      </span>
                    );
                  })}
                </div>
              )
            }
            cta={saved.length ? `Open ${saved[0]}` : 'Browse segments'}
            onClick={() =>
              saved.length
                ? onNavigate?.(`segment:${saved[0]}` as ViewKey)
                : onNavigate?.('overview')
            }
          />
          <QuickCard
            title="Last viewed district"
            badge={lastDistrict?.state}
            body={
              lastDistrict
                ? `${lastDistrict.district} · ${lastDistrict.state}`
                : 'Click a district on the prevalence map to anchor your geography.'
            }
            cta={lastDistrict ? 'Reopen on map' : 'Open prevalence map'}
            onClick={() => onNavigate?.('prevalence')}
          />
          <QuickCard
            title="Comparison in progress"
            badge={draft.length ? `${draft.length} of 3` : undefined}
            body={
              draft.length === 0
                ? 'Add segments to a comparison from any segment profile.'
                : `Comparing: ${draft.join(' · ')}`
            }
            cta={draft.length ? 'Resume comparison' : 'Start a comparison'}
            onClick={() => onNavigate?.('comparison')}
          />
        </div>
      </section>

      {/* Getting started — only for new users */}
      {isNewUser && (
        <section>
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: ui.color.text,
              borderTop: `2px solid ${ui.color.text}`,
              paddingTop: 12,
            }}
          >
            Getting started
          </h2>
          <div
            style={{
              marginTop: 14,
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 10,
            }}
          >
            <StepCard
              n={1}
              title="Explore segments"
              body="Start with the overview to see all 7 segments grouped by readiness tier."
            />
            <StepCard
              n={2}
              title="Compare"
              body="Pick any 2–3 segments side-by-side to find the closest match for your product."
            />
            <StepCard
              n={3}
              title="View on map"
              body="See where your target segment is concentrated by district."
            />
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => onNavigate?.('overview')}
              style={{
                padding: '10px 18px',
                border: 'none',
                borderRadius: 6,
                background: ui.color.text,
                color: ui.color.surface,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: ui.font,
              }}
            >
              Start with the overview →
            </button>
          </div>
        </section>
      )}

      {/* Tier shortcuts */}
      <section>
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: ui.color.text,
            borderTop: `2px solid ${ui.color.text}`,
            paddingTop: 12,
          }}
        >
          Jump to a readiness tier
        </h2>
        <div
          style={{
            marginTop: 14,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 10,
          }}
        >
          {(crm?.tiers ?? []).map((t) => (
            <button
              key={t.tier}
              type="button"
              onClick={() => onNavigate?.('overview')}
              style={{
                textAlign: 'left',
                background: ui.color.surface,
                border: `1px solid ${ui.color.border}`,
                borderRadius: 10,
                padding: 14,
                cursor: 'pointer',
                fontFamily: ui.font,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: t.badge_bg,
                  color: t.badge_color,
                  width: 'fit-content',
                }}
              >
                {t.label}
              </span>
              <span style={{ fontSize: 12, color: ui.color.textMuted, lineHeight: 1.5 }}>
                {t.tagline}
              </span>
              <span style={{ fontSize: 12, color: ui.color.text, fontWeight: 600 }}>
                {t.members.join(' · ')}
              </span>
            </button>
          ))}
          {!crm && (
            <div style={{ fontSize: 12, color: ui.color.textMuted, gridColumn: '1 / -1' }}>
              Loading tiers…
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// Tiny helpers re-exported so other pages can write to the same storage keys.
export const HOME_STORAGE = STORAGE;
