const required = [
  "DATABASE_URL",
  "WEB_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "TOKEN_PEPPER",
  "INSTITUTION_EMAIL_DOMAIN",
  "S3_ENDPOINT",
  "S3_BUCKET",
  "S3_ACCESS_KEY",
  "S3_SECRET_KEY",
  "ML_SERVICE_URL",
  "ML_INTERNAL_TOKEN",
];

export function validateEnvironment(config: Record<string, unknown>) {
  const missing = required.filter((key) => !config[key]);
  if (missing.length)
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);

  if (config.NODE_ENV === "production") {
    for (const key of [
      "JWT_ACCESS_SECRET",
      "JWT_REFRESH_SECRET",
      "TOKEN_PEPPER",
      "ML_INTERNAL_TOKEN",
    ]) {
      if (
        String(config[key]).length < 32 ||
        String(config[key]).includes("REPLACE")
      ) {
        throw new Error(
          `${key} must be a unique secret of at least 32 characters in production`,
        );
      }
    }
  }
  return config;
}
