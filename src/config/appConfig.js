/**
 * AEM: aem
 * GlobalTix: glt
 * Passkit Internal: passkit
 */
const appConfig = {
  // App ID DEV
  APP_ID_DEV:'["aemDev.com.mandaiapi.ciam","gltDev.com.mandaiapi.ciam","tktDev.com.mandaiapi.ciam","passkit.Dev.internal.mandaiapi.ciam","rePassMicroSite.Dev.internal.mandaiapi.ciam"]',
  // App ID UAT
  APP_ID_UAT:'["aemUat.com.mandaiapi.ciam","gltUat.com.mandaiapi.ciam","tktUat.com.mandaiapi.ciam","passkit.Uat.internal.mandaiapi.ciam","rePassMicroSite.Uat.internal.mandaiapi.ciam"]',
  // App ID Prod
  APP_ID_PROD:'["aemProd.com.mandaiapi.ciam","gltProd.com.mandaiapi.ciam","tktProd.com.mandaiapi.ciam","passkit.Prod.internal.mandaiapi.ciam","rePassMicroSite.Prod.internal.mandaiapi.ciam"]',

  // App ID Support DEV
  APP_ID_SUPPORT_DEV:'["support.Dev.internal.mandaiapi.ciam"]',
  // App ID Support UAT
  APP_ID_SUPPORT_UAT:'["support.Uat.internal.mandaiapi.ciam"]',
  // App ID Support Prod
  APP_ID_SUPPORT_PROD:'["support.Prod.internal.mandaiapi.ciam"]',

  // user signup generate passkit for send in the email
  SIGNUP_CHECK_AEM:false,

  LOG_APP_PREFIX:'[CIAM-MAIN]',

  // password reset / forgot password
  RESET_PASSWORD_EMAIL_FROM: 'no-reply@mandai.com',
  RESET_PASSWORD_EMAIL_TEMPLATE_ID: 'd-05b9da80b0804b749ce68d39724f11d9',
  RESET_PASSWORD_EMAIL_TEXT: 'Please click on the following link to reset your password.',
  RESET_PASSWORD_EMAIL_HTML: '<p>Please click on the following link to reset your password.</p>',

  // email service app ID:
  EMAIL_SERVICE_APP_ID_DEV:"emailTrigger.dev.internal.mandaiapi.ciam",
  EMAIL_SERVICE_APP_ID_UAT:"emailTrigger.uat.internal.mandaiapi.ciam",
  EMAIL_SERVICE_APP_ID_PROD:"emailTrigger.prod.internal.mandaiapi.ciam"
};

module.exports = appConfig;