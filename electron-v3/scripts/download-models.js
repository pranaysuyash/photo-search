const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

class ModelDownloader {
    constructor() {
        this.modelsDir = path.join(__dirname, '..', 'models');
        this.models = [
            {
                name: 'clip-vit-base-patch32',
                url: 'https://huggingface.co/openai/clip-vit-base-patch32/resolve/main/pytorch_model.bin',
                filename: 'clip-vit-base-patch32.bin',
                size: 151000000, // ~151MB
                sha256: null // Will be calculated after download
            },
            {
                name: 'clip-vit-base-patch32-config',
                url: 'https://huggingface.co/openai/clip-vit-base-patch32/resolve/main/config.json',
                filename: 'clip-vit-base-patch32-config.json',
                size: 4096,
                sha256: null
            },
            {
                name: 'clip-vit-base-patch32-tokenizer',
                url: 'https://huggingface.co/openai/clip-vit-base-patch32/resolve/main/tokenizer.json',
                filename: 'clip-vit-base-patch32-tokenizer.json',
                size: 524000,
                sha256: null
            }
        ];

        this.manifestPath = path.join(this.modelsDir, 'manifest.json');
        this.totalProgress = 0;
        this.downloadedSize = 0;
    }

    async downloadModels() {
        try {
            console.log('🚀 Starting model download...');

            // Create models directory if it doesn't exist
            if (!fs.existsSync(this.modelsDir)) {
                fs.mkdirSync(this.modelsDir, { recursive: true });
                console.log(`📁 Created models directory: ${this.modelsDir}`);
            }

            // Check if models already exist
            const manifest = this.loadManifest();
            if (manifest && this.areModelsValid(manifest)) {
                console.log('✅ Models already downloaded and verified');
                return true;
            }

            // Calculate total download size
            const totalSize = this.models.reduce((sum, model) => sum + model.size, 0);
            console.log(`📊 Total download size: ${this.formatBytes(totalSize)}`);

            // Download each model
            const downloadedModels = [];
            for (const model of this.models) {
                console.log(`📥 Downloading ${model.name}...`);
                const result = await this.downloadModel(model);
                if (result) {
                    downloadedModels.push(result);
                    console.log(`✅ Downloaded ${model.name}`);
                } else {
                    console.error(`❌ Failed to download ${model.name}`);
                    return false;
                }
            }

            // Save manifest
            this.saveManifest(downloadedModels);
            console.log('✅ All models downloaded successfully!');
            return true;

        } catch (error) {
            console.error('❌ Error downloading models:', error);
            return false;
        }
    }

    async downloadModel(model) {
        const filePath = path.join(this.modelsDir, model.filename);

        // Skip if file already exists and has correct size
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            if (stats.size === model.size) {
                console.log(`⚡ Skipping ${model.name} (already exists)`);
                return {
                    ...model,
                    path: filePath,
                    downloaded: true,
                    sha256: await this.calculateSHA256(filePath)
                };
            }
        }

        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(filePath);
            let downloadedBytes = 0;

            const request = https.get(model.url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                    return;
                }

                const totalBytes = parseInt(response.headers['content-length'], 10);

                response.on('data', (chunk) => {
                    downloadedBytes += chunk.length;
                    this.downloadedSize += chunk.length;

                    const progress = (downloadedBytes / totalBytes) * 100;
                    const totalProgress = (this.downloadedSize / this.getTotalSize()) * 100;

                    // Update progress every 5%
                    if (Math.floor(progress) % 5 === 0) {
                        console.log(`  📊 ${model.name}: ${progress.toFixed(1)}% (${this.formatBytes(downloadedBytes)}/${this.formatBytes(totalBytes)})`);
                    }
                });

                response.pipe(file);
            });

            file.on('finish', async () => {
                file.close();

                // Verify file size
                const stats = fs.statSync(filePath);
                if (stats.size !== model.size) {
                    console.warn(`⚠️  Size mismatch for ${model.name}: expected ${model.size}, got ${stats.size}`);
                }

                // Calculate SHA256
                const sha256 = await this.calculateSHA256(filePath);

                resolve({
                    ...model,
                    path: filePath,
                    downloaded: true,
                    actualSize: stats.size,
                    sha256: sha256,
                    downloadDate: new Date().toISOString()
                });
            });

            file.on('error', (error) => {
                fs.unlink(filePath, () => { }); // Clean up partial file
                reject(error);
            });

            request.on('error', (error) => {
                fs.unlink(filePath, () => { }); // Clean up partial file
                reject(error);
            });
        });
    }

    async calculateSHA256(filePath) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);

            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    getTotalSize() {
        return this.models.reduce((sum, model) => sum + model.size, 0);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    loadManifest() {
        try {
            if (fs.existsSync(this.manifestPath)) {
                const content = fs.readFileSync(this.manifestPath, 'utf8');
                return JSON.parse(content);
            }
        } catch (error) {
            console.warn('⚠️  Could not load manifest:', error.message);
        }
        return null;
    }

    saveManifest(models) {
        const manifest = {
            version: '1.0.0',
            downloadDate: new Date().toISOString(),
            models: models,
            totalSize: models.reduce((sum, model) => sum + (model.actualSize || model.size), 0)
        };

        fs.writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 2));
        console.log(`💾 Saved manifest: ${this.manifestPath}`);
    }

    areModelsValid(manifest) {
        if (!manifest || !manifest.models) return false;

        for (const model of manifest.models) {
            const filePath = path.join(this.modelsDir, model.filename);
            if (!fs.existsSync(filePath)) {
                console.log(`❌ Missing model file: ${model.filename}`);
                return false;
            }

            const stats = fs.statSync(filePath);
            if (stats.size !== (model.actualSize || model.size)) {
                console.log(`❌ Size mismatch for ${model.filename}`);
                return false;
            }
        }

        return true;
    }

    async verifyModels() {
        console.log('🔍 Verifying model integrity...');
        const manifest = this.loadManifest();

        if (!manifest) {
            console.log('❌ No manifest found');
            return false;
        }

        let allValid = true;
        for (const model of manifest.models) {
            const filePath = path.join(this.modelsDir, model.filename);

            if (!fs.existsSync(filePath)) {
                console.log(`❌ Missing: ${model.filename}`);
                allValid = false;
                continue;
            }

            const stats = fs.statSync(filePath);
            if (stats.size !== (model.actualSize || model.size)) {
                console.log(`❌ Size mismatch: ${model.filename}`);
                allValid = false;
                continue;
            }

            // Verify SHA256 if available
            if (model.sha256) {
                const currentHash = await this.calculateSHA256(filePath);
                if (currentHash !== model.sha256) {
                    console.log(`❌ Hash mismatch: ${model.filename}`);
                    allValid = false;
                    continue;
                }
            }

            console.log(`✅ Valid: ${model.filename}`);
        }

        return allValid;
    }

    getModelInfo() {
        const manifest = this.loadManifest();
        if (!manifest) {
            return { downloaded: false, models: [] };
        }

        return {
            downloaded: true,
            downloadDate: manifest.downloadDate,
            version: manifest.version,
            totalSize: manifest.totalSize,
            models: manifest.models.map(model => ({
                name: model.name,
                filename: model.filename,
                size: model.actualSize || model.size,
                path: model.path
            }))
        };
    }
}

// CLI interface
async function main() {
    const downloader = new ModelDownloader();

    const command = process.argv[2] || 'download';

    switch (command) {
        case 'download':
            const success = await downloader.downloadModels();
            process.exit(success ? 0 : 1);
            break;

        case 'verify':
            const valid = await downloader.verifyModels();
            process.exit(valid ? 0 : 1);
            break;

        case 'info':
            const info = downloader.getModelInfo();
            console.log(JSON.stringify(info, null, 2));
            break;

        case 'clean':
            if (fs.existsSync(downloader.modelsDir)) {
                fs.rmSync(downloader.modelsDir, { recursive: true, force: true });
                console.log('🗑️  Cleaned models directory');
            }
            break;

        default:
            console.log('Usage: node download-models.js [download|verify|info|clean]');
            process.exit(1);
    }
}

// Export for use as module
module.exports = ModelDownloader;

// Run as CLI if executed directly
if (require.main === module) {
    main().catch(console.error);
}