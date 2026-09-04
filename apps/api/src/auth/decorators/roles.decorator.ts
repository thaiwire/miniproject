import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

// ติด @Roles(Role.ADMIN) บน endpoint ที่จำกัดสิทธิ์เฉพาะ role นั้น ๆ (ใช้คู่กับ RolesGuard)
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
