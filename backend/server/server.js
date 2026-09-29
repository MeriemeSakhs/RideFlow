const express = require("express");
const app = express();
const cors = require('cors')
const loginRoute = require('./routes/userLogin')
const registerRoute = require('./routes/userSignUp')
const profileRoute = require('./routes/userProfile')
const dbConnection = require('./config/db.config')
const rideRoutes = require('./routes/rideRoutes')
const workSessionRoutes = require('./routes/workSessionRoutes')
const companyRoutes = require('./routes/companyRoutes')
const driverRoutes = require('./routes/driverRoutes')

require('dotenv').config();
const SERVER_PORT = 8081

dbConnection()
app.use(cors({origin: '*'}))
app.use(express.json())
app.use('/user', loginRoute)
app.use('/user', registerRoute)
app.use('/user', profileRoute)
app.use('/ride', rideRoutes)
app.use('/work-sessions', workSessionRoutes)
app.use('/company', companyRoutes)
app.use('/driver', driverRoutes)

app.listen(SERVER_PORT, (req, res) => {
    console.log(`The backend service is running on port ${SERVER_PORT} and waiting for requests.`);
})
