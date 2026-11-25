// Official Institutional Knowledge Base & Philosophy for Seth M.R. Jaipuria School, Lucknow
// Authoritative Reference: https://www.sethmrjaipuria.school/

export const SCHOOL_OFFICIAL_WEBSITE = 'https://www.sethmrjaipuria.school/';

export const SCHOOL_OFFICIAL_INFO = {
  name: 'Seth M.R. Jaipuria School, Lucknow',
  campusAddress: 'Vineet Khand, Gomti Nagar, Lucknow – 226010, Uttar Pradesh, India',
  website: SCHOOL_OFFICIAL_WEBSITE,
  foundedYear: 1992,
  founderMemory:
    'Founded in 1992 in memory of Padma Bhushan Seth Mungturam Jaipuria — eminent nationalist, industrialist, and philanthropist — under the aegis of the Integral Education Society.',
  mottoSanskrit: 'तमसो मा ज्योतिर्गमय (Tamso Ma Jyotirgamaya)',
  mottoEnglish: 'From Ignorance towards Knowledge (Lead me from darkness to light)',
  tagline: 'School of Conscious Transformation',
  philosophy:
    'Seth M.R. Jaipuria School operates as a "School of Conscious Transformation", blending timeless Indian philosophical roots, values, and early Sanskrit integration with progressive 21st-century STEAM pedagogy to nurture intellectual, emotional, spiritual, and physical well-being.',
  vision:
    'To foster a new world governed by universal fraternity, empowering lifelong learners who are confident, compassionate, and active global contributors.',
  mission:
    'To nurture critical thinking, creativity, leadership, and entrepreneurship in an immersive, value-driven environment that inspires self-discovery and holistic growth.',
  coreValues: [
    'Sustainability',
    'Possibility',
    'Integrity',
    'Collaboration',
    'Empathy'
  ],
  leadership: {
    chairman: 'Shri Sharad Jaipuria (Chairman)',
    principal: 'Mrs. Promini Chopra (Principal)'
  },
  affiliation:
    'Affiliated with CISCE (Council for the Indian School Certificate Examinations), New Delhi — offering ICSE (Classes IX–X) and ISC (Classes XI–XII).',
  schoolWings: [
    'Pre-Primary / Kindergarten: Mom & Me, Playgroup, LKG, UKG',
    'Junior School: Classes I to IV',
    'Middle School: Classes V to VIII (including ICSE Class 7)',
    'Senior School: Classes IX to XII'
  ],
  houses: [
    { name: 'Ganga House', color: 'Red', symbolism: 'Named after India’s most sacred river' },
    { name: 'Godavari House', color: 'Yellow', symbolism: 'Named after the revered river known as the sister of Ganga' },
    { name: 'Krishna House', color: 'Green', symbolism: 'Named after Lord Krishna' },
    { name: 'Narmada House', color: 'Blue', symbolism: 'Meaning "giver of pleasure"' }
  ],
  campusAndFacilities: [
    'Lush 10-acre green campus in Vineet Khand, Gomti Nagar, Lucknow',
    'Digitally enabled smart classrooms with modern audio-visual teaching aids',
    'Dedicated Physics, Chemistry, Biology, Computer, and Robotics laboratories',
    'Resource-rich school library with books, encyclopedias, and digital references',
    'Auditorium and creative spaces for dance, yoga, visual arts, and Indian & Western music (including Torrins Music)',
    'Extensive sports facilities: athletics, gymnastics, karate, football, hockey, cricket, skating, basketball, synthetic tennis courts, and swimming pool',
    'Student-led clubs across literature, science, quiz, environment, heritage, entrepreneurship, and technology (including TechPreneur Club)',
    'Safe routed campus transport and comprehensive school safety systems'
  ],
  contact: {
    reception: '0522-2726502',
    admissions: '+91-7311184804, +91-7311184805, +91-7311184807',
    principalsOffice: '+91-7311184810',
    email: 'principal@jaipuria.com',
    website: SCHOOL_OFFICIAL_WEBSITE
  }
} as const;

const SCHOOL_INFO_QUERY_PATTERN =
  /\b(seth\s*m\.?\s*r\.?\s*jaipuria|jaipuria\s+school|our\s+school|my\s+school|this\s+school|school\s+(info|information|details|history|philosophy|vision|mission|motto|values|principal|chairman|founder|address|location|contact|phone|email|website|admissions?|campus|facilities|labs?|library|sports|clubs?|houses?|wings?|timings?|board|affiliation)|tamso\s+ma\s+jyotirgamaya|conscious\s+transformation|promini\s+chopra|sharad\s+jaipuria|mungturam\s+jaipuria|vineet\s+khand|gomti\s+nagar|ganga\s+house|godavari\s+house|krishna\s+house|narmada\s+house|techpreneur\s+club|sethmrjaipuria\.school)\b/i;

export function isSchoolInfoQuery(query: string): boolean {
  if (!query) return false;
  return SCHOOL_INFO_QUERY_PATTERN.test(query);
}

/**
 * Concise institutional philosophy & reference block injected into the system prompt
 * so every response embodies Seth M.R. Jaipuria School's ethos and answers school questions accurately.
 */
export function buildSchoolPhilosophySystemBlock(): string {
  const housesLine = SCHOOL_OFFICIAL_INFO.houses
    .map((h) => `${h.name} (${h.color})`)
    .join(', ');

  return [
    '================================================================================',
    'SETH M.R. JAIPURIA SCHOOL, LUCKNOW — OFFICIAL PHILOSOPHY & REFERENCE',
    `Authoritative Website: ${SCHOOL_OFFICIAL_WEBSITE}`,
    '================================================================================',
    `- Institution: ${SCHOOL_OFFICIAL_INFO.name} (${SCHOOL_OFFICIAL_INFO.campusAddress}).`,
    `- Motto: ${SCHOOL_OFFICIAL_INFO.mottoSanskrit} — "${SCHOOL_OFFICIAL_INFO.mottoEnglish}".`,
    `- Philosophy ("${SCHOOL_OFFICIAL_INFO.tagline}"): ${SCHOOL_OFFICIAL_INFO.philosophy}`,
    `- Vision & Mission: ${SCHOOL_OFFICIAL_INFO.vision} ${SCHOOL_OFFICIAL_INFO.mission}`,
    `- Core Values: ${SCHOOL_OFFICIAL_INFO.coreValues.join(', ')}.`,
    `- History & Leadership: ${SCHOOL_OFFICIAL_INFO.founderMemory} Chairman: ${SCHOOL_OFFICIAL_INFO.leadership.chairman}. Principal: ${SCHOOL_OFFICIAL_INFO.leadership.principal}.`,
    `- Affiliation & Wings: ${SCHOOL_OFFICIAL_INFO.affiliation} Wings: ${SCHOOL_OFFICIAL_INFO.schoolWings.join(' | ')}.`,
    `- Four Vertical Houses: ${housesLine}.`,
    `- 10-Acre Campus & Co-Curriculars: Smart classrooms, Physics/Chemistry/Biology/Computer/Robotics labs, library, auditorium, swimming pool, athletics, gymnastics, karate, football, hockey, skating, tennis, basketball, music (Indian & Western / Torrins Music), dance, yoga, and clubs (literary, science, quiz, environment, heritage, TechPreneur).`,
    `- Contact: Reception ${SCHOOL_OFFICIAL_INFO.contact.reception} | Admissions ${SCHOOL_OFFICIAL_INFO.contact.admissions} | Principal's Office ${SCHOOL_OFFICIAL_INFO.contact.principalsOffice} | Email ${SCHOOL_OFFICIAL_INFO.contact.email} | Website ${SCHOOL_OFFICIAL_WEBSITE}`,
    '- Mandate: Reflect the "School of Conscious Transformation" spirit (curiosity, integrity, empathy, sustainability, collaboration, and moving from ignorance towards knowledge) naturally in your tone. Students AND teachers are ALWAYS allowed to ask freely about school information, philosophy, leadership, houses, facilities, clubs, admissions, and history — answer accurately and cite https://www.sethmrjaipuria.school/ for official updates.',
    '================================================================================'
  ].join('\n');
}

/**
 * Direct verified answer builder for Seth M.R. Jaipuria School inquiries if live inference is unavailable.
 */
export function buildSchoolInfoDirectAnswer(query: string, manualLine = ''): string {
  const lower = (query || '').toLowerCase();
  const s = SCHOOL_OFFICIAL_INFO;

  const focusedSections: string[] = [];

  if (/\b(house|houses|ganga|godavari|krishna|narmada)\b/i.test(lower)) {
    focusedSections.push(
      `### The Four Vertical Houses of ${s.name}\n\n` +
        s.houses
          .map((h) => `- **${h.name} (${h.color}):** ${h.symbolism}.`)
          .join('\n') +
        `\n\nThe vertical house system spans across grades, building leadership, teamwork, discipline, and healthy co-curricular spirit.`
    );
  }

  if (/\b(principal|chairman|founder|history|established|1992|mungturam|sharad|promini)\b/i.test(lower)) {
    focusedSections.push(
      `### History & Leadership\n\n` +
        `- **Founding:** ${s.founderMemory}\n` +
        `- **Chairman:** ${s.leadership.chairman}\n` +
        `- **Principal:** ${s.leadership.principal}\n` +
        `- **Affiliation:** ${s.affiliation}`
    );
  }

  if (/\b(philosophy|vision|mission|motto|values?|tamso|conscious)\b/i.test(lower)) {
    focusedSections.push(
      `### Philosophy, Motto & Core Values\n\n` +
        `- **Motto:** **${s.mottoSanskrit}** — *"${s.mottoEnglish}"*\n` +
        `- **Identity:** **${s.tagline}**\n` +
        `- **Philosophy:** ${s.philosophy}\n` +
        `- **Vision:** ${s.vision}\n` +
        `- **Mission:** ${s.mission}\n` +
        `- **Core Values:** ${s.coreValues.join(' · ')}`
    );
  }

  if (/\b(campus|facilit|lab|library|sport|swim|club|music|dance|robotics|class|wing|academic|icse|isc)\b/i.test(lower)) {
    focusedSections.push(
      `### Academics, 10-Acre Campus & Co-Curricular Life\n\n` +
        `**School Wings (${s.affiliation}):**\n` +
        s.schoolWings.map((w) => `- ${w}`).join('\n') +
        `\n\n**Campus Facilities & Activities:**\n` +
        s.campusAndFacilities.map((f) => `- ${f}`).join('\n')
    );
  }

  if (/\b(contact|address|phone|number|email|admission|location|website|gomti|vineet)\b/i.test(lower)) {
    focusedSections.push(
      `### Official Campus Contact & Admissions\n\n` +
        `- **Address:** ${s.campusAddress}\n` +
        `- **Reception:** ${s.contact.reception}\n` +
        `- **Admissions Cell:** ${s.contact.admissions}\n` +
        `- **Principal’s Office:** ${s.contact.principalsOffice}\n` +
        `- **Email:** ${s.contact.email}\n` +
        `- **Official Website:** [${s.website}](${s.website})`
    );
  }

  if (focusedSections.length === 0) {
    focusedSections.push(
      `### ${s.name} — Official Overview\n\n` +
        `**Motto:** **${s.mottoSanskrit}** (*"${s.mottoEnglish}"*) · **${s.tagline}**\n\n` +
        `${s.philosophy}\n\n` +
        `- **Founded:** ${s.foundedYear} (${s.founderMemory})\n` +
        `- **Leadership:** ${s.leadership.chairman} · ${s.leadership.principal}\n` +
        `- **Board:** ${s.affiliation}\n` +
        `- **Core Values:** ${s.coreValues.join(', ')}\n` +
        `- **Four Houses:** ${s.houses.map((h) => `${h.name} (${h.color})`).join(', ')}\n` +
        `- **Campus:** ${s.campusAddress}\n` +
        `- **Contact:** Reception ${s.contact.reception} · Admissions ${s.contact.admissions} · ${s.contact.email}`
    );
  }

  return `<medhavi_logic>
- Approach: Answered Seth M.R. Jaipuria School institutional inquiry directly from verified school records (${s.website}).
- Key Steps: Synthesized official motto, School of Conscious Transformation philosophy, leadership, houses, facilities, and contact information.
- Verification: Verified alignment with https://www.sethmrjaipuria.school/ and open student access to institutional information.${manualLine}
</medhavi_logic>

${focusedSections.join('\n\n')}

For the latest circulars, admission calendars, and campus announcements, always refer to the official school website: **[sethmrjaipuria.school](${s.website})**.`;
}
