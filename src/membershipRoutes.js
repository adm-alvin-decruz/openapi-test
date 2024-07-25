require('dotenv').config()
const express = require('express');
const router = express.Router();
const multer  = require('multer');
const upload = multer();

const memberships = require('./memberships');
const common = require('./services/commonService')

const pong = {'pong': 'pang'};

router.use(express.json());

router.get('/ping', async (req, res) => {
    res.json(pong);
});

/**
 * Get membership by email
 * Response
 */
router.get('/users/memberships', upload.none(), async (req, res) => {
    // sign email to memberships check
    if(process.env.APP_LOG_SWITCH){
        console.log(req.body);
    }

    // clean the request data for possible white space
    var reqData = common.cleanData(req.body);

    let checkMemberResult = await memberships.adminGetUser(reqData);
    // response
    res.json(checkMemberResult);
});

router.post('/users/memberships', async (req, res) => {
    res.json({error: "method not allowed"});
})

router.post('/users', async (req, res) => {
    let newUser = await memberships.adminCreateUser();
    res.json({newUser});
})

router.put('/users', async (req, res) => {
    let resUser = await memberships.adminUpdateUser();
    res.json({resUser});
})

router.post('/users/set-password', async (req, res) => {
    let membersetPassword = await memberships.adminSetUserPassword();
    res.json({membersetPassword});
})

router.post('/users/login', async (req, res) => {
    let memberLogin = await memberships.userLogin();
    res.json({memberLogin});
})

router.post('/users/reset-password', async (req, res) => {
    let memberResetPassword = await memberships.userResetPassword();
    res.json({memberResetPassword});
})

router.post('/users/forgot-password', async (req, res) => {
    let memberResetPassword = await memberships.userResetPassword();
    res.json({memberResetPassword});
})

// router.get('/users/:id', (req, res) => {
//     const user = users.find(user => user.id === parseInt(req.params.id));
//     if (!user) res.status(404).json({ message: 'User not found' });
//     res.json(user);
// });

// router.post('/users', async (req, res) => {
//     console.log(req.body.toJSON());
//     const user = {
//         id: users.length + 1,
//         name: req.body.name,
//         company: req.body.company,
//     };
//     users.push(user);
//     res.json(user);
// });

// router.delete('/users/:id', async (req, res) => {
//     const userIndex = users.findIndex(user => user.id === parseInt(req.params.id));
//     if (userIndex === -1) res.status(404).json({ message: 'User not found' });
//     users.splice(userIndex, 1);
//     res.json({ message: 'User deleted' });
// });

// router.put('/users/:id', async (req, res) => {
//     let user = users.find(user => user.id === parseInt(req.params.id));
//     if (!user) res.status(404).json({ message: 'User not found' });
//     user.name = req.body.name;
//     user.company = req.body.company;
//     res.json(user);
// });

module.exports = router;