const router = require("koa-router")();
const userController = require("../../controller/userController");

router.get("/currentState", userController.getCurrentState);

router.post("/login", userController.login);

router.post("/outLogin", userController.outLogin);

router.post("/register", userController.register);

router.post("/resetPassword", userController.resetPassword);

router.get("/getUsers", userController.getUsers);

router.get("/getRoles", userController.getRoles);

router.delete("/deleteUser/:userid", userController.deleteUser);

router.put("/updateUser", userController.updateUser);

module.exports = router;
