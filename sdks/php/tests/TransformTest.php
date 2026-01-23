<?php

declare(strict_types=1);

namespace Tests;

use PHPUnit\Framework\TestCase;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slim\Psr7\Factory\StreamFactory;
use Slim\Psr7\Headers;
use Slim\Psr7\Request;
use Slim\Psr7\Uri;

/**
 * TDD tests for PHP SDK transformation service.
 * These tests describe the desired behavior - implement to make them pass!
 */
class TransformTest extends TestCase
{
    private $app;

    protected function setUp(): void
    {
        // Load the app
        $this->app = require __DIR__ . '/../index.php';
    }

    private function createRequest(string $method, string $path, array $data = []): ServerRequestInterface
    {
        $uri = new Uri('http', 'localhost', 5005, $path);
        $headers = new Headers();
        $headers->addHeader('Content-Type', 'application/json');
        $body = (new StreamFactory())->createStream(json_encode($data));

        $request = new Request($method, $uri, $headers, [], [], $body);
        return $request->withParsedBody($data);
    }

    public function testTransformWithValidBeforeSend(): void
    {
        $event = [
            'exception' => [
                'values' => [[
                    'type' => 'Exception',
                    'value' => 'Original error'
                ]]
            ]
        ];

        $beforeSendCode = 'function($event, $hint) {
            $event["exception"]["values"][0]["value"] = "Modified error";
            return $event;
        }';

        $request = $this->createRequest('POST', '/transform', [
            'event' => $event,
            'beforeSendCode' => $beforeSendCode
        ]);

        $response = $this->app->handle($request);
        $data = json_decode((string) $response->getBody(), true);

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertTrue($data['success']);
        $this->assertNotNull($data['transformedEvent']);
        $this->assertEquals('Modified error', $data['transformedEvent']['exception']['values'][0]['value']);
    }

    public function testTransformReturnsNullDropsEvent(): void
    {
        $event = [
            'exception' => [
                'values' => [[
                    'type' => 'Exception',
                    'value' => 'Test error'
                ]]
            ]
        ];

        $beforeSendCode = 'function($event, $hint) {
            return null;
        }';

        $request = $this->createRequest('POST', '/transform', [
            'event' => $event,
            'beforeSendCode' => $beforeSendCode
        ]);

        $response = $this->app->handle($request);
        $data = json_decode((string) $response->getBody(), true);

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertTrue($data['success']);
        $this->assertNull($data['transformedEvent']);
    }

    public function testMissingEventReturns400(): void
    {
        $request = $this->createRequest('POST', '/transform', [
            'beforeSendCode' => 'function($event, $hint) { return $event; }'
        ]);

        $response = $this->app->handle($request);
        $data = json_decode((string) $response->getBody(), true);

        $this->assertEquals(400, $response->getStatusCode());
        $this->assertFalse($data['success']);
        $this->assertStringContainsString('Missing', $data['error']);
    }

    public function testMissingBeforeSendCodeReturns400(): void
    {
        $request = $this->createRequest('POST', '/transform', [
            'event' => []
        ]);

        $response = $this->app->handle($request);
        $data = json_decode((string) $response->getBody(), true);

        $this->assertEquals(400, $response->getStatusCode());
        $this->assertFalse($data['success']);
        $this->assertStringContainsString('Missing', $data['error']);
    }

    public function testInvalidPHPSyntaxReturns400(): void
    {
        $event = [
            'exception' => [
                'values' => [[
                    'type' => 'Exception',
                    'value' => 'Test error'
                ]]
            ]
        ];

        $beforeSendCode = 'invalid php syntax {';

        $request = $this->createRequest('POST', '/transform', [
            'event' => $event,
            'beforeSendCode' => $beforeSendCode
        ]);

        $response = $this->app->handle($request);
        $data = json_decode((string) $response->getBody(), true);

        $this->assertEquals(400, $response->getStatusCode());
        $this->assertFalse($data['success']);
        $this->assertStringContainsString('parse', strtolower($data['error']));
    }

    public function testRuntimeErrorReturns500(): void
    {
        $event = [
            'exception' => [
                'values' => [[
                    'type' => 'Exception',
                    'value' => 'Test error'
                ]]
            ]
        ];

        $beforeSendCode = 'function($event, $hint) {
            throw new Exception("Runtime error");
        }';

        $request = $this->createRequest('POST', '/transform', [
            'event' => $event,
            'beforeSendCode' => $beforeSendCode
        ]);

        $response = $this->app->handle($request);
        $data = json_decode((string) $response->getBody(), true);

        $this->assertEquals(500, $response->getStatusCode());
        $this->assertFalse($data['success']);
        $this->assertStringContainsString('Transformation error', $data['error']);
        $this->assertArrayHasKey('traceback', $data);
    }

    public function testPreserveEventStructure(): void
    {
        $event = [
            'event_id' => '456',
            'exception' => [
                'values' => [[
                    'type' => 'Exception',
                    'value' => 'Test error',
                    'stacktrace' => [
                        'frames' => [
                            ['filename' => 'app.php', 'lineno' => 20]
                        ]
                    ]
                ]]
            ],
            'contexts' => [
                'os' => ['name' => 'Linux', 'version' => '5.10']
            ]
        ];

        $beforeSendCode = 'function($event, $hint) {
            return $event;
        }';

        $request = $this->createRequest('POST', '/transform', [
            'event' => $event,
            'beforeSendCode' => $beforeSendCode
        ]);

        $response = $this->app->handle($request);
        $data = json_decode((string) $response->getBody(), true);

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertTrue($data['success']);
        $this->assertEquals($event, $data['transformedEvent']);
    }

    public function testAddCustomProperties(): void
    {
        $event = [
            'exception' => [
                'values' => [[
                    'type' => 'Exception',
                    'value' => 'Test error'
                ]]
            ]
        ];

        $beforeSendCode = 'function($event, $hint) {
            $event["tags"] = ["custom" => "tag"];
            $event["extra"] = ["info" => "data"];
            return $event;
        }';

        $request = $this->createRequest('POST', '/transform', [
            'event' => $event,
            'beforeSendCode' => $beforeSendCode
        ]);

        $response = $this->app->handle($request);
        $data = json_decode((string) $response->getBody(), true);

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertTrue($data['success']);
        $this->assertEquals(['custom' => 'tag'], $data['transformedEvent']['tags']);
        $this->assertEquals(['info' => 'data'], $data['transformedEvent']['extra']);
    }

    public function testComplexUnityMetadataCleanup(): void
    {
        $event = [
            'exception' => [
                'values' => [[
                    'type' => 'Error',
                    'value' => 'FATAL EXCEPTION [Thread-94] Unity version : 6000.2.14f1 Device model : realme android.content.res.Resources$NotFoundException'
                ]]
            ]
        ];

        $beforeSendCode = 'function($event, $hint) {
            if (isset($event["exception"]["values"])) {
                foreach ($event["exception"]["values"] as &$exception) {
                    if (isset($exception["value"]) && strpos($exception["value"], "Unity version") !== false) {
                        if (preg_match("/([\\w\\.]+(?:Exception|Error))/", $exception["value"], $match)) {
                            $exception["type"] = $match[1];
                            $exception["value"] = $match[1];
                        } else {
                            $exception["type"] = "NativeCrash";
                            $exception["value"] = "Android Native Crash";
                        }
                    }
                }
            }
            return $event;
        }';

        $request = $this->createRequest('POST', '/transform', [
            'event' => $event,
            'beforeSendCode' => $beforeSendCode
        ]);

        $response = $this->app->handle($request);
        $data = json_decode((string) $response->getBody(), true);

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertTrue($data['success']);
        $this->assertStringContainsString('NotFoundException', $data['transformedEvent']['exception']['values'][0]['type']);
    }

    public function testHealthEndpoint(): void
    {
        $request = $this->createRequest('GET', '/health');
        $response = $this->app->handle($request);
        $data = json_decode((string) $response->getBody(), true);

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertEquals('healthy', $data['status']);
        $this->assertEquals('php', $data['sdk']);
    }
}
