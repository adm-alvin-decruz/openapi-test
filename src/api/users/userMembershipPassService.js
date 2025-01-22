require("dotenv").config();

const cognitoService = require("../../services/cognitoService");
const userModel = require("../../db/models/userModel");
const userMembershipModel = require("../../db/models/userMembershipModel");
const userMembershipDetailsModel = require("../../db/models/userMembershipDetailsModel");
const loggerService = require("../../logs/logger");
const { uploadThumbnailToS3 } = require("../../services/s3Service");
const MembershipPassErrors = require("../../config/https/errors/membershipPassErrors");

const awsRegion = () => {
  const env = process.env.PRODUCTION;
  if (!env) return "ap-southeast-1";
  if (env === "false") return "ap-southeast-1";
  return env;
};
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const { getOrCheck } = require("../../utils/cognitoAttributes");
const MembershipErrors = require("../../config/https/errors/membershipErrors");
const sqsClient = new SQSClient({ region: awsRegion });

class UserMembershipPassService {
  async create(req) {
    try {
      const user = await userModel.findByEmail(req.body.email);

      // store pass data in db
      await this.saveUserMembershipPassToDB(user.id, req);

      // update user's cognito memberships info
      await this.updateMembershipInCognito(req);

      // upload member photo to S3
      if (req.body.membershipPhoto?.bytes) await uploadThumbnailToS3(req);
    } catch (error) {
      const errorMessage = error.message ? JSON.parse(error.message) : "";
      if (errorMessage.status === "failed") {
        throw new Error(
          JSON.stringify(
            MembershipPassErrors.createMembershipPassError(req.body.language)
          )
        );
      }
      throw new Error(error);
    }
  }

  async update(req) {
    try {
      // update pass data in db
      await this.updateUserMembershipPassToDB(req);

      // update pass expiry in cognito (if present in request)
      await this.updateMembershipInCognito(req);

      // update member photo in S3
      if (req.body.membershipPhoto && req.body.membershipPhoto?.bytes)
        await uploadThumbnailToS3(req);

      // send message to SQS to re-generate passkit
      await this.sendSQSMessage(req, "updateMembershipPass");
    } catch (error) {
      const errorMessage = error.message ? JSON.parse(error.message) : "";
      throw new Error(JSON.stringify(errorMessage));
    }
  }

  async createUserMembership(userId, { passType, visualId, validUntil }) {
    try {
      return await userMembershipModel.create({
        user_id: userId,
        name: passType,
        visual_id: visualId,
        expires_at: validUntil,
      });
    } catch (error) {
      loggerService.error(
        `userMembershipPassService.saveMembership Error: ${error} - userId: ${userId}`,
        { passType, visualId, validUntil }
      );
      throw new Error(
        JSON.stringify(MembershipPassErrors.createMembershipPassError())
      );
    }
  }

  async insertMembershipDetails(
    userId,
    membershipId,
    {
      categoryType,
      itemName,
      plu,
      adultQty,
      childQty,
      parking,
      iu,
      carPlate,
      membershipPhotoBytes,
      firstName,
      lastName,
      email,
      dob,
      country,
      identificationNo,
      phoneNumber,
      coMember,
      validFrom,
      validUntil,
    }
  ) {
    try {
      return await userMembershipDetailsModel.create({
        user_id: userId,
        user_membership_id: membershipId,
        category_type: categoryType,
        item_name: itemName,
        plu: plu,
        adult_qty: adultQty,
        child_qty: childQty,
        parking: parking,
        iu: iu,
        car_plate: carPlate,
        membership_photo: membershipPhotoBytes,
        member_first_name: firstName,
        member_last_name: lastName,
        member_email: email,
        member_dob: dob,
        member_country: country,
        member_identification_no: identificationNo,
        member_phone_number: phoneNumber,
        co_member: coMember,
        valid_from: validFrom,
        valid_until: validUntil,
      });
    } catch (error) {
      loggerService.error(
        `userMembershipPassService.insertMembershipDetails Error: ${error} - userId: ${userId} - membershipId: ${membershipId}`,
        {
          user_id: userId,
          user_membership_id: membershipId,
          category_type: categoryType,
          item_name: itemName,
          plu: plu,
          adult_qty: adultQty,
          child_qty: childQty,
          parking: parking,
          iu: iu,
          car_plate: carPlate,
          membership_photo: membershipPhotoBytes,
          member_first_name: firstName,
          member_last_name: lastName,
          member_email: email,
          member_dob: dob,
          member_country: country,
          member_identification_no: identificationNo,
          member_phone_number: phoneNumber,
          co_member: coMember,
          valid_from: validFrom,
          valid_until: validUntil,
        }
      );
      throw new Error(
        JSON.stringify(MembershipPassErrors.createMembershipPassError())
      );
    }
  }

  async saveUserMembershipPassToDB(userId, req) {
    try {
      const userMembership = await this.createUserMembership(userId, {
        passType: req.body.passType,
        visualId: req.body.visualId,
        validUntil: req.body.validUntil || null,
      });

      userMembership &&
        userMembership.membership_id &&
        (await this.insertMembershipDetails(
          userId,
          userMembership.membership_id,
          {
            categoryType: req.body.categoryType,
            itemName: req.body.itemName || null,
            plu: req.body.plu || null,
            adultQty: req.body.adultQty,
            childQty: req.body.childQty,
            parking: req.body.parking === "yes" ? 1 : 0,
            iu: req.body.iu || null,
            carPlate: req.body.carPlate || null,
            membershipPhotoBytes:
              !!req.body.membershipPhoto && !!req.body.membershipPhoto.bytes
                ? req.body.membershipPhoto.bytes
                : null,
            firstName:
              !!req.body.member && !!req.body.member.firstName
                ? req.body.member.firstName
                : null,
            lastName:
              !!req.body.member && !!req.body.member.lastName
                ? req.body.member.lastName
                : null,
            email:
              !!req.body.member && !!req.body.member.email
                ? req.body.member.email
                : null,
            dob:
              !!req.body.member && !!req.body.member.dob
                ? req.body.member.dob
                : null,
            country:
              !!req.body.member && !!req.body.member.country
                ? req.body.member.country
                : null,
            identificationNo:
              !!req.body.member && !!req.body.member.identificationNo
                ? req.body.member.identificationNo
                : null,
            phoneNumber:
              !!req.body.member && !!req.body.member.phoneNumber
                ? req.body.member.phoneNumber
                : null,
            coMember:
              req.body.coMembers && req.body.coMembers.length > 0
                ? JSON.stringify(req.body.coMembers)
                : null,
            validFrom: !!req.body.validFrom ? req.body.validFrom : null,
            validUntil: !!req.body.validUntil ? req.body.validUntil : null,
          }
        ));
      console.log("Successfully saved user membership pass details to DB");
    } catch (error) {
      loggerService.error(
        `userMembershipPassService.saveUserMembershipPassToDB Error: ${error}`,
        req
      );
      throw new Error(
        JSON.stringify(MembershipPassErrors.createMembershipPassError())
      );
    }
  }

  async updateUserMembershipPassToDB(req) {
    try {
      const rows = await userModel.findByEmailVisualIds(
        [req.body.visualId],
        req.body.email
      );

      const userMembership = rows && rows.length > 0 ? rows[0] : undefined;

      if (!userMembership) {
        await Promise.reject(
          JSON.stringify(
            MembershipErrors.ciamMembershipUserNotFound(
              req.body.email,
              req.body.language
            )
          )
        );
      }

      let expiryDate = req.body.validUntil || undefined;

      !!userMembership.userId &&
        (await userMembershipModel.updateByUserId(userMembership.userId, {
          name: req.body.passType,
          expires_at: expiryDate,
        }));

      !!userMembership.membershipId &&
        (await userMembershipDetailsModel.updateByMembershipId(
          userMembership.membershipId,
          {
            category_type: req.body.categoryType || undefined,
            item_name: req.body.itemName || undefined,
            plu: req.body.plu || undefined,
            adult_qty: req.body.adultQty || undefined,
            child_qty: req.body.childQty || undefined,
            parking: !!req.body.parking
              ? req.body.parking === "yes"
                ? 1
                : 0
              : undefined,
            iu: req.body.iu || undefined,
            car_plate: req.body.carPlate || undefined,
            membership_photo:
              !!req.body.membershipPhoto && req.body.membershipPhoto.bytes
                ? req.body.membershipPhoto.bytes
                : undefined,
            member_first_name:
              !!req.body.member && !!req.body.member.firstName
                ? req.body.member.firstName
                : undefined,
            member_last_name:
              !!req.body.member && !!req.body.member.lastName
                ? req.body.member.lastName
                : undefined,
            member_email: req.body.newEmail || undefined,
            member_dob:
              !!req.body.member && !!req.body.member.dob
                ? req.body.member.dob
                : undefined,
            member_country:
              !!req.body.member && !!req.body.member.country
                ? req.body.member.country
                : undefined,
            member_identification_no:
              !!req.body.member && !!req.body.member.identificationNo
                ? req.body.member.identificationNo
                : undefined,
            member_phone_number:
              !!req.body.member && !!req.body.member.phoneNumber
                ? req.body.member.phoneNumber
                : undefined,
            co_member:
              req.body.coMembers && req.body.coMembers.length > 0
                ? JSON.stringify(req.body.coMembers)
                : undefined,
            valid_from: req.body.validFrom || undefined,
            valid_until: expiryDate,
          }
        ));
      console.log("Successfully updated user membership pass details in DB");
      return {
        dbProceed: "success",
      };
    } catch (error) {
      loggerService.error(
        `userMembershipPassService.updateUserMembershipPassToDB Error: ${error}`,
        req
      );
      const errorMessage = error.message ? JSON.parse(error.message) : "";
      if (errorMessage.status === "failed") {
        throw new Error(
          JSON.stringify(
            MembershipPassErrors.updateMembershipPassError(req.body.language)
          )
        );
      }
      throw new Error(error);
    }
  }

  async updateMembershipInCognito(req) {
    try {
      const cognitoUser = await cognitoService.cognitoAdminGetUserByEmail(
        req.body.email
      );

      const existingMemberships = JSON.parse(
        getOrCheck(cognitoUser, "custom:membership")
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
      return {
        cognitoProceed: "success",
      };
    } catch (error) {
      loggerService.error(
        `userMembershipPassService.updateMembershipInCognito Error: ${error}`,
        req
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
        `userMembershipPassService.sendSQSMessage Error: ${error}`,
        req
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
