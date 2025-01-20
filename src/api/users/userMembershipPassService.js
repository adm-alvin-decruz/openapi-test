require("dotenv").config();

const cognitoService = require("../../services/cognitoService");
const userModel = require("../../db/models/userModel");
const userMembershipModel = require("../../db/models/userMembershipModel");
const userMembershipDetailsModel = require("../../db/models/userMembershipDetailsModel");
const loggerService = require("../../logs/logger");
const pool = require("../../db/connections/mysqlConn");
const { uploadThumbnailToS3 } = require("../../services/s3Service");
const MembershipPassErrors = require("../../config/https/errors/membershipPassErrors");
const CommonErrors = require("../../config/https/errors/common");

const awsRegion = () => {
  const env = process.env.PRODUCTION;
  if (!env) return "ap-southeast-1";
  if (env === "false") return "ap-southeast-1";
  return env;
};
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const { messageLang } = require("../../utils/common");
const sqsClient = new SQSClient({ region: awsRegion });

class UserMembershipPassService {
  async create(req) {
    try {
      // store pass data in db
      await this.saveUserMembershipPassToDB(req);

      // update user's cognito memberships info
      await this.updateMembershipInCognito(req);

      // upload member photo to S3
      if (req.body.membershipPhoto?.bytes) await uploadThumbnailToS3(req);
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      if (errorMessage.status === "failed") {
        throw new Error(
          JSON.stringify(
            MembershipPassErrors.createMembershipPassError(req.body.language)
          )
        );
      } else {
        throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
      }
    }
  }

  async update(req) {
    try {
      // update pass data in db
      await this.updateUserMembershipPassToDB(req);

      // update pass expiry in cognito (if present in request)
      await this.updateMembershipInCognito(req);

      // update member photo in S3
      if (req.body.membershipPhoto?.bytes) await uploadThumbnailToS3(req);

      // send message to SQS to re-generate passkit
      await this.sendSQSMessage(req, "updateMembershipPass");
    } catch (error) {
      const errorMessage = JSON.parse(error.message);
      if (errorMessage.status === "failed") {
        throw new Error(
          JSON.stringify(
            MembershipPassErrors.updateMembershipPassError(req.body.language)
          )
        );
      } else {
        throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
      }
    }
  }

  async saveUserMembershipPassToDB(req) {
    try {
      await pool.transaction(async () => {
        const user = await userModel.findByEmail(req.body.email);

        const userMembership = await userMembershipModel.create({
          user_id: user.id,
          name: req.body.passType,
          visual_id: req.body.visualId,
          expires_at: req.body.validUntil || null,
        });

        await userMembershipDetailsModel.create({
          user_id: user.id,
          user_membership_id: userMembership.membership_id,
          category_type: req.body.categoryType,
          item_name: req.body.itemName || null,
          plu: req.body.plu || null,
          adult_qty: req.body.adultQty,
          child_qty: req.body.childQty,
          parking: "yes" ? 1 : "no" ? 0 : null,
          iu: req.body.iu || null,
          car_plate: req.body.carPlate || null,
          membership_photo: req.body.membershipPhoto?.bytes || null,
          member_first_name: req.body.member?.firstName || null,
          member_last_name: req.body.member?.lastName || null,
          member_email: req.body.member?.email || null,
          member_dob: req.body.member?.dob || null,
          member_country: req.body.member?.country || null,
          member_identification_no: req.body.member?.identificationNo || null,
          member_phone_number: req.body.member?.phoneNumber || null,
          co_member:
            req.body.coMembers.length > 0
              ? JSON.stringify(req.body.coMembers)
              : null,
          valid_from: req.body.validFrom || null,
          valid_until: req.body.validUntil || null,
        });
      });

      console.log("Successfully saved user membership pass details to DB");
    } catch (error) {
      loggerService.error(
        `userMembershipPassService.saveUserMembershipPassToDB Error: ${error.message}`
      );
      throw new Error(
        JSON.stringify({
          dbProceed: "failed",
        })
      );
    }
  }

  async updateUserMembershipPassToDB(req) {
    try {
      await pool.transaction(async () => {
        const rows = await userMembershipModel.findByVisualId(
          req.body.visualId
        );
        const userMembership = rows[0];
        if (!userMembership) {
          throw new Error(
            JSON.stringify({
              data: {
                code: 404,
                mwgCode: "MWG_CIAM_USER_MEMBERSHIP_FIND_BY_VISUALID_ERR",
                message: messageLang(
                  "db_user_membership_not_exist",
                  req.body.language
                ),
              },
              status: "failed",
              statusCode: 404,
            })
          );
        }

        let expiryDate = req.body.validUntil || undefined;

        await userMembershipModel.updateByUserId(userMembership.user_id, {
          name: req.body.passType,
          expires_at: expiryDate,
        });

        await userMembershipDetailsModel.updateByMembershipId(
          userMembership.id,
          {
            category_type: req.body.categoryType || undefined,
            item_name: req.body.itemName || undefined,
            plu: req.body.plu || undefined,
            adult_qty: req.body.adultQty || undefined,
            child_qty: req.body.childQty || undefined,
            parking: req.body.parking
              ? req.body.parking === "yes"
                ? 1
                : 0
              : undefined,
            iu: req.body.iu || undefined,
            car_plate: req.body.carPlate || undefined,
            membership_photo: req.body.membershipPhoto?.bytes || undefined,
            member_first_name: req.body.member?.firstName || undefined,
            member_last_name: req.body.member?.lastName || undefined,
            member_email: req.body.newEmail || undefined,
            member_dob: req.body.member?.dob || undefined,
            member_country: req.body.member?.country || undefined,
            member_identification_no:
              req.body.member?.identificationNo || undefined,
            member_phone_number: req.body.member?.phoneNumber || undefined,
            co_member:
              req.body.coMembers.length > 0
                ? JSON.stringify(req.body.coMembers)
                : undefined,
            valid_from: req.body.validFrom || undefined,
            valid_until: expiryDate,
          }
        );
      });

      console.log("Successfully updated user membership pass details in DB");
    } catch (error) {
      loggerService.error(
        `userMembershipPassService.updateUserMembershipPassToDB Error: ${error}`
      );
      throw new Error(
        JSON.stringify({
          dbProceed: "failed",
        })
      );
    }
  }

  async updateMembershipInCognito(req) {
    const cognitoUser = await cognitoService.cognitoAdminGetUserByEmail(
      req.body.email
    );

    function getCognitoAttribute(attributes, attributeName) {
      const attribute = attributes.find((attr) => attr.Name === attributeName);
      return attribute ? attribute.Value : null;
    }

    const existingMemberships = JSON.parse(
      getCognitoAttribute(cognitoUser.UserAttributes, "custom:membership")
    );
    const newMembership = {
      name: req.body.passType,
      visualID: req.body.visualId,
      expiry: req.body.validUntil || null,
    };

    // reformat "custom:membership" to JSON array
    let updatedMemberships;
    if (existingMemberships === null) {
      updatedMemberships = [newMembership];
    } else if (Array.isArray(existingMemberships)) {
      // Check if any existing membership needs to be updated based on visualId
      const membershipToUpdateIdx = existingMemberships.findIndex(
        (membership) => membership.visualID === newMembership.visualID
      );
      if (membershipToUpdateIdx) {
        existingMemberships[membershipToUpdateIdx] = newMembership;
        updatedMemberships = [...existingMemberships];
      } else {
        updatedMemberships = [...existingMemberships, newMembership];
      }
    } else if (typeof existingMemberships === "object") {
      // Check if existing membership needs to be updated based on visualId
      if (existingMemberships.visualID === newMembership.visualID) {
        updatedMemberships = [newMembership];
      } else {
        updatedMemberships = [existingMemberships, newMembership];
      }
    }

    try {
      await cognitoService.cognitoAdminUpdateNewUser(
        [
          {
            Name: "custom:membership",
            Value: JSON.stringify(updatedMemberships),
          },
          {
            Name: "custom:vehicle_iu",
            Value: req.body.iu || "null",
          },
          {
            Name: "custom:vehicle_plate",
            Value: req.body.carPlate || "null",
          },
        ],
        req.body.email
      );

      console.log("Updated user data in Cognito");
    } catch (error) {
      loggerService.error(
        `userMembershipPassService.updateMembershipInCognito Error: ${error}`
      );
      throw new Error(
        JSON.stringify(
          MembershipPassErrors.membershipPassCognitoError(req.body.language)
        )
      );
    }
  }

  async sendSQSMessage(req, action) {
    try {
      req["apiTimer"] = req.processTimer.apiRequestTimer();
      req.apiTimer.log("UserMembershipPassService.sendSQSMessage starts");

      const sqsBody = {
        passType: req.body.passType,
        name: req.body.member.firstName + " " + req.body.member.lastName,
        mandaiId: req.body.mandaiId,
        visualId: req.body.visualId,
        dateOfBirth: req.body.member.dob,
        expiryDate: req.body.validUntil,
        membershipType: req.body.categoryType,
        familyMembers: req.body.coMembers.map(
          (member) => member.firstName + " " + member.lastName
        ),
      };

      let data = { action: action, body: sqsBody };

      const queueUrl = process.env.SQS_QUEUE_URL;
      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(data),
      });

      let result = await sqsClient.send(command);
      req.apiTimer.end("UserMembershipPassService.sendSQSMessage"); // log end time
      return result;
    } catch (error) {
      loggerService.error(
        `userMembershipPassService.sendSQSMessage Error: ${error}`
      );
      throw new Error(
        JSON.stringify(
          MembershipPassErrors.membershipPassSQSError(req.body.language)
        )
      );
    }
  }
}

module.exports = new UserMembershipPassService();
