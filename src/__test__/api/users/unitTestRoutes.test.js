const request = require('supertest');
const express = require('express');
const router = require('./userRoutes'); // Adjust this path as needed

// Mocks
jest.mock('../services/validationService');
jest.mock('../services/commonService');
jest.mock('../controllers/userController');
jest.mock('../config/userConfig', () => ({
  WILDPASS_SOURCE_COGNITO_MAPPING: {}
}));

const validationService = require('../../../services/validationService');
const commonService = require('../../../services/commonService');
const userController = require('../controllers/userController');

describe('PUT /users route', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(router);

    // Reset mocks
    jest.clearAllMocks();

    // Mock processTimer
    const mockProcessTimer = {
      apiRequestTimer: jest.fn().mockReturnValue({
        end: jest.fn()
      })
    };
    global.processTimer = mockProcessTimer;
  });

  it('should return 400 if request body is empty', async () => {
    commonService.isJsonNotEmpty.mockReturnValue(false);

    const response = await request(app)
      .put('/users')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Bad Requests' });
  });

  it('should return 401 if app ID is invalid', async () => {
    commonService.isJsonNotEmpty.mockReturnValue(true);
    validationService.validateAppID.mockReturnValue(false);

    const response = await request(app)
      .put('/users')
      .send({ someData: 'value' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('should update user and return 200 if everything is valid', async () => {
    commonService.isJsonNotEmpty.mockReturnValue(true);
    validationService.validateAppID.mockReturnValue(true);
    commonService.cleanData.mockImplementation(data => data);
    commonService.mapCognitoJsonObj.mockReturnValue({ someParam: 'value' });
    userController.adminUpdateUser.mockResolvedValue({ id: '123', name: 'Updated User' });

    const response = await request(app)
      .put('/users')
      .send({ someData: 'value' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: '123', name: 'Updated User' });
  });

  it('should return membership code if present in the updateUser response', async () => {
    commonService.isJsonNotEmpty.mockReturnValue(true);
    validationService.validateAppID.mockReturnValue(true);
    commonService.cleanData.mockImplementation(data => data);
    commonService.mapCognitoJsonObj.mockReturnValue({ someParam: 'value' });
    userController.adminUpdateUser.mockResolvedValue({
      membership: { code: 201 },
      data: 'Some data'
    });

    const response = await request(app)
      .put('/users')
      .send({ someData: 'value' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      membership: { code: 201 },
      data: 'Some data'
    });
  });

  it('should call processTimer and apiTimer', async () => {
    commonService.isJsonNotEmpty.mockReturnValue(true);
    validationService.validateAppID.mockReturnValue(true);
    userController.adminUpdateUser.mockResolvedValue({});

    await request(app)
      .put('/users')
      .send({ someData: 'value' });

    expect(global.processTimer.apiRequestTimer).toHaveBeenCalledWith(true);
    expect(global.processTimer.apiRequestTimer().end).toHaveBeenCalled();
  });
});
