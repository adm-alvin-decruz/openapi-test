

async function generateWildpass(req){
  // clean the request data for possible white space
  var reqBody = commonService.cleanData(req.body);

  // TODO: integrate with send email lambda
  let functionName = process.env.LAMBDA_CIAM_SIGNUP_CREATE_WILDPASS_FUNCTION;

  // find user attribute value for mandaiID
  passName = reqBody.lastName + reqBody.firstName;
  dob = reqBody.dob;

  // event data
  const event = {
    email: reqBody.email,
    name: passName,
    group: reqBody.group,
    mandaiID: reqBody.mandaiID
  };

  return lambdaService.lambdaInvokeFunction(event, functionName, req);
}

module.exports = {
  generateWildpass
}