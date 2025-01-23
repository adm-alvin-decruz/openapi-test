const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();

const loggerService = require("../logs/logger");

const uploadThumbnailToS3 = async (req) => {
  try {
    //TODO: update env for s3
    const s3Client = new S3Client({
      region: process.env.AWS_REGION_NAME,
      credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
      },
    });
    const buffer = Buffer.from(req.body.membershipPhoto.bytes, "base64");

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: `users/${req.body.mandaiId}/assets/thumbnails/${req.body.visualId}.png`,
        Body: buffer,
        ContentType: "image/png",
      })
    );

    console.log("Thumbnail uploaded to S3 successfully");
  } catch (error) {
    loggerService.error(
      `userMembershipPassService.uploadThumbnailToS3 Error: ${error}`
    );
    throw new Error(
      JSON.stringify({
        status: "failed",
        isFrom: "s3",
      })
    );
  }
};

module.exports = {
  uploadThumbnailToS3,
};
