# Changelog

All notable changes to the Sentry SDK Playground will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-01-29

### Added
- 🎉 **Rebranded to SDK Playground** - Multi-mode testing platform for Sentry SDKs
- ✨ **Multi-mode UI** - Tab-based navigation for different testing modes
- 🪝 **Webhook Testing Playground**
  - 6 webhook templates (Issue Alerts, Metric Alerts, Error Events, Comments)
  - HMAC-SHA256 signature generation with configurable secrets
  - Built-in webhook receiver for signature verification testing
  - Visual request/response viewer with detailed error messages
  - SE guidance section with troubleshooting tips and customer examples
  - Support for external webhook testing services (webhook.site, etc.)
- 📝 **Comprehensive Webhook Documentation**
  - Signature verification examples (Node.js, Python)
  - Common use cases for Solutions Engineers
  - Troubleshooting guide for signature mismatches
- 🎨 **Mode Persistence** - Remembers last selected mode across page refreshes
- 📊 **Enhanced Error Display** - Expandable error details with full response bodies

### Changed
- Refactored UI to support multiple playground modes (beforeSend, Webhooks)
- Updated navigation with tab-based mode selector
- Improved responsive layout for multi-panel interfaces
- Enhanced API error handling with detailed response inspection

### Technical Improvements
- Added comprehensive test coverage for webhook functionality (28 API tests, 18 UI tests)
- Implemented raw body capture middleware for accurate signature verification
- Added TypeScript interfaces for webhook templates and responses
- Improved Docker build caching for faster development iterations

## [1.0.0] - 2025-01-XX

### Added
- Initial release as "beforeSend Playground"
- Support for 11 Sentry SDKs (JavaScript, Python, Ruby, PHP, Go, .NET, Java, Android, Cocoa, Rust, Elixir)
- 19 pre-built example templates
- Visual diff viewer for event transformations
- Real-time syntax validation for 7 SDKs
- Secure configuration sharing with PII scrubbing
- Monaco editor integration
- Docker-isolated execution environment
- Comprehensive documentation and examples

---

## Migration Guide: v1.x to v2.0

### Repository Changes

The repository has been renamed from `beforesend-playground` to `sdk-playground`.

**Update your git remote:**
```bash
git remote set-url origin https://github.com/your-org/sdk-playground.git
```

### Docker Changes

Container names have been updated to reflect the new branding:
- `beforesend-playground-api` → `sdk-playground-api`
- `beforesend-playground-ui` → `sdk-playground-ui`
- `beforesend-playground-sdk-*` → `sdk-playground-sdk-*`

**Rebuild containers:**
```bash
docker-compose down
docker-compose build
docker-compose up -d
```

### UI Changes

The UI now features multiple modes accessible via tabs:
- **beforeSend Mode** - Same functionality as v1.x, no changes required
- **Webhooks Mode** - New webhook testing functionality

All existing beforeSend configurations and workflows remain unchanged.

### API Changes

**New Endpoints:**
- `GET /api/webhooks/templates` - List webhook templates
- `GET /api/webhooks/templates/:id` - Get specific template
- `POST /api/webhooks/send` - Send webhook to endpoint
- `POST /api/webhooks/receive` - Built-in webhook receiver

All existing `/api/transform` endpoints remain unchanged and fully compatible with v1.x.

### Breaking Changes

None. Version 2.0 is fully backward compatible with 1.x configurations and workflows.
