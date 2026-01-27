/**
 * User Access Domain Types
 * 
 * Domain types for the User Access Management feature.
 * These types represent the business logic layer and are independent of database schema.
 */

export type UserRole = 'unassigned' | 'admin' | 'manager' | 'contractor';

export interface UserAccessUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export interface UpdateUserRoleParams {
  userId: string;
  role: UserRole;
}

export interface SetUserEnabledParams {
  userId: string;
  isActive: boolean;
}
