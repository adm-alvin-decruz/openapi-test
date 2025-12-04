const { EntitySchema } = require('typeorm');

const User = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: {
      type: 'int',
      primary: true,
      generated: true,
    },
    email: {
      type: 'varchar',
      length: 256,
      nullable: false,
    },
    given_name: {
      type: 'varchar',
      length: 256,
      nullable: false,
    },
    family_name: {
      type: 'varchar',
      length: 256,
      nullable: false,
    },
    birthdate: {
      type: 'timestamp',
      nullable: false,
    },
    mandai_id: {
      type: 'varchar',
      length: 32,
      nullable: false,
    },
    source: {
      type: 'tinyint',
      nullable: true,
      comment: 'ORGANIC:1, TICKETING:2, GLOBALTIX:3',
    },
    status: {
      type: 'tinyint',
      nullable: false,
      default: 1,
    },
    delete_at: {
      type: 'datetime',
      nullable: true,
      default: null,
    },
    otp_email_disabled_until: {
      type: 'datetime',
      nullable: true,
      default: null,
    },
    singpass_uuid: {
      type: 'varchar',
      length: 36,
      nullable: true,
      default: null,
    },
    created_at: {
      type: 'timestamp',
      nullable: true,
      default: () => 'CURRENT_TIMESTAMP',
    },
    updated_at: {
      type: 'timestamp',
      nullable: true,
      default: () => 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    },
  },
  indices: [
    {
      name: 'idx_email',
      columns: ['email'],
    },
    {
      name: 'idx_mandai_id',
      columns: ['mandai_id'],
    },
    {
      name: 'uniq_singpass_uuid',
      columns: ['singpass_uuid'],
      unique: true,
    },
  ],
});

module.exports = {
  User
};

