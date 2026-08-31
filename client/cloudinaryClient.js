const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const PROFILE_PICTURE_TRANSFORMATION = [
  { width: 500, height: 500, crop: "fill", gravity: "face" },
];

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
        transformation: PROFILE_PICTURE_TRANSFORMATION,
      },
      (error, result) => {
        if (error) {
          return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        }
        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

module.exports = { uploadProfilePicture };
