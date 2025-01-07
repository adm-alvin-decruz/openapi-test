require("dotenv").config();
const userModel = require("../../db/models/userModel");
const CommonErrors = require("../../config/https/errors/common");
const ApiUtils = require("../../utils/apiUtils");
const appConfig = require("../../config/appConfig");

class UserGetMembershipPassesService {
  constructor() {
    this.apiEndpoint =
      process.env.GALAXY_URL + process.env.GALAXY_QUERY_TICKET_PATH;
  }

  getVisualId(body) {
    if (body && body.visualId) {
      return [body.visualId];
    }
    //TODO: enhance for option "all"
    return body.list;
  }

  dynamicPasskitUrl() {
    const env = process.env.APP_ENV;
    let url = "";
    switch (env) {
      case "prod": {
        url = `https://${process.env.PASSKIT_GENERATOR_URL}`;
        break;
      }
      case "uat": {
        url = `https://${env}-${
          process.env.PASSKIT_GENERATOR_URL
        }`;
        break;
      }
      default: {
        return (url = `https://${env}-${process.env.PASSKIT_GENERATOR_URL}`);
      }
    }
    return url;
  }

  async retrievePasskit(mandaiId, group) {
    return await ApiUtils.makeRequest(
      this.dynamicPasskitUrl(),
      "post",
      {
        "mwg-app-id":
          appConfig[`APP_ID_SUPPORT_${process.env.APP_ENV.toUpperCase()}`],
        //need storage x-api-key as secret key.
        "x-api-key": "X6tEwBlZ178wZ2nKtc2P71fm2g5D1iud9QhF9DLr",
      },
      {
        passType: group,
        mandaiId: mandaiId,
      }
    );
  }

  async execute(body) {
    const visualId = this.getVisualId(body);
    try {
      //query in user_membership join users table by visualId
      const userInfo = await userModel.findByVisualIds(visualId);

      //mapping userInfo for mandai group and mandai ID
      const mandaiInfo = userInfo.map((info) => ({
        group: info.name,
        mandaiId: info.mandai_id,
      }));

      console.log(
        "userInfo",
        userInfo,
        mandaiInfo,
        appConfig[
          `APP_ID_PASSKIT_GENERATOR_${process.env.APP_ENV.toUpperCase()}`
        ]
      );
      //handle calling Passkit Internal
      const response = await ApiUtils.makeRequest(
        this.dynamicPasskitUrl(),
        "post",
        {
          "mwg-app-id":
            appConfig[
              `APP_ID_PASSKIT_GENERATOR_${process.env.APP_ENV.toUpperCase()}`
            ],
          //TODO: need storage x-api-key as secret key.
          "x-api-key": "X6tEwBlZ178wZ2nKtc2P71fm2g5D1iud9QhF9DLr",
        },
        {
          passType: "wildpass",
          mandaiId: "MWPGA04411313977",
        }
      );
      const dataFromPasskit = ApiUtils.handleResponse(response);
      console.log("response", response, dataFromPasskit);
      //modify data response
      //handle error saved into db
      return {
        passes: [userInfo],
      };
    } catch (error) {
      console.log('error', error)
      throw new Error(JSON.stringify(CommonErrors.InternalServerError()));
    }
  }
}

module.exports = new UserGetMembershipPassesService();
