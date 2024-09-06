const {
  CognitoIdentityProviderClient, AdminGetUserCommand, AdminCreateUserCommand, AdminUpdateUserAttributesCommand, AdminDeleteUserCommand,
  AdminConfirmSignUp, AdminInitiateAuthCommand, AdminResetUserPasswordCommand, ForgotPasswordCommand, AdminSetUserPasswordCommand, AdminDisableUserCommand
} = require("@aws-sdk/client-cognito-identity-provider");
const client = new CognitoIdentityProviderClient({ region: "ap-southeast-1" });

class Cognito {
  static async cognitoAdminUpdateUser(req, ciamComparedParams){
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
    return result;
  }
}

module.exports = Cognito;