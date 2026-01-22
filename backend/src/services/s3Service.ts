import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const isLocalMode = process.env.USE_LOCAL_STORAGE === 'true';

// In-memory storage for local development
const localImageStore: Map<string, { data: Buffer; contentType: string }> = new Map();

// S3 Client (only initialized if not in local mode)
const s3Client = isLocalMode ? null : new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'smart-receipt-images';

/**
 * Upload an image to S3 or local storage
 */
export const uploadImage = async (
    fileBuffer: Buffer,
    originalFilename: string,
    contentType: string
): Promise<string> => {
    const extension = originalFilename.split('.').pop() || 'jpg';
    const key = `receipts/${uuidv4()}.${extension}`;

    if (isLocalMode) {
        // Store in memory for local development
        localImageStore.set(key, { data: fileBuffer, contentType });
        return `http://localhost:${process.env.PORT || 3001}/images/${key}`;
    }

    // Upload to S3
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
    });

    await s3Client!.send(command);

    // Return public URL
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
};

/**
 * Delete an image from S3 or local storage
 */
export const deleteImage = async (imageUrl: string): Promise<void> => {
    if (!imageUrl) return;

    // Extract key from URL
    let key: string;

    if (imageUrl.includes('localhost')) {
        // Local URL: http://localhost:3001/images/receipts/xxx.jpg
        key = imageUrl.split('/images/')[1];
        if (isLocalMode && key) {
            localImageStore.delete(key);
        }
        return;
    }

    // S3 URL: https://bucket.s3.region.amazonaws.com/receipts/xxx.jpg
    const urlParts = imageUrl.split('.amazonaws.com/');
    if (urlParts.length < 2) return;
    key = urlParts[1];

    if (isLocalMode) return;

    const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    await s3Client!.send(command);
};

/**
 * Get local image data (for local development server)
 */
export const getLocalImage = (key: string): { data: Buffer; contentType: string } | null => {
    return localImageStore.get(key) || null;
};
