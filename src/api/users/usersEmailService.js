const lambdaService = require('../../services/lambdaService');
require('dotenv').config();
const processTimer = require('../../utils/processTimer');
const switchService = require('../../services/switchService');

async function lambdaSendEmail(req){
  req['apiTimer'] = req.processTimer.apiRequestTimer();
  req.apiTimer.log('lambdaSendEmail starts'); // log process time
  // send wildpass email or resend wildpass
  let functionName = process.env.LAMBDA_CIAM_SIGNUP_TRIGGER_MAIL_FUNCTION;

  let emailTriggerData = {
    email: req.body.email,
    firstName: req.body.firstName,
    group: req.body.group,
    ID: req.body.mandaiID
  };

  // if signup email passkit is true, send email
  if(req.body.resendWpWithPasskit){
    functionName = process.env.LAMBDA_CIAM_SIGNUP_TRIGGER_PASSKIT_MAIL_FUNCTION;
    emailTriggerData = {
      email: req.body.email,
      passType: req.body.group,
    };
  }

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