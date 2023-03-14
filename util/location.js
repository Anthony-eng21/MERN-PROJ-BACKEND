const API_KEY = process.env.GOOGLE_API_KEY;
const axios = require("axios");
const HttpError = require("../models/http-error");

//asynchronously get our parsed location through some promise
async function getCoordsForAddress(address) {
  const response = await axios.get(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${API_KEY}`
  );

  const data = response.data; //axios gives us a data field from the response object

  if (!data || data.status === "ZERO_RESULTS") {
    //no data and we check our data's status field
    const error = new HttpError(
      "Could not find location for the specified address",
      422
    );
    throw error;
  }

  const coordinates = data.results[0].geometry.location; //this is an object on this api's chain 

  return coordinates;
}

module.exports = getCoordsForAddress;