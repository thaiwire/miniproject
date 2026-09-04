export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface UpdateProfileInput {
  name?: string;
  password?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
