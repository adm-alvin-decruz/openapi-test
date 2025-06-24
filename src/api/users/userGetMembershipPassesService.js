require("dotenv").config();
const userModel = require("../../db/models/userModel");
const failedJobsModel = require("../../db/models/failedJobsModel");
const MembershipErrors = require("../../config/https/errors/membershipErrors");
const passkitRetrieveService = require("../components/passkit/services/passkitRetrieveService");
const appConfig = require("../../config/appConfig");
const loggerService = require("../../logs/logger");

class UserGetMembershipPassesService {
  constructor() {
    this.apiEndpoint = `${
      appConfig[`PASSKIT_URL_${process.env.APP_ENV.toUpperCase()}`]
    }${appConfig.PASSKIT_GET_SIGNED_URL_PATH}`;
  }

  async execute(body) {
    const visualIds = this.getVisualIds(body);
    try {
      if (visualIds.includes("all")) {
        return await this.retrieveAllPassesURL(body);
      }
      return await this.retrieveSinglePassURL(visualIds, body);
    } catch (error) {
      loggerService.log(
        {
          user: {
            body: body,
            action: `handleIntegration with Passkit`,
            layer: "userGetMembershipPassesService.execute",
            error: `${error}`,
          },
        },
        "End getMembershipPasses Service - Failed"
      );
      await failedJobsModel.create({
        uuid: crypto.randomUUID(),
        name: "failedGetMembershipPasses",
        action: "failed",
        data: {
          visualIds,
          passkitIntegration: this.apiEndpoint,
        },
        source: 2,
        triggered_at: null,
        status: 0,
      });
      throw new Error(
        JSON.stringify(
          MembershipErrors.ciamMembershipGetPassesInvalid(body.language)
        )
      );
    }
  }

  /**
    Notes:Not support get multiple passes
    The validation required visualId
    List property will not manipulate now
    ** getVisualIds will always point to body.visualId
  */
  getVisualIds(body) {
    if (body && body.visualId) {
      return [body.visualId];
    }
    //unique list visualId
    return body.list.filter((item, index) => body.list.indexOf(item) === index);
  }

  async retrieveAllPassesURL(body) {
    const userInfo = await userModel.findFullMandaiId(body.email);
    return await this.handleIntegration(userInfo);
  }

  async retrieveSinglePassURL(visualId, body) {
    const userInfo = await userModel.findActiveVisualId(visualId, body.email, body.mandaiId);

    let passUrl = { passes: [] };
    if (userInfo.length > 0) {
      passUrl = await this.handleIntegration(userInfo);
    }

    loggerService.log(
      {
        user: {
          body: body,
          action: `retrieveSinglePassURL`,
          layer: "userGetMembershipPassesService.retrieveSinglePassURL",
          passUrl: JSON.stringify(passUrl),
        },
      },
      "End getMembershipPasses Service - Success"
    );

    return passUrl;
  }

  async handleIntegration(userInfo) {
    loggerService.log(
      {
        user: {
          userInfo: JSON.stringify(userInfo),
          action: `handleIntegration with Passkit`,
          layer: "userGetMembershipPassesService.handleIntegration",
        },
      },
      "Start getMembershipPasses Service"
    );

    const response = await Promise.all(
      userInfo.map((info) => passkitRetrieveService.retrievePasskit(info))
    );
    return {
      passes: response.filter((rs) => !!rs),
    };
  }
}

module.exports = new UserGetMembershipPassesService();
