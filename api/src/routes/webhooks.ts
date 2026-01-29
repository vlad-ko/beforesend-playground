import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import axios from 'axios';
import { getAllTemplates, getTemplateById, getTemplateMetadata } from '../webhook-templates';

const router = Router();

/**
 * Generate HMAC SHA-256 signature for webhook payload
 */
function generateHMACSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * GET /api/webhooks/templates
 * List all available webhook templates
 */
router.get('/templates', (_req: Request, res: Response) => {
  try {
    const templates = getTemplateMetadata();
    res.json({ templates });
  } catch (error: any) {
    console.error('Error loading templates:', error);
    res.status(500).json({ error: 'Failed to load templates' });
  }
});

/**
 * GET /api/webhooks/templates/:id
 * Get a specific webhook template by ID
 */
router.get('/templates/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const template = getTemplateById(id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error: any) {
    console.error('Error loading template:', error);
    res.status(500).json({ error: 'Failed to load template' });
  }
});

/**
 * POST /api/webhooks/send
 * Send a webhook to a target URL with HMAC signature
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { url, templateId, secret } = req.body;

    // Validate required fields
    if (!url || !templateId) {
      return res.status(400).json({
        error: 'Missing required fields: url and templateId are required',
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        error: 'Invalid URL: Please provide a valid URL',
      });
    }

    // Get template
    const template = getTemplateById(templateId);
    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
      });
    }

    // Prepare payload
    const payload = JSON.stringify(template.payload);
    const sentAt = new Date().toISOString();

    // Generate HMAC signature if secret is provided
    let signature: string | undefined;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'SentryWebhook/1.0',
    };

    if (secret) {
      signature = generateHMACSignature(payload, secret);
      headers['X-Sentry-Signature'] = signature;

      // For testing with our built-in receiver, also send the secret
      // This allows the receiver to verify the signature
      // Real Sentry webhook receivers would have the secret stored, not in headers
      headers['X-Webhook-Secret'] = secret;
    }

    // Send webhook
    try {
      const webhookResponse = await axios.post(url, template.payload, {
        headers,
        timeout: 10000, // 10 second timeout
      });

      res.json({
        success: true,
        sentAt,
        signature,
        webhookStatus: webhookResponse.status,
        webhookStatusText: webhookResponse.statusText,
      });
    } catch (webhookError: any) {
      // Webhook send failed, but we still return success for the API call
      // This is expected behavior - the API successfully attempted to send
      if (webhookError.response) {
        // Server responded with error status
        // Include the actual error response from the webhook endpoint
        const errorData = webhookError.response.data;
        const errorMessage = typeof errorData === 'string'
          ? errorData
          : errorData?.error || errorData?.message || 'Webhook endpoint returned an error';

        res.json({
          success: true,
          sentAt,
          signature,
          webhookStatus: webhookError.response.status,
          webhookStatusText: webhookError.response.statusText,
          webhookError: errorMessage,
          webhookResponseBody: errorData, // Include full response for debugging
        });
      } else if (webhookError.request) {
        // Request was made but no response received
        res.status(500).json({
          error: 'Failed to send webhook: No response from endpoint',
          details: webhookError.message,
        });
      } else {
        // Something else went wrong
        res.status(500).json({
          error: 'Failed to send webhook',
          details: webhookError.message,
        });
      }
    }
  } catch (error: any) {
    console.error('Error sending webhook:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
});

/**
 * POST /api/webhooks/receive
 * Receive and verify webhook signatures
 *
 * This endpoint simulates a webhook receiver that validates HMAC signatures
 * the same way a real Sentry webhook receiver would.
 *
 * IMPORTANT: Signature must be computed on the raw request body bytes,
 * not on a re-serialized version of the parsed JSON. This ensures
 * signature verification works correctly regardless of JSON key ordering
 * or whitespace differences.
 */
router.post('/receive', (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-sentry-signature'] as string;
    const secret = req.headers['x-webhook-secret'] as string;

    // Validate required headers
    if (!secret) {
      return res.status(400).json({
        verified: false,
        error: 'X-Webhook-Secret header required for verification'
      });
    }

    if (!signature) {
      return res.status(400).json({
        verified: false,
        error: 'X-Sentry-Signature header required for verification'
      });
    }

    // CRITICAL: Use raw body for signature verification
    // Computing signature on JSON.stringify(req.body) would fail because
    // JSON serialization is non-deterministic (key order can vary)
    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      return res.status(500).json({
        verified: false,
        error: 'Raw body not available for signature verification'
      });
    }

    const expectedSignature = generateHMACSignature(rawBody, secret);

    // Compare signatures (constant-time comparison would be better for production)
    const verified = signature === expectedSignature;

    res.json({
      verified,
      receivedAt: new Date().toISOString(),
      signature: {
        received: signature,
        expected: expectedSignature,
        match: verified
      },
      payload: req.body,
      message: verified
        ? 'Webhook signature verified successfully!'
        : 'Signature verification failed - signatures do not match'
    });
  } catch (error: any) {
    console.error('Error verifying webhook:', error);
    res.status(500).json({
      verified: false,
      error: 'Failed to verify webhook',
      details: error.message
    });
  }
});

export default router;
