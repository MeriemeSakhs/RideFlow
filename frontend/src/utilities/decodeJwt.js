import jwt_decode from 'jwt-decode'

const getUserInfo = () => {
    const accessToken = localStorage.getItem("accessToken")
    if(!accessToken) return undefined
    try {
        const decoded = jwt_decode(accessToken)
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
            localStorage.removeItem("accessToken")
            return undefined
        }
        return decoded
    } catch {
        localStorage.removeItem("accessToken")
        return undefined
    }
}

export default getUserInfo