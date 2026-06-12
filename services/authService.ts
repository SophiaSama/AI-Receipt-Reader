import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabaseClient';

export interface AuthResult {
  user: User | null;
  session: Session | null;
}

export interface AuthService {
  /** Register a new user. With email confirmation enabled, session is null until confirmed. */
  signUp(email: string, password: string): Promise<AuthResult>;
  /** Sign in with email + password. */
  signIn(email: string, password: string): Promise<AuthResult>;
  /** Sign out the current user. */
  signOut(): Promise<void>;
  /** Get the current session (or null if signed out). */
  getSession(): Promise<Session | null>;
  /** Get the current access token (JWT) for authorizing server calls, or null. */
  getAccessToken(): Promise<string | null>;
  /** Subscribe to auth state changes. Returns an unsubscribe function. */
  onAuthStateChange(callback: (session: Session | null) => void): () => void;
}

/**
 * Creates an auth service backed by the given Supabase client. Accepting the
 * client as an argument keeps this unit-testable with a mocked client.
 */
export function createAuthService(client: SupabaseClient): AuthService {
  return {
    async signUp(email, password) {
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) throw new Error(error.message);
      return { user: data.user, session: data.session };
    },

    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      return { user: data.user, session: data.session };
    },

    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw new Error(error.message);
    },

    async getSession() {
      const { data, error } = await client.auth.getSession();
      if (error) throw new Error(error.message);
      return data.session;
    },

    async getAccessToken() {
      const { data } = await client.auth.getSession();
      return data.session?.access_token ?? null;
    },

    onAuthStateChange(callback) {
      const { data } = client.auth.onAuthStateChange((_event, session) => callback(session));
      return () => data.subscription.unsubscribe();
    },
  };
}

let cachedAuthService: AuthService | null = null;

/** Lazily-created singleton auth service using the default browser client. */
export function getAuthService(): AuthService {
  if (!cachedAuthService) {
    cachedAuthService = createAuthService(getSupabaseClient());
  }
  return cachedAuthService;
}
