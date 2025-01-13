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

  // process emailType
  if(req.body.emailType){
    emailTriggerData['emailType'] = req.body.emailType;
  }

  // if switch 'signup_email_passkit' is true, send email
  if(req.body.resendWpWithPasskit){
    // map emailType
    let emailType = await mapEmailType(req.body.emailType);
    functionName = process.env.LAMBDA_CIAM_SIGNUP_TRIGGER_PASSKIT_MAIL_FUNCTION;
    emailTriggerData = {
      email: req.body.email,
      passType: req.body.group,
      emailType: emailType,
      caller: 'ciam'
    };
  }

  // if reset password
  if(req.body.emailAction === 'reset-password'){
    functionName = process.env.LAMBDA_EMAIL_TRIGGER_SERVICE_FUNCTION;
    emailTriggerData = {
      email: req.body.email,
      firstName: req.body.firstName,
      group: req.body.group,
      ID: req.body.ID,
      resetPasswordLink: `${process.env.MWG_CIAM_RESET_PASSWORD_URL}?token=${req.body.resetToken}`,
      caller: 'ciam'
    };
  }

  // lambda invoke
  let emailLambda = await lambdaService.lambdaInvokeFunction(emailTriggerData, functionName);

  req.apiTimer.end('lambdaSendEmail'); // log end time
  return emailLambda;
}

async function mapEmailType(emailType){
  switch (emailType) {
    case 'resend_wp':
      emailType = 'resend';
      break;
    case 'update_wp':
      emailType = 'resend';
      break;
    default:
      emailType = 'signup';
      break;
  }
  return emailType;
}

module.exports={
  lambdaSendEmail
}