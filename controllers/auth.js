const User = require("../models/user");
const jwt = require("jsonwebtoken")
require("dotenv").config()

const signToken = (userId) =>jwt.sign({userId}, process.env.JWT_SECRET)

exports.login = async (req, res, next) => {
    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Please enter both email and password"
            });
        }

        const user = await User.findOne({email:email}).select("+password")

        if (!user || !user.password) {
            res.status(400).json({
              status: "error",
              message: "Incorrect password",
            });
        
            return;
          }
        

          if (!user || !(await user.correctPassword(password, user.password))) {
            res.status(400).json({
              status: "error",
              message: "Email or password is incorrect",
            });
        
            return;
          }

          const token = signToken(user._id)


          res.status(200).json({
            status: "success",
            message: "Logged in successfully!",
            token,
            user_id: user._id,
          });



    } catch (err) {
        res.status(500).json({
            message:"Somthing wrong while creating login api"
        })
    }
}