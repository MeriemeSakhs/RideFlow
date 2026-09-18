const jwt = require('jsonwebtoken')
const dotenv = require('dotenv');
dotenv.config();

const generateAccessToken = (user) => {
    const { _id, email, fullName, role, companyName, companySlug } = user
    return jwt.sign({ id: _id, email, fullName, role, companyName, companySlug }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
    })
}

module.exports.generateAccessToken = generateAccessToken
