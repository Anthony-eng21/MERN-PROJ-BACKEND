const fs = require("fs");
const path = require("path");

const express = require("express");
const bodyParser = require("body-parser");

//we can use this logic here in our app as middleware keeps our files lean
const placesRoutes = require("./routes/places-routes");
const usersRoutes = require("./routes/users-routes");
const HttpError = require("./models/http-error");
const mongoose = require("mongoose");

const app = express();

app.use(bodyParser.json()); //extracts json data from the request body object for post .. methods

app.use("/uploads/images", express.static(path.join("uploads", "images"))); //return the requested file

//headers and post to our backend for our signup logic
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); //allows api access for the browser
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE"); //what verbs we want attached to incoming req on the frontend

  next();
});

app.use("/api/places", placesRoutes); // => / /api/places/...

app.use("/api/users", usersRoutes); // => / /api/users/...

//only reached if we have some request that didn't get a response from before
app.use((res, req, next) => {
  const error = new HttpError("Could not find this route", 404);
  throw error;
});

//middleware functions with four params are special. case/:(error)
// this function will run if we have a problem in any of the above middleware functions
app.use((error, req, res, next) => {
  //rollback image upload on failed signup
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500); //either the code is set or default to 500 code(server error)
  res.json({ message: error.message || "An unknown error occured!" });
});

//establish database connection to mongoose
//theres a globally available process variable that gives us an env key which is where we configure our EV's
mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@utahsp.jvezeo6.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
  )
  .then(() => {
    app.listen(process.env.PORT || 5000);
  })
  .catch((err) => {
    console.log(err);
  });
