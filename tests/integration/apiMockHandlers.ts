import { http, HttpResponse } from 'msw';

export const handlers = [
    http.post('https://api.mistral.ai/v1/chat/completions', async ({ request }) => {
        const body = await request.json() as any;
        const model = body.model;

        let content = '';

        if (model === 'pixtral-12b-2409') {
            // Mock OCR response
            content = `MOCK STORE
Date: 2026-01-28
Coffee $5.00
Donut $2.50
TOTAL: $7.50`;
        } else if (model === 'mistral-large-latest') {
            // Mock structured response
            content = JSON.stringify({
                merchantName: 'Mock Store',
                date: '2026-01-28',
                total: 7.50,
                currency: 'USD',
                items: [
                    { description: 'Coffee', price: 5.00 },
                    { description: 'Donut', price: 2.50 }
                ]
            });
        } else {
            content = 'Default mock response';
        }

        return HttpResponse.json({
            id: 'mock-id-' + Date.now(),
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: model,
            choices: [
                {
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: content
                    },
                    finish_reason: 'stop'
                }
            ],
            usage: {
                prompt_tokens: 50,
                completion_tokens: 50,
                total_tokens: 100
            }
        });
    }),
];
