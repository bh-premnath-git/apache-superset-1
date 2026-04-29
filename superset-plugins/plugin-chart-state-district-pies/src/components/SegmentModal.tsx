import React, { useEffect, useRef } from 'react';

import type { SegmentDescription } from '../constants';

export interface SegmentModalProps {
  segment: string;
  description: SegmentDescription;
  /** Background swatch shown next to the segment code in the modal header. */
  swatchColor: string;
  onClose: () => void;
}

/**
 * Plain-overlay modal opened by clicking a segment label on the detail
 * page tables. Deliberately does not depend on antd or Superset's modal —
 * keeps the federated bundle minimal and avoids style leaks from the host.
 *
 * Accessibility:
 *   - role="dialog" + aria-modal="true"
 *   - aria-labelledby points at the title element
 *   - ESC closes
 *   - Click on the backdrop closes
 *   - Initial focus moves to the close button
 */
export function SegmentModal({
  segment,
  description,
  swatchColor,
  onClose,
}: SegmentModalProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const titleId = `sdp-segment-modal-${segment}`;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,20,30,0.45)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 8,
          width: 'min(520px, 92vw)',
          maxHeight: '88vh',
          overflowY: 'auto',
          boxShadow: '0 12px 48px rgba(0,0,0,0.25)',
          padding: 20,
          fontFamily: 'Inter, Arial, sans-serif',
          color: '#222',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              aria-hidden="true"
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: swatchColor,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
              }}
            />
            <div>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>
                Segment {segment}
              </div>
              <div
                id={titleId}
                style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}
              >
                {description.title}
              </div>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close segment description"
            style={{
              padding: '4px 10px',
              fontSize: 12,
              background: '#f5f6f8',
              border: '1px solid #d1d5db',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Close
          </button>
        </header>

        {description.summary && (
          <p style={{ fontSize: 13, lineHeight: 1.5, color: '#333', margin: '0 0 14px' }}>
            {description.summary}
          </p>
        )}

        {description.criteria && description.criteria.length > 0 && (
          <DescriptionList label="Classification criteria" items={description.criteria} />
        )}

        {description.interventions && description.interventions.length > 0 && (
          <DescriptionList
            label="Suggested interventions"
            items={description.interventions}
          />
        )}
      </div>
    </div>
  );
}

function DescriptionList({ label, items }: { label: string; items: string[] }) {
  return (
    <section style={{ marginTop: 6 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#666',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5, color: '#333' }}>
        {items.map((item, i) => (
          <li key={`${label}-${i}`} style={{ marginBottom: 2 }}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
