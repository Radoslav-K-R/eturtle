import bcrypt from 'bcrypt';

export async function hashPassword(
  plainPassword: string,
  costFactor: number,
): Promise<string> {
  return bcrypt.hash(plainPassword, costFactor);
}

export async function comparePassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}
