import Vapor

public func configure(_ app: Application) throws {
    // Configure server
    app.http.server.configuration.hostname = "0.0.0.0"
    app.http.server.configuration.port = 5009

    // Configure routes
    try routes(app)
}
