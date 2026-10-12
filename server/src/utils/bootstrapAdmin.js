const User = require("../models/User.js");
const { validatePasswordStrength } = require("./security.js");

/**
 * Ensures a predefined bootstrap admin user exists in MongoDB based on environment variables.
 * Safe, idempotent, and validates password policy.
 */
const ensureBootstrapAdmin = async () => {
  try {
    const name = process.env.BOOTSTRAP_ADMIN_NAME;
    const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

    if (!name || !email || !password) {
      console.log("ℹ️ Bootstrap admin environment variables not configured. Skipping bootstrap admin initialization.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Validate password strength against existing security policy
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      console.error(
        `❌ Bootstrap admin password does not meet security requirements: ${passwordValidation.errors.join("; ")}`
      );
      return;
    }

    // 2. Check if user with this email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      // Ensure existing user has admin role and active status without changing password or existing data
      let updated = false;
      if (existingUser.role !== "admin") {
        existingUser.role = "admin";
        updated = true;
      }
      if (existingUser.accountStatus !== "active") {
        existingUser.accountStatus = "active";
        updated = true;
      }
      if (!existingUser.isEmailVerified) {
        existingUser.isEmailVerified = true;
        updated = true;
      }
      if (updated) {
        await existingUser.save();
      }
      console.log(`Bootstrap admin ready: ${normalizedEmail}`);
      return;
    }

    // 3. Create Bootstrap Admin
    const adminUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: password,
      role: "admin",
      accountStatus: "active",
      isEmailVerified: true,
    });

    await adminUser.save(); // Pre-save hook hashes the password

    adminUser.passwordHistory.push({ hash: adminUser.password, createdAt: new Date() });
    await adminUser.save();

    console.log(`Bootstrap admin ready: ${normalizedEmail}`);
  } catch (err) {
    console.error("❌ Error initializing bootstrap admin:", err.message);
  }
};

module.exports = ensureBootstrapAdmin;
