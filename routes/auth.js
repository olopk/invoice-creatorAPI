const path = require('../utils/path');
const express = require('express');

const authController = require('../controllers/user');

const router = express.Router();

router.post('/user', authController.addUser);

// router.get('/user', (req, res, next)=>{
//     res.status(333)
//     res.send('uzytkownik zalogowany')
// })

// router.post('/getuser', authController.getUser);

module.exports = router;