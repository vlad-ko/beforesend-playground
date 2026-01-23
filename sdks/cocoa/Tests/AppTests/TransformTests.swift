import XCTest
@testable import App

final class TransformTests: XCTestCase {

    // Test 1: Valid transformation with tag addition
    func testValidTransformationWithTags() throws {
        let event: [String: Any] = [
            "event_id": "test-123",
            "message": "Test error"
        ]

        let beforeSendCode = """
        event.tags = { test: "value" };
        return event;
        """

        let result = try TransformService.transform(event: event, beforeSendCode: beforeSendCode)

        XCTAssertTrue(result.success)
        XCTAssertNotNil(result.transformedEvent)

        let transformedEvent = result.transformedEvent!
        XCTAssertNotNil(transformedEvent["tags"])

        if let tags = transformedEvent["tags"] as? [String: String] {
            XCTAssertEqual(tags["test"], "value")
        }
    }

    // Test 2: Transformation returns null (drops event)
    func testTransformationReturnsNull() throws {
        let event: [String: Any] = [
            "event_id": "test-456"
        ]

        let beforeSendCode = "return null;"

        let result = try TransformService.transform(event: event, beforeSendCode: beforeSendCode)

        XCTAssertTrue(result.success)
        XCTAssertNil(result.transformedEvent)
        XCTAssertNil(result.error)
    }

    // Test 3: Syntax error in beforeSend code
    func testSyntaxError() throws {
        let event: [String: Any] = [
            "event_id": "test-789"
        ]

        let beforeSendCode = "this is invalid javascript {{{}}}"

        let result = try TransformService.transform(event: event, beforeSendCode: beforeSendCode)

        XCTAssertFalse(result.success)
        XCTAssertNotNil(result.error)
        XCTAssertTrue(result.error!.contains("Syntax") || result.error!.contains("error"))
    }

    // Test 4: Runtime error in beforeSend code
    func testRuntimeError() throws {
        let event: [String: Any] = [
            "event_id": "test-runtime"
        ]

        let beforeSendCode = "throw new Error('Intentional error');"

        let result = try TransformService.transform(event: event, beforeSendCode: beforeSendCode)

        XCTAssertFalse(result.success)
        XCTAssertNotNil(result.error)
    }

    // Test 5: Modify exception message
    func testModifyExceptionMessage() throws {
        let event: [String: Any] = [
            "event_id": "test-exception",
            "exception": [
                "values": [
                    [
                        "type": "Error",
                        "value": "Original message"
                    ]
                ]
            ]
        ]

        let beforeSendCode = """
        if (event.exception && event.exception.values) {
            event.exception.values[0].value = "Modified message";
        }
        return event;
        """

        let result = try TransformService.transform(event: event, beforeSendCode: beforeSendCode)

        XCTAssertTrue(result.success)
        XCTAssertNotNil(result.transformedEvent)

        let transformedEvent = result.transformedEvent!
        if let exception = transformedEvent["exception"] as? [String: Any],
           let values = exception["values"] as? [[String: Any]],
           let firstValue = values.first,
           let value = firstValue["value"] as? String {
            XCTAssertEqual(value, "Modified message")
        } else {
            XCTFail("Exception modification failed")
        }
    }

    // Test 6: Add custom tags
    func testAddCustomTags() throws {
        let event: [String: Any] = [
            "event_id": "test-tags",
            "tags": ["existing": "tag"]
        ]

        let beforeSendCode = """
        event.tags = { ...event.tags, custom: "value", platform: "ios" };
        return event;
        """

        let result = try TransformService.transform(event: event, beforeSendCode: beforeSendCode)

        XCTAssertTrue(result.success)

        let transformedEvent = result.transformedEvent!
        if let tags = transformedEvent["tags"] as? [String: String] {
            XCTAssertEqual(tags["existing"], "tag")
            XCTAssertEqual(tags["custom"], "value")
            XCTAssertEqual(tags["platform"], "ios")
        } else {
            XCTFail("Tags not properly added")
        }
    }

    // Test 7: Filter sensitive data
    func testFilterSensitiveData() throws {
        let event: [String: Any] = [
            "event_id": "test-filter",
            "user": [
                "email": "user@example.com",
                "id": "12345"
            ]
        ]

        let beforeSendCode = """
        if (event.user) {
            delete event.user.email;
        }
        return event;
        """

        let result = try TransformService.transform(event: event, beforeSendCode: beforeSendCode)

        XCTAssertTrue(result.success)

        let transformedEvent = result.transformedEvent!
        if let user = transformedEvent["user"] as? [String: Any] {
            XCTAssertNil(user["email"])
            XCTAssertEqual(user["id"] as? String, "12345")
        } else {
            XCTFail("User filtering failed")
        }
    }

    // Test 8: No return statement (implicit return)
    func testNoReturnStatement() throws {
        let event: [String: Any] = [
            "event_id": "test-implicit"
        ]

        let beforeSendCode = """
        event.tags = { implicit: "return" };
        """

        let result = try TransformService.transform(event: event, beforeSendCode: beforeSendCode)

        XCTAssertTrue(result.success)
        XCTAssertNotNil(result.transformedEvent)
    }

    // Test 9: Empty beforeSend code
    func testEmptyBeforeSendCode() throws {
        let event: [String: Any] = [
            "event_id": "test-empty"
        ]

        let beforeSendCode = ""

        let result = try TransformService.transform(event: event, beforeSendCode: beforeSendCode)

        XCTAssertFalse(result.success)
        XCTAssertNotNil(result.error)
    }

    // Test 10: Complex nested data modification
    func testComplexNestedModification() throws {
        let event: [String: Any] = [
            "event_id": "test-nested",
            "contexts": [
                "device": [
                    "name": "iPhone 14",
                    "model": "iPhone14,2"
                ]
            ]
        ]

        let beforeSendCode = """
        if (event.contexts && event.contexts.device) {
            event.contexts.device.platform = "iOS";
            event.tags = { device_name: event.contexts.device.name };
        }
        return event;
        """

        let result = try TransformService.transform(event: event, beforeSendCode: beforeSendCode)

        XCTAssertTrue(result.success)

        let transformedEvent = result.transformedEvent!
        if let contexts = transformedEvent["contexts"] as? [String: Any],
           let device = contexts["device"] as? [String: Any] {
            XCTAssertEqual(device["platform"] as? String, "iOS")
        }

        if let tags = transformedEvent["tags"] as? [String: String] {
            XCTAssertEqual(tags["device_name"], "iPhone 14")
        }
    }

    // Test 11: "return" in comment should not prevent auto-return
    func testReturnInComment() throws {
        let event: [String: Any] = [
            "event_id": "test-comment"
        ]

        let beforeSendCode = """
        // This will return the event with tags
        event.tags = { test: "value" };
        """

        let result = try TransformService.transform(event: event, beforeSendCode: beforeSendCode)

        XCTAssertTrue(result.success)
        XCTAssertNotNil(result.transformedEvent)

        let transformedEvent = result.transformedEvent!
        if let tags = transformedEvent["tags"] as? [String: String] {
            XCTAssertEqual(tags["test"], "value")
        } else {
            XCTFail("Tags should be present - auto-return should have been added")
        }
    }

    // Test 12: "return" in variable name should not prevent auto-return
    func testReturnInVariableName() throws {
        let event: [String: Any] = [
            "event_id": "test-varname"
        ]

        let beforeSendCode = """
        var returnValue = "test";
        event.tags = { result: returnValue };
        """

        let result = try TransformService.transform(event: event, beforeSendCode: beforeSendCode)

        XCTAssertTrue(result.success)
        XCTAssertNotNil(result.transformedEvent)

        let transformedEvent = result.transformedEvent!
        if let tags = transformedEvent["tags"] as? [String: String] {
            XCTAssertEqual(tags["result"], "test")
        } else {
            XCTFail("Tags should be present - auto-return should have been added")
        }
    }

    // Test 13: Actual return statement should work
    func testActualReturnStatement() throws {
        let event: [String: Any] = [
            "event_id": "test-actual-return"
        ]

        let beforeSendCode = """
        var returnCode = 200;
        event.tags = { code: returnCode };
        return event;
        """

        let result = try TransformService.transform(event: event, beforeSendCode: beforeSendCode)

        XCTAssertTrue(result.success)
        XCTAssertNotNil(result.transformedEvent)

        let transformedEvent = result.transformedEvent!
        if let tags = transformedEvent["tags"] as? [String: String] {
            XCTAssertEqual(tags["code"], "200")
        } else {
            XCTFail("Tags should be present")
        }
    }
}
