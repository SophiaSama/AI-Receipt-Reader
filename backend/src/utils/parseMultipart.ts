import Busboy from 'busboy';
import { ParsedMultipartData } from '../types';

/**
 * Parse multipart/form-data from API Gateway event
 * Throws Error if parsing fails (caller should catch and return 400)
 */
export const parseMultipart = (
    body: string,
    contentType: string,
    isBase64Encoded: boolean
): Promise<ParsedMultipartData> => {
    return new Promise((resolve, reject) => {
        const result: ParsedMultipartData = {
            fields: {},
            files: [],
        };

        try {
            // Validate content type has boundary
            if (!contentType.includes('boundary=')) {
                return reject(new Error('Missing boundary in Content-Type header'));
            }

            const busboy = Busboy({ headers: { 'content-type': contentType } });

            // Decode body if base64 encoded
            const buffer = isBase64Encoded
                ? Buffer.from(body, 'base64')
                : Buffer.from(body, 'utf-8');

            // Validate body is not empty
            if (!buffer || buffer.length === 0) {
                return reject(new Error('Request body is empty'));
            }

            busboy.on('field', (fieldname: string, value: string) => {
                result.fields[fieldname] = value;
            });

            busboy.on('file', (fieldname: string, file: NodeJS.ReadableStream, info: { filename: string; mimeType: string }) => {
                const chunks: Buffer[] = [];

                file.on('data', (chunk: Buffer) => {
                    chunks.push(chunk);
                });

                file.on('end', () => {
                    result.files.push({
                        filename: info.filename,
                        content: Buffer.concat(chunks),
                        contentType: info.mimeType,
                    });
                });
            });

            busboy.on('finish', () => {
                resolve(result);
            });

            busboy.on('error', (error: Error) => {
                // Busboy parsing error - reject with descriptive message
                reject(new Error(`Multipart parsing failed: ${error.message}`));
            });

            busboy.end(buffer);
        } catch (error: any) {
            // Setup/initialization error
            reject(new Error(`Failed to initialize multipart parser: ${error.message}`));
        }
    });
};

/**
 * Simple multipart parser for Express multer-processed files
 */
export const extractFileFromMulter = (file: Express.Multer.File) => {
    return {
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype,
    };
};
