/**
 * Helper to strip placeholders so frontend forms show empty fields
 * and provide a consistent user object structure.
 */
const sanitizeUserPayload = (userData) => {
  if (!userData) return null;
  
  const u = { ...userData };
  let originalEmail = u.email;
  let originalPhone = u.phone;

  const isPlaceholderEmail = Boolean(
    originalEmail && (
      String(originalEmail).startsWith('noemail_') ||
      String(originalEmail).includes('@placeholder.local') ||
      String(originalEmail).includes('@comrades360.placeholder')
    )
  );

  const isPlaceholderPhone = Boolean(
    originalPhone && (
      String(originalPhone).startsWith('nophone_') ||
      String(originalPhone).startsWith('placeholder-')
    )
  );

  // Strip internal placeholders and ensure verification reflects real status
  if (isPlaceholderEmail) {
    u.email = '';
    u.emailVerified = false;
  }
  if (isPlaceholderPhone) {
    u.phone = '';
    u.phoneVerified = false;
  }

  u.hasEmail = !isPlaceholderEmail && Boolean(u.email);
  u.hasPhone = !isPlaceholderPhone && Boolean(u.phone);

  // Clear name if it matches the email prefix or is a generic "User" string
  if (u.name) {
    if (/^User\d{0,4}$/.test(u.name)) {
      u.name = '';
    } else if (originalEmail && typeof originalEmail === 'string') {
      const prefix = originalEmail.split('@')[0];
      if (u.name === prefix) u.name = '';
    }
  }
  
  // Ensure role and roles are present and consistent
  if (!u.role) u.role = 'customer';
  if (!u.roles) u.roles = [u.role];
  if (!Array.isArray(u.roles)) u.roles = [u.role];
  
  return u;
};

const backendBaseFromReq = (req) => {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host');
  return `${proto}://${host}`;
};

module.exports = {
  sanitizeUserPayload,
  backendBaseFromReq
};

