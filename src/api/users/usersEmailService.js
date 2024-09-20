const lambdaService = require('../../services/lambdaService');
require('dotenv').config();
const processTimer = require('../../utils/processTimer');

async function lambdaSendEmail(reqBody){
  const endTimer = processTimer('lambdaSendEmail'); // log process time
  // send wildpass email or resend wildpass
  let functionName = process.env.LAMBDA_CIAM_SIGNUP_TRIGGER_MAIL_FUNCTION;
  const emailTriggerData = {
    email: reqBody.email,
    firstName: reqBody.firstName,
    group: reqBody.group,
    ID: reqBody.mandaiID
  };

  if(reqBody.emailType){
    emailTriggerData['emailType'] = reqBody.emailType;
  }

  // lambda invoke
  let emailLambda = await lambdaService.lambdaInvokeFunction(emailTriggerData, functionName);
  endTimer()
  return emailLambda;
}

module.exports={
  lambdaSendEmail
}