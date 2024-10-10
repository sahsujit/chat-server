const { default: mongoose } = require("mongoose");
const app = require("./app");

process.on("uncaughtException",(err)=>{
    console.log(err);
    process.exit(1);
})






const http = require("http");


const server = http.createServer(app);
require("dotenv").config();

const DB = process.env.MONGODB_URL;
// console.log("db", DB)

mongoose.connect(DB,{
   

}).then(()=>{
    console.log("DB connected successfully")
}).catch((err)=>{
    console.log(err)
})

const port = process.env.PORT || 8000


server.listen(port, ()=>{
    console.log(`Server is running on port ${port}`);
})

process.on("unhandledRejection",()=>{
    console.log(err);
    server.close(()=>{
        process.exit(1);
    })
})

