const fs = require('fs')
const path = require('path')
const https = require('https')
const crypto = require('crypto')

// Model configurations
const MODELS = {
    'clip-vit-base-patch32': {
        url: 'https://huggingface.co/openai/clip-vit-base-patch32/resolve/main/pytorch_model.bin',
        filename: 'pytorch_model.bin',
        expectedHash: 'a1d071733d7e67c6d30c785d72d8ad26e4db88b68a7be9c5bc8d0b4b1c3f4564', // Placeholder
        size: '151MB'
    },
    'clip-vit-base-patch32-config': {
        url: 'https://huggingface.co/openai/clip-vit-base-patch32/resolve/main/config.json',
        filename: 'config.json',
        expectedHash: 'b2d4e1a3c5f6789012345678901234567890123456789012345678901234567', // Placeholder
        size: '2KB'
    }
}

class ModelDownloader {
    constructor() {
        this.modelsDir = path.join(__dirname, '..', 'models')
        this.ensureModelsDirectory()
    }

    ensureModelsDirectory() {
        if (!fs.existsSync(this.modelsDir)) {
            fs.mkdirSync(this.modelsDir, { recursive: true })
            console.log(`Created models directory: ${this.modelsDir}`)
        }
    }

    async downloadModel(modelKey) {
        const model = MODELS[modelKey]
        if (!model) {
            throw new Error(`Unknown model: ${modelKey}`)
        }

        const filePath = path.join(this.modelsDir, model.filename)

        // Check if file already exists and verify hash
        if (fs.existsSync(filePath)) {
            console.log(`Model ${modelKey} already exists, verifying...`)

            if (await this.verifyHash(filePath, model.expectedHash)) {
                console.log(`✓ Model ${modelKey} verified successfully`)
                return filePath
            } else {
                console.log(`⚠ Model ${modelKey} hash mismatch, re-downloading...`)
                fs.unlinkSync(filePath)
            }
        }

        console.log(`Downloading ${modelKey} (${model.size})...`)
        await this.downloadFile(model.url, filePath)

        // Verify downloaded file
        if (await this.verifyHash(filePath, model.expectedHash)) {
            console.log(`✓ Model ${modelKey} downloaded and verified successfully`)
        } else {
            console.error(`✗ Model ${modelKey} hash verification failed`)
            fs.unlinkSync(filePath)
            throw new Error(`Hash verification failed for ${modelKey}`)
        }

        return filePath
    }

    async downloadFile(url, filePath) {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(filePath)

            https.get(url, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    // Handle redirect
                    return this.downloadFile(response.headers.location, filePath)
                        .then(resolve)
                        .catch(reject)
                }

                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`))
                    return
                }

                const totalSize = parseInt(response.headers['content-length'], 10)
                let downloadedSize = 0
                let lastProgressTime = Date.now()

                response.on('data', (chunk) => {
                    downloadedSize += chunk.length

                    // Show progress every 500ms
                    const now = Date.now()
                    if (now - lastProgressTime > 500) {
                        const percent = totalSize ? ((downloadedSize / totalSize) * 100).toFixed(1) : '?'
                        process.stdout.write(`\r  Progress: ${percent}% (${this.formatBytes(downloadedSize)}/${this.formatBytes(totalSize)})`)
                        lastProgressTime = now
                    }
                })

                response.pipe(file)

                file.on('finish', () => {
                    file.close()
                    console.log('\n  Download completed')
                    resolve()
                })

                file.on('error', (err) => {
                    fs.unlink(filePath, () => { }) // Delete partial file
                    reject(err)
                })
            }).on('error', (err) => {
                reject(err)
            })
        })
    }

    async verifyHash(filePath, expectedHash) {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256')
            const stream = fs.createReadStream(filePath)

            stream.on('data', (data) => {
                hash.update(data)
            })

            stream.on('end', () => {
                const computedHash = hash.digest('hex')
                resolve(computedHash === expectedHash)
            })

            stream.on('error', (err) => {
                reject(err)
            })
        })
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    async downloadAllModels() {
        console.log('📦 Downloading AI models for offline operation...')

        try {
            for (const modelKey of Object.keys(MODELS)) {
                await this.downloadModel(modelKey)
            }

            console.log('\n✅ All models downloaded successfully!')

            // Create manifest file
            const manifestPath = path.join(this.modelsDir, 'manifest.json')
            const manifest = {
                version: '1.0.0',
                downloadedAt: new Date().toISOString(),
                models: Object.keys(MODELS)
            }

            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
            console.log(`📄 Created manifest: ${manifestPath}`)

        } catch (error) {
            console.error('❌ Failed to download models:', error.message)
            process.exit(1)
        }
    }
}

// Run if called directly
if (require.main === module) {
    const downloader = new ModelDownloader()
    downloader.downloadAllModels()
}

module.exports = ModelDownloader