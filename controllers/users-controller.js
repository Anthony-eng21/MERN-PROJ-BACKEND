const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");
const User = require("../models/user");

// const DUMMY_USERS = [
//   {
//     id: "u1",
//     name: "Cookie Monster",
//     email: "test@test.com",
//     password: "testers",
//   },
// ];

const getUsers = async (req, res, next) => {
  // res.json({ users: DUMMY_USERS });
  let users;
  try {
    users = await User.find({}, "-password"); //find users object excluding -passwords and doesnt send the pw field to the front
  } catch (err) {
    const error = new HttpError(
      "fetching users failed, please try again later.",
      500
    );
    return next(error);
  }
  res.json({ users: users.map((user) => user.toObject({ getters: true })) }); //users array
};

const signup = async (req, res, next) => {
  const errors = validationResult(req); //looks into the req obj and sees if theres any validation errors based in our route setup

  //know that we have errors
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data", 422)
    );
  }

  const { name, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email }); //checks if the user is already existing in our db
  } catch (err) {
    const error = new HttpError(
      "Signing up failed please try again later.",
      500
    );
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError(
      "User exists already, please log in instead",
      422
    );
    return next(error);
  }

  let hashedPassWord;
  try {
    //2nd arg is the Salt basically makes 12 salting rounds makes encrypted pw
    hashedPassWord = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError("Could not create user, please try again", 500);
    return next(error);
  }

  const createdUser = new User({
    name: name,
    email: email,
    image: req.file.path, //construct url to prepend and store the path not the full url
    password: hashedPassWord, //never store passwords in plain text in the db
    places: [], //once we add a new place data will be filled here
  });

  try {
    await createdUser.save(); //handle all the code to store a doc in mongodb
  } catch (err) {
    const error = new HttpError(
      "Sign up failed, please try again  later.",
      500
    );
    return next(error);
  }

  //1st arg encode an object of data we want to be stored into this token
  //second arg is a private key: a string that should never be read by any client only the server knows
  //third arg is optional and lets us shape our token with a js object that lets us set config options
  let token;
  try {
    token = jwt.sign(
      {
        userId: createdUser.id,
        email: createdUser.email,
      },
      process.env.JWT_KEY,
      {
        expiresIn: "1h", //makes a short time duration for threats on this made token
      }
    );
  } catch (err) {
    const error = new HttpError(
      "Sign up failed, please try again  later.",
      500
    );
    return next(error);
  }

  // {
  //   id: uuid(),
  //   name: name,
  //   email: email,
  //   password: password,
  // };

  // DUMMY_USERS.push(createdUser);
  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token: token });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email }); //checks if the user is already existing in our db
  } catch (err) {
    const error = new HttpError("log in failed please try again.", 500);
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError(
      "Invalid credentials, could not log you in.",
      403
    );
    return next(error);
  }

  let isValidPassWord = false;
  try {
    //asynchronously compare the extracted password from the request to the existing hash password in the db
    isValidPassWord = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError(
      "Could not log you in, please check your credentials and try again.",
      500
    );
    return next(error);
  }

  if (!isValidPassWord) {
    const error = new HttpError(
      "Invalid credentials, could not log you in.",
      401
    );
    return next(error);
  }

  //1st arg encode an object of data we want to be stored into this token
  //second arg is a private key: a string that should never be read by any client only the server knows
  //third arg is optional and lets us shape our token with a js object that lets us set config options
  let token;
  try {
    token = jwt.sign(
      {
        userId: existingUser.id,
        email: existingUser.email,
      },
      process.env.JWT_KEY,
      {
        expiresIn: "1h", //makes a short time duration for threats on this made token
      }
    );
  } catch (err) {
    const error = new HttpError(
      "logging in failed, please try again  later.",
      500
    );
    return next(error);
  }

  // const identifiedUser = DUMMY_USERS.find((u) => u.email === email);

  // if (!identifiedUser || identifiedUser.password !== password) {
  //   return next(new HttpError(
  //     "Could not log user in, email or password are wrong.",
  //     401
  //   )) //error application failed
  // }
  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token,
  });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
