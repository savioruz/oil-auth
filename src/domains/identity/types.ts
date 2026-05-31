export interface UserIdentity {
  id: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  image?: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}
