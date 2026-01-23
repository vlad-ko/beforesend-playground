using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace SentryBeforeSendTransform.Tests;

public class TransformTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public TransformTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task TransformWithValidBeforeSend()
    {
        // Arrange
        var request = new
        {
            @event = new
            {
                exception = new
                {
                    values = new[]
                    {
                        new { type = "Exception", value = "Original error" }
                    }
                }
            },
            beforeSendCode = @"
                if (ev.Exception?.Values?.Count > 0)
                {
                    ev.Exception.Values[0].Value = ""Modified error"";
                }
                return ev;
            "
        };

        // Act
        var response = await _client.PostAsJsonAsync("/transform", request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<TransformResponse>();
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.NotNull(result.TransformedEvent);
    }

    [Fact]
    public async Task TransformReturnsNullDropsEvent()
    {
        // Arrange
        var request = new
        {
            @event = new { event_id = "test123" },
            beforeSendCode = "return null;"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/transform", request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<TransformResponse>();
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.Null(result.TransformedEvent);
    }

    [Fact]
    public async Task MissingEventReturns400()
    {
        // Arrange
        var request = new { beforeSendCode = "return ev;" };

        // Act
        var response = await _client.PostAsJsonAsync("/transform", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<TransformResponse>();
        Assert.NotNull(result);
        Assert.False(result.Success);
        Assert.NotNull(result.Error);
    }

    [Fact]
    public async Task MissingBeforeSendCodeReturns400()
    {
        // Arrange
        var request = new { @event = new { event_id = "test123" } };

        // Act
        var response = await _client.PostAsJsonAsync("/transform", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<TransformResponse>();
        Assert.NotNull(result);
        Assert.False(result.Success);
    }

    [Fact]
    public async Task InvalidCSharpSyntaxReturns400()
    {
        // Arrange
        var request = new
        {
            @event = new { event_id = "test123" },
            beforeSendCode = "this is not valid C# syntax {{{"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/transform", request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<TransformResponse>();
        Assert.NotNull(result);
        Assert.False(result.Success);
        Assert.Contains("compilation", result.Error?.ToLower() ?? "");
    }

    [Fact]
    public async Task RuntimeErrorReturns500()
    {
        // Arrange
        var request = new
        {
            @event = new { event_id = "test123" },
            beforeSendCode = @"throw new System.Exception(""Runtime error"");"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/transform", request);

        // Assert
        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<TransformResponse>();
        Assert.NotNull(result);
        Assert.False(result.Success);
        Assert.NotNull(result.Error);
    }

    [Fact]
    public async Task PreserveEventStructure()
    {
        // Arrange
        var request = new
        {
            @event = new
            {
                event_id = "test123",
                timestamp = "2024-01-15T12:00:00",
                platform = "csharp"
            },
            beforeSendCode = "return ev;"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/transform", request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<TransformResponse>();
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.NotNull(result.TransformedEvent);
    }

    [Fact]
    public async Task AddCustomProperties()
    {
        // Arrange
        var request = new
        {
            @event = new { event_id = "test123" },
            beforeSendCode = @"
                ev.SetTag(""custom"", ""value"");
                ev.User = new Sentry.User { Id = ""user123"" };
                return ev;
            "
        };

        // Act
        var response = await _client.PostAsJsonAsync("/transform", request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<TransformResponse>();
        Assert.NotNull(result);
        Assert.True(result.Success);
    }

    [Fact]
    public async Task ComplexUnityMetadataCleanup()
    {
        // Arrange
        var request = new
        {
            @event = new
            {
                event_id = "test123",
                contexts = new
                {
                    unity = new
                    {
                        debug_info = "sensitive data",
                        internal_state = "internal"
                    }
                }
            },
            beforeSendCode = @"
                if (ev.Contexts.ContainsKey(""unity""))
                {
                    ev.Contexts.Remove(""unity"");
                }
                return ev;
            "
        };

        // Act
        var response = await _client.PostAsJsonAsync("/transform", request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<TransformResponse>();
        Assert.NotNull(result);
        Assert.True(result.Success);
    }

    [Fact]
    public async Task HealthEndpoint()
    {
        // Act
        var response = await _client.GetAsync("/health");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<HealthResponse>();
        Assert.NotNull(result);
        Assert.Equal("healthy", result.Status);
        Assert.Equal("dotnet", result.Sdk);
    }
}

public record TransformResponse(bool Success, object? TransformedEvent, string? Error, string? Traceback);
public record HealthResponse(string Status, string Sdk);
