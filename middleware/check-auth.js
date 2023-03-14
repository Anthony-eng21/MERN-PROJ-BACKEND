const jwt = require("jsonwebtoken");
const HttpError = require("../models/http-error");

module.exports = (req, res, next) => {
  //ensures that option request will resolve instead of break our logic
  if (req.method === "OPTIONS") {
    return next();
  }
  try {
    //get the second array value after this split logic and thats our token
    //check if we have valid token
    //encode the token in the headers of the incoming request
    const token = req.headers.authorization.split(" ")[1];
    // Authorization: 'Bearer TOKEN'
    if (!token) {
      throw new Error("Authentication Failed!");
    }
    //verify token
    const decodedToken = jwt.verify(token, process.env.JWT_KEY); //returns payload that was encoded into the token
    req.userData = { userId: decodedToken.userId }; //data from req obj set this data from the payload and get the userId we extract in this MW and add data to the req
    next(); //allow request to continue
  } catch (err) {
    const error = new HttpError("Authentication failed!", 403);
    return next(error);
  }
};
