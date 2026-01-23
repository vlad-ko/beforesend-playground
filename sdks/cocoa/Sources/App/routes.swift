import Vapor

struct TransformRequest: Content {
    let event: [String: AnyCodable]
    let beforeSendCode: String
}

struct TransformResponse: Content {
    let success: Bool
    let transformedEvent: [String: AnyCodable]?
    let error: String?
    let traceback: String?

    enum CodingKeys: String, CodingKey {
        case success
        case transformedEvent
        case error
        case traceback
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(success, forKey: .success)
        try container.encode(transformedEvent, forKey: .transformedEvent)
        try container.encode(error, forKey: .error)
        try container.encode(traceback, forKey: .traceback)
    }
}

struct HealthResponse: Content {
    let status: String
    let sdk: String
}

// AnyCodable helper for dynamic JSON
struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if container.decodeNil() {
            self.value = NSNull()
        } else if let bool = try? container.decode(Bool.self) {
            self.value = bool
        } else if let int = try? container.decode(Int.self) {
            self.value = int
        } else if let double = try? container.decode(Double.self) {
            self.value = double
        } else if let string = try? container.decode(String.self) {
            self.value = string
        } else if let array = try? container.decode([AnyCodable].self) {
            self.value = array.map { $0.value }
        } else if let dictionary = try? container.decode([String: AnyCodable].self) {
            self.value = dictionary.mapValues { $0.value }
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "AnyCodable value cannot be decoded"
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch value {
        case is NSNull:
            try container.encodeNil()
        case let bool as Bool:
            try container.encode(bool)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let string as String:
            try container.encode(string)
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case let dictionary as [String: Any]:
            try container.encode(dictionary.mapValues { AnyCodable($0) })
        default:
            let context = EncodingError.Context(
                codingPath: container.codingPath,
                debugDescription: "AnyCodable value cannot be encoded"
            )
            throw EncodingError.invalidValue(value, context)
        }
    }
}

func routes(_ app: Application) throws {
    // Health check endpoint
    app.get("health") { req -> HealthResponse in
        return HealthResponse(status: "healthy", sdk: "cocoa")
    }

    // Transform endpoint
    app.post("transform") { req -> TransformResponse in
        req.logger.info("Transform endpoint called")
        let transformReq = try req.content.decode(TransformRequest.self)
        req.logger.info("Decoded request, event keys: \(transformReq.event.keys)")

        // Convert AnyCodable to [String: Any]
        let event = transformReq.event.mapValues { $0.value }
        req.logger.info("Converted event to [String: Any]")

        do {
            req.logger.info("Calling TransformService.transform")
            let result = try TransformService.transform(
                event: event,
                beforeSendCode: transformReq.beforeSendCode
            )
            req.logger.info("Transform result: success=\(result.success), hasEvent=\(result.transformedEvent != nil)")

            let transformedEvent: [String: AnyCodable]? = result.transformedEvent?.mapValues { AnyCodable($0) }

            return TransformResponse(
                success: result.success,
                transformedEvent: transformedEvent,
                error: result.error,
                traceback: result.traceback
            )
        } catch {
            return TransformResponse(
                success: false,
                transformedEvent: nil,
                error: "Transform failed: \(error.localizedDescription)",
                traceback: nil
            )
        }
    }
}
