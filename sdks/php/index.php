<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;

require __DIR__ . '/vendor/autoload.php';

$app = AppFactory::create();
$app->addBodyParsingMiddleware();
$app->addErrorMiddleware(true, true, true);

// Transform endpoint
$app->post('/transform', function (Request $request, Response $response) {
    try {
        $data = $request->getParsedBody();

        if (!isset($data['event']) || !isset($data['beforeSendCode'])) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'Missing event or beforeSendCode'
            ]));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(400);
        }

        $event = $data['event'];
        $beforeSendCode = $data['beforeSendCode'];

        // Execute the beforeSend code
        try {
            // Evaluate the code to get the callable
            $beforeSendFn = eval('return ' . $beforeSendCode . ';');

            if (!is_callable($beforeSendFn)) {
                $response->getBody()->write(json_encode([
                    'success' => false,
                    'error' => 'beforeSend code must return a callable function'
                ]));
                return $response
                    ->withHeader('Content-Type', 'application/json')
                    ->withStatus(400);
            }
        } catch (ParseError $e) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'Failed to parse beforeSend code: ' . $e->getMessage()
            ]));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(400);
        } catch (Throwable $e) {
            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'Failed to parse beforeSend code: ' . $e->getMessage()
            ]));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(400);
        }

        // Apply the transformation
        try {
            // Clone the event to avoid mutation issues
            $eventClone = json_decode(json_encode($event), true);

            // Execute the beforeSend function
            // Sentry's beforeSend receives (event, hint) but hint is optional
            $transformedEvent = $beforeSendFn($eventClone, []);

            $response->getBody()->write(json_encode([
                'success' => true,
                'transformedEvent' => $transformedEvent
            ]));
            return $response->withHeader('Content-Type', 'application/json');
        } catch (Throwable $e) {
            $traceback = $e->getTraceAsString();
            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'Transformation error: ' . $e->getMessage(),
                'traceback' => $traceback,
                'transformedEvent' => null
            ]));
            return $response
                ->withHeader('Content-Type', 'application/json')
                ->withStatus(500);
        }
    } catch (Throwable $e) {
        error_log('Unexpected error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
        $response->getBody()->write(json_encode([
            'success' => false,
            'error' => 'Unexpected error: ' . $e->getMessage()
        ]));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus(500);
    }
});

// Health check endpoint
$app->get('/health', function (Request $request, Response $response) {
    $response->getBody()->write(json_encode([
        'status' => 'healthy',
        'sdk' => 'php'
    ]));
    return $response->withHeader('Content-Type', 'application/json');
});

// Only run the app if this file is executed directly
if (php_sapi_name() !== 'cli') {
    $app->run();
}

return $app;
