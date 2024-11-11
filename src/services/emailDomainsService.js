const { EmailDomainModel } = require("../db/models/emailDomainsModel");
const loggerService = require("../logs/logger");
const ApiUtils = require('../utils/apiUtils');
const switchService = require('./switchService');
// use dotenv
require('dotenv').config();


class EmailDomainService {
  constructor(model) {
    this.model = EmailDomainModel;
    this.domain;
    this.email;
    this.statusMap = {
      0: { isValid: false, status: 'new', message: `Domain pending verification ${this.email}` },
      1: { isValid: true, status: 'whitelist', message: `Domain is whitelisted` },
      2: { isValid: true, status: 'greylist', message: `Domain is greylisted` },
      3: { isValid: false, status: 'blacklist', message: `Domain is blacklisted ${this.email}` }
    };
  }

  async createDomain(domain, valid = 0) {
    domain = domain.toLowerCase().trim();
    if (!this.isValidDomainFormat(domain)) {
      loggerService.error(`Invalid domain format ${domain}`);
    }
    return await this.model.create(domain, valid);
  }

  async updateDomainStatus(id, valid) {
    if (![0, 1, 2, 3].includes(valid)) {
      throw new Error('Invalid status value');
    }
    return await this.model.update(id, { valid });
  }

  async upsertDomain(domain, valid = 0) {
    domain = domain.toLowerCase().trim();
    if (!this.isValidDomainFormat(domain)) {
      loggerService.error(`Invalid domain format ${domain}`);
    }
    return await this.model.upsert(domain, valid);
  }

  async getDomainStatus(domain) {
    domain = domain.toLowerCase().trim();
    const result = await this.model.findByDomain(domain);
    return result.length ? result[0] : null;
  }

  async emailFormatTest(email) {
    email = email.toLowerCase().trim();
    this.email = email;
    return this.isValidEmailFormat(email);
  }

  isValidEmailFormat(email) {
    // Basic domain validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidDomainFormat(domain) {
    // Basic domain validation regex
    const domainRegex =  /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    return domainRegex.test(domain);
  }

  parseEmail(email) {
    if (!email || typeof email !== 'string') {
      throw new Error('Invalid email input');
    }

    const parts = email.split('@');
    if (parts.length !== 2) {
      throw new Error('Invalid email format');
    }

    return {
      localPart: parts[0],
      domain: parts[1].toLowerCase()
    };
  }

  async checkEmailDomainValidity(email) {
    try {
      const { domain } = this.parseEmail(email);
      const domainInfo = await this.getDomainStatus(domain);
      this.domain = domain;

      if (!domainInfo) {
        return {
          isValid: false,
          status: 'unknown',
          message: `Domain not found in database. Email: ${email}`
        };
      }

      return this.statusMap[domainInfo.valid] || statusMap[0];
    } catch (error) {
      loggerService.error(`Email validation failed: ${error}, email: ${email}`);
    }
  }

  async valApiDisposableEmail (email) {
    try {
      const result = await ApiUtils.makeRequest('https://disposable.debounce.io/', 'get', {}, { email: email });
      if (result.disposable == "true") {
        // add to DB
        await this.upsertDomain(this.domain, 3);
        return true;
      }
      else if (result.disposable == "false") {
        // add to DB
        await this.createDomain(this.domain, 0);
        return false;
      }
      // loggerService.log(`ValidationMiddleware.apiValidateEmail ${JSON.stringify(result)}`);
    } catch (error) {
      loggerService.error(`ValidationMiddleware.apiValidateEmail Error: ${error}`);
      return false;
    }
  }

  async validateEmailDomain(email) {
    let validEmail = await this.checkEmailDomainValidity(email);

    if (!validEmail.isValid && validEmail.status == 'blacklist') {
      loggerService.error(`Invalid email domain ${email}`);
      return false

    } else if (validEmail.status == 'greylist' || validEmail.status == 'unknown') {
      // call free API
      let disposable = await this.valApiDisposableEmail(email);
      if (disposable == true) {
        loggerService.error(`Invalid email domain ${email}`);
        return false;
      }
    }

    return true;
  }

  async getCheckDomainSwitch () {
    if (process.env.APP_ENV == 'development' || process.env.APP_ENV == 'uat') {
      // get switches from DB
      let dbSwitch = await switchService.findByName('email_domain_check');
      return dbSwitch.switch === 1;
    }
    return false;
  }

}

module.exports = new EmailDomainService();
