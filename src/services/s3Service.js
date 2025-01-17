const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();

const uploadThumbnailToS3 = async (req) => {
  try {
    const s3Client = new S3Client({});
    const buffer = Buffer.from(req.body.membershipPhoto.bytes, "base64");

    await s3Client.send(
      new PutObjectCommand({
        Bucket: `mwg-passkit.${process.env.APP_ENV}`,
        Key: `users/${req.body.mandaiId}/assets/thumbnails/${req.body.visualId}.png`,
        Body: buffer,
        ContentType: "image/png",
      })
    );

    console.log("Thumbnail uploaded to S3 successfully");
  } catch (error) {
    console.error(error.message);
    return error;
  }
};

module.exports = {
  uploadThumbnailToS3,
};
