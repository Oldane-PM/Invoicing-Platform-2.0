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
  const rawRole = dbUser.role?.toLowerCase() ?? 'unassigned';
  const validRoles = ['unassigned', 'admin', 'manager', 'contractor'] as const;
  const role = validRoles.includes(rawRole as typeof validRoles[number]) 
    ? (rawRole as 'unassigned' | 'admin' | 'manager' | 'contractor')
    : 'unassigned';
    
  return {
    id: dbUser.id,
    fullName: dbUser.full_name,
    email: dbUser.email,
    role,
    isActive: dbUser.is_active,
  };
}
