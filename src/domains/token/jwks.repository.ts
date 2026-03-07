export interface JwksKey {
  kid: string;
  privateKeyJson: string;
}

export interface JwksRepository {
  findActiveKey(): Promise<JwksKey | null>;
}
