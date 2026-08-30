const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

const client_id = process.env.APPLE_CLIENT_ID;

const jwks = jwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
});

const verifyIdentityToken = async (identityToken) => {
  try {
    const decoded = jwt.decode(identityToken, { complete: true });
    if (!decoded) {
      throw new Error("token could not be decoded");
    }

    const signingKey = await jwks.getSigningKey(decoded.header.kid);

    const payload = jwt.verify(identityToken, signingKey.getPublicKey(), {
      algorithms: ["RS256"],
      issuer: "https://appleid.apple.com",
      audience: client_id,
    });

    return {
      providerId: payload.sub,
      email: payload.email,
      emailVerified:
        payload.email_verified === true || payload.email_verified === "true",
    };
  } catch (error) {
    throw new Error(`Apple authentication failed: ${error.message}`);
  }
};

module.exports = { verifyIdentityToken };
