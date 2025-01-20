const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();

const MembershipPassErrors = require("../config/https/errors/membershipPassErrors");

const uploadThumbnailToS3 = async (req) => {
  try {
    const s3Client = new S3Client({});
    const buffer = Buffer.from(req.body.membershipPhoto.bytes, "base64");

    await s3Client.send(
      new PutObjectCommand({
        // Bucket: `mwg-passkit-${process.env.APP_ENV}`,
        Bucket: `mwg-passkit-sandbox`,
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
      JSON.stringify(
        MembershipPassErrors.membershipPassS3Error(req.body.language)
      )
    );
  }
};

module.exports = {
  uploadThumbnailToS3,
};
