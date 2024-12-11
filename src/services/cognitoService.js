const {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
  AdminInitiateAuthCommand,
  AdminUserGlobalSignOutCommand,
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

  static async cognitoUserLogin(req, hashSecret) {
    req["apiTimer"] = req.processTimer.apiRequestTimer();
    req.apiTimer.log("cognitoAdminUpdateUser"); // log process time
    const result = [];
    try {
      const userLoginParams = new AdminInitiateAuthCommand({
        AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
        UserPoolId: process.env.USER_POOL_ID,
        ClientId: process.env.USER_POOL_CLIENT_ID,
        AuthParameters: {
          SECRET_HASH: hashSecret,
          USERNAME: req.body.email,
          PASSWORD: req.body.password,
        },
      });
      const loginSession = await client.send(userLoginParams);
      result["cognitoLoginResult"] = {
        accessToken: loginSession.AuthenticationResult.AccessToken,
        refreshToken: loginSession.AuthenticationResult.RefreshToken,
        idToken: loginSession.AuthenticationResult.IdToken,
      };
    } catch (error) {
      result["cognitoLoginError"] = JSON.stringify(error);
    }
    req.apiTimer.end("cognitoAdminUpdateUser"); // log end time
    return result;
  }

  static async cognitoUserLogout(username) {
    try {
      const userLogout = new AdminUserGlobalSignOutCommand({
        UserPoolId: process.env.USER_POOL_ID,
        Username: username,
      });
      await client.send(userLogout);
      return {
        message: "success",
      };
    } catch (error) {
      return {
        message: JSON.stringify(error),
      };
    }
  }
}

module.exports = Cognito;
