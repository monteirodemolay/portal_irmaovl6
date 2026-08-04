import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const inviteUserSchema = z.object({
  email: z.string().email(),
  roleId: z.string().min(1),
  memberId: z.string().min(1).nullable(),
});
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const assignRoleSchema = z.object({
  userId: z.string().min(1),
  roleId: z.string().min(1),
});
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
