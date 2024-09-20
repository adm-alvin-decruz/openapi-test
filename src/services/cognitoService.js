const {
  CognitoIdentityProviderClient, AdminGetUserCommand, AdminCreateUserCommand, AdminUpdateUserAttributesCommand, AdminDeleteUserCommand,
  AdminConfirmSignUp, AdminInitiateAuthCommand, AdminResetUserPasswordCommand, ForgotPasswordCommand, AdminSetUserPasswordCommand, AdminDisableUserCommand
} = require("@aws-sdk/client-cognito-identity-provider");
const client = new CognitoIdentityProviderClient({ region: "ap-southeast-1" });

class Cognito {
  static async cognitoAdminUpdateUser(req, ciamComparedParams){
    req.apiTimer.log('cognitoAdminUpdateUser'); // log process time
    const result = [];
    // prepare update user array
    const updateUserArray = {
      UserPoolId: process.env.USER_POOL_ID,
      Username: req.body.email,
      UserAttributes: ciamComparedParams
    }
    result['cognitoUpdateArr'] = JSON.stringify(updateUserArray);
    var setUpdateParams = new AdminUpdateUserAttributesCommand(updateUserArray);

    try {
      result['cognitoUpdateResult'] = JSON.stringify(client.send(setUpdateParams));
    }catch(error){
      result['cognitoUpdateError'] = JSON.stringify(error);
    }
    req.apiTimer.end('cognitoAdminUpdateUser'); // log end time
    return result;
  }
}

module.exports = Cognito;