/**
 * Dev-mode stub. Once a real SMTP provider is wired up, replace the body with
 * an actual send call — the call site and signature stay the same.
 */
export async function sendActivationEmail(email: string, token: string): Promise<void> {
  const link = `http://localhost:5173/verify-email?token=${token}`;
  console.log(`[email:dev] Activation link for ${email}: ${link}`);
}
