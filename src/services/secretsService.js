const axios = require("axios");
const loggerService = require("../logs/logger");
require("dotenv").config();

const baseUrl = `http://localhost:${process.env.PARAMETERS_SECRETS_EXTENSION_HTTP_PORT || 2773}`;
const awsSessionToken = process.env.AWS_SESSION_TOKEN;
let ciamSecrets, dbSecrets;

const getSecret = async (secretName) => {
  try {
    const { data } = await axios.get(`${baseUrl}/secretsmanager/get`, {
      params: { secretId: secretName },
      headers: {
        "X-Aws-Parameters-Secrets-Token": awsSessionToken,
      },
    });

    return data.SecretString;
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
  }
};

const initSecrets = async () => {
  ciamSecrets = await getSecret("ciam-microservice-lambda-config");
  dbSecrets = await getSecret(`ciam-${process.env.APP_ENV}-db-user1`);
};

const getCiamSecrets = () => {
  if (!ciamSecrets) throw new Error("ciamSecrets not initialized");
  return ciamSecrets;
};

const getDbSecrets = () => {
  if (!dbSecrets) throw new Error("dbSecrets not initialized");
  return dbSecrets;
};

module.exports = {
  initSecrets,
  getCiamSecrets,
  getDbSecrets,
};

// class Secrets {
//   constructor() {
//     this.baseUrl = `http://localhost:${process.env.PARAMETERS_SECRETS_EXTENSION_HTTP_PORT || 2773}`;
//     this.awsSessionToken = process.env.AWS_SESSION_TOKEN;
//     this.ciamSecrets = undefined;
//     this.dbSecrets = undefined;
//   }

//   async getSecrets(secretName) {
//     console.log("Getting secrets: ", secretName);
//     loggerService.log(
//       {
//         secretsService: {
//           action: "getSecrets",
//           layer: "services.secretsService",
//         },
//       },
//       "[CIAM] Start getSecrets Service"
//     );

//     if (!secretName) {
//       loggerService.error(
//         {
//           secretsService: {
//             action: "getSecrets",
//             layer: "services.secretsService",
//             error: "Secret name not defined",
//           },
//         },
//         {},
//         "[CIAM] End getSecrets Service - Failed"
//       );
//       throw new Error(
//         JSON.stringify({
//           status: "failed",
//         })
//       );
//     }

//     try {
//       const { data } = await axios.get(`${this.baseUrl}/secretsmanager/get`, {
//         params: { secretId: secretName },
//         headers: {
//           "X-Aws-Parameters-Secrets-Token": this.awsSessionToken,
//         },
//       });

//       console.log("Retrieved secrets");
//       return JSON.parse(data.SecretString);
//     } catch (error) {
//       loggerService.error(
//         {
//           secretsService: {
//             action: "getSecrets",
//             layer: "services.secretsService",
//             error: `${error.message}`,
//           },
//         },
//         {},
//         "[CIAM] End getSecrets Service - Failed"
//       );
//       throw new Error(
//         JSON.stringify({
//           status: "failed",
//           data: error,
//         })
//       );
//     }
//   }

//   async loadAllSecrets() {
//     this.ciamSecrets = await this.getSecrets("ciam-microservice-lambda-config");
//     this.dbSecrets = await this.getSecrets(`ciam-${process.env.APP_ENV}-db-user1`);
//   }
// }

// const secrets = new Secrets();

// async function initSecrets() {
//   await secrets.loadAllSecrets();
//   return secrets;
// }
