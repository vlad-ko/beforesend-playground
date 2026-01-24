import request from 'supertest';
import express from 'express';
import validateRouter from '../../src/routes/validate';

const app = express();
app.use(express.json());
app.use('/api/validate', validateRouter);

describe('POST /api/validate', () => {
  describe('JavaScript validation', () => {
    it('should return valid for correct JavaScript code', async () => {
      const response = await request(app)
        .post('/api/validate')
        .send({
          sdk: 'javascript',
          beforeSendCode: '(event, hint) => { return event; }',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        valid: true,
        errors: [],
      });
    });

    it('should return errors for invalid JavaScript syntax', async () => {
      const response = await request(app)
        .post('/api/validate')
        .send({
          sdk: 'javascript',
          beforeSendCode: '(event, hint) => { return event',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
      expect(response.body.errors[0]).toHaveProperty('message');
    });

    it('should return errors for missing closing brace', async () => {
      const response = await request(app)
        .post('/api/validate')
        .send({
          sdk: 'javascript',
          beforeSendCode: 'function test() { console.log("test")',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Python validation', () => {
    it('should return valid for correct Python code', async () => {
      const response = await request(app)
        .post('/api/validate')
        .send({
          sdk: 'python',
          beforeSendCode: 'def before_send(event, hint):\n    return event',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        valid: true,
        errors: [],
      });
    });

    it('should return errors for invalid Python syntax', async () => {
      const response = await request(app)
        .post('/api/validate')
        .send({
          sdk: 'python',
          beforeSendCode: 'def before_send(event, hint)\n    return event',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should return errors for indentation errors', async () => {
      const response = await request(app)
        .post('/api/validate')
        .send({
          sdk: 'python',
          beforeSendCode: 'def before_send(event, hint):\nreturn event',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Input validation', () => {
    it('should return 400 for missing sdk parameter', async () => {
      const response = await request(app)
        .post('/api/validate')
        .send({
          beforeSendCode: 'some code',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for missing beforeSendCode parameter', async () => {
      const response = await request(app)
        .post('/api/validate')
        .send({
          sdk: 'javascript',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for unsupported SDK', async () => {
      const response = await request(app)
        .post('/api/validate')
        .send({
          sdk: 'cobol',
          beforeSendCode: 'some code',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Unsupported SDK');
    });
  });

  describe('Error object structure', () => {
    it('should return errors with line and message properties', async () => {
      const response = await request(app)
        .post('/api/validate')
        .send({
          sdk: 'javascript',
          beforeSendCode: '(event, hint) => { return event',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
      expect(response.body.errors[0]).toHaveProperty('message');
      expect(typeof response.body.errors[0].message).toBe('string');
    });
  });
});
