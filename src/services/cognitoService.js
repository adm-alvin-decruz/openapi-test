const {
  CognitoIdentityProviderClient, AdminGetUserCommand, AdminCreateUserCommand, AdminUpdateUserAttributesCommand, AdminDeleteUserCommand,
  AdminConfirmSignUp, AdminInitiateAuthCommand, AdminResetUserPasswordCommand, ForgotPasswordCommand, AdminSetUserPasswordCommand, AdminDisableUserCommand
} = require("@aws-sdk/client-cognito-identity-provider");
const client = new CognitoIdentityProviderClient({ region: "ap-southeast-1" });

class Cognito {
  static async cognitoAdminUpdateUser(req, ciamComparedParams){
    req['apiTimer'] = req.processTimer.apiRequestTimer();
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

  static async cognitoAdminGetUser(req){
    const getMemberJson = {
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
}

module.exports = Cognito;
