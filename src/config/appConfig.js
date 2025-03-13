/**
 * AEM: aem
 * GlobalTix: glt
 * Passkit Internal: passkit
 */
const appConfig = {
  // App ID DEV
  APP_ID_DEV:'["aemDev.com.mandaiapi.ciam","gltDev.com.mandaiapi.ciam","tktDev.com.mandaiapi.ciam","passkit.Dev.internal.mandaiapi.ciam","rePassMicroSite.Dev.internal.mandaiapi.ciam","nopComm.Dev.service.mandaiapi.ciam", "loginMicroSite.Dev.internal.mandaiapi.ciam"]',
  // App ID UAT
  APP_ID_UAT:'["aemUat.com.mandaiapi.ciam","gltUat.com.mandaiapi.ciam","tktUat.com.mandaiapi.ciam","passkit.Uat.internal.mandaiapi.ciam","rePassMicroSite.Uat.internal.mandaiapi.ciam","nopComm.Uat.service.mandaiapi.ciam", "loginMicroSite.Uat.internal.mandaiapi.ciam"]',
  // App ID Prod
  APP_ID_PROD:'["aemProd.com.mandaiapi.ciam","gltProd.com.mandaiapi.ciam","tktProd.com.mandaiapi.ciam","passkit.Prod.internal.mandaiapi.ciam","rePassMicroSite.Prod.internal.mandaiapi.ciam","nopComm.Prod.service.mandaiapi.ciam", "loginMicroSite.Prod.internal.mandaiapi.ciam"]',

  // App ID Support DEV
  APP_ID_SUPPORT_DEV: '["support.Dev.internal.mandaiapi.ciam"]',
  // App ID Support UAT
  APP_ID_SUPPORT_UAT: '["support.Uat.internal.mandaiapi.ciam"]',
  // App ID Support Prod
  APP_ID_SUPPORT_PROD: '["support.Prod.internal.mandaiapi.ciam"]',


  // Passkit app ID, CIAM call -> passkit generator
  PASSKIT_APP_ID_DEV:"passkitGenerator.dev.internal.mandaiapi.ciam",
  PASSKIT_APP_ID_UAT:"passkitGenerator.uat.internal.mandaiapi.ciam",
  PASSKIT_APP_ID_PROD:"passkitGenerator.prod.internal.mandaiapi.ciam",

  // Passkit URL
  PASSKIT_URL_DEV:'https://dev-services.mandaiapi.com',
  PASSKIT_URL_UAT:'https://uat-services.mandaiapi.com',
  PASSKIT_URL_PROD:'https://prod-services.mandaiapi.com',
  PASSKIT_GET_SIGNED_URL_PATH:'/v1/passkit/all/get',

  // user signup generate passkit for send in the email
  SIGNUP_CHECK_AEM: false,

  LOG_APP_PREFIX: "[CIAM-MAIN]",

  //passes support by membership-passes - passes be adjust based on BU request
  //currently support FO(s) series
  MEMBERSHIP_PASSES: ['fow', 'fow+', 'fom', 'fora'],

  // password reset / forgot password
  RESET_PASSWORD_EMAIL_FROM: "no-reply@mandai.com",
  RESET_PASSWORD_EMAIL_TEMPLATE_ID: "d-05b9da80b0804b749ce68d39724f11d9",
  RESET_PASSWORD_EMAIL_TEXT:
    "Please click on the following link to reset your password.",
  RESET_PASSWORD_EMAIL_HTML:
    "<p>Please click on the following link to reset your password.</p>",
  // reset password URLs & path
  RESET_PASSWORD_EMAIL_LINK_DEV: 'https://dev-identity.mandai.com/ciam/reset-password',
  RESET_PASSWORD_EMAIL_LINK_UAT: 'https://uat-identity.mandai.com/ciam/reset-password',
  RESET_PASSWORD_EMAIL_LINK_PROD: 'https://identity.mandai.com/ciam/reset-password',
  EMAIL_SERVICE_API_URL_DEV: 'https://dev-services.mandaiapi.com',
  EMAIL_SERVICE_API_URL_UAT: 'https://uat-services.mandaiapi.com',
  EMAIL_SERVICE_API_URL_PROD: 'https://services.mandaiapi.com',
  EMAIL_SERVICE_API_EMAIL_PATH: '/v1/ciam/email',

  // email service app ID, CIAM call -> email service
  EMAIL_SERVICE_APP_ID_DEV: "emailTrigger.dev.internal.mandaiapi.ciam",
  EMAIL_SERVICE_APP_ID_UAT: "emailTrigger.uat.internal.mandaiapi.ciam",
  EMAIL_SERVICE_APP_ID_PROD: "emailTrigger.prod.internal.mandaiapi.ciam",

  //AEM Callback URL
  AEM_CALLBACK_URL_DEV: 'https://dev-members.mandai.com',
  AEM_CALLBACK_URL_UAT: 'https://uat-members.mandai.com',
  AEM_CALLBACK_URL_PROD: 'https://members.mandai.com',
  AEM_CALLBACK_PATH: '/bin/wrs/ciam/auth/callback',

  //NopCommerce URL
  NOP_COMMERCE_URL_DEV: 'https://www.mandaiapi.com/uat-store',
  NOP_COMMERCE_URL_UAT: 'https://www.mandaiapi.com/uat-store',
  NOP_COMMERCE_URL_PROD: 'https://www.mandaiapi.com/store',
  NOP_COMMERCE_ACCESS_TOKEN_PATH: '/GenerateMembershipToken',
  NOP_COMMERCE_GET_MEMBERSHIP_PATH: '/MembershipGetPictureFile',

  // NopCommerce APP ID Service Hub
  PRIVATE_APP_ID_DEV:"nopComm.Dev.servicehub.mandaipvtapi.ciam",
  PRIVATE_APP_ID_UAT:"nopComm.Uat.servicehub.mandaipvtapi.ciam",
  PRIVATE_APP_ID_PROD:"nopComm.Prod.servicehub.mandaipvtapi.ciam",
};

module.exports = appConfig;
