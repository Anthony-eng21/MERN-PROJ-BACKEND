const mongoose = require("mongoose");

const Schema = mongoose.Schema; //blue print for our document/ place model

//obj with our info for a future document
const placeSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  address: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  //create a place and connection from a user perspective ref
  creator: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
});

module.exports = mongoose.model("Place", placeSchema); //returns a constructor function
