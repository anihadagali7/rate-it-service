process.env.ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || "test-access-token-secret";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
process.env.CORS_ORIGIN =
  process.env.CORS_ORIGIN || "http://localhost:3000,http://127.0.0.1:3000";
process.env.SLACK_LOGIN_URL =
  process.env.SLACK_LOGIN_URL || "https://example.com/slack";
process.env.SLACK_TOKEN = process.env.SLACK_TOKEN || "test-slack-token";
process.env.SLACK_MEDIA_URL =
  process.env.SLACK_MEDIA_URL || "https://example.com/slack-media";
process.env.SLACK_RATING_URL =
  process.env.SLACK_RATING_URL || "https://example.com/slack-rating";
process.env.GOOGLE_OAUTH_CLIENT_ID =
  process.env.GOOGLE_OAUTH_CLIENT_ID || "test-google-client-id";
process.env.GOOGLE_OAUTH_CLIENT_SECRET =
  process.env.GOOGLE_OAUTH_CLIENT_SECRET || "test-google-client-secret";
process.env.FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || "test-app-id";
process.env.FACEBOOK_APP_SECRET =
  process.env.FACEBOOK_APP_SECRET || "test-app-secret";
process.env.APPLE_CLIENT_ID =
  process.env.APPLE_CLIENT_ID || "test-apple-client-id";
process.env.BREVO_API_KEY =
  process.env.BREVO_API_KEY || "xkeysib-test-brevo-api-key";
process.env.EMAIL_FROM = process.env.EMAIL_FROM || "no-reply@example.com";
process.env.FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:3000";
process.env.CLOUDINARY_CLOUD_NAME =
  process.env.CLOUDINARY_CLOUD_NAME || "test-cloud-name";
process.env.CLOUDINARY_API_KEY =
  process.env.CLOUDINARY_API_KEY || "test-cloudinary-api-key";
process.env.CLOUDINARY_API_SECRET =
  process.env.CLOUDINARY_API_SECRET || "test-cloudinary-api-secret";
process.env.NODE_ENV = "test";