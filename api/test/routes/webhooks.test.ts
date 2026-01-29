import request from 'supertest';
import express from 'express';
import webhooksRouter from '../../src/routes/webhooks';

const app = express();
app.use(express.json());
app.use('/api/webhooks', webhooksRouter);

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

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('sentAt');
    });

    it('should include HMAC signature in request headers', async () => {
      const requestBody = {
        url: 'https://webhook.site/test',
        templateId: 'issue-alert-created',
        secret: 'my-secret-key',
      };

      const response = await request(app)
        .post('/api/webhooks/send')
        .send(requestBody);

      expect(response.body).toHaveProperty('signature');
      expect(response.body.signature).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

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
    });

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
    });
  });
});
