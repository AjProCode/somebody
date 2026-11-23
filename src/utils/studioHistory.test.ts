import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadStudioHistory,
  loadAllStudioHistory,
  saveStudioHistoryEntry,
  deleteStudioHistoryEntry,
  clearStudioHistory,
  mergeStudioHistoryLists,
  formatHistoryTimestamp,
  type StorageAdapter
} from './studioHistory';

function createMemoryStorage(): StorageAdapter {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    }
  };
}

describe('studioHistory', () => {
  it('stores and loads history isolated per studioId and role', () => {
    const storage = createMemoryStorage();

    saveStudioHistoryEntry(
      {
        studioId: 'revision_arena',
        role: 'student',
        ownerId: '13457',
        title: 'Rational Numbers Drill',
        subtitle: 'Mixed Pattern · Standard · 10 Qs',
        subject: 'Mathematics',
        inputsSnapshot: { topic: 'Rational Numbers', questionCount: 10 },
        result: { content: '# Test Output', durationSeconds: 1.4 }
      },
      storage
    );

    saveStudioHistoryEntry(
      {
        studioId: 'revision',
        role: 'student',
        ownerId: '13457',
        title: 'Heat Transfer Card',
        subtitle: '5-Minute High-Yield Chapter Summary',
        subject: 'Physics',
        inputsSnapshot: { topic: 'Heat Transfer' },
        result: { content: '# Heat Revision', durationSeconds: 1.1 }
      },
      storage
    );

    saveStudioHistoryEntry(
      {
        studioId: 'lesson_arch',
        role: 'teacher',
        ownerId: 'FAC-101',
        title: 'Exterior Angle Theorem (VII-A)',
        subtitle: 'Class VII-A · Inquiry-Based',
        subject: 'Mathematics',
        inputsSnapshot: { topic: 'Exterior Angle Theorem', classSection: 'VII-A' },
        result: { content: '# Lesson Plan', durationSeconds: 2.0 }
      },
      storage
    );

    const revTests = loadStudioHistory('revision_arena', 'student', storage);
    const revCards = loadStudioHistory('revision', 'student', storage);
    const teacherLessons = loadStudioHistory('lesson_arch', 'teacher', storage);
    const studentLessons = loadStudioHistory('lesson_arch', 'student', storage);

    assert.equal(revTests.length, 1);
    assert.equal(revTests[0].title, 'Rational Numbers Drill');
    assert.equal(revCards.length, 1);
    assert.equal(revCards[0].title, 'Heat Transfer Card');
    assert.equal(teacherLessons.length, 1);
    assert.equal(studentLessons.length, 0);

    assert.equal(loadAllStudioHistory('student', storage).length, 2);
    assert.equal(loadAllStudioHistory('teacher', storage).length, 1);
  });

  it('deletes single entries and clears only the target studio and role', () => {
    const storage = createMemoryStorage();

    const first = saveStudioHistoryEntry(
      {
        studioId: 'evaluator',
        role: 'teacher',
        ownerId: 'FAC-1',
        title: 'Eval 1',
        subtitle: '4/5 Marks',
        subject: 'Mathematics',
        inputsSnapshot: { questionPrompt: 'Q1' },
        result: { content: 'Report 1', durationSeconds: 1.2 },
        timestamp: 1000
      },
      storage
    );

    const second = saveStudioHistoryEntry(
      {
        studioId: 'evaluator',
        role: 'teacher',
        ownerId: 'FAC-1',
        title: 'Eval 2',
        subtitle: '5/5 Marks',
        subject: 'Physics',
        inputsSnapshot: { questionPrompt: 'Q2' },
        result: { content: 'Report 2', durationSeconds: 1.5 },
        timestamp: 2000
      },
      storage
    );

    const circ = saveStudioHistoryEntry(
      {
        studioId: 'circular',
        role: 'teacher',
        ownerId: 'FAC-1',
        title: 'PTM Circular',
        subtitle: 'Parents',
        subject: 'Mathematics',
        inputsSnapshot: { circularType: 'ptm' },
        result: { content: 'Notice', durationSeconds: 1.0 },
        timestamp: 3000
      },
      storage
    );

    deleteStudioHistoryEntry(first.id, storage);
    const afterDelete = loadStudioHistory('evaluator', 'teacher', storage);
    assert.equal(afterDelete.length, 1);
    assert.equal(afterDelete[0].id, second.id);

    const removed = clearStudioHistory('evaluator', 'teacher', storage);
    assert.equal(removed.length, 1);
    assert.equal(loadStudioHistory('evaluator', 'teacher', storage).length, 0);
    assert.equal(loadStudioHistory('circular', 'teacher', storage)[0].id, circ.id);
  });

  it('merges cloud and local entries by newest timestamp without dropping local items', () => {
    const storage = createMemoryStorage();
    saveStudioHistoryEntry(
      {
        id: 'local-only',
        studioId: 'revision',
        role: 'student',
        ownerId: '13457',
        title: 'Local Flash Card',
        subtitle: 'Summary',
        subject: 'Chemistry',
        inputsSnapshot: { topic: 'Valency' },
        result: { content: 'Valency notes', durationSeconds: 1.0 },
        timestamp: 5000
      },
      storage
    );

    const merged = mergeStudioHistoryLists(
      [
        {
          id: 'cloud-only',
          studioId: 'revision_arena',
          role: 'student',
          ownerId: '13457',
          title: 'Cloud Revision Quiz',
          subtitle: 'MCQs',
          subject: 'Biology',
          inputsSnapshot: { topic: 'Plant Tissues' },
          result: { content: 'Quiz content', durationSeconds: 1.8 },
          timestamp: 6000
        }
      ],
      storage
    );

    assert.equal(merged.length, 2);
    assert.equal(merged[0].id, 'cloud-only');
    assert.equal(merged[1].id, 'local-only');
  });

  it('formats same-day timestamps cleanly', () => {
    const now = new Date('2026-11-19T15:30:00').getTime();
    const sameDay = new Date('2026-11-19T10:15:00').getTime();
    const formatted = formatHistoryTimestamp(sameDay, now);
    assert.ok(formatted.startsWith('Today · '));
  });
});
