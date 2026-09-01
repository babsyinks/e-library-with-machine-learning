import { validateEnvironment } from "./environment";

const valid = {
  DATABASE_URL: "postgresql://localhost/library",
  WEB_URL: "http://localhost:3000",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "b".repeat(32),
  TOKEN_PEPPER: "c".repeat(32),
  INSTITUTION_EMAIL_DOMAIN: "example.edu",
  S3_ENDPOINT: "http://localhost:9000",
  S3_BUCKET: "library",
  S3_ACCESS_KEY: "access",
  S3_SECRET_KEY: "secret",
  ML_SERVICE_URL: "http://localhost:8000",
  ML_INTERNAL_TOKEN: "d".repeat(32),
};

describe("environment validation", () => {
  it("accepts a complete local configuration", () => {
    expect(validateEnvironment({ ...valid })).toEqual(valid);
  });

  it("fails fast when required configuration is missing", () => {
    expect(() => validateEnvironment({ ...valid, DATABASE_URL: "" })).toThrow(
      "DATABASE_URL",
    );
  });

  it("rejects placeholder or short production secrets", () => {
    expect(() =>
      validateEnvironment({
        ...valid,
        NODE_ENV: "production",
        JWT_ACCESS_SECRET: "REPLACE_ME",
      }),
    ).toThrow("JWT_ACCESS_SECRET");
  });
});
