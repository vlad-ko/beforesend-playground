import { Router, Request, Response } from 'express';
import { validateJSON, validateSentryEvent } from '../parsers/json';
import { transformWithJavaScript } from '../sdk-clients/javascript';
import { transformWithPython } from '../sdk-clients/python';
import { transformWithRuby } from '../sdk-clients/ruby';
import { transformWithPHP } from '../sdk-clients/php';
import { transformWithGo } from '../sdk-clients/go';
import { transformWithDotNet } from '../sdk-clients/dotnet';
import { transformWithJava } from '../sdk-clients/java';
import { transformWithAndroid } from '../sdk-clients/android';
import fs from 'fs';
import path from 'path';

const router = Router();

interface TransformRequest {
  sdk: 'javascript' | 'python' | 'ruby' | 'php' | 'go' | 'dotnet' | 'java' | 'android' | 'react-native';
  event: string | Record<string, any>;
  beforeSendCode: string;
}

interface TransformResponse {
  success: boolean;
  originalEvent?: Record<string, any>;
  transformedEvent?: Record<string, any> | null;
  error?: string;
  sdk?: string;
}

// Load SDK registry to check what's available
function loadSDKRegistry() {
  try {
    const registryPath = path.join(__dirname, '../../sdks/registry.json');
    const content = fs.readFileSync(registryPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to load SDK registry:', error);
    return { sdks: {} };
  }
}

router.post('/', async (req: Request<{}, {}, TransformRequest>, res: Response<TransformResponse>) => {
  try {
    const { sdk, event: eventInput, beforeSendCode } = req.body;

    // Validate inputs
    if (!sdk || !eventInput || !beforeSendCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sdk, event, beforeSendCode',
      });
    }

    // Parse event if it's a string
    let event: Record<string, any>;
    if (typeof eventInput === 'string') {
      const validation = validateJSON(eventInput);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: validation.error,
        });
      }
      event = validation.data;
    } else {
      event = eventInput;
    }

    // Validate event structure
    const eventValidation = validateSentryEvent(event);
    if (!eventValidation.valid) {
      return res.status(400).json({
        success: false,
        error: eventValidation.error,
      });
    }

    // Check if SDK is available
    const registry = loadSDKRegistry();
    const sdkInfo = registry.sdks[sdk];

    if (!sdkInfo) {
      return res.status(400).json({
        success: false,
        error: `Unknown SDK: ${sdk}`,
      });
    }

    if (sdkInfo.status === 'not-installed') {
      return res.status(400).json({
        success: false,
        error: `SDK "${sdk}" is not installed. Run: npm run sdk:install ${sdk}`,
      });
    }

    // Route to appropriate SDK service
    let result;
    try {
      switch (sdk) {
        case 'javascript':
        case 'react-native':
          // React Native uses the JavaScript SDK runtime
          result = await transformWithJavaScript(event, beforeSendCode);
          break;
        case 'python':
          result = await transformWithPython(event, beforeSendCode);
          break;
        case 'ruby':
          result = await transformWithRuby(event, beforeSendCode);
          break;
        case 'php':
          result = await transformWithPHP(event, beforeSendCode);
          break;
        case 'go':
          result = await transformWithGo(event, beforeSendCode);
          break;
        case 'dotnet':
          result = await transformWithDotNet(event, beforeSendCode);
          break;
        case 'java':
          result = await transformWithJava(event, beforeSendCode);
          break;
        case 'android':
          result = await transformWithAndroid(event, beforeSendCode);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: `Unsupported SDK: ${sdk}`,
          });
      }

      return res.json({
        success: result.success,
        originalEvent: event,
        transformedEvent: result.transformedEvent,
        error: result.error,
        sdk: sdk,
      });
    } catch (error: any) {
      console.error(`Error transforming with ${sdk}:`, error);
      return res.status(500).json({
        success: false,
        error: `SDK service error: ${error.message}`,
      });
    }
  } catch (error: any) {
    console.error('Unexpected error in transform route:', error);
    return res.status(500).json({
      success: false,
      error: `Unexpected error: ${error.message}`,
    });
  }
});

// GET /sdks - List available SDKs
router.get('/sdks', (req: Request, res: Response) => {
  const registry = loadSDKRegistry();
  const availableSDKs = Object.entries(registry.sdks)
    .filter(([_, sdk]: [string, any]) => sdk.status !== 'not-installed')
    .map(([key, sdk]: [string, any]) => ({
      key,
      name: sdk.name,
      language: sdk.language,
      default: sdk.default,
      status: sdk.status,
    }));

  res.json({
    sdks: availableSDKs,
  });
});

export default router;
