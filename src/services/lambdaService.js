// lambda
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const lambdaClient = new LambdaClient({ region: "ap-southeast-1" });

const loggerService = require('../logs/logger');
const responseHelper = require('../helpers/responseHelpers');
const commonService = require('../services/commonService');

async function lambdaInvokeFunction(event, functionName, req){
  // build input
  const input = { // InvocationRequest
    FunctionName: functionName, // required
    InvocationType: "RequestResponse",
    LogType: "Tail",
    // ClientContext: "STRING_VALUE",
    Payload: JSON.stringify(event, null, 2)
    // Qualifier: "STRING_VALUE",
  };

  // invoke lambda using input
  const command = new InvokeCommand(input);
  try {
    // send to lambda
    const response = await lambdaClient.send(command);

    // decode response base64
    // let decodedString = commonService.decodeBase64(response.LogResult);
    let decodedString = JSON.parse(Buffer.from(response.Payload));
    decodedString["body"] = JSON.parse(decodedString.body);

    return decodedString;

  } catch (error) {
    return error;
  }
}

module.exports = {
  lambdaInvokeFunction
}