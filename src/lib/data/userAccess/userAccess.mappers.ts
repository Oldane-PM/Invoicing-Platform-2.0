/**
 * User Access Data Mappers
 * 
 * Transform database rows (snake_case) to domain types (camelCase).
 */

import type { UserAccessUser } from './userAccess.types';

/**
 * Map database user row to domain UserAccessUser
 */
export function mapDbUserToUserAccessUser(dbUser: any): UserAccessUser {
  return {
    id: dbUser.id,
    fullName: dbUser.full_name,
    email: dbUser.email,
    role: dbUser.role.toLowerCase() as 'admin' | 'manager' | 'contractor',
    isActive: dbUser.is_active,
  };
}
