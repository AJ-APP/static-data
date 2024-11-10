// uploadFile.js
const fs = require('fs');
const S3Service = require('./S3Service');  // Adjust this path if needed

// Simple logger for demonstration purposes
const logger = {
    error: console.error,
};

// Instantiate S3Service
const s3Service = new S3Service({ logger });

// Function to upload a file
async function uploadFile(filepath) {
    const fileStats = fs.statSync(filepath);
    const fileStream = fs.createReadStream(filepath);

    // Mimic an Express-style file object
    const file = {
        originalname: filepath.split('/').pop(),
        path: filepath,
        mimetype: 'application/octet-stream',  // Default MIME type
        size: fileStats.size,
    };

    try {
        const result = await s3Service.upload(file);
        console.log('File uploaded successfully:', result);
    } catch (error) {
        console.error('Error uploading file:', error);
    }
}

// Run the upload with the filepath from the command line
const filepath = process.argv[2];
if (!filepath) {
    console.error('Please provide a file path to upload.');
    process.exit(1);
}

uploadFile(filepath);
