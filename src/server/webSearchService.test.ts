import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  evaluateWebSearchNeed,
  isAppropriateWebSource,
  isAppropriateTextForSchool,
  type WebSearchSource
} from './webSearchService.ts';
import { createApp } from './app.ts';

test('isAppropriateWebSource blocks adult, gambling, ad-tracker, shopping, localhost, and off-topic links', () => {
  const query = 'ISRO Chandrayaan lunar mission';

  const blockedCases: WebSearchSource[] = [
    {
      title: 'Explicit adult videos',
      url: 'https://pornhub.com/chandrayaan',
      domain: 'pornhub.com',
      snippet: 'nsfw adult video content'
    },
    {
      title: 'Online betting odds for ISRO launch',
      url: 'https://bet365.com/isro-betting',
      domain: 'bet365.com',
      snippet: 'Place live sportsbook casino bets'
    },
    {
      title: 'Sponsored Ad Result',
      url: 'https://duckduckgo.com/y.js?ad_domain=example.com&u3=foo',
      domain: 'duckduckgo.com',
      snippet: 'ISRO space mission toy'
    },
    {
      title: 'Buy ISRO Rocket Model on Amazon',
      url: 'https://www.amazon.in/dp/B09ISRO',
      domain: 'amazon.in',
      snippet: 'Shop ISRO Chandrayaan model kit online'
    },
    {
      title: 'Localhost test page',
      url: 'http://localhost:3000/isro',
      domain: 'localhost',
      snippet: 'ISRO Chandrayaan'
    },
    {
      title: 'Unrelated Gardening Blog',
      url: 'https://example.org/growing-tomatoes',
      domain: 'example.org',
      snippet: 'Tips for watering heirloom tomatoes in summer'
    }
  ];

  for (const src of blockedCases) {
    assert.equal(
      isAppropriateWebSource(src, query),
      false,
      `Expected blocked source to be rejected: ${src.url}`
    );
  }
});

test('isAppropriateWebSource accepts clean educational sources and safe Gemini grounding redirects', () => {
  const query = 'ISRO Chandrayaan lunar mission';

  const cleanSource: WebSearchSource = {
    title: 'Chandrayaan-3 — ISRO Official Mission Overview',
    url: 'https://www.isro.gov.in/Chandrayaan3_Details.html',
    domain: 'isro.gov.in',
    snippet: 'ISRO Chandrayaan-3 achieved a soft landing near the lunar south pole.'
  };
  assert.equal(isAppropriateWebSource(cleanSource, query), true);

  const safeGroundingRedirect: WebSearchSource = {
    title: 'isro.gov.in',
    url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc123',
    domain: 'vertexaisearch.cloud.google.com',
    snippet: 'Verified via Google Search grounding'
  };
  assert.equal(
    isAppropriateWebSource(safeGroundingRedirect, query, { allowGroundingRedirect: true }),
    true
  );

  const unsafeGroundingRedirect: WebSearchSource = {
    title: 'amazon.in',
    url: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/xyz999',
    domain: 'vertexaisearch.cloud.google.com',
    snippet: 'Verified via Google Search grounding'
  };
  assert.equal(
    isAppropriateWebSource(unsafeGroundingRedirect, query, { allowGroundingRedirect: true }),
    false
  );

  assert.equal(isAppropriateTextForSchool('Photosynthesis converts light energy into glucose.'), true);
  assert.equal(isAppropriateTextForSchool('Free casino gambling roulette spin'), false);
});

test('evaluateWebSearchNeed only triggers web search when genuinely needed', () => {
  // Disabled
  assert.equal(
    evaluateWebSearchNeed({
      query: 'What is the latest ISRO space mission in 2026?',
      webSearchEnabled: false,
      strongTextbookMatch: false
    }).needed,
    false
  );

  // Greeting
  assert.equal(
    evaluateWebSearchNeed({
      query: 'Hi!',
      webSearchEnabled: true,
      strongTextbookMatch: false
    }).needed,
    false
  );

  // Creative writing / conversational
  assert.equal(
    evaluateWebSearchNeed({
      query: 'Write a short essay on my school',
      webSearchEnabled: true,
      strongTextbookMatch: false
    }).needed,
    false
  );

  // Pure calculation / homework
  assert.equal(
    evaluateWebSearchNeed({
      query: '9/3',
      webSearchEnabled: true,
      strongTextbookMatch: false
    }).needed,
    false
  );
  assert.equal(
    evaluateWebSearchNeed({
      query: 'Solve 2x + 5 = 15',
      webSearchEnabled: true,
      strongTextbookMatch: false
    }).needed,
    false
  );

  // Restricted studio workflow
  assert.equal(
    evaluateWebSearchNeed({
      query: 'Latest news 2026',
      workflowType: 'revision_quiz',
      webSearchEnabled: true,
      strongTextbookMatch: false
    }).needed,
    false
  );

  // Strongly covered Grade 7 textbook topic (no live/current intent)
  const textbookDecision = evaluateWebSearchNeed({
    query: 'Explain percentage and its applications',
    subject: 'Mathematics',
    webSearchEnabled: true,
    strongTextbookMatch: true
  });
  assert.equal(textbookDecision.needed, false);
  assert.equal(textbookDecision.reason, 'covered_by_textbook');

  // Current / time-sensitive query triggers web search even if textbook matched
  const currentDecision = evaluateWebSearchNeed({
    query: 'What is the latest ISRO Gaganyaan mission update in 2026?',
    subject: 'Physics',
    webSearchEnabled: true,
    strongTextbookMatch: true
  });
  assert.equal(currentDecision.needed, true);
  assert.equal(currentDecision.reason, 'current_or_time_sensitive');

  // Explicit user request to search the web
  const explicitDecision = evaluateWebSearchNeed({
    query: 'Search the web for photosynthesis diagrams and links',
    subject: 'Biology',
    webSearchEnabled: true,
    strongTextbookMatch: true
  });
  assert.equal(explicitDecision.needed, true);
  assert.equal(explicitDecision.reason, 'explicit_web_request');

  // Beyond-textbook general knowledge query
  const beyondDecision = evaluateWebSearchNeed({
    query: 'How does quantum computing use qubits?',
    subject: 'Computer Studies',
    webSearchEnabled: true,
    strongTextbookMatch: false
  });
  assert.equal(beyondDecision.needed, true);
  assert.equal(beyondDecision.reason, 'beyond_textbook_general_knowledge');
});

test('POST /api/chat skips unnecessary web search for textbook topics and calculations even when webSearchEnabled is true', async () => {
  const app = createApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Textbook topic should NOT attach web results
    const textbookRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Explain percentage and its applications' }],
        context: { role: 'student', subject: 'All Subjects', intelligenceMode: 'pedagogical' },
        webSearchEnabled: true
      })
    });
    assert.equal(textbookRes.status, 200);
    const textbookData = await textbookRes.json();
    assert.deepEqual(textbookData.webSources, []);
    assert.equal(textbookData.webSearchProvider, 'not-needed');

    // 2. Pure math calculation should NOT attach web results
    const mathRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: '9/3' }],
        context: { role: 'student', subject: 'All Subjects', intelligenceMode: 'pedagogical' },
        webSearchEnabled: true
      })
    });
    assert.equal(mathRes.status, 200);
    const mathData = await mathRes.json();
    assert.deepEqual(mathData.webSources, []);
    assert.equal(mathData.webSearchProvider, 'not-needed');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
