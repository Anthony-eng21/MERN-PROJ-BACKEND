//focused file for places middleware fucntions
// => /
const fs = require("fs");

const { v4: uuid } = require("uuid"); //generate unique id

const { validationResult } = require("express-validator");

const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../util/location");
const Place = require("../models/place"); //our model constructor()
const User = require("../models/user");
const mongoose = require("mongoose");

// let DUMMY_PLACES = [
//   {
//     id: "p1",
//     title: "Empire State Building",
//     description: "One of the most famous sky scrapers",
//     location: {
//       lat: 40.7484474,
//       lng: -73.9871516,
//     },
//     address: "20 W 34th St, New York, NY 10001",
//     creator: "u1",
//   },
// ];

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid; // { pid: 'p1' }

  let place;
  try {
    place = await Place.findById(placeId); //doesn't return a promise
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find a place",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError(
      "Could not find a place for the provided id.",
      404
    );
    return next(error);
    // no model error.code = 404; //get this code field from our err handling middle ware in app.js
    // throw error;
  }

  res.json({ place: place.toObject({ getters: true }) }); //mongoose adds this _id => to the created proj
};

//middleware function to get places by user id
const getPlacesByUserId = async (req, res, next) => {
  //returnes array of user place objects
  const userId = req.params.uid;

  //returns new array full of user objects that meet the right criteria
  // let places;
  let userWithPlaces;
  try {
    userWithPlaces = await User.findById(userId).populate("places"); //filters for the right creator and their data in url
  } catch (err) {
    const error = new HttpError(
      "Feching places failed, please try again later",
      500
    );
    return next(error);
  }

  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    // w/o model const error = new Error("Could not find a place for the provided user id.");
    // error.code = 404;
    return next(
      new HttpError("Could not find a places for the provided user id.", 404)
    );
  }
  //we're trying to read instead of create here so we want to map that "userIdPlaces" array
  res.json({
    //this gets sent to our front end and lets us use this logic through this res object and the places field created
    places: userWithPlaces.places.map((place) =>
      place.toObject({ getters: true })
    ),
  });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req); //looks into the req obj and sees if theres any validation errors based in our route setup

  //know that we have errors
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data", 422)
    );
  }

  const { title, description, address } = req.body; //extracted data for the incoming request from the request body

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address); //convert address to coords //infered by google
  } catch (error) {
    return next(error);
  }

  //const title = req.body.title
  //new created place object for memory
  const createdPlace = new Place({
    title: title,
    description: description,
    address: address,
    location: coordinates,
    image: req.file.path,
    creator: req.userData.userId, //get extracted tok data not from front end and the req body
  });

  let user;
  try {
    user = await User.findById(req.userData.userId); //check if the logged in user id is existing
  } catch (err) {
    const error = new HttpError("Creating place failed, please try again", 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError("Could not find user for provided id", 404);
    return next(error);
  }
  // console.log(user);

  //start session and transaction then store the createdplace into the user
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    //make sure the place id is added to our user
    user.places.push(createdPlace); //only adds place id to our user
    await user.save({ session: sess });
    await sess.commitTransaction(); //changes are only saved in the db place is created then stored to the user
  } catch (err) {
    const error = new HttpError("creating place failed please try again.", 500);
    return next(error);
  }
  //returned response with a place prop that points to this newly created place
  res.status(201).json({ place: createdPlace });
};

//valid updating middleware hmm 🤑🤑🤑🤯
const updatePlace = async (req, res, next) => {
  const errors = validationResult(req); //looks into the req obj and sees if theres any validation errors based in our route setup
  //know that we have errors
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data", 422)
    );
  }
  const { title, description } = req.body; //extracted data for the incoming request from the request body / other data can be sent but not considered
  const placeId = req.params.pid; //id for request body

  // //creates copied object change that copy and as soon it's changed we want to change the whole array of places in memory /ref values muy importante!
  // const updatedPlace = { ...DUMMY_PLACES.find((p) => p.id === placeId) }; //clean copy: ^_^
  // const placeIndex = DUMMY_PLACES.findIndex((p) => p.id === placeId); //pos of object instead of the obj itself

  //find place by place id then update the place's title and description

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500
    );
    return next(error);
  }

  //after this check then the user can add the change this for people trying to get into user logic dirty hackers
  if (place.creator.toString() !== req.userData.userId) {
    //cant compare an object and a string so we make this tostring method
    const error = new HttpError(
      "You are not allowed to edit this place Naughty Naughty.",
      401
    );
    return next(error);
  }

  place.title = title; //overwrites title in req body
  place.description = description; //overwrites description in req body

  try {
    await place.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not update place.",
      500
    );
    return next(error);
  }

  // DUMMY_PLACES[placeIndex] = updatedPlace; //dynamically replace object data at that index in our array of objects

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

//get rid of place and connection to the user
const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;
  // if (!DUMMY_PLACES.find((p) => p.id === placeId)) {
  //   throw new HttpError("Could not find a place for that id.", 404);
  // }

  // //returns false when we want to drop a place
  // DUMMY_PLACES = DUMMY_PLACES.filter((p) => p.id !== placeId);
  let place;
  //find place
  try {
    //use populate to get access to the entire content of a document stored in a different collection via refs and populate
    place = await Place.findById(placeId).populate("creator"); //creator field holds whole user object
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete place.",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError("Could not find place for this id", 404);
    return next(error);
  }

  if (place.creator.id !== req.userData.userId) {
    const error = new HttpError(
      "You are not allowed to delete this place  Naughty Naughty.",
      401
    );
    return next(error);
  }

  const imagePath = place.image; //path stored onto this image key

  try {
    //remove from db
    const sess = await mongoose.startSession();
    sess.startTransaction();
    place.deleteOne({ session: sess });
    //access place stored in our creator and target place id
    place.creator.places.pull(place); //removes an id / i.e place id
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not delete place.",
      500
    );
    return next(error);
  }

  fs.unlink(imagePath, (err) => {
    console.log(err);
  }); //unlink the image from our file system

  res.status(200).json({ message: "Deleted place." });
};

//point at the middleware function that get stored onto some object and these functions are accessed like methods
exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
