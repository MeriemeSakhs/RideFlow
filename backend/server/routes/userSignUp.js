const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const userModel = require('../models/userModel')
const { userValidation } = require('../models/userValidator');

router.post('/signup', async (req, res) => {
    const { success, data, error } = userValidation(req.body);
    if (!success) return res.status(400).send({ message: error.errors[0].message });

    const { fullName, dateOfBirth, email, password, companyName, role } = data

    try {
        const existingUser = await userModel.findOne({ email })
        if (existingUser) return res.status(409).send({ message: "An account with this email already exists" })

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const newUser = new userModel({ fullName, dateOfBirth, email, password: hashedPassword, companyName, role })
        const savedUser = await newUser.save()

        const { password: _password, ...userWithoutPassword } = savedUser.toObject()
        res.status(201).send(userWithoutPassword)
    } catch (err) {
        res.status(400).send({ message: "Error trying to create new user" })
    }
})

module.exports = router;
