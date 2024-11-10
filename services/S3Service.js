require('dotenv').config();
const fs = require('fs');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
} = require('@aws-sdk/client-s3');
const { parse } = require('path');
const stream = require('stream');

class S3Service {
    constructor({ logger }) {
        this.logger = logger;

        this.prefix = '';
        this.endpoint = process.env.S3_ENDPOINT;
        this.bucket = process.env.S3_BUCKET;
        this.s3Url = process.env.S3_URL;
        this.accessKeyId = process.env.S3_ACCESS_KEY_ID;
        this.secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
        this.region = process.env.S3_REGION;
        this.downloadFileDuration = 60;
        this.awsConfigObject = {};
        this.cacheControl = 'max-age=31536000';

        this.client = this.getClient();
    }

    getClient(overwriteConfig = {}) {
        const config = {
            endpoint: this.s3Url,
            credentials: {
                accessKeyId: this.accessKeyId,
                secretAccessKey: this.secretAccessKey,
            },
            region: this.region,
            ...this.awsConfigObject,
            signatureVersion: 'v4',
            ...overwriteConfig,
        };

        return new S3Client(config);
    }

    async upload(file, options = {}) {
        return await this.uploadFile(file, options);
    }

    async uploadProtected(file) {
        return await this.uploadFile(file, { acl: 'private' });
    }

    async uploadFile(file, options = { isProtected: false, acl: undefined }) {
        const parsedFilename = parse(file.originalname);
        const fileKey = `${this.prefix}${parsedFilename.name}-${Date.now()}${parsedFilename.ext}`;

        const command = new PutObjectCommand({
            ACL: options.acl ?? (options.isProtected ? 'private' : 'public-read'),
            Bucket: this.bucket,
            Body: fs.createReadStream(file.path),
            Key: fileKey,
            ContentType: file.mimetype,
            CacheControl: this.cacheControl,
        });

        try {
            await this.client.send(command);
            const url = this.s3Url.replace('s3', this.bucket + '.s3');
            return {
                url: `${url}/${fileKey}`,
                key: fileKey,
            };
        } catch (e) {
            this.logger.error(e);
            throw e;
        }
    }

    async delete(file) {
        const command = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: `${file.file_key}`,
        });

        try {
            await this.client.send(command);
        } catch (e) {
            this.logger.error(e);
        }
    }

    async getUploadStreamDescriptor(fileData) {
        const pass = new stream.PassThrough();
        const isPrivate = fileData.isPrivate ?? true;
        const fileKey = `${this.prefix}${fileData.name}.${fileData.ext}`;

        const params = {
            ACL: isPrivate ? 'private' : 'public-read',
            Bucket: this.bucket,
            Body: pass,
            Key: fileKey,
            ContentType: fileData.contentType,
        };

        const uploadJob = new Upload({
            client: this.client,
            params,
        });

        return {
            writeStream: pass,
            promise: uploadJob.done(),
            url: `${this.s3Url}/${this.bucket}/${fileKey}`,
            fileKey,
        };
    }

    async getDownloadStream(fileData) {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: `${fileData.fileKey}`,
        });

        const response = await this.client.send(command);

        return response.Body;
    }

    async getPresignedDownloadUrl(fileData) {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: `${fileData.fileKey}`,
        });

        return await getSignedUrl(this.client, command, {
            expiresIn: this.downloadFileDuration,
        });
    }
}

module.exports = S3Service;
