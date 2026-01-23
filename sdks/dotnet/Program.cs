using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.CodeAnalysis.CSharp.Scripting;
using Microsoft.CodeAnalysis.Scripting;
using Sentry;
using Sentry.Protocol;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://0.0.0.0:5002");

var app = builder.Build();

// JSON serializer options for responses
var jsonOptions = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    PropertyNameCaseInsensitive = true
};

app.MapPost("/transform", async (TransformRequest request) =>
{
    try
    {
        // Validate inputs
        if (request == null || request.Event == null || string.IsNullOrEmpty(request.BeforeSendCode))
        {
            return Results.Json(new {
                success = false,
                transformedEvent = (object?)null,
                error = "Missing event or beforeSendCode",
                traceback = (string?)null
            }, statusCode: 400);
        }

        // Convert JsonNode to SentryEvent
        var eventJson = request.Event.ToJsonString();
        var sentryEvent = JsonSerializer.Deserialize<SentryEvent>(eventJson);

        if (sentryEvent == null)
        {
            return Results.Json(new {
                success = false,
                transformedEvent = (object?)null,
                error = "Failed to parse event",
                traceback = (string?)null
            }, statusCode: 400);
        }

        // Create script options with Sentry references
        var scriptOptions = ScriptOptions.Default
            .AddReferences(typeof(SentryEvent).Assembly)
            .AddImports("Sentry", "Sentry.Protocol");

        // Compile the script
        Script<SentryEvent?> script;
        try
        {
            script = CSharpScript.Create<SentryEvent?>(
                request.BeforeSendCode,
                scriptOptions,
                globalsType: typeof(ScriptGlobals)
            );

            var diagnostics = script.Compile();
            if (diagnostics.Any(d => d.Severity == Microsoft.CodeAnalysis.DiagnosticSeverity.Error))
            {
                var errors = string.Join("\n", diagnostics.Select(d => d.GetMessage()));
                return Results.Json(new {
                    success = false,
                    transformedEvent = (object?)null,
                    error = $"Compilation failed for beforeSend code: {errors}",
                    traceback = (string?)null
                }, statusCode: 400);
            }
        }
        catch (Exception ex)
        {
            return Results.Json(new {
                success = false,
                transformedEvent = (object?)null,
                error = $"Compilation failed for beforeSend code: {ex.Message}",
                traceback = (string?)null
            }, statusCode: 400);
        }

        // Execute the transformation
        try
        {
            var globals = new ScriptGlobals { ev = sentryEvent };
            var result = await script.RunAsync(globals);
            var transformedEvent = result.ReturnValue;

            // Convert back to JSON for response
            object? transformedEventObj = null;
            if (transformedEvent != null)
            {
                var transformedJson = JsonSerializer.Serialize(transformedEvent);
                transformedEventObj = JsonSerializer.Deserialize<JsonObject>(transformedJson);
            }

            return Results.Json(new {
                success = true,
                transformedEvent = transformedEventObj,
                error = (string?)null,
                traceback = (string?)null
            });
        }
        catch (Exception ex)
        {
            return Results.Json(new {
                success = false,
                transformedEvent = (object?)null,
                error = $"Transformation error: {ex.Message}",
                traceback = ex.StackTrace
            }, statusCode: 500);
        }
    }
    catch (Exception ex)
    {
        return Results.Json(new {
            success = false,
            transformedEvent = (object?)null,
            error = $"Unexpected error: {ex.Message}",
            traceback = ex.StackTrace
        }, statusCode: 500);
    }
});

app.MapGet("/health", () =>
{
    return Results.Json(new { status = "healthy", sdk = "dotnet" }, jsonOptions);
});

app.Run();

// Make Program accessible to tests
public partial class Program { }

public record TransformRequest(JsonNode? Event, string? BeforeSendCode);
public record TransformResponse(bool Success, object? TransformedEvent, string? Error, string? Traceback);
public record HealthResponse(string Status, string Sdk);

public class ScriptGlobals
{
    public SentryEvent? ev { get; set; }
}
