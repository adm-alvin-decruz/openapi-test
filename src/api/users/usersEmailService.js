const lambdaService = require('../../services/lambdaService');
require('dotenv').config();

async function lambdaSendEmail(req){
  req.apiTimer.log('lambdaSendEmail'); // log process time
  // send wildpass email or resend wildpass
  let functionName = process.env.LAMBDA_CIAM_SIGNUP_TRIGGER_MAIL_FUNCTION;
  const emailTriggerData = {
    email: req.body.email,
    firstName: req.body.firstName,
    group: req.body.group,
    ID: req.body.mandaiID
  };

  if(req.body.emailType){
    emailTriggerData['emailType'] = req.body.emailType;
  }

  // lambda invoke
  let emailLambda = await lambdaService.lambdaInvokeFunction(emailTriggerData, functionName);

  req.apiTimer.end('lambdaSendEmail'); // log end time
  return emailLambda;
}

module.exports={
  lambdaSendEmail
}