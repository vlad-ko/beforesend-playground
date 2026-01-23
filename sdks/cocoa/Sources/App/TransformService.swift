import Foundation
import JavaScriptCore

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

    private static func wrapUserCode(_ userCode: String) -> String {
        let trimmedCode = userCode.trimmingCharacters(in: .whitespacesAndNewlines)

        // Check if user code has explicit return statement
        let hasReturn = trimmedCode.contains("return")

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
