import Foundation
#if canImport(JavaScriptCore)
import JavaScriptCore
#else
import JXKit
#endif

struct TransformResult {
    let success: Bool
    let transformedEvent: [String: Any]?
    let error: String?
    let traceback: String?
}

class TransformService {
    static func transform(event: [String: Any], beforeSendCode: String) throws -> TransformResult {
        // Validate input
        guard !beforeSendCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return TransformResult(
                success: false,
                transformedEvent: nil,
                error: "beforeSendCode cannot be empty",
                traceback: nil
            )
        }

        #if canImport(JavaScriptCore)
        // Use native JavaScriptCore on macOS/iOS
        return executeWithJavaScriptCore(event: event, beforeSendCode: beforeSendCode)
        #else
        // Use JXKit on Linux
        return executeWithJXKit(event: event, beforeSendCode: beforeSendCode)
        #endif
    }

    #if canImport(JavaScriptCore)
    private static func executeWithJavaScriptCore(event: [String: Any], beforeSendCode: String) -> TransformResult {
        // Create JavaScript context
        guard let context = JSContext() else {
            return TransformResult(
                success: false,
                transformedEvent: nil,
                error: "Failed to create JavaScript context",
                traceback: nil
            )
        }

        // Set up exception handler
        var jsError: String?
        context.exceptionHandler = { context, exception in
            if let error = exception?.toString() {
                jsError = error
            }
        }

        // Convert Swift dictionary to JavaScript object
        do {
            let eventJSON = try JSONSerialization.data(withJSONObject: event, options: [])
            let eventJSONString = String(data: eventJSON, encoding: .utf8)!

            // Inject the event into JavaScript context
            context.evaluateScript("var event = \(eventJSONString);")

            // Wrap user code to handle implicit returns
            let wrappedCode = wrapUserCode(beforeSendCode)

            // Execute the beforeSend code
            let result = context.evaluateScript(wrappedCode)

            // Check for JavaScript errors
            if let error = jsError {
                return TransformResult(
                    success: false,
                    transformedEvent: nil,
                    error: "JavaScript error: \(error)",
                    traceback: nil
                )
            }

            // Handle null return (drop event)
            if result?.isNull == true || result?.isUndefined == true {
                return TransformResult(
                    success: true,
                    transformedEvent: nil,
                    error: nil,
                    traceback: nil
                )
            }

            // Convert JavaScript result back to Swift dictionary
            if let resultValue = result?.toObject() as? [String: Any] {
                return TransformResult(
                    success: true,
                    transformedEvent: resultValue,
                    error: nil,
                    traceback: nil
                )
            } else {
                return TransformResult(
                    success: false,
                    transformedEvent: nil,
                    error: "beforeSend must return an event object or null",
                    traceback: nil
                )
            }

        } catch {
            return TransformResult(
                success: false,
                transformedEvent: nil,
                error: "Failed to process event: \(error.localizedDescription)",
                traceback: nil
            )
        }
    }
    #endif

    #if !canImport(JavaScriptCore)
    private static func executeWithJXKit(event: [String: Any], beforeSendCode: String) -> TransformResult {
        do {
            // Create JXKit context
            let context = JXContext()

            // Convert Swift dictionary to JSON string
            let eventJSON = try JSONSerialization.data(withJSONObject: event, options: [])
            let eventJSONString = String(data: eventJSON, encoding: .utf8)!

            // Inject the event into JavaScript context
            try context.eval("var event = \(eventJSONString);")

            // Wrap user code to handle implicit returns
            let wrappedCode = wrapUserCode(beforeSendCode)

            // Execute the beforeSend code and store result in a variable
            // Note: wrapUserCode already wraps in a function and calls it with ()
            try context.eval("var __result = \(wrappedCode);")

            // Try to stringify the result - will be "null" or "undefined" if that's what was returned
            let jsonStringResult = try context.eval("typeof __result === 'undefined' || __result === null ? null : JSON.stringify(__result)")

            // Check if result was null/undefined
            if jsonStringResult.isNullOrUndefined {
                return TransformResult(
                    success: true,
                    transformedEvent: nil,
                    error: nil,
                    traceback: nil
                )
            }

            // Convert result back to Swift dictionary
            if let jsonString = try? jsonStringResult.string,
               let jsonData = jsonString.data(using: .utf8),
               let resultDict = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
                return TransformResult(
                    success: true,
                    transformedEvent: resultDict,
                    error: nil,
                    traceback: nil
                )
            }

            return TransformResult(
                success: false,
                transformedEvent: nil,
                error: "beforeSend must return an event object or null",
                traceback: nil
            )

        } catch {
            return TransformResult(
                success: false,
                transformedEvent: nil,
                error: "JavaScript error: \(error.localizedDescription)",
                traceback: nil
            )
        }
    }
    #endif

    private static func wrapUserCode(_ userCode: String) -> String {
        let trimmedCode = userCode.trimmingCharacters(in: .whitespacesAndNewlines)

        // Check for return statement (return followed by whitespace or semicolon)
        // This is a simple heuristic that avoids matching "return" in strings/comments
        // Pattern: return followed by space, tab, newline, or semicolon
        let hasReturn = trimmedCode.range(
            of: "\\breturn[\\s;]",
            options: .regularExpression
        ) != nil

        if hasReturn {
            // User has explicit return, use code as-is
            return """
            (function() {
                \(trimmedCode)
            })();
            """
        } else {
            // No return statement, wrap to automatically return event
            return """
            (function() {
                \(trimmedCode)
                return event;
            })();
            """
        }
    }
}
