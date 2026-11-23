import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  GRADE_7_TEXTBOOK_CATALOG,
  getGrade7BooksGrouped,
  searchGrade7TextbookReferences,
  formatTextbookGroundingBlock
} from './grade7Textbooks.ts';
import { createApp } from '../server/app.ts';

test('Grade 7 textbook catalog matches Seth M.R. Jaipuria 2026-27 book list with page ranges', () => {
  const grouped = getGrade7BooksGrouped();
  assert.ok(grouped.length >= 11, `Expected >=11 subjects including Financial Education, got ${grouped.length}`);
  assert.ok(GRADE_7_TEXTBOOK_CATALOG.length >= 18, 'Expected >=18 indexed chapters');

  for (const ch of GRADE_7_TEXTBOOK_CATALOG) {
    assert.ok(ch.textbook.length > 5);
    assert.ok(ch.pageRange.startsWith('pp.'), `Missing pageRange on ${ch.id}`);
    assert.ok(ch.ncseBridge.length > 5);
    assert.ok(ch.keyConcepts.length > 0);
    assert.ok(ch.formulasOrFacts.length > 0);
  }

  // Spot check official 2026-27 prescribed authors & titles
  assert.ok(grouped.some((b) => /M\.L\. Aggarwal/i.test(b.primaryBook)));
  assert.ok(grouped.some((b) => /Srijan ICSE Physics/i.test(b.primaryBook)));
  assert.ok(grouped.some((b) => /Learning Elementary Biology/i.test(b.primaryBook)));
  assert.ok(grouped.some((b) => /Concise Chemistry/i.test(b.primaryBook)));
  assert.ok(grouped.some((b) => /Empowering English/i.test(b.primaryBook)));
  assert.ok(grouped.some((b) => /Frank Modern Certificate/i.test(b.primaryBook)));
  assert.ok(grouped.some((b) => /Explore Possibilities With Computers/i.test(b.primaryBook)));
  assert.ok(grouped.some((b) => /Train Your Brain/i.test(b.primaryBook)));
  assert.ok(grouped.some((b) => /Financial Education Work Book/i.test(b.primaryBook)));
  assert.ok(grouped.some((b) => /Dev Bhasha/i.test(b.primaryBook)));
  assert.ok(grouped.some((b) => /ओस के मोती/i.test(b.primaryBook)));
});

test('matches Congruence of Triangles to M.L. Aggarwal Understanding Mathematics Ch. 15', () => {
  const matches = searchGrade7TextbookReferences({
    subject: 'Mathematics',
    query: 'Explain SAS and RHS congruence of triangles'
  });
  assert.ok(matches.length > 0);
  assert.equal(matches[0].id, 'math-ch16-triangles-congruence');
  assert.match(matches[0].textbook, /Understanding Mathematics.*Aggarwal/);
  assert.match(matches[0].pageRange, /^pp\./);
});

test('matches Heat Transfer to Srijan ICSE Physics Ch. 5 by S.C. Gupta', () => {
  const matches = searchGrade7TextbookReferences({
    subject: 'Physics',
    query: 'How does a thermos flask reduce conduction, convection, and radiation?'
  });
  assert.ok(matches.length > 0);
  assert.equal(matches[0].id, 'phys-ch5-heat');
  assert.match(matches[0].textbook, /Srijan ICSE Physics/);
  assert.match(matches[0].ncseBridge, /NCERT Class VII/);
});

test('formats silent syllabus context block without forcing Book & Page Reference footers', () => {
  const matches = searchGrade7TextbookReferences({
    subject: 'Mathematics',
    query: 'percentage and its applications'
  });
  assert.ok(matches.length > 0);
  assert.equal(matches[0].id, 'math-ch9-commercial-arithmetic');
  const block = formatTextbookGroundingBlock(matches);
  assert.match(block, /SETH M\.R\. JAIPURIA SCHOOL, LUCKNOW \(SESSION 2026-27\)/);
  assert.match(block, /SILENT SYLLABUS CONTEXT/);
  assert.match(block, /Do NOT append a "Book & Page Reference:"/);
});

test('API endpoints /api/textbooks, /api/chat (no Book & Page Reference footer & Zero Answer Leakage intact) work end-to-end', async () => {
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. GET /api/textbooks
    const booksRes = await fetch(`${baseUrl}/api/textbooks?subject=Mathematics`);
    assert.equal(booksRes.status, 200);
    const booksData = await booksRes.json();
    assert.equal(booksData.grade, 'Class 7');
    assert.ok(Array.isArray(booksData.books) && booksData.books.length === 1);
    assert.match(booksData.books[0].primaryBook, /Aggarwal/);

    // 2. GET /api/textbooks?q=photosynthesis
    const searchRes = await fetch(`${baseUrl}/api/textbooks?q=photosynthesis`);
    assert.equal(searchRes.status, 200);
    const searchData = await searchRes.json();
    assert.ok(searchData.matches.length > 0);
    assert.equal(searchData.matches[0].id, 'bio-ch4-photosynthesis-respiration');
    assert.match(searchData.matches[0].textbook, /Learning Elementary Biology/);

    // 3. POST /api/chat omits forced Book & Page Reference footer & keeps Student Zero Answer Leakage intact on "9/3"
    const leakRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: '9/3' }],
        context: { role: 'student', subject: 'All Subjects' },
        webSearchEnabled: false
      })
    });
    assert.equal(leakRes.status, 200);
    const leakData = await leakRes.json();
    assert.doesNotMatch(leakData.reply, /Book\s*&\s*Page\s*Reference\s*:/i);
    assert.ok(leakData.manualReference?.totalPages >= 75);
    assert.doesNotMatch(leakData.reply, /=\s*3\b/);

    // 4. POST /api/chat with webSearchEnabled: true returns webSources array & no Book & Page Reference footer
    const webChatRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Explain percentage and its applications' }],
        context: { role: 'student', subject: 'All Subjects', webSearchEnabled: true },
        webSearchEnabled: true
      })
    });
    assert.equal(webChatRes.status, 200);
    const webChatData = await webChatRes.json();
    assert.doesNotMatch(webChatData.reply, /Book\s*&\s*Page\s*Reference\s*:/i);
    assert.doesNotMatch(webChatData.reply, /Explore Possibilities With Computers/i);
    assert.ok(Array.isArray(webChatData.webSources));
    assert.ok(typeof webChatData.webSearchProvider === 'string');

    // 5. GET /api/manual/pdf returns actual 75-page PDF bytes for page image rendering
    const pdfRes = await fetch(`${baseUrl}/api/manual/pdf`);
    assert.equal(pdfRes.status, 200);
    assert.match(pdfRes.headers.get('content-type') || '', /application\/pdf/);
    const pdfBuf = await pdfRes.arrayBuffer();
    assert.ok(pdfBuf.byteLength > 10000, 'Expected actual PDF binary bytes');

    // 6. GET /api/textbooks/page-images returns structured metadata & image list
    const imgRes = await fetch(`${baseUrl}/api/textbooks/page-images?chapterId=bio-ch1-tissues`);
    assert.equal(imgRes.status, 200);
    const imgData = await imgRes.json();
    assert.equal(imgData.chapterId, 'bio-ch1-tissues');
    assert.equal(imgData.manualPdfUrl, '/api/manual/pdf');
    assert.ok(Array.isArray(imgData.images));
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
