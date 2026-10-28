// Types for spark-client.js, which mirrors the client API the pages already use.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Result<T = any> = { data: T; error: (Error & { status?: number }) | null };
interface Query extends PromiseLike<Result> {
  select(cols?: string): Query;
  insert(rows: any): Query;
  upsert(rows: any, o?: { onConflict?: string }): Query;
  update(v: any): Query;
  delete(): Query;
  eq(c: string, v: any): Query;
  neq(c: string, v: any): Query;
  gt(c: string, v: any): Query;
  gte(c: string, v: any): Query;
  lt(c: string, v: any): Query;
  lte(c: string, v: any): Query;
  like(c: string, v: any): Query;
  ilike(c: string, v: any): Query;
  in(c: string, v: any[]): Query;
  is(c: string, v: any): Query;
  order(c: string, o?: { ascending?: boolean }): Query;
  limit(n: number): Query;
  range(a: number, b: number): Query;
  single(): Query;
  maybeSingle(): Query;
}
interface Rpc extends Promise<Result> { single(): Promise<Result>; }
export function createClient(url: string, anonKey?: unknown, opts?: unknown): {
  auth: {
    onAuthStateChange(fn: (event: string, session: any) => void): { data: { subscription: { unsubscribe(): void } } };
    getSession(): Promise<Result<{ session: any }>>;
    getUser(): Promise<Result>;
    signInWithPassword(c: { email: string; password: string }): Promise<Result>;
    signUp(c: { email: string; password: string; options?: any }): Promise<Result>;
    signInWithIdToken(c: any): Promise<Result>;
    signInWithOAuth(c: any): Promise<Result>;
    resetPasswordForEmail(email: string, o?: { redirectTo?: string }): Promise<Result>;
    updateUser(c: { password?: string; data?: any }): Promise<Result>;
    signOut(): Promise<{ error: null }>;
    deleteAccount(): Promise<Result>;
  };
  from(table: string): Query;
  rpc(fn: string, args?: any): Rpc;
  storage: { from(bucket: string): { upload(path: string, file: any, o?: any): Promise<Result>; getPublicUrl(path: string): { data: { publicUrl: string } } } };
  functions: { invoke(name: string, o?: { body?: any }): Promise<Result> };
};
