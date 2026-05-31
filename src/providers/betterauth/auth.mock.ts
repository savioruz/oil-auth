import { mock } from 'bun:test';

export type MockAuth = {
  api: {
    getSession: ReturnType<typeof mock>;
    signOut: ReturnType<typeof mock>;
  };
};

export function makeMockAuth(): MockAuth {
  return {
    api: {
      getSession: mock(),
      signOut: mock(),
    },
  };
}
