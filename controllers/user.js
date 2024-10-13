const User = require("../models/user");
const filterObj = require("../utils/filterObj");

exports.updateMe = async (req, res, next) => {


    const filteredBody = filterObj(
        req.body,
        "firstName",
        "lastName",
        "about",
        "avatar"
    );

    const updatedData = await User.findByIdAndUpdate(req.user._id,
        { filteredBody })


        res.status(200).json({
            status: "success",
            data: updatedData,
            message: "User Updated successfully",
          });


}