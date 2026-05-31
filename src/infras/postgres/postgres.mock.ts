export const mockPostgresClient = {
  getPool: () => ({
    query: () => {},
    on: () => {},
    connect: () => {},
  }),
};
