import { mock } from 'bun:test';
import type { IdentityProvider } from './provider';

export type MockProvider = {
  [K in keyof Required<IdentityProvider>]: ReturnType<typeof mock>;
};

export function makeMockProvider(): MockProvider {
  return {
    verify: mock(),
    refresh: mock(),
    signOut: mock(),
  };
}
