import express from 'express';
import axios from 'axios';

const router = express.Router();

interface ShareRequest {
  sdk: string;
  sdkName: string;
  sdkPackage: string;
  sdkVersion: string;
  event: Record<string, any>;
  beforeSendCode: string;
}

/**
 * Recursively scrub an event object to show structure only
 * Replaces all values with placeholders to prevent PII leakage
 */
function scrubEventData(obj: any, depth = 0): any {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[MAX_DEPTH_REACHED]';
  }

  if (obj === null) {
    return null;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return [];
    }
    // Show structure of first item, indicate array
    return [scrubEventData(obj[0], depth + 1), '...'];
  }

  if (typeof obj === 'object') {
    const scrubbed: Record<string, any> = {};
    for (const key in obj) {
      scrubbed[key] = scrubEventData(obj[key], depth + 1);
    }
    return scrubbed;
  }

  // Replace primitive values with type indicators
  if (typeof obj === 'string') {
    return `<string>`;
  }
  if (typeof obj === 'number') {
    return `<number>`;
  }
  if (typeof obj === 'boolean') {
    return `<boolean>`;
  }

  return `<${typeof obj}>`;
}

router.post('/', async (req, res) => {
  try {
    const { sdk, sdkName, sdkPackage, sdkVersion, event, beforeSendCode } = req.body as ShareRequest;

    if (!sdk || !event || !beforeSendCode) {
      return res.status(400).json({
        error: 'Missing required fields: sdk, event, beforeSendCode',
      });
    }

    // Scrub event data to prevent PII leakage
    const scrubbedEvent = scrubEventData(event);

    // Create readable paste content
    const content = `# SDK: ${sdkName} (${sdkPackage} ${sdkVersion})

# ==================== Event Structure ====================
# NOTE: Original values have been removed to prevent accidental PII sharing.
# Only the event structure is shown below.

${JSON.stringify(scrubbedEvent, null, 2)}

# ==================== beforeSend Code ====================
${beforeSendCode}`;

    // Create paste via dpaste.com (no authentication required)
    const formData = new URLSearchParams();
    formData.append('content', content);
    formData.append('syntax', 'text'); // Plain text for better readability
    formData.append('expiry_days', '30'); // Expire after 30 days

    const response = await axios.post(
      'https://dpaste.com/api/',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      }
    );

    // dpaste returns the URL as plain text with .txt extension
    // Remove .txt to get the HTML view
    const pasteUrl = response.data.trim().replace(/\.txt$/, '');

    res.json({
      html_url: pasteUrl,
      id: pasteUrl.split('/').pop(),
    });
  } catch (error: any) {
    console.error('Failed to create paste:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to create paste',
      message: error.response?.data?.message || error.message,
    });
  }
});

export default router;
