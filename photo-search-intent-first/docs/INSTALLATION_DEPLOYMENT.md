# Installation and Deployment Guide

## Overview

This guide provides comprehensive instructions for installing, deploying, and maintaining the Photo Search application across different environments and platforms.

## Prerequisites

### System Requirements

#### Minimum Requirements
- **Operating System**: 
  - macOS 10.15+ (Catalina)
  - Windows 10+ (64-bit)
  - Ubuntu 18.04+ or equivalent Linux distribution
- **RAM**: 8GB RAM (16GB recommended)
- **Disk Space**: 500MB for application + 2GB for AI models
- **CPU**: 2-core processor (Intel/AMD x86_64 or Apple Silicon)
- **GPU**: Integrated graphics (dedicated GPU recommended for AI processing)

#### Recommended Requirements
- **Operating System**: 
  - macOS 11+ (Big Sur)
  - Windows 11+ (64-bit)
  - Ubuntu 20.04+ or equivalent
- **RAM**: 16GB RAM (32GB for large libraries)
- **Disk Space**: 4GB (application + AI models + cache)
- **CPU**: 4-core processor with AVX2 support
- **GPU**: Dedicated GPU with 4GB+ VRAM (NVIDIA/AMD/Intel)

### Dependencies

#### Runtime Dependencies (Automatically Installed)
- **Python 3.9+**: For AI model execution
- **Node.js 16+**: For Electron runtime
- **CUDA 11+**: For NVIDIA GPU acceleration (optional)
- **ROCm 5+**: For AMD GPU acceleration (optional)

#### Build Dependencies (Development Only)
- **Git 2.20+**: For source code management
- **npm 8+**: For JavaScript package management
- **pip 21+**: For Python package management
- **Docker 20+**: For containerized builds (optional)
- **Xcode 13+**: For macOS codesigning (macOS only)
- **Visual Studio Build Tools**: For Windows builds (Windows only)

## Installation Methods

### End-User Installation

#### macOS

1. **Download**:
   - Visit the [releases page](https://github.com/yourorg/photo-search/releases)
   - Download the `.dmg` file for your architecture (Intel or Apple Silicon)

2. **Install**:
   ```bash
   # Open the DMG file
   open PhotoSearch-mac-x64.dmg
   
   # Drag Photo Search to Applications folder
   # (GUI operation, no terminal command needed)
   ```

3. **First Launch**:
   ```bash
   # Launch from Applications folder
   open /Applications/Photo\ Search.app
   
   # Or from terminal
   /Applications/Photo\ Search.app/Contents/MacOS/Photo\ Search
   ```

4. **Grant Permissions** (if prompted):
   - Full Disk Access (for photo library access)
   - Camera Access (for webcam features)
   - Notification Access (for status updates)

#### Windows

1. **Download**:
   - Visit the releases page
   - Download the `.exe` installer for your architecture (x64 recommended)

2. **Install**:
   ```cmd
   REM Run the installer
   PhotoSearch-win-x64.exe
   
   REM Or silent install
   PhotoSearch-win-x64.exe /S /D=C:\Program Files\PhotoSearch
   ```

3. **First Launch**:
   ```cmd
   REM Launch from Start Menu
   REM Or from installation directory
   "C:\Program Files\PhotoSearch\Photo Search.exe"
   ```

4. **Grant Permissions** (if prompted):
   - File System Access (for photo library access)
   - Camera Access (for webcam features)
   - Notification Access (for status updates)

#### Linux

1. **Download**:
   - Visit the releases page
   - Download the `.AppImage` file for universal Linux support

2. **Install**:
   ```bash
   # Make AppImage executable
   chmod +x PhotoSearch-linux-x64.AppImage
   
   # Run directly
   ./PhotoSearch-linux-x64.AppImage
   
   # Or integrate with system
   mkdir -p ~/.local/bin
   cp PhotoSearch-linux-x64.AppImage ~/.local/bin/photo-search
   chmod +x ~/.local/bin/photo-search
   ```

3. **Alternative Package Managers**:
   ```bash
   # For Debian/Ubuntu (using .deb package)
   sudo dpkg -i PhotoSearch-linux-amd64.deb
   sudo apt-get install -f  # Fix dependencies if needed
   
   # For Red Hat/Fedora (using .rpm package)
   sudo rpm -i PhotoSearch-linux-x86_64.rpm
   
   # For Arch Linux (using AUR)
   yay -S photo-search
   ```

### Developer Installation

#### Clone Repository

```bash
# Clone the repository
git clone https://github.com/yourorg/photo-search.git
cd photo-search/photo-search-intent-first

# Initialize submodules (if any)
git submodule update --init --recursive
```

#### Install Dependencies

```bash
# Navigate to electron directory
cd electron

# Install Node.js dependencies
npm install

# Install Python dependencies
cd ..
pip install -r requirements.txt

# Install development dependencies
pip install -r requirements-dev.txt
```

#### Environment Setup

Create a `.env` file in the project root:

```bash
# .env
NODE_ENV=development
ELECTRON_LOG_LEVEL=debug
PYTHON_PATH=/usr/bin/python3
```

## Build Process

### Development Builds

#### Run in Development Mode

```bash
# Navigate to electron directory
cd electron

# Run with hot reload
npm run dev

# Run with full setup (UI build + model prep)
npm run dev:full
```

#### Build UI Only

```bash
# Build React frontend
cd ../webapp
npm install
npm run build

# Return to electron directory
cd ../electron

# Run electron with built UI
npm run dev
```

### Production Builds

#### Build for Current Platform

```bash
# Navigate to electron directory
cd electron

# Build for current platform
npm run dist

# Build directory only (no installer)
npm run pack
```

#### Build for Specific Platforms

```bash
# Build for macOS
npm run dist:mac

# Build for Windows
npm run dist:win

# Build for Linux
npm run dist:linux

# Build for all platforms
npm run dist
```

#### Custom Build Configuration

Create a `build.config.js` file for custom builds:

```javascript
// build.config.js
module.exports = {
  appId: 'com.yourcompany.photos',
  productName: 'Your Photo Search',
  directories: {
    output: 'dist/custom'
  },
  mac: {
    category: 'public.app-category.photography',
    target: ['dmg', 'zip']
  },
  win: {
    target: ['nsis', 'msi']
  },
  linux: {
    target: ['AppImage', 'deb', 'rpm'],
    category: 'Graphics'
  }
};
```

## Codesigning and Notarization

### macOS Codesigning

#### Prerequisites

1. **Apple Developer Account**
2. **Developer ID Certificate**
3. **Apple ID and App-Specific Password**

#### Setup Certificates

```bash
# Import Developer ID certificate
open developer-id-application.cer

# Verify certificate is installed
security find-identity -v -p codesigning

# Expected output:
# 1) ABC123DEF4567890ABC123DEF4567890ABC123DE "Developer ID Application: Your Name (TEAMID)"
```

#### Environment Variables

Set these environment variables:

```bash
# .env.codesign
export APPLE_ID="your-apple-id@apple.com"
export APPLE_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="YOURTEAMID"
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)"
```

#### Manual Codesigning

```bash
# Sign the app bundle
npm run sign:mac

# Notarize the app
npm run notarize:mac

# Full release process
npm run release
```

### Windows Codesigning

#### Prerequisites

1. **Code Signing Certificate** (EV certificate recommended)
2. **Windows SDK** (for signtool)
3. **Certificate File** (PFX format)

#### Setup Certificate

```bash
# Verify certificate
certutil -viewstore -user my

# Export certificate (if needed)
certutil -exportpfx -user "Your Certificate Name" certificate.pfx
```

#### Environment Variables

Set these environment variables:

```bash
# .env.codesign
export WINDOWS_CERTIFICATE_FILE="/path/to/certificate.pfx"
export WINDOWS_CERTIFICATE_PASSWORD="certificate-password"
```

#### Manual Signing

```bash
# Sign Windows executables
npm run sign:win

# Verify signature
signtool verify /pa /v /path/to/PhotoSearch.exe
```

## Deployment Strategies

### Local Deployment

#### Single User Installation

```bash
# Install for current user only
npm run pack

# Copy to user applications directory
mkdir -p ~/Applications
cp -r dist/mac/Photo\ Search.app ~/Applications/
```

#### Multi-User Installation (macOS)

```bash
# Build installer
npm run dist:mac

# Install system-wide (requires admin privileges)
sudo installer -pkg dist/PhotoSearch.pkg -target /

# Verify installation
ls -la /Applications/Photo\ Search.app
```

### Enterprise Deployment

#### MSI Deployment (Windows)

```bash
# Build MSI package
npm run dist:win

# Deploy via Group Policy
msiexec /i PhotoSearch-win-x64.msi /quiet /norestart

# Deploy via SCCM
# Use standard SCCM deployment procedures
```

#### PKG Deployment (macOS)

```bash
# Build PKG installer
npm run dist:mac

# Deploy via MDM
# Upload PhotoSearch.pkg to your MDM solution
# Configure deployment to target devices
```

#### AppImage Deployment (Linux)

```bash
# Build AppImage
npm run dist:linux

# Deploy to user machines
wget https://your-server.com/PhotoSearch-linux-x64.AppImage
chmod +x PhotoSearch-linux-x64.AppImage
./PhotoSearch-linux-x64.AppImage

# Or deploy via package manager
# Place .deb or .rpm in repository
sudo apt update
sudo apt install photo-search
```

### Containerized Deployment

#### Docker (Development)

```dockerfile
# Dockerfile
FROM electronuserland/builder:wine AS builder

WORKDIR /app
COPY . .
RUN npm install
RUN npm run dist

FROM debian:bullseye-slim
RUN apt-get update && apt-get install -y \
    libgtk-3-0 \
    libnotify4 \
    libnss3 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    libatspi2.0-0 \
    libuuid1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist/*.deb /tmp/
RUN apt install -y /tmp/*.deb

CMD ["photo-search"]
```

```bash
# Build and run
docker build -t photo-search .
docker run -it --rm \
    -v /tmp/.X11-unix:/tmp/.X11-unix \
    -e DISPLAY=$DISPLAY \
    -v $HOME/Pictures:/photos:ro \
    photo-search
```

#### Kubernetes (Enterprise)

```yaml
# kubernetes/photo-search-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: photo-search
spec:
  replicas: 3
  selector:
    matchLabels:
      app: photo-search
  template:
    metadata:
      labels:
        app: photo-search
    spec:
      containers:
      - name: photo-search
        image: your-registry/photo-search:latest
        ports:
        - containerPort: 8000
        volumeMounts:
        - name: photo-storage
          mountPath: /photos
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
          limits:
            memory: "8Gi"
            cpu: "4"
      volumes:
      - name: photo-storage
        persistentVolumeClaim:
          claimName: photo-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: photo-search-service
spec:
  selector:
    app: photo-search
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8000
  type: LoadBalancer
```

## Configuration Management

### Application Configuration

#### Configuration File Locations

- **macOS**: `~/Library/Application Support/Photo Search/config.json`
- **Windows**: `%APPDATA%\Photo Search\config.json`
- **Linux**: `~/.config/Photo Search/config.json`

#### Configuration Schema

```json
{
  "version": "1.0",
  "general": {
    "theme": "system",
    "language": "en",
    "autoStart": true,
    "checkForUpdates": true
  },
  "ai": {
    "modelProvider": "local",
    "processingThreads": 4,
    "enableOcr": true,
    "enableCaptions": true,
    "enableFaces": true
  },
  "performance": {
    "cacheSize": "2GB",
    "thumbnailQuality": "high",
    "backgroundProcessing": "smart"
  },
  "privacy": {
    "telemetry": true,
    "crashReports": true,
    "usageAnalytics": false
  },
  "directories": {
    "lastUsed": ["/Users/john/Pictures", "/Volumes/Photos"],
    "allowedRoots": ["/Users/john/Pictures"]
  }
}
```

### Environment Variables

#### Development Variables

```bash
# .env.development
NODE_ENV=development
ELECTRON_LOG_LEVEL=debug
PYTHON_PATH=/usr/bin/python3
API_PORT=8000
```

#### Production Variables

```bash
# .env.production
NODE_ENV=production
ELECTRON_LOG_LEVEL=info
API_TOKEN=generated-at-runtime
PHOTOVAULT_MODEL_DIR=/path/to/models
TRANSFORMERS_CACHE=/path/to/models
HF_HUB_OFFLINE=1
```

## Maintenance and Updates

### Automatic Updates

#### Configuration

```json
{
  "updates": {
    "enabled": true,
    "channel": "stable",
    "frequency": "daily",
    "notifyBeforeInstall": true
  }
}
```

#### Update Process

1. **Background Check**: Daily check for updates
2. **Download**: Silent download of update package
3. **Notification**: Inform user of available update
4. **Installation**: Apply update on next restart

#### Manual Update Trigger

```javascript
// Trigger manual update check
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();
```

### Manual Updates

#### Download Latest Version

```bash
# Check current version
photo-search --version

# Download and install latest
curl -L https://github.com/yourorg/photo-search/releases/latest/download/PhotoSearch-mac-x64.dmg -o PhotoSearch.dmg
open PhotoSearch.dmg
```

#### Preserve User Data

```bash
# Backup user data before major update
tar -czf photo-search-backup-$(date +%Y%m%d).tar.gz \
    ~/Library/Application\ Support/Photo\ Search/

# Restore after update (if needed)
tar -xzf photo-search-backup-20231201.tar.gz \
    -C ~/Library/Application\ Support/
```

### Model Management

#### Model Updates

```bash
# Check for model updates
photo-search --check-models

# Update models
photo-search --update-models

# List installed models
photo-search --list-models

# Remove unused models
photo-search --cleanup-models
```

#### Custom Models

```bash
# Install custom model
photo-search --install-model /path/to/custom-model.zip

# Set default model
photo-search --set-default-model custom-model-v1

# Verify model integrity
photo-search --verify-model custom-model-v1
```

## Monitoring and Logging

### Log Locations

#### User Logs

- **macOS**: `~/Library/Logs/Photo Search/`
- **Windows**: `%APPDATA%\Photo Search\logs\`
- **Linux**: `~/.config/Photo Search/logs/`

#### System Logs

- **macOS**: Console.app or `/var/log/system.log`
- **Windows**: Event Viewer
- **Linux**: `journalctl` or `/var/log/syslog`

### Log Levels

```javascript
// Configure log levels
const logLevels = {
  error: 0,    // Critical errors only
  warn: 1,     // Warnings and errors
  info: 2,     // General information
  debug: 3,    // Debug information
  trace: 4     // Detailed trace information
};
```

### Monitoring Scripts

```bash
#!/bin/bash
# monitor-photo-search.sh

# Check if service is running
if pgrep -f "Photo Search" > /dev/null; then
    echo "Photo Search is running"
else
    echo "Photo Search is not running"
    exit 1
fi

# Check disk usage
USAGE=$(df -h "~/Library/Application Support/Photo Search" | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$USAGE" -gt 80 ]; then
    echo "Warning: High disk usage ($USAGE%)"
fi

# Check memory usage
MEMORY=$(ps aux | grep "Photo Search" | awk '{sum += $6} END {print sum}')
echo "Memory usage: ${MEMORY}KB"

# Check for recent errors
ERROR_COUNT=$(tail -1000 ~/Library/Logs/Photo\ Search/main.log | grep ERROR | wc -l)
if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "Recent errors: $ERROR_COUNT"
fi
```

## Troubleshooting

### Common Installation Issues

#### macOS Gatekeeper Blocking

**Problem**: "Photo Search can't be opened because it is from an unidentified developer"

**Solution**:
```bash
# Right-click and open (recommended)
# Or temporarily disable Gatekeeper:
sudo spctl --master-disable

# Run Photo Search
open /Applications/Photo\ Search.app

# Re-enable Gatekeeper:
sudo spctl --master-enable
```

#### Windows SmartScreen Warning

**Problem**: "Windows protected your PC" warning

**Solution**:
```cmd
REM Run as administrator
whoami /groups | findstr "High Mandatory Level"

REM Or click "More info" then "Run anyway"
```

#### Linux AppImage Not Executing

**Problem**: "Permission denied" when running AppImage

**Solution**:
```bash
# Make executable
chmod +x PhotoSearch-linux-x64.AppImage

# Run with FUSE
./PhotoSearch-linux-x64.AppImage

# Or extract and run
./PhotoSearch-linux-x64.AppImage --appimage-extract
./squashfs-root/AppRun
```

### Service Startup Issues

#### Python Service Not Starting

**Problem**: Backend service fails to start

**Troubleshooting**:
```bash
# Check logs
tail -f ~/Library/Logs/Photo\ Search/api.log

# Verify Python installation
/usr/bin/python3 --version

# Check virtual environment
ls -la ~/.photo-search/venv/

# Restart service
photo-search --restart-backend
```

#### Port Conflicts

**Problem**: "Address already in use" error

**Solution**:
```bash
# Check for conflicting processes
lsof -i :8000
netstat -an | grep 8000

# Kill conflicting process
kill -9 $(lsof -t -i :8000)

# Or configure different port
echo 'API_PORT=8001' >> ~/.photo-search/.env
```

### Performance Issues

#### High CPU Usage

**Problem**: Photo Search consuming excessive CPU

**Solutions**:
```bash
# Check current processes
top -o cpu | grep "Photo Search"

# Reduce processing threads
photo-search --set-processing-threads 2

# Pause background indexing
photo-search --pause-indexing

# Monitor with built-in tools
photo-search --monitor-performance
```

#### Memory Leaks

**Problem**: Steady increase in memory usage over time

**Solutions**:
```bash
# Check memory usage
ps -o pid,rss,vsz,comm $(pgrep "Photo Search")

# Restart application to clear memory
photo-search --restart

# Configure memory limits
echo 'MAX_MEMORY=4GB' >> ~/.photo-search/.env

# Monitor memory usage
photo-search --monitor-memory
```

## Security Considerations

### Data Encryption

#### At-Rest Encryption

```bash
# Enable encryption
photo-search --enable-encryption

# Set encryption key
photo-search --set-encryption-key /path/to/keyfile

# Verify encryption
photo-search --verify-encryption
```

#### In-Transit Encryption

```bash
# Enable HTTPS for local API
photo-search --enable-https

# Configure SSL certificate
photo-search --set-ssl-cert /path/to/cert.pem
photo-search --set-ssl-key /path/to/key.pem
```

### Access Controls

#### User Permissions

```bash
# Set file permissions
chmod 700 ~/Library/Application\ Support/Photo\ Search/

# Verify ownership
ls -la ~/Library/Application\ Support/Photo\ Search/

# Set ACL (macOS)
chmod +a "everyone deny delete" ~/Library/Application\ Support/Photo\ Search/
```

#### Network Security

```bash
# Bind to localhost only
photo-search --bind-address 127.0.0.1

# Configure firewall (macOS)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /Applications/Photo\ Search.app
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --blockappreqs /Applications/Photo\ Search.app
```

## Backup and Recovery

### Automated Backups

#### Configuration Backup

```bash
# Create backup script
cat > backup-photo-search.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="$HOME/Backups/PhotoSearch"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR/$DATE"

# Backup configuration
cp -r "$HOME/Library/Application Support/Photo Search" "$BACKUP_DIR/$DATE/"

# Compress backup
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" -C "$BACKUP_DIR" "$DATE"

# Clean old backups (keep last 7 days)
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +7 -delete
EOF

chmod +x backup-photo-search.sh

# Schedule daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * $HOME/backup-photo-search.sh") | crontab -
```

#### Photo Library Backup

```bash
# Use rsync for photo library backup
rsync -av --progress \
    /Users/john/Pictures/ \
    /Volumes/BackupDrive/Photos/ \
    --exclude='.DS_Store' \
    --exclude='.thumbnails' \
    --exclude='*.tmp'
```

### Disaster Recovery

#### Full System Recovery

```bash
# Restore from backup
tar -xzf backup_20231201_143022.tar.gz -C ~/Library/Application\ Support/

# Verify restoration
photo-search --verify-integrity

# Rebuild indexes if needed
photo-search --rebuild-indexes
```

#### Selective Restoration

```bash
# Restore only configuration
cp backup/config.json ~/Library/Application\ Support/Photo\ Search/

# Restore only cache
tar -xzf backup/cache.tar.gz -C ~/Library/Application\ Support/Photo\ Search/

# Restore only indexes
photo-search --restore-indexes backup/indexes/
```

## Enterprise Considerations

### Group Policy Management

#### Windows GPO

```xml
<!-- PhotoSearch-GPO.xml -->
<GroupPolicy>
  <Computer>
    <Extension>
      <Name>Registry</Name>
      <Setting>
        <KeyName>SOFTWARE\Policies\PhotoSearch</KeyName>
        <ValueName>AutoUpdate</ValueName>
        <Value>0</Value>
        <Type>REG_DWORD</Type>
      </Setting>
      <Setting>
        <KeyName>SOFTWARE\Policies\PhotoSearch</KeyName>
        <ValueName>AllowTelemetry</ValueName>
        <Value>0</Value>
        <Type>REG_DWORD</Type>
      </Setting>
    </Extension>
  </Computer>
</GroupPolicy>
```

#### macOS Profile

```xml
<!-- PhotoSearch-Profile.mobileconfig -->
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>PayloadType</key>
      <string>com.apple.ManagedClient.preferences</string>
      <key>PayloadContent</key>
      <dict>
        <key>com.photos.search</key>
        <dict>
          <key>Forced</key>
          <array>
            <dict>
              <key>mcx_preference_settings</key>
              <dict>
                <key>AutoUpdate</key>
                <false/>
                <key>AllowTelemetry</key>
                <false/>
                <key>AllowedRoots</key>
                <array>
                  <string>/Users/Shared/Photos</string>
                </array>
              </dict>
            </dict>
          </array>
        </dict>
      </dict>
    </dict>
  </array>
</dict>
</plist>
```

### Centralized Management

#### Configuration Management

```yaml
# ansible/playbooks/photo-search.yml
---
- hosts: workstations
  tasks:
    - name: Install Photo Search
      package:
        name: photo-search
        state: present
      when: ansible_os_family == "Darwin"
      
    - name: Configure Photo Search
      template:
        src: photo-search-config.json.j2
        dest: "{{ ansible_user_dir }}/Library/Application Support/Photo Search/config.json"
        
    - name: Set allowed directories
      lineinfile:
        path: "{{ ansible_user_dir }}/Library/Application Support/Photo Search/config.json"
        regexp: '"allowedRoots": \['
        line: '    "allowedRoots": ["/Company/Photos", "/Users/{{ ansible_user }}/Pictures"]'
```

#### Monitoring and Reporting

```bash
#!/bin/bash
# enterprise-monitor.sh

# Collect system information
HOSTNAME=$(hostname)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Check Photo Search status
if pgrep -f "Photo Search" > /dev/null; then
    STATUS="running"
else
    STATUS="stopped"
fi

# Collect performance metrics
CPU_USAGE=$(ps -o %cpu= -p $(pgrep -f "Photo Search"))
MEMORY_USAGE=$(ps -o rss= -p $(pgrep -f "Photo Search"))

# Send to monitoring system
curl -X POST https://monitoring.company.com/api/v1/metrics \
    -H "Content-Type: application/json" \
    -d "{
        \"hostname\": \"$HOSTNAME\",
        \"timestamp\": \"$TIMESTAMP\",
        \"application\": \"Photo Search\",
        \"status\": \"$STATUS\",
        \"cpu_usage\": $CPU_USAGE,
        \"memory_usage_kb\": $MEMORY_USAGE
    }"
```

## Migration Guides

### Upgrading from Previous Versions

#### Version 1.x to 2.x

**Breaking Changes**:
- Configuration file format updated
- Cache directory structure changed
- API endpoints renamed

**Migration Steps**:
```bash
# Backup current configuration
cp ~/Library/Application\ Support/Photo\ Search/config.json ~/config.backup

# Run migration tool
photo-search --migrate-config

# Verify migration
photo-search --verify-config
```

#### Migrating Photo Libraries

```bash
# Export from old version
photo-search-1.x --export-library /path/to/export

# Import to new version
photo-search-2.x --import-library /path/to/export
```

### Cross-Platform Migration

#### macOS to Windows

```bash
# Export macOS library
photo-search-mac --export-migration /tmp/photos-migration.zip

# Import on Windows
photo-search-win --import-migration C:\temp\photos-migration.zip
```

#### Windows to Linux

```bash
# Export Windows library
photo-search-win --export-migration C:\temp\photos-migration.zip

# Import on Linux
photo-search-linux --import-migration /tmp/photos-migration.zip
```

## Support and Resources

### Documentation
- [User Guide](USER_GUIDE.md)
- [API Reference](API_REFERENCE.md)
- [Developer Documentation](DEVELOPER_DOCS.md)

### Community Support
- GitHub Discussions: https://github.com/yourorg/photo-search/discussions
- Stack Overflow: Tag `photo-search`
- Reddit: r/PhotoSearchApp

### Commercial Support
For enterprise customers:
- Email: support@yourcompany.com
- Phone: +1-800-PHOTO-SEARCH
- SLA: 24/7 support with 2-hour response time

### Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Reporting bugs
- Requesting features
- Contributing code
- Documentation improvements

## Legal and Compliance

### Licensing
Photo Search is licensed under the MIT License. See [LICENSE](LICENSE) for details.

Third-party components:
- Electron: MIT License
- Python: PSF License
- CLIP Models: MIT License
- Various open-source libraries with compatible licenses

### Compliance
Photo Search complies with:
- GDPR for European users
- CCPA for California residents
- HIPAA for healthcare organizations (enterprise edition)
- SOC 2 Type II for enterprise edition
- ISO 27001 for enterprise edition

### Data Handling
- No personally identifiable information collected
- No photos uploaded to external servers
- Local processing only
- Encrypted storage for sensitive configuration
- Transparent data practices

## Contact Information

### General Inquiries
Email: info@yourcompany.com
Web: https://photos.yourcompany.com

### Technical Support
Email: support@yourcompany.com
Hours: Monday-Friday 9AM-5PM EST

### Sales
Email: sales@yourcompany.com
Phone: +1-800-PHOTO-SEARCH

### Security Issues
Email: security@yourcompany.com
PGP Key: [Available on key servers]