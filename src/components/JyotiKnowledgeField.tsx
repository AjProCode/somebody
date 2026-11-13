import React from 'react';
import type { PersonaRole } from '../utils/medhaviEngine';

export type OrbStatus = 'idle' | 'preparing' | 'analysing' | 'verifying' | 'completed';
export type BlockLayoutMode = 'centered' | 'mosaic' | 'split' | 'focus';

const STATUS_LABELS: Record<OrbStatus, string> = {
  idle: 'Ready',
  preparing: 'Reading',
  analysing: 'Reasoning',
  verifying: 'Verifying ICSE',
  completed: 'Verified'
};

export interface SubjectBlockTheme {
  bg: string;
  text: string;
  softLight: string;
  softDark: string;
  borderHex: string;
  tag: string;
}

const MONOCHROME_NAVY_THEME = (tag: string): SubjectBlockTheme => ({
  bg: '#0B2559',
  text: '#FFFFFF',
  softLight: '#F8F8F6',
  softDark: '#111622',
  borderHex: '#0B2559',
  tag
});

export const SUBJECT_COLOR_BLOCKS: Record<string, SubjectBlockTheme> = {
  Mathematics: MONOCHROME_NAVY_THEME('MTH'),
  Physics: MONOCHROME_NAVY_THEME('PHY'),
  Chemistry: MONOCHROME_NAVY_THEME('CHM'),
  Biology: MONOCHROME_NAVY_THEME('BIO'),
  'Computer Studies': MONOCHROME_NAVY_THEME('CSC'),
  'English Literature & Language': MONOCHROME_NAVY_THEME('ENG'),
  'Hindi — हिन्दी': MONOCHROME_NAVY_THEME('HIN'),
  'Sanskrit — संस्कृतम्': MONOCHROME_NAVY_THEME('SAN'),
  'History & Civics': MONOCHROME_NAVY_THEME('HIS'),
  Geography: MONOCHROME_NAVY_THEME('GEO'),
  'General Knowledge': MONOCHROME_NAVY_THEME('GNK')
};

export function getSubjectBlockTheme(subject: string): SubjectBlockTheme {
  return SUBJECT_COLOR_BLOCKS[subject] || MONOCHROME_NAVY_THEME('ICSE');
}

/**
 * Pure monochrome-navy status indicator (Zero 3D / Zero Canvas / Zero Animation Clutter)
 */
export const JyotiOrb: React.FC<{
  status: OrbStatus;
  persona: PersonaRole;
  compact?: boolean;
  isLight?: boolean;
}> = ({ status, compact = true, isLight = true }) => {
  if (compact && status === 'idle') return null;

  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 text-xs font-mono font-semibold ${
        isLight ? 'text-[#0B2559]' : 'text-[#F4F4F0]'
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block w-2 h-2 rounded-xs shrink-0 ${
          isLight ? 'bg-[#0B2559]' : 'bg-[#F4F4F0]'
        }`}
      />
      <span>{STATUS_LABELS[status]}</span>
    </span>
  );
};
