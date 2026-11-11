import { z } from "zod";

// Sign-in verifies existing credentials; password-strength rules belong to account creation.
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z
    .string()
    .min(1, "Enter your password.")
    .max(1024, "Password is too long."),
});
