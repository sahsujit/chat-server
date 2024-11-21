const { default: mongoose } = require("mongoose");
const app = require("./app");

const { Server } = require("socket.io");

process.on("uncaughtException", (err) => {
  console.log(err);
  process.exit(1);
});

const http = require("http");
const User = require("./models/user");
const FriendRequest = require("./models/friendRequest");

const server = http.createServer(app);
require("dotenv").config();

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const DB = process.env.MONGODB_URL;
// console.log("db", DB)

mongoose
  .connect(DB, {})
  .then(() => {
    console.log("DB connected successfully");
  })
  .catch((err) => {
    console.log(err);
  });

const port = process.env.PORT || 8000;

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

io.on("connection", async (socket) => {
  console.log(JSON.stringify(socket.handshake.query));
  const user_id = socket.handshake.query["user_id"];

  if (user_id !== null && Boolean(user_id)) {
    try {
      User.findByIdAndUpdate(user_id, {
        socket_id: socket.id,
      });
    } catch (err) {
      console.log(err);
    }
  }

  socket.on("friend_request", async (data) => {
    const to = await User.findById(data.to).select("socket_id");
    const from = await User.findById(data.from).select("socket_id");

    await FriendRequest.create({
      sender: data.from,
      recipient: data.to,
    });

    io.to(to?.socket_id).emit("new_friend_request", {
      message: "New friend request received",
    });
    io.to(from?.socket_id).emit("request_sent", {
      message: "Request Sent successfully!",
    });
  });


  socket.on("accept_request", async(data)=>{
    console.log(data);
    const request_doc = await FriendRequest.findById(data.request_id);

    console.log(request_doc);

    const sender = await User.findById(request_doc.sender);
    const receiver = await User.findById(request_doc.recipient);

    sender.friends.push(request_doc.recipient);
    receiver.friends.push(request_doc.sender);


    await receiver.save({ new: true, validateModifiedOnly: true });
    await sender.save({ new: true, validateModifiedOnly: true });

    await FriendRequest.findByIdAndDelete(data.request_id);

    // delete this request doc
    // emit event to both of them

    // emit event request accepted to both
    io.to(sender?.socket_id).emit("request_accepted", {
      message: "Friend Request Accepted",
    });
    io.to(receiver?.socket_id).emit("request_accepted", {
      message: "Friend Request Accepted",
    });
  })

socket.to("end", function(){
  console.log("Closing Connection");
  socket.disconnect(0)
})
  
});



process.on("unhandledRejection", () => {
  server.close(() => {
    process.exit(1);
  });
});
