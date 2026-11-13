import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LOCKED_GRADE,
  JAIPURIA_MEDHAVI_MASTER_CONSTITUTION,
  normalizeDifficultyDistribution,
  calculateRevisionScore,
  buildSystemPrompt,
  buildVerifiedIdentityResult,
  parseMedhaviResponse,
  constantTimeEquals,
  verifyInstitutionalPassword,
  verifyFacultyPasscode,
  signVerifiedIdentity,
  verifyIdentityIntegrity,
  isTestGenerationRequest,
  type QuizQuestion,
  type AcademicContext
} from './medhaviEngine';
import {
  MOCK_SCHOOL_CALENDAR,
  getAllCalendarEvents,
  filterCalendarEvents,
  getDaysRemaining
} from '../data/schoolCalendarData';
import { stripMarkdownForSpeech, cleanRepeatedSpeechTokens } from './voiceAudioEngine';

test('LOCKED_GRADE is exclusively Class 7', () => {
  assert.equal(LOCKED_GRADE, 'Class 7');
});

test('normalizeDifficultyDistribution always sums to 100%', () => {
  const dist1 = normalizeDifficultyDistribution(30, 50, 20);
  assert.equal(dist1.easy + dist1.moderate + dist1.hots, 100);
  assert.deepEqual(dist1, { easy: 30, moderate: 50, hots: 20 });
});

test('calculateRevisionScore enforces +2 correct, -1 incorrect, 0 skipped', () => {
  const questions: QuizQuestion[] = [
    {
      id: 'q1',
      question: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctIndex: 1,
      explanation: '2 + 2 = 4',
      conceptTag: 'Arithmetic'
    },
    {
      id: 'q2',
      question: 'What is sqrt(9)?',
      options: ['2', '3', '4', '9'],
      correctIndex: 1,
      explanation: '3 * 3 = 9',
      conceptTag: 'Radicals'
    },
    {
      id: 'q3',
      question: 'Value of x^0 for x != 0?',
      options: ['0', '1', 'x', '-1'],
      correctIndex: 1,
      explanation: 'Any non-zero number to power 0 is 1',
      conceptTag: 'Exponents'
    }
  ];

  const report = calculateRevisionScore({ 0: 1, 1: 0, 2: null }, questions, 45);
  assert.equal(report.score, 1);
  assert.equal(report.maxScore, 6);
  assert.equal(report.correctCount, 1);
  assert.equal(report.incorrectCount, 1);
  assert.equal(report.skippedCount, 1);
});

test('Master Constitution exports Parts I-XX (Rules 1-116) & buildSystemPrompt enforces full Master Constitution + ICSE Class 7 lock', () => {
  assert.match(JAIPURIA_MEDHAVI_MASTER_CONSTITUTION, /FINAL MASTER INTELLIGENCE, TEACHING & TEACHER STUDIO CONSTITUTION/);
  assert.match(JAIPURIA_MEDHAVI_MASTER_CONSTITUTION, /# PART I — CORE INTELLIGENCE PRINCIPLES/);
  assert.match(JAIPURIA_MEDHAVI_MASTER_CONSTITUTION, /# PART II — STUDENT PORTAL/);
  assert.match(JAIPURIA_MEDHAVI_MASTER_CONSTITUTION, /# PART VI — TEACHER STUDIO/);
  assert.match(JAIPURIA_MEDHAVI_MASTER_CONSTITUTION, /# PART XX — FINAL MEDHAVI IDENTITY/);
  assert.match(JAIPURIA_MEDHAVI_MASTER_CONSTITUTION, /## 1\. PRIMARY PHILOSOPHY/);
  assert.match(JAIPURIA_MEDHAVI_MASTER_CONSTITUTION, /## 116\. FINAL INTERNAL CHECK/);

  const ctx: AcademicContext = {
    role: 'student',
    grade: 'Class 7',
    subject: 'Mathematics',
    intelligenceMode: 'pedagogical',
    model: 'nvidia/nemotron-3.5-super-vl:free',
    customSpecs: [
      {
        id: 'spec-1',
        category: 'Current Syllabus',
        title: 'ICSE Chapter 6',
        content: 'The Triangle and its Properties',
        active: true
      }
    ]
  };

  const prompt = buildSystemPrompt(ctx);
  assert.match(prompt, /You are "Jaipuria Medhavi" \(मेधावी\), the official high-logic AI scholar and pedagogical copilot for Seth M\.R\. Jaipuria School/);
  assert.match(prompt, /# PART I — CORE INTELLIGENCE PRINCIPLES/);
  assert.match(prompt, /## 116\. FINAL INTERNAL CHECK/);
  assert.match(prompt, /CORE MANDATES \(STRICT ICSE CLASS 7 LOCK\):/);
  assert.match(prompt, /1\. Identity: Introduce yourself proudly as Jaipuria Medhavi/);
  assert.match(prompt, /NO DUPLICATION OF ASSESSMENTS/);
  assert.match(prompt, /Class 7/);
  assert.match(prompt, /The Triangle and its Properties/);
});

test('buildVerifiedIdentityResult verifies valid Student and Teacher credentials and rejects wrong info', () => {
  const validAtharva = buildVerifiedIdentityResult({
    fullName: 'Atharva Jindal',
    role: 'student',
    schoolId: '13457',
    password: 'jaipuria123'
  });
  assert.equal(validAtharva.verified, true);
  assert.equal(validAtharva.grade, 'Class 7');
  assert.equal(validAtharva.extractedRole, 'student');

  // Wrong Name for Scholar No 13457 (e.g. "Reshu Jindal" with "13457") MUST be rejected
  const wrongNameRes = buildVerifiedIdentityResult({
    fullName: 'Reshu Jindal',
    role: 'student',
    schoolId: '13457',
    password: 'jaipuria123'
  });
  assert.equal(wrongNameRes.verified, false);
  assert.match(wrongNameRes.summary, /registered to "Atharva Jindal"/i);

  // Role mismatch (Student ID 13457 used for Teacher account) MUST be rejected
  const wrongRoleRes = buildVerifiedIdentityResult({
    fullName: 'Atharva Jindal',
    role: 'teacher',
    schoolId: '13457',
    password: 'jaipuria123'
  });
  assert.equal(wrongRoleRes.verified, false);
  assert.match(wrongRoleRes.summary, /belongs to a STUDENT/i);

  // Invalid password MUST be rejected
  const invalidPasswordRes = buildVerifiedIdentityResult({
    fullName: 'Atharva Jindal',
    role: 'student',
    schoolId: '13457',
    password: 'wrongpassword'
  });
  assert.equal(invalidPasswordRes.verified, false);
  assert.match(invalidPasswordRes.summary, /Incorrect institutional password/i);
});

test('parseMedhaviResponse extracts logic summary and quiz JSON cleanly', () => {
  const raw = `<medhavi_logic>
- Approach: Use Euclidean theorem.
- Verification: Confirmed right-angle triangle.
</medhavi_logic>
Here is your Revision quiz:
<medhavi_quiz>
{
  "title": "Class 7 Geometry Sprint",
  "topic": "Triangles",
  "difficulty": "Competitive",
  "timerSeconds": 120,
  "questions": [
    {
      "id": "q1",
      "question": "Hypotenuse of 3-4-5 triangle?",
      "options": ["3", "4", "5", "6"],
      "correctIndex": 2,
      "explanation": "3^2 + 4^2 = 5^2",
      "conceptTag": "Pythagoras"
    }
  ]
}
</medhavi_quiz>`;

  const parsed = parseMedhaviResponse(raw);
  assert.equal(parsed.logicSummary.length, 2);
  assert.ok(parsed.quizData);
  assert.equal(parsed.quizData?.title, 'Class 7 Geometry Sprint');
});

test('buildSystemPrompt binds Class 7 context and motto without fallback', () => {
  const ctx: AcademicContext = {
    role: 'student',
    grade: 'Class 7',
    subject: 'Computer Science & AI',
    intelligenceMode: 'deep',
    model: 'nvidia/nemotron-3.5-super-vl:free',
    customSpecs: []
  };

  const sysPrompt = buildSystemPrompt(ctx);
  assert.ok(sysPrompt.includes('Seth M.R. Jaipuria School'));
  assert.ok(sysPrompt.includes('Class 7'));
  assert.ok(sysPrompt.includes('Tamso Ma Jyotirgamaya'));
});

test('MOCK_SCHOOL_CALENDAR lists upcoming exams, school holidays, and assignment deadlines for Class 7', () => {
  assert.equal(MOCK_SCHOOL_CALENDAR.grade, 'Class 7');
  assert.ok(MOCK_SCHOOL_CALENDAR.exams.length >= 3);
  assert.ok(MOCK_SCHOOL_CALENDAR.assignments.length >= 3);
  assert.ok(MOCK_SCHOOL_CALENDAR.holidays.length >= 3);
  assert.ok(MOCK_SCHOOL_CALENDAR.initialVoiceNotes.length >= 2);

  const all = getAllCalendarEvents(MOCK_SCHOOL_CALENDAR);
  assert.equal(
    all.length,
    MOCK_SCHOOL_CALENDAR.exams.length +
      MOCK_SCHOOL_CALENDAR.assignments.length +
      MOCK_SCHOOL_CALENDAR.holidays.length
  );

  const examsOnly = filterCalendarEvents(all, { category: 'exam' });
  assert.equal(examsOnly.length, MOCK_SCHOOL_CALENDAR.exams.length);

  const days = getDaysRemaining('2026-11-02', '2026-10-24');
  assert.equal(days, 9);
});

test('stripMarkdownForSpeech cleans XML tags and markdown syntax for voice synthesis', () => {
  const input = '<medhavi_logic>- Step 1</medhavi_logic> ## Namaste **Jaipuria Medhavi**!';
  const cleaned = stripMarkdownForSpeech(input);
  assert.equal(cleaned, 'Namaste Jaipuria Medhavi !');
});

test('cleanRepeatedSpeechTokens collapses stuttered and repeated words/phrases', () => {
  const stuttered =
    'explain explain explain congruence congruence congruence congruence explain explain explain congruence of triangles';
  const cleaned = cleanRepeatedSpeechTokens(stuttered);
  assert.equal(cleaned, 'explain congruence of triangles');
});

test('Zero-Trust Security: constantTimeEquals, password/passcode checks, and anti-escalation signature checks', () => {
  assert.equal(constantTimeEquals('jaipuria123', 'jaipuria123'), true);
  assert.equal(constantTimeEquals('jaipuria123', 'jaipuria124'), false);
  assert.equal(constantTimeEquals('jaipuria123', 'jaipuria12'), false);
  assert.equal(verifyInstitutionalPassword('jaipuria123'), true);
  assert.equal(verifyInstitutionalPassword('wrong'), false);
  assert.equal(verifyFacultyPasscode('SMRJ-FAC-2026'), true);
  assert.equal(verifyFacultyPasscode('INVALID-CODE'), false);

  const studentId = signVerifiedIdentity(
    buildVerifiedIdentityResult({
      fullName: 'Atharva Jindal',
      role: 'student',
      schoolId: '13457',
      password: 'jaipuria123'
    })
  );
  assert.equal(verifyIdentityIntegrity(studentId), true);

  // Escalating student record to teacher in storage MUST fail integrity check
  const tamperedEscalation = { ...studentId, extractedRole: 'teacher' as const };
  assert.equal(verifyIdentityIntegrity(tamperedEscalation), false);

  // Masquerading faculty ID as student MUST fail integrity check
  const masqueradedFacultyAsStudent = signVerifiedIdentity({
    ...studentId,
    extractedRole: 'student',
    schoolId: 'SMRJ-FAC-00001'
  });
  assert.equal(verifyIdentityIntegrity(masqueradedFacultyAsStudent), false);
});

test('Zero-Trust Studio Isolation: isTestGenerationRequest blocks tests outside Studio while allowing lesson plans', () => {
  assert.equal(isTestGenerationRequest('Generate a 40-mark Half-Yearly Mathematics question paper'), true);
  assert.equal(isTestGenerationRequest('Create a diagnostic worksheet on Rational Numbers'), true);
  assert.equal(isTestGenerationRequest('Prepare a 40-minute lesson plan on Rational Numbers'), false);
  assert.equal(isTestGenerationRequest('Evaluate this student answer submission on photosynthesis'), false);
});

