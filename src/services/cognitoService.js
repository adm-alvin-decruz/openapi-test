const {
  CognitoIdentityProviderClient, AdminGetUserCommand, AdminCreateUserCommand, AdminUpdateUserAttributesCommand, AdminDeleteUserCommand,
  AdminConfirmSignUp, AdminInitiateAuthCommand, AdminResetUserPasswordCommand, ForgotPasswordCommand, AdminSetUserPasswordCommand, AdminDisableUserCommand
} = require("@aws-sdk/client-cognito-identity-provider");
const passwordService = require("../api/users/userPasswordService");
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

  static async cognitoAdminGetUserByEmail(email) {
    const getUserCommand = new AdminGetUserCommand({
      UserPoolId: process.env.USER_POOL_ID,
      Username: email
    });

    try {
      // get from cognito
      return await client.send(getUserCommand);
    } catch (error) {
      let result = '';
      if(error.name === 'UserNotFoundException'){
        result = {status: 'not found', data: JSON.stringify(error)};
      }else{
        result = {status: 'failed', data: JSON.stringify(error)};
      }
      return result;
    }
  }

  static async cognitoAdminCreateUser({
      email,
      firstName,
      lastName,
      birthdate,
      address,
      groups,
      mandaiId,
      newsletter,
      source
  }) {
    const newUserArray = {
      UserPoolId: process.env.USER_POOL_ID,
      Username: email,
      TemporaryPassword: passwordService.generatePassword(8),
      DesiredDeliveryMediums: ["EMAIL"],
      MessageAction: "SUPPRESS", // disable send verification email temp password
      UserAttributes: [
        {"Name": "email_verified", "Value": "true"},
        {"Name": "given_name"    , "Value": email},
        {"Name": "family_name"   , "Value": lastName},
        {"Name": "preferred_username", "Value": email},
        {"Name": "name"          , "Value": `${firstName} ${lastName}`},
        {"Name": "email"         , "Value": email},
        {"Name": "birthdate"     , "Value": birthdate},
        {"Name": "address"       , "Value": address ? address : ''},
        // custom fields
        {"Name": "custom:membership", "Value": JSON.stringify(groups)},
        {"Name": "custom:mandai_id", "Value": mandaiId},
        {"Name": "custom:newsletter", "Value": JSON.stringify(newsletter)},
        {"Name": "custom:terms_conditions", "Value": "null"},
        {"Name": "custom:visual_id", "Value": "null"},
        {"Name": "custom:vehicle_iu", "Value": "null"},
        {"Name": "custom:vehicle_plate", "Value": "null"},
        {"Name": "custom:last_login", "Value": "null"},
        {"Name": "custom:source", "Value": source},
      ],
    };

    const newUserParams = new AdminCreateUserCommand(newUserArray);

    try {
      return await client.send(newUserParams);
    } catch (error) {
      return {status: 'failed', data: JSON.stringify(error)};
    }
  }

  static async cognitoAdminSetUserPassword(email, password) {
    const setPasswordParams = new AdminSetUserPasswordCommand({
      UserPoolId: process.env.USER_POOL_ID,
      Username: email,
      Password: password,
      Permanent: true
    });
    try {
      await client.send(setPasswordParams);
    } catch (error) {
      return {status: 'failed', data: JSON.stringify(error)};
    }
  }
}

module.exports = Cognito;
