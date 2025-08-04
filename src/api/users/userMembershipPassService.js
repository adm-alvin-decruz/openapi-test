require("dotenv").config();

const { updateMembershipInCognito } = require("../../helpers/cognitoHelpers");
const userModel = require("../../db/models/userModel");
const userMembershipModel = require("../../db/models/userMembershipModel");
const userMembershipDetailsModel = require("../../db/models/userMembershipDetailsModel");
const userMigrationsMembershipPassesModel = require("../../db/models/userMigrationsMembershipPassesModel");
const empMembershipUserPassesModel = require("../../db/models/empMembershipUserPassesModel");
const loggerService = require("../../logs/logger");
const { uploadThumbnailToS3 } = require("../../services/s3Service");
const MembershipPassErrors = require("../../config/https/errors/membershipPassErrors");
const nopCommerceService = require("../components/nopCommerce/services/nopCommerceService");
const { getPassType } = require("../../helpers/dbConfigsHelpers");

const awsRegion = () => {
  const env = process.env.AWS_REGION_NAME;
  if (!env) return "ap-southeast-1";
  if (env === "false") return "ap-southeast-1";
  return env;
};

const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const MembershipErrors = require("../../config/https/errors/membershipErrors");
const { omit } = require("../../utils/common");
const Configs = require("../../db/models/configsModel");
const sqsClient = new SQSClient({ region: awsRegion });

class UserMembershipPassService {
  async create(req) {
    loggerService.log(
      {
        user: {
          userEmail: req.body.email,
          membership: req.body.group,
          action: `userCreateMembershipPass - migration flow: ${!!req.body.migrations}`,
          layer: "userMembershipPassService.create",
        },
      },
      "Start userCreateMembershipPass Service"
    );

    const migrationsFlag = req.body && req.body.migrations;
    const userInfo = migrationsFlag ? await userModel.findByEmail(req.body.email) : null;
    const mandaiId = userInfo && userInfo.mandai_id ? userInfo.mandai_id : req.body.mandaiId;
    const passTypeMapping = await getPassType(req.body);
    try {
      const user = await userModel.findByEmailMandaiId(req.body.email, mandaiId);
      if (!user || !user.id) {
        req.body &&
          req.body.migrations &&
          (await empMembershipUserPassesModel.updatePassState(req.body, {
            picked: 2,
          }));
        await Promise.reject(
          JSON.stringify(MembershipErrors.ciamMembershipUserNotFound(req.body.email, req.body.language))
        );
      }

      // 1st: check membership pass exist
      const membershipInfo = await userModel.findByEmailMandaiIdVisualId(
        req.body.visualId,
        req.body.email,
        mandaiId,
        req.body.passType
      );
      if (membershipInfo && membershipInfo.visualId === req.body.visualId) {
        req.body &&
          req.body.migrations &&
          (await empMembershipUserPassesModel.updatePassState(req.body, {
            picked: 2,
          }));
        await Promise.reject(
          JSON.stringify(MembershipPassErrors.membershipPassExistedError(req.body.email, req.body.language))
        );
      }

      // 2nd: update user's cognito memberships info
      await updateMembershipInCognito(req.body);

      // 3rd: upload photo
      // TODO: if upload photo success, data can save to DB together in #4
      let uploadPhoto;
      // migration flow image with base64 bytes - upload member photo to S3
      if (req.body.migrations && req.body.pictureId) {
        const photoBase64 = await nopCommerceService.retrieveMembershipPhoto(req.body.pictureId);
        if (photoBase64) {
          uploadPhoto = await uploadThumbnailToS3({
            body: {
              membershipPhoto: {
                bytes: photoBase64.split("data:image/jpeg;base64,")[1],
              },
              mandaiId,
              visualId: req.body.visualId,
            },
          });
        }
      }

      // normal flow image with base64 bytes - upload member photo to S3
      if (req.body.membershipPhoto && req.body.membershipPhoto?.bytes) {
        uploadPhoto = await uploadThumbnailToS3(req);
      }

      // 4th: store pass data in db
      const createMembershipRs = await this.saveUserMembershipPassToDB(user.id, {
        ...req,
        passType: passTypeMapping.toLowerCase(),
      });

      if (uploadPhoto && uploadPhoto.$metadata.httpStatusCode === 200) {
        await userMembershipDetailsModel.updateByMembershipId(createMembershipRs.membershipId, {
          membership_photo: `users/${mandaiId}/assets/thumbnails/${req.body.visualId}.png`,
        });
      }

      // send to SQS and update migrations DB
      if (req.body.member && req.body.coMembers && uploadPhoto && uploadPhoto.$metadata.httpStatusCode === 200) {
        // TODO: migrations flow need to update query
        req.body &&
          req.body.migrations &&
          (await userMigrationsMembershipPassesModel.updateByEmailAndBatchNo(req.body.email, req.body.batchNo, {
            pass_request: 1,
            co_member_request: 1,
          }));

        const supportedPasskitTypes = await Configs.findByConfigKey("membership-passes", "passkit-supported-types");
        if (supportedPasskitTypes.value.includes(req.body.passType))
          await this.sendSQSMessage(
            {
              ...req,
              body: {
                ...req.body,
                mandaiId: mandaiId,
                passType: passTypeMapping.toLowerCase(),
              },
            },
            "createMembershipPass"
          );

        return loggerService.log(
          {
            user: {
              action: `userCreateMembershipPass - migration flow: ${!!req.body.migrations}`,
              layer: "userMembershipPassService.create",
              triggerSQSAction: "success",
            },
          },
          "End userCreateMembershipPass Service - Success"
        );
      } else {
        req.body &&
          req.body.migrations &&
          (await empMembershipUserPassesModel.updatePassState(req.body, {
            picked: 1,
          }));
      }

      return loggerService.log(
        {
          user: {
            action: `userCreateMembershipPass - migration flow: ${!!req.body.migrations}`,
            layer: "userMembershipPassService.create",
            triggerSQSAction: "unused",
          },
        },
        "End userCreateMembershipPass Service - Success"
      );
    } catch (error) {
      loggerService.error(
        {
          user: {
            userEmail: req.body.email,
            action: `userCreateMembershipPass - migration flow: ${!!req.body.migrations}`,
            layer: "userMembershipPassService.create",
            error: new Error(error),
          },
        },
        {},
        "End userCreateMembershipPass Service - Failed"
      );
      req.body &&
        req.body.migrations &&
        (await empMembershipUserPassesModel.updatePassState(req.body, {
          picked: 2,
        }));
      const errorMessage = error.message ? JSON.parse(error.message) : "";
      if (errorMessage.status === "failed") {
        throw new Error(JSON.stringify(MembershipPassErrors.createMembershipPassError(req.body.language)));
      }
      throw new Error(error);
    }
  }

  async update(req) {
    try {
      loggerService.log(
        {
          user: {
            userEmail: req.body.email,
            membership: req.body.group,
            action: `userUpdateMembershipPass`,
            layer: "userMembershipPassService.update",
            data: JSON.stringify(req.body),
          },
        },
        "Start userUpdateMembershipPass Service"
      );
      // update pass expiry in cognito (if present in request)
      await updateMembershipInCognito(req.body);

      // update pass data in db
      // TODO: improve the flow which flow first, 2nd, 3rd ...
      const updateMembershipRs = await this.updateUserMembershipPassToDB(req);

      // update member photo in S3
      // TODO: move upload photo up, so after upload photo, data can save to DB together in #3
      if (req.body.membershipPhoto && req.body.membershipPhoto?.bytes) {
        // let updatePhoto = true; // commented due to no checking for passkit generate for now.
        await uploadThumbnailToS3(req);
        await userMembershipDetailsModel.updateByMembershipId(updateMembershipRs.membershipId, {
          membership_photo: `users/${req.body.mandaiId}/assets/thumbnails/${req.body.visualId}.png`,
        });
        // } // disabled, gen passkit whenever update
      }

      // send message to SQS to re-generate passkit (Trigger whenever pass update)
      // if (req.body.member || updatePhoto || req.body.coMembers || (req.body.status > 0) || req.body.validUntil) { // disabled
      const supportedPasskitTypes = await Configs.findByConfigKey("membership-passes", "passkit-supported-types");
      if (supportedPasskitTypes.value.includes(req.body.passType))
        await this.sendSQSMessage(
          {
            ...req,
            body: {
              ...req.body,
              membershipId: updateMembershipRs.membershipId,
            },
          },
          "updateMembershipPass"
        );

      loggerService.log(
        {
          user: {
            userEmail: req.body.email,
            membership: req.body.group,
            action: `userUpdateMembershipPass`,
            layer: "userMembershipPassService.update",
          },
        },
        "End userUpdateMembershipPass Service - Success"
      );
    } catch (error) {
      loggerService.error(
        {
          user: {
            userEmail: req.body.email,
            membership: req.body.group,
            action: `userUpdateMembershipPass`,
            layer: "userMembershipPassService.update",
            error: new Error(error),
          },
        },
        {},
        "End userUpdateMembershipPass Service - Failed"
      );
      const errorMessage = error.message ? JSON.parse(error.message) : "";
      if (errorMessage.status === "failed") {
        throw new Error(JSON.stringify(MembershipPassErrors.createMembershipPassError(req.body.language)));
      }
      throw new Error(JSON.stringify(errorMessage));
    }
  }

  async createUserMembership(userId, { passType, visualId, validUntil }) {
    try {
      loggerService.log(
        {
          user: {
            userId: userId,
            membership: { passType, visualId, validUntil },
            layer: "userMembershipPassService.createUserMembership",
          },
        },
        "Start createUserMembership"
      );
      const createMembershipRs = await userMembershipModel.create({
        user_id: userId,
        name: passType,
        visual_id: visualId,
        expires_at: validUntil,
      });
      loggerService.log(
        {
          user: {
            userId: userId,
            membership: { passType, visualId, validUntil },
            layer: "userMembershipPassService.createUserMembership",
          },
        },
        "End createUserMembership - Success"
      );
      return createMembershipRs;
    } catch (error) {
      loggerService.error(
        {
          user: {
            userId: userId,
            membership: { passType, visualId, validUntil },
            layer: "userMembershipPassService.createUserMembership",
          },
        },
        {},
        "End createUserMembership - Failed"
      );
      throw new Error(JSON.stringify(MembershipPassErrors.createMembershipPassError()));
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
      status,
      parking,
      iu,
      carPlate,
      membershipPhoto,
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
      loggerService.log(
        {
          user: {
            userId: userId,
            membershipId: membershipId,
            layer: "userMembershipPassService.insertMembershipDetails",
            data: {
              user_id: userId,
              user_membership_id: membershipId,
              category_type: categoryType,
              item_name: itemName,
              plu: plu,
              adult_qty: adultQty,
              child_qty: childQty,
              status: status,
              parking: parking,
              iu: iu,
              car_plate: carPlate,
              membership_photo: membershipPhoto,
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
            },
          },
        },
        "Start insertMembershipDetails"
      );
      await userMembershipDetailsModel.create({
        user_id: userId,
        user_membership_id: membershipId,
        category_type: categoryType,
        item_name: itemName,
        plu: plu,
        adult_qty: adultQty,
        child_qty: childQty,
        status: typeof status !== "undefined" && status !== null ? status : null,
        parking: parking,
        iu: iu,
        car_plate: carPlate,
        membership_photo: membershipPhoto,
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
      return loggerService.log(
        {
          user: {
            userId: userId,
            membershipId: membershipId,
            layer: "userMembershipPassService.insertMembershipDetails",
          },
        },
        "End insertMembershipDetails - Success"
      );
    } catch (error) {
      loggerService.error(
        {
          user: {
            userId: userId,
            membershipId: membershipId,
            layer: "userMembershipPassService.insertMembershipDetails",
            data: {
              user_id: userId,
              user_membership_id: membershipId,
              category_type: categoryType,
              item_name: itemName,
              plu: plu,
              adult_qty: adultQty,
              child_qty: childQty,
              status: typeof status !== "undefined" && status !== null ? status : null,
              parking: parking,
              iu: iu,
              car_plate: carPlate,
              membership_photo: membershipPhoto,
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
            },
          },
        },
        {},
        "End insertMembershipDetails - Failed"
      );
      throw new Error(JSON.stringify(MembershipPassErrors.createMembershipPassError()));
    }
  }

  async saveUserMembershipPassToDB(userId, req) {
    try {
      const userMembership = await this.createUserMembership(userId, {
        passType: req.passType.toLowerCase(),
        visualId: req.body.visualId,
        validUntil: req.body.validUntil || null,
      });

      userMembership &&
        userMembership.membership_id &&
        (await this.insertMembershipDetails(userId, userMembership.membership_id, {
          categoryType: req.body.categoryType,
          itemName: req.body.itemName || null,
          plu: req.body.plu || null,
          adultQty: req.body.adultQty || null,
          childQty: req.body.childQty || null,
          status: typeof req.body.status !== "undefined" && req.body.status !== null ? req.body.status : null,
          parking: req.body.parking === "yes" ? 1 : 0,
          iu: req.body.iu || null,
          carPlate: req.body.carPlate || null,
          membershipPhoto: null,
          firstName: !!req.body.member && !!req.body.member.firstName ? req.body.member.firstName : null,
          lastName: !!req.body.member && !!req.body.member.lastName ? req.body.member.lastName : null,
          email: !!req.body.member && !!req.body.member.email ? req.body.member.email : null,
          dob: !!req.body.member && !!req.body.member.dob ? req.body.member.dob : null,
          country: !!req.body.member && !!req.body.member.country ? req.body.member.country : null,
          identificationNo:
            !!req.body.member && !!req.body.member.identificationNo ? req.body.member.identificationNo : null,
          phoneNumber: !!req.body.member && !!req.body.member.phoneNumber ? req.body.member.phoneNumber : null,
          coMember: req.body.coMembers && req.body.coMembers.length > 0 ? JSON.stringify(req.body.coMembers) : null,
          validFrom: !!req.body.validFrom ? req.body.validFrom : null,
          validUntil: !!req.body.validUntil ? req.body.validUntil : null,
        }));

      return {
        membershipId: userMembership.membership_id,
      };
    } catch (error) {
      throw new Error(JSON.stringify(MembershipPassErrors.createMembershipPassError()));
    }
  }

  async updateUserMembershipPassToDB(req) {
    try {
      loggerService.log(
        {
          user: {
            data: req.body,
            layer: "userMembershipPassService.updateUserMembershipPassToDB",
          },
        },
        "Start updateUserMembershipPassToDB"
      );
      const membershipInfo = await userModel.findByEmailMandaiIdVisualId(
        req.body.visualId,
        req.body.email,
        req.body.mandaiId,
        req.body.passType
      );

      if (!membershipInfo || !membershipInfo.membershipId) {
        await Promise.reject(
          JSON.stringify(MembershipErrors.ciamMembershipUserNotFound(req.body.email, req.body.language))
        );
      }

      let expiryDate = req.body.validUntil || undefined;
      !!membershipInfo.membershipId &&
        (await userMembershipModel.updateByMembershipId(membershipInfo.membershipId, {
          name: req.body.passType.toLowerCase(),
          expires_at: expiryDate,
        }));

      if (!!membershipInfo.membershipId) {
        const updatedRecord = await userMembershipDetailsModel.updateByMembershipId(membershipInfo.membershipId, {
          category_type: req.body.categoryType || undefined,
          item_name: req.body.itemName || undefined,
          plu: req.body.plu || undefined,
          adult_qty: req.body.adultQty || undefined,
          child_qty: req.body.childQty || undefined,
          parking: !!req.body.parking ? (req.body.parking === "yes" ? 1 : 0) : undefined,
          iu: req.body.iu || undefined,
          car_plate: req.body.carPlate || undefined,
          membership_photo: undefined,
          member_first_name: !!req.body.member && !!req.body.member.firstName ? req.body.member.firstName : undefined,
          member_last_name: !!req.body.member && !!req.body.member.lastName ? req.body.member.lastName : undefined,
          member_email: req.body.newEmail || undefined,
          member_dob: !!req.body.member && !!req.body.member.dob ? req.body.member.dob : undefined,
          member_country: !!req.body.member && !!req.body.member.country ? req.body.member.country : undefined,
          member_identification_no:
            !!req.body.member && !!req.body.member.identificationNo ? req.body.member.identificationNo : undefined,
          member_phone_number:
            !!req.body.member && !!req.body.member.phoneNumber ? req.body.member.phoneNumber : undefined,
          co_member:
            req.body.coMembers && req.body.coMembers.length > 0 ? JSON.stringify(req.body.coMembers) : undefined,
          valid_from: req.body.validFrom || undefined,
          valid_until: expiryDate,
          status: typeof req.body.status !== "undefined" && req.body.status !== null ? req.body.status : undefined,
        });
        if (updatedRecord && updatedRecord.row_affected === 0) {
          await this.insertMembershipDetails(membershipInfo.userId, membershipInfo.membershipId, {
            categoryType: req.body.categoryType,
            itemName: req.body.itemName || null,
            plu: req.body.plu || null,
            adultQty: req.body.adultQty || null,
            childQty: req.body.childQty || null,
            parking: req.body.parking === "yes" ? 1 : 0,
            iu: req.body.iu || null,
            carPlate: req.body.carPlate || null,
            membershipPhoto: null,
            firstName: !!req.body.member && !!req.body.member.firstName ? req.body.member.firstName : null,
            lastName: !!req.body.member && !!req.body.member.lastName ? req.body.member.lastName : null,
            email: !!req.body.member && !!req.body.member.email ? req.body.member.email : null,
            dob: !!req.body.member && !!req.body.member.dob ? req.body.member.dob : null,
            country: !!req.body.member && !!req.body.member.country ? req.body.member.country : null,
            identificationNo:
              !!req.body.member && !!req.body.member.identificationNo ? req.body.member.identificationNo : null,
            phoneNumber: !!req.body.member && !!req.body.member.phoneNumber ? req.body.member.phoneNumber : null,
            coMember: req.body.coMembers && req.body.coMembers.length > 0 ? JSON.stringify(req.body.coMembers) : null,
            validFrom: !!req.body.validFrom ? req.body.validFrom : null,
            validUntil: !!req.body.validUntil ? req.body.validUntil : null,
            status: typeof req.body.status !== "undefined" && req.body.status !== null ? req.body.status : null,
          });
        }
      }
      loggerService.log(
        {
          user: {
            userMembership: membershipInfo,
            layer: "userMembershipPassService.updateUserMembershipPassToDB",
          },
        },
        "End updateUserMembershipPassToDB - Success"
      );
      return {
        membershipId: membershipInfo.membershipId,
      };
    } catch (error) {
      loggerService.error(
        {
          user: {
            data: req.body,
            layer: "userMembershipPassService.updateUserMembershipPassToDB",
            error: new Error(error),
          },
        },
        {},
        "End updateUserMembershipPassToDB - Failed"
      );
      const errorMessage = error.message ? JSON.parse(error.message) : "";
      if (errorMessage.status === "failed") {
        throw new Error(JSON.stringify(MembershipPassErrors.updateMembershipPassError(req.body.language)));
      }
      throw new Error(error);
    }
  }

  async sendSQSMessage(req, action) {
    delete req.body.membershipPhoto;
    const data = {
      action: action,
      body: omit(req.body, ["membershipPhoto"]),
    };
    const queueUrl = process.env.SQS_QUEUE_URL;

    loggerService.log(
      {
        SQS: {
          queueURL: queueUrl,
          messageBody: JSON.stringify(data),
          layer: "userMembershipPassService.sendSQSMessage",
          body: JSON.stringify(req.body),
        },
      },
      "Start sendSQSMessage"
    );

    try {
      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(data),
      });

      const result = await sqsClient.send(command);
      loggerService.log(
        {
          SQS: {
            queueURL: queueUrl,
            messageBody: JSON.stringify(data),
            layer: "userMembershipPassService.sendSQSMessage",
            data: result,
          },
        },
        "End sendSQSMessage - Success"
      );
      return result;
    } catch (error) {
      loggerService.error(
        {
          SQS: {
            queueURL: queueUrl,
            messageBody: JSON.stringify(data),
            layer: "userMembershipPassService.sendSQSMessage",
            error: new Error("userMembershipPassService.sendSQSMessage error", error),
          },
        },
        {},
        "End sendSQSMessage - Failed"
      );

      throw new Error(JSON.stringify(MembershipPassErrors.createMembershipPassError(req.body.language)));
    }
  }
}

module.exports = new UserMembershipPassService();
