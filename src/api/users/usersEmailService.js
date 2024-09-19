const lambdaService = require('../../services/lambdaService');
require('dotenv').config();

async function lambdaSendEmail(reqBody){
  // send wildpass email or resend wildpass
  let functionName = process.env.LAMBDA_CIAM_SIGNUP_TRIGGER_MAIL_FUNCTION;
  const emailTriggerData = {
    email: reqBody.email,
    firstName: reqBody.firstName,
    group: reqBody.group,
    ID: reqBody.mandaiID
  };

  // email type to differentiate mail template
  if(reqBody.emailType){
    emailTriggerData['emailType'] = reqBody.emailType;
  }

  // lambda invoke
  return await lambdaService.lambdaInvokeFunction(emailTriggerData, functionName);
}

module.exports={
  lambdaSendEmail
}