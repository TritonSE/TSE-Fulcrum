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
  return parser === undefined ? fromEnv : parser(fromEnv);
}

const NODE_ENV = getEnv("NODE_ENV", "development");
const ADMIN_EMAIL = getEnv("ADMIN_EMAIL", "tse@ucsd.edu");

// To configure these variables, use a .env file during development, or use
// environment variables in production.
const env = {
  // Required for production.

  /**
   * MongoDB connection URL, including any authentication information.
   */
  MONGODB_URL: getEnv("MONGODB_URL", "mongodb://127.0.0.1:27017/tse-fulcrum"),

  /**
   * Base URL of the current deployment. Used to generate links in emails.
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

  /**
   * Hostname of the email service used to send emails.
   */
  EMAIL_HOST: getEnv("EMAIL_HOST", "smtp.gmail.com"),

  FIREBASE_SERVICE_ACCOUNT_KEY: getEnv("FIREBASE_SERVICE_ACCOUNT_KEY", undefined),

  // Only necessary if you need to override the default values.

  /**
   * On startup, this account will be created if it doesn't exist.
   */
  ADMIN_EMAIL,

  EMAIL_ENABLED: getEnv(
    "EMAIL_ENABLED",
    NODE_ENV !== "development",
    (enabled: string) => !!enabled,
  ),

  DEPLOYMENT_NAME: getEnv("DEPLOYMENT_NAME", "TSE Fulcrum"),

  EMAIL_FOOTER: getEnv(
    "EMAIL_FOOTER",
    `This is an automated email, and replies will not be read. Please contact ${ADMIN_EMAIL} if you have any questions or concerns.`,
  ),

  PASSWORD_RESET_EXPIRATION_MINS: getEnv("PASSWORD_RESET_EXPIRATION_MINS", 15, parseInt),

  SESSION_EXPIRATION_MINS: getEnv("SESSION_EXPIRATION_MINS", 12 * 60, parseInt),

  /**
   * Debounce duration before saving a user's live code state into MongoDB.
   */
  DB_UPDATE_INTERVAL: getEnv("DB_UPDATE_INTERVAL", 10 * 1000, parseInt),

  /**
   * URL of the interview instructions to be displayed to interviewees.
   */
  README_URL: getEnv(
    "README_URL",
    "https://raw.githubusercontent.com/TritonSE/TSE-Technical-Interview-Template/main/README.md",
  ),

  // Loaded from environment variables.
  NODE_ENV,
  PORT: getEnv("PORT", 8000, parseInt),
};

if (!env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.error("Missing Firebase service account key");
}

if (env.EMAIL_ENABLED && !(env.EMAIL_USERNAME && env.EMAIL_PASSWORD && env.EMAIL_HOST)) {
  console.error("Email configuration incomplete. Disabling email.");
  env.EMAIL_ENABLED = false;
}

console.log(`env: ${JSON.stringify(env, null, 2)}`);

export default env;
