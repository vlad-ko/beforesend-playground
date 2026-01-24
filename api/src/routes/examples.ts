import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

interface Example {
  id: string;
  name: string;
  description: string;
  sdk: string;
  event: Record<string, any>;
  beforeSendCode: string;
}

interface ExamplesResponse {
  examples: Example[];
}

/**
 * Load all example templates from the examples directory
 */
function loadExamples(): Example[] {
  const examples: Example[] = [];
  const examplesDir = path.join(__dirname, '../../examples');

  try {
    // Check if examples directory exists
    if (!fs.existsSync(examplesDir)) {
      console.warn('Examples directory not found:', examplesDir);
      return examples;
    }

    // Read all files in examples directory
    const files = fs.readdirSync(examplesDir);

    // Filter only JSON files
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    // Load each example
    for (const file of jsonFiles) {
      try {
        const filePath = path.join(examplesDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const example = JSON.parse(content);

        // Validate example structure
        if (isValidExample(example)) {
          examples.push(example);
        } else {
          console.warn(`Invalid example structure in file: ${file}`);
        }
      } catch (error) {
        console.error(`Error loading example file ${file}:`, error);
        // Continue loading other examples
      }
    }

    return examples;
  } catch (error) {
    console.error('Error loading examples:', error);
    return examples;
  }
}

/**
 * Validate example structure
 */
function isValidExample(example: any): example is Example {
  return (
    typeof example === 'object' &&
    example !== null &&
    typeof example.id === 'string' &&
    typeof example.name === 'string' &&
    typeof example.description === 'string' &&
    typeof example.sdk === 'string' &&
    typeof example.event === 'object' &&
    example.event !== null &&
    typeof example.beforeSendCode === 'string'
  );
}

/**
 * GET /api/examples
 * Returns list of all available example templates
 */
router.get('/', (req: Request, res: Response<ExamplesResponse>) => {
  try {
    const examples = loadExamples();
    res.json({ examples });
  } catch (error: any) {
    console.error('Error in GET /api/examples:', error);
    res.status(500).json({
      examples: [],
    } as any);
  }
});

/**
 * GET /api/examples/:id
 * Returns specific example by ID
 */
router.get('/:id', (req: Request, res: Response<Example | { error: string }>) => {
  try {
    const { id } = req.params;
    const examples = loadExamples();
    const example = examples.find(ex => ex.id === id);

    if (!example) {
      return res.status(404).json({ error: 'Example not found' });
    }

    res.json(example);
  } catch (error: any) {
    console.error(`Error in GET /api/examples/${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
