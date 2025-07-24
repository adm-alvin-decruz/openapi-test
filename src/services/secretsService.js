const axios = require("axios");
const loggerService = require("../logs/logger");
require("dotenv").config();

class Secrets {
  constructor() {
    this.baseUrl = `http://localhost:${process.env.PARAMETERS_SECRETS_EXTENSION_HTTP_PORT || 2773}`;
    this.awsSessionToken = process.env.AWS_SESSION_TOKEN;
  }

  async getSecrets(secretName) {
    console.log("Getting secrets: ", secretName);
    loggerService.log(
      {
        secretsService: {
          action: "getSecrets",
          layer: "services.secretsService",
        },
      },
      "[CIAM] Start getSecrets Service"
    );

    if (!secretName) {
      loggerService.error(
        {
          secretsService: {
            action: "getSecrets",
            layer: "services.secretsService",
            error: "Secret name not defined",
          },
        },
        {},
        "[CIAM] End getSecrets Service - Failed"
      );
      throw new Error(
        JSON.stringify({
          status: "failed",
        })
      );
    }

    try {
      console.log(this.baseUrl);
      console.log(this.awsSessionToken);
      const { data } = await axios.get(`${this.baseUrl}/secretsmanager/get`, {
        params: { secretId: secretName },
        headers: {
          "X-Aws-Parameters-Secrets-Token": this.awsSessionToken,
        },
      });

      console.log(data);
      console.log("Retrieved secrets");
      return JSON.parse(data.SecretString);
    } catch (error) {
      loggerService.error(
        {
          secretsService: {
            action: "getSecrets",
            layer: "services.secretsService",
            error: `${error.message}`,
          },
        },
        {},
        "[CIAM] End getSecrets Service - Failed"
      );
      throw new Error(
        JSON.stringify({
          status: "failed",
          data: error,
        })
      );
    }
  }
}

const secrets = new Secrets();
module.exports = { secrets };
