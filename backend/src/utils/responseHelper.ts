import { APIGatewayProxyResult } from '../types';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Content-Type': 'application/json',
};

export const success = (data: any): APIGatewayProxyResult => ({
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify(data),
});

export const created = (data: any): APIGatewayProxyResult => ({
    statusCode: 201,
    headers: corsHeaders,
    body: JSON.stringify(data),
});

export const noContent = (): APIGatewayProxyResult => ({
    statusCode: 204,
    headers: corsHeaders,
    body: '',
});

export const badRequest = (message: string): APIGatewayProxyResult => ({
    statusCode: 400,
    headers: corsHeaders,
    body: JSON.stringify({ error: message }),
});

export const notFound = (message: string): APIGatewayProxyResult => ({
    statusCode: 404,
    headers: corsHeaders,
    body: JSON.stringify({ error: message }),
});

export const serverError = (message: string): APIGatewayProxyResult => ({
    statusCode: 500,
    headers: corsHeaders,
    body: JSON.stringify({ error: message }),
});
