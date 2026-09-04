import type { AuthTokens } from '@mini-project/shared-types';

export class AuthResponseDto implements AuthTokens {
  accessToken: string;
  refreshToken: string;
}
