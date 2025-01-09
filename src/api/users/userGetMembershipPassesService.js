require("dotenv").config();
const userModel = require("../../db/models/userModel");
const failedJobsModel = require("../../db/models/failedJobsModel");
const ApiUtils = require("../../utils/apiUtils");
const appConfig = require("../../config/appConfig");
const MembershipErrors = require("../../config/https/errors/membershipErrors");
const passkitCommonService = require("../components/passkit/services/passkitCommonService");

class UserGetMembershipPassesService {
  constructor() {
    this.apiEndpoint = process.env.PASSKIT_URL + process.env.PASSKIT_GET_PATH;
  }

  getVisualIds(body) {
    if (body && body.visualId) {
      return [body.visualId];
    }
    //unique list visualId
    return body.list.filter((item, index) => body.list.indexOf(item) === index);
  }

  /**
   * handle retrieve passkit
   * @param mandaiId
   * @param group
   * @param visualId
   * @return {Promise<{urls: {apple: (*|string), google: (*|string)}, visualId}|{urls: {apple: string, google: string}, visualId}|undefined>}
   */
  async retrievePasskit(mandaiId, group, visualId) {
    try {
      const headers = await passkitCommonService.setPasskitReqHeader();
      console.log('api endpoint', this.apiEndpoint);
      console.log('headers', headers)
      const response = await ApiUtils.makeRequest(this.apiEndpoint, 'post', headers, {
        passType: group,
        mandaiId: mandaiId,
      });
      console.log('response', response)
      const rsHandler = ApiUtils.handleResponse(response);
      return {
        visualId,
        urls: {
          apple: rsHandler.applePassUrl ? rsHandler.applePassUrl : "",
          google: rsHandler.googlePassUrl ? rsHandler.googlePassUrl : "",
        },
      };
    } catch (error) {
      //handle 404: case not yet add apple and google passkit
      if (error.message.includes('"status":404')) {
        return {
          visualId,
          urls: {
            apple: "",
            google: "",
          },
        };
      }
      //handle other status: 403 Forbidden, 400 Bad Request, 500 Internal Server Error will not attach passes by visualId
      return undefined;
    }
  }

  async handleIntegration(userInfo) {
    console.log('user info', userInfo)
    const response = await Promise.all(
      userInfo.map((info) =>
        this.retrievePasskit(info.mandaiId, info.membership, info.visualId)
      )
    );
    return {
      passes: response.filter((rs) => !!rs),
    };
  }

  async handleRetrieveFullVisualIds(body) {
    const userInfo = await userModel.findFullMandaiId(body.email);
    return await this.handleIntegration(userInfo);
  }

  async handleRetrieveBasedOnVisualIds(visualIds, body) {
    const userInfo = await userModel.findByEmailVisualIds(
      visualIds,
      body.email
    );
    return await this.handleIntegration(userInfo);
  }

  async execute(body) {
    const visualIds = this.getVisualIds(body);
    try {
      if (visualIds.includes("all")) {
        return await this.handleRetrieveFullVisualIds(body);
      }
      return await this.handleRetrieveBasedOnVisualIds(visualIds, body);
    } catch (error) {
      await failedJobsModel.create({
        uuid: crypto.randomUUID(),
        name: "failedGetMembershipPasses",
        action: "failed",
        data: {
          visualIds,
          passkitIntegrationUrl: this.passkitGeneratorUrl(),
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
}

module.exports = new UserGetMembershipPassesService();
