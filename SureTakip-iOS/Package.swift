// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "SureTakip",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    dependencies: [
        // Firebase iOS SDK
        .package(url: "https://github.com/firebase/firebase-ios-sdk.git", from: "10.22.0")
    ],
    targets: [
        .executableTarget(
            name: "SureTakip",
            dependencies: [
                .product(name: "FirebaseAuth", package: "firebase-ios-sdk"),
                .product(name: "FirebaseFirestore", package: "firebase-ios-sdk"),
            ],
            path: "SureTakip",
            resources: [
                .process("GoogleService-Info.plist")
            ]
        )
    ]
)
