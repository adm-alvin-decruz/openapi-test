const userLoginJob = require('../../../api/users/userLoginJob');
const UserLoginService = require ('../../../api/users/userLoginServices');

jest.mock('../../../api/users/userLoginServices', () => ({
    execute: jest.fn(),
    user: {},
}));

describe('UserLoginJob', () => {
    describe('failed', () => {
        it('should throw an error when failed is called', () => {
            expect(() => userLoginJob.failed('Login Failed')).toThrow('Login Failed');
        });
    });

    describe('success', () => {
        it('should return the result passed to success method', () => {
            const result = { userId: 1, username: 'test-user' };
            const rs = userLoginJob.success(result)
            expect(rs).toEqual(result);
        });
    });

    describe('execute', () => {
        it('should call UserLoginService.execute and return UserLoginService.user', async () => {
            const req = {
                body: {
                    email: 'test-user', password: 'password'
                }
            };
            const mockedUser = { userId: 1, username: 'test-user' };
            UserLoginService.user = mockedUser;
            await userLoginJob.execute(req);
            expect(UserLoginService.execute).toHaveBeenCalledWith(req);
            expect(UserLoginService.user).toBe(mockedUser);
        });
    });

    describe('perform', () => {
        it('should call failed when there is an errorMessage in the response', async () => {
            const req = {
                body: {
                    email: 'test-user', password: 'password'
                }
            };

            jest.spyOn(userLoginJob, 'execute').mockResolvedValue({
               errorMessage: 'Invalid credentials'
            });
            jest.spyOn(userLoginJob, 'failed')
            UserLoginService.user = {
               errorMessage: 'Invalid credentials'
            };

            await expect(userLoginJob.perform(req)).rejects.toBe("\"Invalid credentials\"")
            expect(userLoginJob.failed).toHaveBeenCalledWith('Invalid credentials');
        });

        it('should call success when the response is valid', async () => {
            const req = {
                body: {
                    email: 'test-user', password: 'password'
                }
            };
            const result = { userId: 1, username: 'test-user' };

            jest.spyOn(userLoginJob, 'execute').mockResolvedValue(result);
            jest.spyOn(userLoginJob, 'success');

            const response = await userLoginJob.perform(req);

            expect(userLoginJob.success).toHaveBeenCalledWith(result);
            expect(response).toEqual(result);
        });
    });
})

