import request from 'supertest';
import express from 'express';
import transformRouter from '../../src/routes/transform';
import examplesRouter from '../../src/routes/examples';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());
app.use('/api/transform', transformRouter);
app.use('/api/examples', examplesRouter);

// Load actual example files
function loadExampleFiles() {
  const examplesDir = path.join(__dirname, '../../examples');
  const files = fs.readdirSync(examplesDir).filter(f => f.endsWith('.json'));
  return files.map(file => {
    const content = fs.readFileSync(path.join(examplesDir, file), 'utf-8');
    return JSON.parse(content);
  });
}

describe('Examples Integration Tests', () => {
  const examples = loadExampleFiles();

  describe('All examples should transform without syntax errors', () => {
    examples.forEach((example) => {
      it(`should transform successfully: ${example.name} (${example.sdk})`, async () => {
        const response = await request(app)
          .post('/api/transform')
          .send({
            sdk: example.sdk,
            event: example.event,
            beforeSendCode: example.beforeSendCode,
          })
          .set('Content-Type', 'application/json');

        // Check response structure
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success');

        // If transformation failed, log the error for debugging
        if (!response.body.success) {
          console.error(`\nTransformation failed for ${example.name}:`);
          console.error('SDK:', example.sdk);
          console.error('Error:', response.body.error);
          console.error('Details:', response.body.details);
        }

        // Assert transformation succeeded
        expect(response.body.success).toBe(true);

        // Some examples may drop events (return null), which is valid
        // transformedEvent will be undefined in these cases
        // Only check that success is true, not that transformedEvent exists
      }, 30000); // 30 second timeout for SDK container calls
    });
  });

  describe('Examples should return valid event structure', () => {
    examples.forEach((example) => {
      it(`should return event with event_id: ${example.name}`, async () => {
        const response = await request(app)
          .post('/api/transform')
          .send({
            sdk: example.sdk,
            event: example.event,
            beforeSendCode: example.beforeSendCode,
          })
          .set('Content-Type', 'application/json');

        if (response.body.success) {
          // If transformation returned an event (not dropped)
          if (response.body.transformedEvent !== null && response.body.transformedEvent !== undefined) {
            // Check for event_id (lowercase) or EventId (Pascal case for .NET)
            const hasEventId =
              response.body.transformedEvent.event_id !== undefined ||
              response.body.transformedEvent.EventId !== undefined;
            expect(hasEventId).toBe(true);
          }
          // Otherwise event was dropped, which is valid behavior
        }
      }, 30000);
    });
  });

  describe('Example SDK types should be valid', () => {
    const validSdks = [
      'javascript',
      'python',
      'dotnet',
      'ruby',
      'php',
      'go',
      'java',
      'android',
      'cocoa',
    ];

    examples.forEach((example) => {
      it(`should have valid SDK type: ${example.name}`, () => {
        expect(validSdks).toContain(example.sdk);
      });
    });
  });

  describe('Example structure validation', () => {
    examples.forEach((example) => {
      it(`should have all required fields: ${example.name}`, () => {
        expect(example).toHaveProperty('id');
        expect(example).toHaveProperty('name');
        expect(example).toHaveProperty('description');
        expect(example).toHaveProperty('sdk');
        expect(example).toHaveProperty('event');
        expect(example).toHaveProperty('beforeSendCode');

        expect(typeof example.id).toBe('string');
        expect(typeof example.name).toBe('string');
        expect(typeof example.description).toBe('string');
        expect(typeof example.sdk).toBe('string');
        expect(typeof example.event).toBe('object');
        expect(typeof example.beforeSendCode).toBe('string');

        expect(example.id.length).toBeGreaterThan(0);
        expect(example.name.length).toBeGreaterThan(0);
        expect(example.beforeSendCode.length).toBeGreaterThan(0);
      });
    });
  });
});
