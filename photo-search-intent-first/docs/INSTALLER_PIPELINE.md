# Installer Pipeline Documentation

## Overview

This document describes the installer pipeline for the Photo Search application, including codesigning, notarization, and SmartScreen configuration for Windows, macOS, and Linux platforms.

## Prerequisites

### macOS Codesigning and Notarization

1. **Apple Developer Account**: Required for codesigning certificates
2. **Developer ID Certificate**: For distributing outside the Mac App Store
3. **Notarization Credentials**: Apple ID and app-specific password

### Windows Code Signing

1. **Code Signing Certificate**: From a trusted CA (e.g., DigiCert, Sectigo)
2. **Windows SDK**: For signtool.exe
3. **Certificate File**: PFX file with private key

### Linux Packaging

1. **AppImageKit**: For AppImage creation
2. **dpkg-dev**: For Debian package creation
3. **rpm-build**: For RPM package creation

## Build Configuration

The build configuration is defined in `electron/package.json` under the `build` section:

```json
{
  "build": {
    "appId": "com.photos.search.intentfirst",
    "productName": "Photo Search",
    "mac": {
      "target": ["dmg", "zip"],
      "category": "public.app-category.photography",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist"
    },
    "win": {
      "target": [
        {"target": "nsis", "arch": ["x64"]},
        {"target": "msi", "arch": ["x64"]}
      ],
      "certificateSubjectName": "Your Company Name",
      "certificateSha1": "YOUR_CERTIFICATE_SHA1_HERE",
      "sign": "./build/sign-windows.js"
    },
    "linux": {
      "target": ["AppImage", "deb", "rpm"],
      "category": "Graphics"
    }
  }
}
```

## Build Scripts

### Development Builds

```bash
# Development mode
npm run dev

# Full development mode with UI build and model preparation
npm run dev:full
```

### Production Builds

```bash
# Build for all platforms
npm run dist

# Build for specific platforms
npm run dist:mac
npm run dist:win
npm run dist:linux

# Package without rebuilding
npm run pack
```

### Release Builds with Codesigning

```bash
# Full release build with codesigning and notarization
npm run release

# Platform-specific release builds
npm run release:mac
npm run release:win
npm run release:linux
```

## macOS Codesigning and Notarization

### Entitlements

The entitlements file (`build/entitlements.mac.plist`) grants necessary permissions:

- JIT compilation for performance
- Unsigned executable memory for dynamic code generation
- Library validation disabling for plugin loading
- File system access for photo directories
- Network access for API communication

### Environment Variables

Set these environment variables for notarization:

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_PASSWORD="your-app-specific-password"
export APPLE_TEAM_ID="your-team-id"
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)"
```

### Notarization Process

1. **Codesign**: Sign the app bundle with hardened runtime
2. **Package**: Create the distributable (DMG, ZIP)
3. **Upload**: Submit to Apple for notarization
4. **Staple**: Attach the notarization ticket to the app

### Build Commands

```bash
# Manual codesigning
npm run sign:mac

# Manual notarization
npm run notarize:mac

# Full release process
npm run release
```

## Windows Code Signing

### Certificate Requirements

- Extended Validation (EV) certificate recommended for SmartScreen reputation
- SHA-256 algorithm support
- Valid for at least the duration of the release cycle

### Environment Variables

```bash
export WINDOWS_CERTIFICATE_FILE="/path/to/certificate.pfx"
export WINDOWS_CERTIFICATE_PASSWORD="certificate-password"
```

### Signing Process

1. **Build**: Create unsigned executables
2. **Sign**: Apply code signature with timestamp
3. **Verify**: Confirm signature validity

### SmartScreen Configuration

Windows SmartScreen reputation is built through:

- **Volume**: Number of downloads and installations
- **Time**: Duration of distribution without malware reports
- **Reputation**: User feedback and Microsoft's threat intelligence

To accelerate SmartScreen reputation:

1. Use EV certificates
2. Distribute through official channels (Microsoft Store, official website)
3. Maintain consistent publisher identity
4. Avoid false positives in antivirus scans

## Linux Packaging

### Supported Formats

1. **AppImage**: Universal format with no installation required
2. **Debian Package (.deb)**: For Ubuntu/Debian-based distributions
3. **Red Hat Package (.rpm)**: For Fedora/CentOS/RHEL distributions

### AppImage Features

- Portable single-file distribution
- No system installation required
- Automatic updates via AppImageUpdate
- Desktop integration with appimaged daemon

### Package Metadata

Each package includes:

- Application icon and metadata
- MIME type associations for supported photo formats
- Desktop entry for application menu integration
- System integration scripts for automatic updates

## Continuous Integration

### GitHub Actions Workflow

The recommended CI workflow includes:

1. **Build Matrix**: Parallel builds for all platforms
2. **Dependency Caching**: Speed up subsequent builds
3. **Automated Testing**: Validate functionality before packaging
4. **Codesigning**: Apply signatures with secure credential access
5. **Distribution**: Upload to release channels

### Artifact Publishing

Artifacts are published to:

1. **GitHub Releases**: For direct downloads
2. **Package Repositories**: APT, YUM repositories
3. **Microsoft Store**: For Windows distribution
4. **Mac App Store**: For curated macOS distribution

## Security Best Practices

### Code Signing

- Protect private keys with hardware security modules (HSM)
- Use timestamping to ensure validity beyond certificate expiration
- Rotate certificates before expiration
- Monitor certificate revocation lists

### Notarization

- Submit all releases for notarization
- Handle notarization failures gracefully
- Verify notarization tickets before distribution
- Maintain audit trail of notarization receipts

### Supply Chain Security

- Validate all third-party dependencies
- Use reproducible builds for verification
- Maintain SBOM (Software Bill of Materials)
- Scan for vulnerabilities in dependencies

## Troubleshooting

### Common Issues

1. **Codesigning Failures**
   - Expired certificates
   - Incorrect entitlements
   - Missing hardened runtime flag

2. **Notarization Delays**
   - Apple service outages
   - Malware detection false positives
   - Missing entitlements for required permissions

3. **SmartScreen Warnings**
   - New publisher identity
   - Low download volume
   - Antivirus false positives

### Debugging Commands

```bash
# Verify macOS signature
codesign --verify --deep --strict /path/to/app

# Check notarization status
spctl --assess --type exec /path/to/app

# Verify Windows signature
signtool verify /pa /v /path/to/executable.exe
```

## Release Process

### Preparation

1. Update version numbers in package.json
2. Update changelog and release notes
3. Validate all build configurations
4. Test on clean environments

### Build and Sign

1. Execute platform-specific build commands
2. Apply codesignatures to executables
3. Submit macOS builds for notarization
4. Verify all signatures and notarizations

### Distribution

1. Upload artifacts to release channels
2. Update download links and documentation
3. Announce release on social channels
4. Monitor installation and SmartScreen reports

### Post-Release

1. Collect user feedback
2. Monitor crash reports and error logs
3. Track SmartScreen reputation improvements
4. Prepare hotfix releases if needed