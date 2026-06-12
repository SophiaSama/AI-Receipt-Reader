import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAuthService } from '../../services/authService';

function makeMockClient(authOverrides: Record<string, any> = {}) {
  const auth = {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    ...authOverrides,
  };
  return { client: { auth } as unknown as SupabaseClient, auth };
}

describe('createAuthService', () => {
  it('signUp calls supabase with credentials and returns user + session', async () => {
    const { client, auth } = makeMockClient();
    auth.signUp.mockResolvedValue({
      data: { user: { id: 'u1' }, session: null },
      error: null,
    });
    const service = createAuthService(client);

    const result = await service.signUp('a@example.com', 'pw12345');

    expect(auth.signUp).toHaveBeenCalledWith({ email: 'a@example.com', password: 'pw12345' });
    expect(result.user).toEqual({ id: 'u1' });
    expect(result.session).toBeNull();
  });

  it('signUp throws with the supabase error message', async () => {
    const { client, auth } = makeMockClient();
    auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'User already registered' } });
    const service = createAuthService(client);

    await expect(service.signUp('a@example.com', 'pw')).rejects.toThrow('User already registered');
  });

  it('signIn calls signInWithPassword and returns user + session', async () => {
    const { client, auth } = makeMockClient();
    auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u1' }, session: { access_token: 'tok' } },
      error: null,
    });
    const service = createAuthService(client);

    const result = await service.signIn('a@example.com', 'pw12345');

    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@example.com', password: 'pw12345' });
    expect(result.session).toEqual({ access_token: 'tok' });
  });

  it('signIn throws with the supabase error message', async () => {
    const { client, auth } = makeMockClient();
    auth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'Invalid login credentials' } });
    const service = createAuthService(client);

    await expect(service.signIn('a@example.com', 'bad')).rejects.toThrow('Invalid login credentials');
  });

  it('signOut calls supabase signOut', async () => {
    const { client, auth } = makeMockClient();
    auth.signOut.mockResolvedValue({ error: null });
    const service = createAuthService(client);

    await service.signOut();

    expect(auth.signOut).toHaveBeenCalledOnce();
  });

  it('getSession returns the current session', async () => {
    const { client, auth } = makeMockClient();
    auth.getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } }, error: null });
    const service = createAuthService(client);

    const session = await service.getSession();

    expect(session).toEqual({ access_token: 'tok' });
  });

  it('getAccessToken returns the token from the session, or null', async () => {
    const { client, auth } = makeMockClient();
    auth.getSession
      .mockResolvedValueOnce({ data: { session: { access_token: 'tok' } }, error: null })
      .mockResolvedValueOnce({ data: { session: null }, error: null });
    const service = createAuthService(client);

    await expect(service.getAccessToken()).resolves.toBe('tok');
    await expect(service.getAccessToken()).resolves.toBeNull();
  });

  it('onAuthStateChange registers a listener and returns an unsubscribe fn', () => {
    const { client, auth } = makeMockClient();
    const unsubscribe = vi.fn();
    let captured: ((event: string, session: any) => void) | null = null;
    auth.onAuthStateChange.mockImplementation((cb: any) => {
      captured = cb;
      return { data: { subscription: { unsubscribe } } };
    });
    const service = createAuthService(client);

    const received: any[] = [];
    const off = service.onAuthStateChange((s) => received.push(s));

    // Simulate supabase emitting an auth change
    captured!('SIGNED_IN', { access_token: 'tok' });
    expect(received).toEqual([{ access_token: 'tok' }]);

    off();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
