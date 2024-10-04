const app = require("./app");
const http = require("http");
const ratelimit = require("express-rate-limit");
const helmet = require("helmet");
const mongosanitize = require("express-mongo-sanitize");
const express = require("express");
const morgan = require("morgan");
const xss = require("xss-clean");
const bodyParser = require("body-parser");
const cors = require("cors")

const server = http.createServer(app);
require("dotenv").config();

const port = process.env.PORT || 8000

app.use(cors({
    origin: "*",
    methods: ["GET", "PATCH", "POST", "DELETE", "PUT"],

    credentials: true, //

}))

app.use(express.json({limit:"10kb"}))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:true}))

app.use(helmet());

if(process.env.NODE_ENV === "development"){
    app.use(morgan("dev"))

}

const limiter = ratelimit({
    max:3000,
    windowMs:60*60*1000,
    message: "Too many Requests from this IP, please try again in an hour!",

})

app.use("/twak", limiter)

app.use(express.urlencoded({extended:true}))

app.use(mongosanitize());
app.use(xss())

server.listen(port, ()=>{
    console.log(`Server is running on port ${port}`);
})