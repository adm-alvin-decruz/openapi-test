const BaseDTO = require('./BaseDTO');

class UserDTO extends BaseDTO {
  DATE_FIELDS = ['birthdate', 'otp_email_disabled_until', 'created_at', 'updated_at'];
  HIDDEN_FIELDS = ['password_hash'];

  constructor(entity) {
    super(entity);
  }
}

module.exports = UserDTO;