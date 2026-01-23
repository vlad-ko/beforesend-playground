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
        print("[Transform] Called with event keys: \(event.keys), code length: \(beforeSendCode.count)")

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
        print("[Transform] Using native JavaScriptCore")
        // Use native JavaScriptCore on macOS/iOS
        return executeWithJavaScriptCore(event: event, beforeSendCode: beforeSendCode)
        #else
        print("[Transform] Using JXKit")
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

            print("[JXKit] Event JSON: \(eventJSONString)")

            // Inject the event into JavaScript context
            try context.eval("var event = \(eventJSONString);")

            // Wrap user code to handle implicit returns
            let wrappedCode = wrapUserCode(beforeSendCode)
            print("[JXKit] Wrapped code: \(wrappedCode)")

            // Execute the beforeSend code and store result in a variable
            try context.eval("var __result = (function() { \(wrappedCode) })();")

            // Try to stringify the result - will be "null" or "undefined" if that's what was returned
            let jsonStringResult = try context.eval("typeof __result === 'undefined' || __result === null ? null : JSON.stringify(__result)")

            print("[JXKit] JSON string result isNull: \(jsonStringResult.isNullOrUndefined)")

            // Check if result was null/undefined
            if jsonStringResult.isNullOrUndefined {
                print("[JXKit] Result was null/undefined")
                return TransformResult(
                    success: true,
                    transformedEvent: nil,
                    error: nil,
                    traceback: nil
                )
            }

            // Convert result back to Swift dictionary
            if let jsonString = try? jsonStringResult.string {
                print("[JXKit] JSON string: \(jsonString)")
                if let jsonData = jsonString.data(using: .utf8),
                   let resultDict = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
                    print("[JXKit] Successfully parsed result")
                    return TransformResult(
                        success: true,
                        transformedEvent: resultDict,
                        error: nil,
                        traceback: nil
                    )
                } else {
                    print("[JXKit] Failed to parse JSON data")
                }
            } else {
                print("[JXKit] Failed to get string from result")
            }

            return TransformResult(
                success: false,
                transformedEvent: nil,
                error: "beforeSend must return an event object or null",
                traceback: nil
            )

        } catch {
            print("[JXKit] Exception: \(error)")
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

        // Check for return as a standalone keyword using word boundaries
        // This prevents false positives from "return" in comments, strings, or variable names
        let hasReturn = trimmedCode.range(
            of: "\\breturn\\b",
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
