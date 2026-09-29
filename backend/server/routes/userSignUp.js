const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const userModel = require('../models/userModel')
const companyModel = require('../models/companyModel')
const { userValidation } = require('../models/userValidator');
const { generateUniqueReferenceNumber } = require('../utilities/companyReference');

// Public self-signup always creates a brand-new Company and its Manager.
// Dispatcher accounts are never self-registered - see routes/userProfile.js's
// POST /dispatchers, which a logged-in Manager uses instead.
router.post('/signup', async (req, res) => {
    const { success, data, error } = userValidation(req.body);
    if (!success) return res.status(400).send({ message: error.errors[0].message });

    const { fullName, dateOfBirth, email, password, companyName } = data

    try {
        const existingUser = await userModel.findOne({ email })
        if (existingUser) return res.status(409).send({ message: "An account with this email already exists" })

        const referenceNumber = await generateUniqueReferenceNumber();
        const newCompany = new companyModel({ companyName, referenceNumber });
        const savedCompany = await newCompany.save();

        try {
            const salt = await bcrypt.genSalt(10)
            const hashedPassword = await bcrypt.hash(password, salt)

            const newUser = new userModel({
                fullName,
                dateOfBirth,
                email,
                password: hashedPassword,
                companyName,
                companyId: savedCompany._id,
                role: 'manager',
            })
            const savedUser = await newUser.save()

            const { password: _password, ...userWithoutPassword } = savedUser.toObject()
            res.status(201).send(userWithoutPassword)
        } catch (userErr) {
            // Don't leave an orphaned Company record behind if the manager
            // account itself couldn't be created.
            await companyModel.deleteOne({ _id: savedCompany._id });
            throw userErr;
        }
    } catch (err) {
        res.status(400).send({ message: "Error trying to create new user" })
    }
})

module.exports = router;
