const path = require('../utils/path');
const express = require('express');

const authController = require('../controllers/User');

const router = express.Router();

router.get('/user', (req, res, next)=>{
    res.status(333)
    res.send('uzytkownik zalogowany')
})

router.post('/user', authController.addUser);

router.post('/getuser', authController.getUser);


module.exports = router;