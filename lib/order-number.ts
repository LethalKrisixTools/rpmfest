export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).slice(2, 7).toUpperCase().padEnd(5, '0');
  return `RPM-${year}-${random}`;
}
