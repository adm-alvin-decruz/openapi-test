const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const loggerService = require('../logs/logger');
const { maskKeyRandomly } = require('../utils/common');

const uploadThumbnailToS3 = async (req) => {
  const s3Client = new S3Client({});

  loggerService.log(
    {
      uploadThumbnailToS3: {
        bucket: `mwg-passkit-${process.env.APP_ENV}`,
        path: `mwg-passkit-${process.env.APP_ENV}`,
        visualId: req.body.visualId,
        mandaiId: req.body.mandaiId,
        layer: 'service.uploadThumbnailToS3',
        data: maskKeyRandomly(req.body.membershipPhoto.bytes),
      },
    },
    'Start uploadThumbnailToS3',
  );

  try {
    const buffer = Buffer.from(req.body.membershipPhoto.bytes, 'base64');
    let uploadPhoto = await s3Client.send(
      new PutObjectCommand({
        Bucket: `mwg-passkit-${process.env.APP_ENV}`,
        Key: `users/${req.body.mandaiId}/assets/thumbnails/${req.body.visualId}.png`,
        Body: buffer,
        ContentType: 'image/png',
      }),
    );

    loggerService.log(
      {
        uploadThumbnailToS3: {
          bucket: `mwg-passkit-${process.env.APP_ENV}`,
          path: `mwg-passkit-${process.env.APP_ENV}`,
          visualId: req.body.visualId,
          mandaiId: req.body.mandaiId,
          layer: 'service.uploadThumbnailToS3',
          data: JSON.stringify(uploadPhoto),
        },
      },
      'Success uploadThumbnailToS3',
    );
    return uploadPhoto;
  } catch (error) {
    loggerService.error(
      {
        uploadThumbnailToS3: {
          bucket: `mwg-passkit-${process.env.APP_ENV}`,
          path: `mwg-passkit-${process.env.APP_ENV}`,
          visualId: req.body.visualId,
          mandaiId: req.body.mandaiId,
          layer: 'service.uploadThumbnailToS3',
          data: maskKeyRandomly(req.body.membershipPhoto.bytes),
          error: new Error(`uploadThumbnailToS3 error: ${error}`),
        },
      },
      {},
      'End uploadThumbnailToS3 - Failed',
    );
    throw new Error(
      JSON.stringify({
        status: 'failed',
        isFrom: 's3',
      }),
    );
  }
};

const preSignedURLS3 = async (path) => {
  if (!path) {
    throw new Error(
      JSON.stringify({
        status: 'failed',
        isFrom: 's3',
        message: 'Empty S3 path',
      }),
    );
  }

  try {
    const s3Client = new S3Client({});
    const command = new GetObjectCommand({
      Bucket: `mwg-passkit-${process.env.APP_ENV}`,
      Key: path,
    });
    return await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });
  } catch (error) {
    loggerService.error(`userMembershipPassService.preSignedURL Error: ${error}`, path);
    throw new Error(
      JSON.stringify({
        status: 'failed',
        isFrom: 's3',
      }),
    );
  }
};

module.exports = {
  uploadThumbnailToS3,
  preSignedURLS3,
};
