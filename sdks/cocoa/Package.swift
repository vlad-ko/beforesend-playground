// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "cocoa-sdk",
    platforms: [
        .macOS(.v13)
    ],
    dependencies: [
        // Vapor web framework
        .package(url: "https://github.com/vapor/vapor.git", from: "4.89.0"),
        // Sentry Cocoa SDK
        .package(url: "https://github.com/getsentry/sentry-cocoa.git", from: "8.40.1"),
        // JXKit for cross-platform JavaScriptCore support
        .package(url: "https://github.com/jectivex/JXKit.git", from: "3.0.0")
    ],
    targets: [
        .executableTarget(
            name: "App",
            dependencies: [
                .product(name: "Vapor", package: "vapor"),
                .product(name: "Sentry", package: "sentry-cocoa"),
                .product(name: "JXKit", package: "JXKit")
            ],
            swiftSettings: [
                .unsafeFlags(["-cross-module-optimization"], .when(configuration: .release))
            ],
            linkerSettings: [
                .unsafeFlags(["-L/usr/lib/aarch64-linux-gnu", "-L/usr/lib/llvm-14/lib", "-lc++", "-lc++abi"], .when(platforms: [.linux]))
            ]
        ),
        .testTarget(
            name: "AppTests",
            dependencies: [
                .target(name: "App"),
                .product(name: "XCTVapor", package: "vapor")
            ]
        )
    ]
)
