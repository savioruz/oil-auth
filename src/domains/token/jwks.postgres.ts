import type { Pool } from 'pg';
import type { JwksKey, JwksRepository } from './jwks.repository';

interface JwksRow {
  id: string;
  privateKey: string;
}

export class PostgresJwksRepository implements JwksRepository {
  constructor(private readonly pool: Pool) {}

  async findActiveKey(): Promise<JwksKey | null> {
    const result = await this.pool.query<JwksRow>(
      `SELECT id, "privateKey" FROM jwks WHERE "expiresAt" IS NULL OR "expiresAt" > NOW() ORDER BY "createdAt" DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      return null;
    }

    const { id: kid, privateKey: privateKeyJson } = result.rows[0];
    return { kid, privateKeyJson };
  }
}
