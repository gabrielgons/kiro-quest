import * as fs from 'node:fs';
import * as path from 'node:path';

const testFile = path.join('content', 'questions', 'pt-BR', '_test-invalid.json');
const data = {
  stage: 'test',
  locale: '',
  questions: [
    {
      id: 'kb-001',
      difficulty: 'invalid',
      type: 'invalid-type',
      text: 'test',
      options: [],
      explanation: '',
      sourceUrl: '',
      reviewStatus: 'draft',
      lastReviewedDate: '2025-01-01'
    }
  ]
};
fs.writeFileSync(testFile, JSON.stringify(data, null, 2));
console.log('Test file created:', testFile);
