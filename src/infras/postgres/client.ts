import type { Config } from '@config/config';
import type { Logger } from '@infras/logger/logger';
import { Pool } from 'pg';

export class PostgresClient {
  private pool: Pool | null = null;
  private initialized = false;

  constructor(
    private config: Config,
    private logger?: Logger
  ) {
    this.connect();
  }

  private connect(): void {
    const { host, port, name, user, password, sslMode } = this.config.database;

    this.pool = new Pool({
      host,
      port,
      database: name,
      user,
      password,
      ssl: sslMode === 'require' ? { rejectUnauthorized: false } : false,
    });

    let loggedOnce = false;
    this.pool.on('connect', () => {
      if (!loggedOnce) {
        loggedOnce = true;
        this.logger?.info(`PostgreSQL connected host=${host} port=${port} db=${name}`);
      }
    });

    this.initialized = true;
  }

  getPool(): Pool {
    if (!this.pool || !this.initialized) {
      throw new Error('PostgreSQL client not initialized');
    }

    return this.pool;
  }

  getConnectionString(): string {
    const { host, port, name, user, password } = this.config.database;

    return `postgresql://${user}:${password}@${host}:${port}/${name}`;
  }

  async end(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.initialized = false;
    }
  }
}

export function createPostgresClient(config: Config, logger?: Logger): PostgresClient {
  return new PostgresClient(config, logger);
}
