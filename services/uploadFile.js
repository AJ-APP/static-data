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

// Allowed image file extensions
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// Function to upload all image files in a specified folder
async function uploadFolder(folderPath) {
    try {
        // Read all files in the folder
        const files = fs.readdirSync(folderPath);

        // Filter files to include only images
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return IMAGE_EXTENSIONS.has(ext);
        });

        if (imageFiles.length === 0) {
            console.log("No image files found in the folder.");
            return;
        }

        for (const file of imageFiles) {
            const filePath = path.join(folderPath, file);
            const fileStats = fs.statSync(filePath);

            // Skip if not a file
            if (!fileStats.isFile()) continue;

            const fileStream = fs.createReadStream(filePath);

            // Mimic an Express-style file object
            const uploadFile = {
                originalname: file,
                path: filePath,
                mimetype: `image/${path.extname(file).slice(1)}`,  // e.g., "image/png"
                size: fileStats.size,
            };

            try {
                const result = await s3Service.upload(uploadFile);
                console.log(`Uploaded ${file} successfully:`, result);
            } catch (error) {
                console.error(`Error uploading ${file}:`, error);
            }
        }
    } catch (error) {
        console.error('Error reading folder:', error);
    }
}

// Run the upload with the folder path from the command line
const folderPath = process.argv[2];
if (!folderPath) {
    console.error('Please provide a folder path to upload.');
    process.exit(1);
}

uploadFolder(folderPath);
