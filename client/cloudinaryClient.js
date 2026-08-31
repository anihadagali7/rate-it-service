const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const PROFILE_PICTURE_TRANSFORMATION = [
  { width: 500, height: 500, crop: "fill", gravity: "face" },
];

// Restricting formats here is enforced by Cloudinary against the actual
// decoded file, unlike the client-declared Content-Type multer checks —
// closes the gap where a spoofed mimetype could get non-image content
// (e.g. an SVG with an embedded <script>) stored and served as an "image".
const ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp"];

// A stable public_id per user means a re-upload overwrites the previous
// picture at the same Cloudinary asset instead of accumulating orphaned
// images every time someone changes their profile picture.
const uploadProfilePicture = (userId, fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: `rate-it/profile-pictures/${userId}`,
        overwrite: true,
        resource_type: "image",
        allowed_formats: ALLOWED_FORMATS,
        transformation: PROFILE_PICTURE_TRANSFORMATION,
      },
      (error, result) => {
        if (error) {
          const wrapped = new Error(`Cloudinary upload failed: ${error.message}`);
          // Cloudinary sets http_code on client-caused failures (e.g. an
          // invalid or disallowed-format file) vs. its own service errors —
          // preserved so callers can tell "this file will never work" apart
          // from "try again shortly".
          wrapped.httpCode = error.http_code;
          return reject(wrapped);
        }
        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

module.exports = { uploadProfilePicture };
