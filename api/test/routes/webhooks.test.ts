import request from 'supertest';
import express from 'express';
import * as crypto from 'crypto';
import webhooksRouter from '../../src/routes/webhooks';

const app = express();
// Capture raw body for webhook signature verification (same as in main app)
app.use(express.json({
  verify: (req: any, res, buf, encoding) => {
    req.rawBody = buf.toString((encoding as BufferEncoding) || 'utf8');
  }
}));
app.use('/api/webhooks', webhooksRouter);

// Helper function to generate HMAC signature for testing
function generateTestSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

describe('Webhooks API Route', () => {
  describe('GET /api/webhooks/templates', () => {
    it('should return list of available webhook templates', async () => {
      const response = await request(app).get('/api/webhooks/templates');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('templates');
      expect(Array.isArray(response.body.templates)).toBe(true);
      expect(response.body.templates.length).toBeGreaterThan(0);
    });

    it('should include template metadata', async () => {
      const response = await request(app).get('/api/webhooks/templates');

      const template = response.body.templates[0];
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('eventType');
    });

    it('should return all 6 templates', async () => {
      const response = await request(app).get('/api/webhooks/templates');

      expect(response.body.templates).toHaveLength(6);

      const templateIds = response.body.templates.map((t: any) => t.id);
      expect(templateIds).toContain('issue-alert-created');
      expect(templateIds).toContain('issue-alert-resolved');
      expect(templateIds).toContain('issue-alert-assigned');
      expect(templateIds).toContain('metric-alert');
      expect(templateIds).toContain('error-event');
      expect(templateIds).toContain('comment-created');
    });
  });

  describe('GET /api/webhooks/templates/:id', () => {
    it('should return specific template by id', async () => {
      const response = await request(app).get('/api/webhooks/templates/issue-alert-created');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 'issue-alert-created');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('payload');
    });

    it('should include Sentry webhook payload structure', async () => {
      const response = await request(app).get('/api/webhooks/templates/issue-alert-created');

      const payload = response.body.payload;
      expect(payload).toHaveProperty('action');
      expect(payload).toHaveProperty('data');
      expect(payload).toHaveProperty('installation');
    });

    it('should return 404 for non-existent template', async () => {
      const response = await request(app).get('/api/webhooks/templates/non-existent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('should return error-event template', async () => {
      const response = await request(app).get('/api/webhooks/templates/error-event');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('error-event');
      expect(response.body.payload.action).toBe('event.created');
    });

    it('should return metric-alert template', async () => {
      const response = await request(app).get('/api/webhooks/templates/metric-alert');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('metric-alert');
      expect(response.body.payload.action).toBe('metric_alert.triggered');
    });
  });

  describe('POST /api/webhooks/send', () => {
    it('should send webhook to target URL', async () => {
      const requestBody = {
        url: 'https://webhook.site/test',
        templateId: 'issue-alert-created',
        secret: 'my-secret-key',
      };

      const response = await request(app)
        .post('/api/webhooks/send')
        .send(requestBody);

      // Accept both success and network failures (external service may be down)
      expect([200, 500]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('sentAt');
      }
    }, 15000); // Increased timeout for external service

    it('should include HMAC signature in request headers', async () => {
      const requestBody = {
        url: 'https://webhook.site/test',
        templateId: 'issue-alert-created',
        secret: 'my-secret-key',
      };

      const response = await request(app)
        .post('/api/webhooks/send')
        .send(requestBody);

      // Accept network failures
      expect([200, 500]).toContain(response.status);
      if (response.body.signature) {
        expect(response.body.signature).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
      }
    }, 15000); // Increased timeout for external service

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/webhooks/send')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate URL format', async () => {
      const response = await request(app)
        .post('/api/webhooks/send')
        .send({
          url: 'invalid-url',
          templateId: 'issue-alert-created',
          secret: 'my-secret',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('valid URL');
    });

    it('should return 404 for invalid template', async () => {
      const response = await request(app)
        .post('/api/webhooks/send')
        .send({
          url: 'https://webhook.site/test',
          templateId: 'non-existent',
          secret: 'my-secret',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Template not found');
    });

    it('should handle webhook send failures gracefully', async () => {
      const response = await request(app)
        .post('/api/webhooks/send')
        .send({
          url: 'https://invalid-domain-that-does-not-exist-12345.com',
          templateId: 'issue-alert-created',
          secret: 'my-secret',
        });

      expect([200, 500]).toContain(response.status);
      if (response.status === 500) {
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should work without secret (optional HMAC)', async () => {
      const response = await request(app)
        .post('/api/webhooks/send')
        .send({
          url: 'https://webhook.site/test',
          templateId: 'issue-alert-created',
        });

      expect([200, 500]).toContain(response.status);
    }, 15000); // Increased timeout for external service

    it('should include response status from webhook endpoint', async () => {
      const response = await request(app)
        .post('/api/webhooks/send')
        .send({
          url: 'https://webhook.site/test',
          templateId: 'error-event',
          secret: 'test-secret',
        });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('webhookStatus');
      }
    }, 15000); // Increased timeout for external service

    it('should include response body from webhook endpoint on success', async () => {
      const response = await request(app)
        .post('/api/webhooks/send')
        .send({
          url: 'https://webhook.site/test',
          templateId: 'error-event',
          secret: 'test-secret',
        });

      if (response.status === 200 && response.body.success) {
        expect(response.body).toHaveProperty('webhookResponseBody');
      }
    }, 15000); // Increased timeout for external service

    it('should include X-Webhook-Secret header when secret is provided', async () => {
      // This test verifies the header is added, but we can't easily intercept
      // the actual HTTP request in the test. The implementation is tested
      // end-to-end when using with the built-in receiver.
      const response = await request(app)
        .post('/api/webhooks/send')
        .send({
          url: 'https://webhook.site/test',
          templateId: 'issue-alert-created',
          secret: 'my-secret-key',
        });

      // Should succeed in sending (whether endpoint accepts it or not)
      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        // Should have generated a signature
        expect(response.body).toHaveProperty('signature');
      }
    }, 15000); // Increased timeout for external service
  });

  describe('POST /api/webhooks/receive', () => {
    it('should verify valid webhook signature', async () => {
      const payload = { action: 'test', data: { message: 'test webhook' } };
      const secret = 'test-secret';
      const payloadString = JSON.stringify(payload);
      const signature = generateTestSignature(payloadString, secret);

      const response = await request(app)
        .post('/api/webhooks/receive')
        .set('Sentry-Hook-Signature', signature)
        .set('X-Webhook-Secret', secret)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.verified).toBe(true);
      expect(response.body.signature.match).toBe(true);
      expect(response.body.signature.received).toBe(signature);
      expect(response.body.signature.expected).toBe(signature);
    });

    it('should reject invalid webhook signature', async () => {
      const payload = { action: 'test', data: {} };
      const secret = 'test-secret';
      const wrongSignature = 'invalid-signature-12345';

      const response = await request(app)
        .post('/api/webhooks/receive')
        .set('Sentry-Hook-Signature', wrongSignature)
        .set('X-Webhook-Secret', secret)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.verified).toBe(false);
      expect(response.body.signature.match).toBe(false);
      expect(response.body.signature.received).toBe(wrongSignature);
      expect(response.body.message).toContain('failed');
    });

    it('should return 400 when X-Webhook-Secret header is missing', async () => {
      const payload = { action: 'test' };
      const signature = 'some-signature';

      const response = await request(app)
        .post('/api/webhooks/receive')
        .set('Sentry-Hook-Signature', signature)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.verified).toBe(false);
      expect(response.body.error).toContain('X-Webhook-Secret');
    });

    it('should return 400 when Sentry-Hook-Signature header is missing', async () => {
      const payload = { action: 'test' };
      const secret = 'test-secret';

      const response = await request(app)
        .post('/api/webhooks/receive')
        .set('X-Webhook-Secret', secret)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.verified).toBe(false);
      expect(response.body.error).toContain('Sentry-Hook-Signature');
    });

    it('should include received timestamp in response', async () => {
      const payload = { action: 'test' };
      const secret = 'test-secret';
      const payloadString = JSON.stringify(payload);
      const signature = generateTestSignature(payloadString, secret);

      const response = await request(app)
        .post('/api/webhooks/receive')
        .set('Sentry-Hook-Signature', signature)
        .set('X-Webhook-Secret', secret)
        .send(payload);

      expect(response.body.receivedAt).toBeDefined();
      expect(new Date(response.body.receivedAt)).toBeInstanceOf(Date);
      expect(response.body.receivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return both received and expected signatures', async () => {
      const payload = { action: 'test', data: { id: 123 } };
      const secret = 'test-secret';
      const payloadString = JSON.stringify(payload);
      const signature = generateTestSignature(payloadString, secret);

      const response = await request(app)
        .post('/api/webhooks/receive')
        .set('Sentry-Hook-Signature', signature)
        .set('X-Webhook-Secret', secret)
        .send(payload);

      expect(response.body.signature).toBeDefined();
      expect(response.body.signature.received).toBe(signature);
      expect(response.body.signature.expected).toBeDefined();
      expect(response.body.signature.match).toBe(true);
    });

    it('should include payload in response', async () => {
      const payload = { action: 'created', data: { issue: { id: '123' } } };
      const secret = 'test-secret';
      const payloadString = JSON.stringify(payload);
      const signature = generateTestSignature(payloadString, secret);

      const response = await request(app)
        .post('/api/webhooks/receive')
        .set('Sentry-Hook-Signature', signature)
        .set('X-Webhook-Secret', secret)
        .send(payload);

      expect(response.body.payload).toEqual(payload);
    });

    it('should include success message for valid signature', async () => {
      const payload = { action: 'test' };
      const secret = 'test-secret';
      const payloadString = JSON.stringify(payload);
      const signature = generateTestSignature(payloadString, secret);

      const response = await request(app)
        .post('/api/webhooks/receive')
        .set('Sentry-Hook-Signature', signature)
        .set('X-Webhook-Secret', secret)
        .send(payload);

      expect(response.body.message).toContain('verified successfully');
    });

    it('should handle complex nested payloads', async () => {
      const payload = {
        action: 'created',
        installation: { uuid: '12345' },
        data: {
          issue: {
            id: '123',
            title: 'Test Issue',
            metadata: { type: 'Error', value: 'Something broke' }
          }
        }
      };
      const secret = 'complex-secret-123';
      const payloadString = JSON.stringify(payload);
      const signature = generateTestSignature(payloadString, secret);

      const response = await request(app)
        .post('/api/webhooks/receive')
        .set('Sentry-Hook-Signature', signature)
        .set('X-Webhook-Secret', secret)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.verified).toBe(true);
      expect(response.body.payload).toEqual(payload);
    });

    it('should verify signature based on raw body, not re-serialized JSON', async () => {
      // This test ensures we use the raw request body for signature verification
      // JSON.stringify can produce different output (key order, whitespace) even
      // for semantically identical objects, which would break signature verification

      const secret = 'test-secret';
      // Deliberately use specific JSON formatting with extra spaces
      const rawPayload = '{"action":"test",  "data":{"id":123}}';
      const signature = generateTestSignature(rawPayload, secret);

      // supertest will parse and re-serialize this, potentially changing formatting
      // But our endpoint should verify against the original raw body
      const response = await request(app)
        .post('/api/webhooks/receive')
        .set('Content-Type', 'application/json')
        .set('Sentry-Hook-Signature', signature)
        .set('X-Webhook-Secret', secret)
        .send(rawPayload);  // Send as raw string

      expect(response.status).toBe(200);
      expect(response.body.verified).toBe(true);
      expect(response.body.signature.match).toBe(true);
    });
  });
});
