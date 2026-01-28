import { setupServer } from 'msw/node';
import { handlers } from './apiMockHandlers';

export const server = setupServer(...handlers);
