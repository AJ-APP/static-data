require('dotenv').config();  // Load environment variables from .env file
const fs = require('fs');
const path = require('path');
const S3Service = require('./S3Service');  // Adjust the path if needed

// Simple logger for demonstration purposes
const logger = {
    error: console.error,
};

// Instantiate S3Service
const s3Service = new S3Service({ logger });

// Allowed file extensions
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.mp4']);

// Function to upload a single file
async function uploadFile(filePath, fileName) {
    const fileStats = fs.statSync(filePath);
    const fileStream = fs.createReadStream(filePath);

    // Determine MIME type based on file extension
    const ext = path.extname(fileName).toLowerCase();
    const mimeType = ext === '.mp4' ? 'video/mp4' : `image/${ext.slice(1)}`;  // Handle .mp4 separately

    // Mimic an Express-style file object
    const uploadFile = {
        originalname: fileName,
        path: filePath,
        mimetype: mimeType,
        size: fileStats.size,
    };

    try {
        const result = await s3Service.upload(uploadFile);
        console.log(`Uploaded ${fileName} successfully:`, result);
    } catch (error) {
        console.error(`Error uploading ${fileName}:`, error);
    }
}

// Recursive function to scan folder and upload allowed files
async function uploadFolderRecursive(folderPath) {
    const items = fs.readdirSync(folderPath);

    for (const item of items) {
        const fullPath = path.join(folderPath, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            // If it's a directory, recurse into it
            await uploadFolderRecursive(fullPath);
        } else if (stats.isFile()) {
            // If it's a file, check if it's allowed and upload it
            const ext = path.extname(item).toLowerCase();
            if (ALLOWED_EXTENSIONS.has(ext)) {
                await uploadFile(fullPath, item);
            }
        }
    }
}

// Run the upload with the folder path from the command line
const folderPath = process.argv[2];
if (!folderPath) {
    console.error('Please provide a folder path to upload.');
    process.exit(1);
}

uploadFolderRecursive(folderPath)
    .then(() => console.log('All files uploaded successfully.'))
    .catch(error => console.error('Error during upload process:', error));
