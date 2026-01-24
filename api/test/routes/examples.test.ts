import request from 'supertest';
import express from 'express';
import examplesRouter from '../../src/routes/examples';
import fs from 'fs';
import path from 'path';

// Mock fs for file reading
jest.mock('fs');

const app = express();
app.use(express.json());
app.use('/api/examples', examplesRouter);

describe('Examples API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/examples', () => {
    it('should return list of example templates', async () => {
      const mockExamples = [
        {
          id: 'unity-cleanup',
          name: 'Unity Metadata Cleanup',
          description: 'Extract actual exception from Unity crash metadata',
          sdk: 'javascript',
          event: {
            event_id: 'test-123',
            exception: {
              values: [{
                type: 'UnityException',
                value: 'FATAL EXCEPTION [Thread-1] Unity version : 2021.3.0f1 Device model : samsung SM-A022M Resources$NotFoundException: File resource not found',
              }],
            },
          },
          beforeSendCode: '(event, hint) => {\n  // Extract actual exception\n  return event;\n}',
        },
        {
          id: 'pii-scrubbing',
          name: 'PII Scrubbing',
          description: 'Remove sensitive information from events',
          sdk: 'javascript',
          event: {
            event_id: 'test-456',
            message: 'User login failed for user@example.com',
            user: {
              email: 'user@example.com',
              ip_address: '192.168.1.1',
            },
          },
          beforeSendCode: '(event, hint) => {\n  // Scrub PII\n  return event;\n}',
        },
      ];

      // Mock fs.existsSync to return true
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Mock fs.readdirSync to return example file names
      (fs.readdirSync as jest.Mock).mockReturnValue(['unity-cleanup.json', 'pii-scrubbing.json']);

      // Mock fs.readFileSync to return example content
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('unity-cleanup.json')) {
          return JSON.stringify(mockExamples[0]);
        }
        if (filePath.includes('pii-scrubbing.json')) {
          return JSON.stringify(mockExamples[1]);
        }
        throw new Error('File not found');
      });

      const response = await request(app).get('/api/examples');

      expect(response.status).toBe(200);
      expect(response.body.examples).toHaveLength(2);
      expect(response.body.examples[0].id).toBe('unity-cleanup');
      expect(response.body.examples[0].name).toBe('Unity Metadata Cleanup');
      expect(response.body.examples[0]).toHaveProperty('description');
      expect(response.body.examples[0]).toHaveProperty('sdk');
      expect(response.body.examples[0]).toHaveProperty('event');
      expect(response.body.examples[0]).toHaveProperty('beforeSendCode');
    });

    it('should return empty array if no examples exist', async () => {
      // Mock empty examples directory
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      const response = await request(app).get('/api/examples');

      expect(response.status).toBe(200);
      expect(response.body.examples).toHaveLength(0);
    });

    it('should filter out non-JSON files', async () => {
      const mockExample = {
        id: 'unity-cleanup',
        name: 'Unity Metadata Cleanup',
        description: 'Test',
        sdk: 'javascript',
        event: { event_id: '123' },
        beforeSendCode: 'code',
      };

      // Mock directory with mixed files
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([
        'unity-cleanup.json',
        'README.md',
        '.DS_Store',
        'test.txt',
      ]);

      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('unity-cleanup.json')) {
          return JSON.stringify(mockExample);
        }
        throw new Error('Should not read non-JSON files');
      });

      const response = await request(app).get('/api/examples');

      expect(response.status).toBe(200);
      expect(response.body.examples).toHaveLength(1);
      expect(response.body.examples[0].id).toBe('unity-cleanup');
    });

    it('should handle file read errors gracefully', async () => {
      // Mock file read error
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['example.json']);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File read error');
      });

      const response = await request(app).get('/api/examples');

      expect(response.status).toBe(200);
      expect(response.body.examples).toHaveLength(0);
    });

    it('should handle invalid JSON gracefully', async () => {
      const validExample = {
        id: 'valid',
        name: 'Valid Example',
        description: 'Test',
        sdk: 'javascript',
        event: { event_id: '123' },
        beforeSendCode: 'code',
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['valid.json', 'invalid.json']);
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('invalid.json')) {
          return '{invalid json';
        }
        if (filePath.endsWith('valid.json')) {
          return JSON.stringify(validExample);
        }
        throw new Error('Unknown file');
      });

      const response = await request(app).get('/api/examples');

      expect(response.status).toBe(200);
      expect(response.body.examples).toHaveLength(1);
      expect(response.body.examples[0].id).toBe('valid');
    });

    it('should validate example structure', async () => {
      const incompleteExample = {
        id: 'incomplete',
        name: 'Incomplete Example',
        // Missing: description, sdk, event, beforeSendCode
      };

      const completeExample = {
        id: 'complete',
        name: 'Complete Example',
        description: 'Test',
        sdk: 'javascript',
        event: { event_id: '123' },
        beforeSendCode: 'code',
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['incomplete.json', 'complete.json']);
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('incomplete.json')) {
          return JSON.stringify(incompleteExample);
        }
        if (filePath.includes('complete.json')) {
          return JSON.stringify(completeExample);
        }
        throw new Error('Unknown file');
      });

      const response = await request(app).get('/api/examples');

      expect(response.status).toBe(200);
      expect(response.body.examples).toHaveLength(1);
      expect(response.body.examples[0].id).toBe('complete');
    });

    it('should load examples for multiple SDK types', async () => {
      const mockExamples = [
        {
          id: 'pii-scrubbing-python',
          name: 'PII Scrubbing (Python)',
          description: 'Python regex patterns',
          sdk: 'python',
          event: { event_id: '1' },
          beforeSendCode: 'def before_send(event, hint): return event',
        },
        {
          id: 'pii-scrubbing-dotnet',
          name: 'PII Scrubbing (.NET)',
          description: 'C# regex patterns',
          sdk: 'dotnet',
          event: { event_id: '2' },
          beforeSendCode: 'public SentryEvent BeforeSend(SentryEvent ev) { return ev; }',
        },
        {
          id: 'conditional-dropping-go',
          name: 'Conditional Event Dropping (Go)',
          description: 'Go filtering patterns',
          sdk: 'go',
          event: { event_id: '3' },
          beforeSendCode: 'func beforeSend(event *sentry.Event) *sentry.Event { return event }',
        },
        {
          id: 'android-context-enrichment',
          name: 'Android Context Enrichment',
          description: 'Android-specific context',
          sdk: 'android',
          event: { event_id: '4' },
          beforeSendCode: 'override fun execute(event: SentryEvent): SentryEvent { return event }',
        },
      ];

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(mockExamples.map(e => `${e.id}.json`));
      (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
        const example = mockExamples.find(e => filePath.includes(`${e.id}.json`));
        if (example) return JSON.stringify(example);
        throw new Error('File not found');
      });

      const response = await request(app).get('/api/examples');

      expect(response.status).toBe(200);
      expect(response.body.examples).toHaveLength(4);

      // Verify we have examples from different SDKs
      const sdks = response.body.examples.map((e: any) => e.sdk);
      expect(sdks).toContain('python');
      expect(sdks).toContain('dotnet');
      expect(sdks).toContain('go');
      expect(sdks).toContain('android');
    });
  });

  describe('GET /api/examples/:id', () => {
    it('should return specific example by id', async () => {
      const mockExample = {
        id: 'unity-cleanup',
        name: 'Unity Metadata Cleanup',
        description: 'Test',
        sdk: 'javascript',
        event: { event_id: '123' },
        beforeSendCode: 'code',
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['unity-cleanup.json']);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockExample));

      const response = await request(app).get('/api/examples/unity-cleanup');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('unity-cleanup');
      expect(response.body.name).toBe('Unity Metadata Cleanup');
    });

    it('should return 404 if example not found', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      const response = await request(app).get('/api/examples/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Example not found');
    });
  });
});
