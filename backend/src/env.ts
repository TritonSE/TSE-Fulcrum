import dotenv from "dotenv";
dotenv.config();

/**
 * Get the value of an environment variable.
 * @param key The name of the environment variable to read.
 * @param defaultValue The value to use if the variable is not assigned.
 * @param parser Function used to parse the environment variable's value.
 */
function getEnv<T>(key: string, defaultValue: T): string | T;
function getEnv<T>(key: string, defaultValue: T, parser: (fromEnv: string) => T): T;
function getEnv<T>(key: string, defaultValue: T, parser?: (fromEnv: string) => T): string | T {
  const fromEnv = process.env[key];
  if (fromEnv === undefined) {
    return defaultValue;
  }
  return (parser === undefined) ? fromEnv : parser(fromEnv);
}

/*
type Intersection<T> = (
  T extends []
    ? {}
    : T extends [infer F, ...infer R]
      ? F & Intersection<R>
      : never
);

function merge<T>(...args: T): Intersection<T> {
  const merged
}
*/

const NODE_ENV = getEnv("NODE_ENV", "development");
const ORIGINAL_ADMIN_EMAIL = getEnv("ORIGINAL_ADMIN_EMAIL", "tse@ucsd.edu");

// To configure these variables, use a .env file during development, or use
// environment variables in production.
const config = {
  // Required for production.

  /**
   * MongoDB connection URL, including any authentication information.
   */
  MONGODB_URL: getEnv("MONGODB_URL", "mongodb://localhost:27017/tse-fulcrum"),

  /**
   * Base URL of the current deployment. Used to generate links for emails.
   */
  DEPLOYMENT_URL: getEnv("DEPLOYMENT_URL", "http://localhost:3000"),

  /**
   * Username for the email account used to send emails.
   */
  EMAIL_USERNAME: getEnv("EMAIL_USERNAME", ""),

  /**
   * Password for the email account used to send emails.
   */
  EMAIL_PASSWORD: getEnv("EMAIL_PASSWORD", ""),

  // Only necessary if you need to override the default values.

  /**
   * Name of the current deployment. Used in automated emails
   */
  DEPLOYMENT_NAME: getEnv("DEPLOYMENT_NAME", "TSE Fulcrum"),

  /**
   * If there are no active admin accounts when the server starts, this email
   * address will be given an active admin account. This can be used to set up
   * a new deployment, or recover an existing deployment with no active admin
   * accounts.
   */
  ORIGINAL_ADMIN_EMAIL,

  /**
   * Hostname of the email service used to send emails.
   */
  EMAIL_HOST: getEnv("EMAIL_HOST", "smtp.gmail.com"),

  /**
   * Whether emails should be sent. If false (the default during development),
   * emails will be printed to the console instead.
   */
  EMAIL_ENABLED: getEnv("EMAIL_ENABLED", NODE_ENV !== "development", (enabled: string) => !!enabled),

  /**
   * Footer message added to every email sent.
   */
  EMAIL_FOOTER: getEnv("EMAIL_FOOTER", `This is an automated email. Please contact ${ORIGINAL_ADMIN_EMAIL} if you have any questions or concerns.`),

  /**
   * Duration (in milliseconds) that a user session lasts.
   */
  SESSION_EXPIRATION_MS: getEnv("SESSION_EXPIRATION_MS", 24 * 60 * 60 * 1000, parseInt),

  /**
   * Duration (in hours) that a password reset token is valid.
   */
  PASSWORD_RESET_VALID_HRS: getEnv("PASSWORD_RESET_VALID_HRS", 24, parseInt),

  // Loaded from environment variables.
  NODE_ENV,
  PORT: getEnv("PORT", 8000),
};

if (config.EMAIL_ENABLED && !(config.EMAIL_USERNAME && config.EMAIL_PASSWORD && config.EMAIL_HOST)) {
  console.error("Email configuration incomplete. Disabling email.");
  config.EMAIL_ENABLED = false;
}

export default config;



/*
const config = Object.fromEntries(Object.entries(defaults).map(([key, default]) => {
  const external = process.env[key];
  if (external !== undefined) {
    if (Array.isArray(default)) {

    }
  }
}))
*/

/*
export default {
  PORT: process.env.PORT || 8000,
  NODE_ENV,
  MONGODB_URL: "mongodb://localhost:27017/tse-fulcrum",
  DEPLOYMENT_URL: process.env.DEPLOYMENT_URL || "http://localhost:3000",
  FALLBACK_ADMIN_EMAIL: process.env.FALLBACK_ADMIN_EMAIL || "tse@ucsd.edu",
  SESSION_EXPIRATION_MS: parseInt(process.env.SESSION_EXPIRATION_SEC || (24 * 60 * 60 * 1000).toString()),
  EMAIL_HOST: process.env.EMAIL_HOST || "smtp.gmail.com",
  EMAIL_USERNAME: process.env.EMAIL_ADDRESS,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  EMAIL_ENABLED: process.env.NODE_!!process.env.ENABLE_EMAIL_IN_DEV,
};
*/
