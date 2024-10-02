const {
  CognitoIdentityProviderClient, AdminGetUserCommand, AdminCreateUserCommand, AdminUpdateUserAttributesCommand, AdminDeleteUserCommand,
  AdminConfirmSignUp, AdminInitiateAuthCommand, AdminResetUserPasswordCommand, ForgotPasswordCommand, AdminSetUserPasswordCommand, AdminDisableUserCommand
} = require("@aws-sdk/client-cognito-identity-provider");
const client = new CognitoIdentityProviderClient({ region: "ap-southeast-1" });

async function getUserCognitoInfo(req){
  let getMemberJson = {
    UserPoolId: process.env.USER_POOL_ID,
    Username: req.body.email
  };

  const getUserCommand = new AdminGetUserCommand(getMemberJson);

  try {
    // get from cognito
    return await client.send(getUserCommand);
  } catch (error) {
    let result = '';
    if(error.name === 'UserNotFoundException'){
      result = {"status": "not found", "data": error};
    }else{
      result = {"status": "failed", "data": error};
    }
    return result;
  }
}

module.exports = {
  getUserCognitoInfo
};