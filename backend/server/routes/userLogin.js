const express = require("express");
const router = express.Router();
const { userLoginValidation } = require('../models/userValidator')
const userModel = require('../models/userModel')
const bcrypt = require('bcrypt')
const { generateAccessToken } = require('../utilities/generateToken')

router.post('/login', async (req, res) => {
    const { error } = userLoginValidation(req.body);
    if (error) return res.status(400).send({ message: error.errors[0].message });

    const { email, password } = req.body

    try {
        const user = await userModel.findOne({ email })
        if (!user) return res.status(401).send({ message: "Email or password is incorrect" })

        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) return res.status(401).send({ message: "Email or password is incorrect" })

        if (!user.isActive) {
            return res.status(403).send({ message: "Your account has been deactivated. Contact your company manager." })
        }

        if (!user.isEmailVerified) {
            return res.status(403).send({
                message: "Please verify your email before logging in.",
                requiresEmailVerification: true,
                email: user.email,
            })
        }

        const accessToken = generateAccessToken(user)
        res.header('Authorization', accessToken).send({ accessToken })
    } catch (err) {
        res.status(500).send({ message: "Internal server error" })
    }
})

module.exports = router;
