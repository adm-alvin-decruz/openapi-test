const userLogoutJob = require("../../../api/users/userLogoutJob");
const UserLogoutService = require("../../../api/users/userLogoutServices");

jest.mock("../../../api/users/userLogoutServices", () => ({
  execute: jest.fn(),
}));

describe("UserLogoutJob", () => {
  describe("failed", () => {
    it("should throw an error when failed is called", () => {
      expect(() => userLogoutJob.failed("Logout Failed")).toThrow(
        "Logout Failed"
      );
    });
  });

  describe("success", () => {
    it("should return the result passed to success method", () => {
      const result = { message: "Logout successfully" };
      const rs = userLogoutJob.success(result);
      expect(rs).toEqual(result);
    });
  });

  describe("execute", () => {
    it("should call UserLoginService.execute and return UserLoginService.user", async () => {
      await userLogoutJob.execute("123");
      expect(UserLogoutService.execute).toHaveBeenCalledWith("123");
    });
  });

  describe("perform", () => {
    it("should call failed when there is an errorMessage in the response", async () => {
      jest.spyOn(userLogoutJob, "execute").mockResolvedValue({
        errorMessage: "Login Failed",
      });
      jest.spyOn(userLogoutJob, "failed");
      await expect(userLogoutJob.perform("123")).rejects.toBe('"Login Failed"');
      expect(userLogoutJob.failed).toHaveBeenCalledWith("Login Failed");
    });

    it("should call success when the response is valid", async () => {
      jest
        .spyOn(userLogoutJob, "execute")
        .mockResolvedValue({ message: "Logout successfully" });
      jest.spyOn(userLogoutJob, "success");

      const response = await userLogoutJob.perform("123");

      expect(userLogoutJob.success).toHaveBeenCalledWith({
        message: "Logout successfully",
      });
      expect(response).toEqual({ message: "Logout successfully" });
    });
  });
});
