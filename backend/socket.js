const { Server: SocketIOServer } = require("socket.io");

const setupSocket = (server) => {
    const io = new SocketIOServer(server,{
        cors: {
             origin:
             ["http://localhost:5173",  // Allow local development
                "https://algoarena-frotend.onrender.com"],
            methods: ["GET","POST"],    
            credentials: true,
        },
    });

    const userSocketMap = new Map();

    io.on('connection', socket => {
        console.log(`🔗 New client connected: ${socket.id}, Username: ${socket.handshake.query.username}`);
        const userId = socket.handshake.query.username; // Access the userId sent as a query parameter
        const roomId= socket.handshake.query.roomId;

        if (userId) {
            userSocketMap.set(userId, socket.id);
        } else {
            console.log("User ID not provided during connection");
        } 

        if(roomId){
            socket.join(roomId);
            socket.roomId=roomId;
            console.log(`User ${userId} joined room ${roomId}`);
        }
        else{
            console.log (`User ${userId} did not provide romId`);
        }

        socket.on('code-update', (data) => {
            console.log(`User ${userId}, ${roomId} updated`);
            if(socket.roomId){
                console.log(`User ${userId}, ${roomId} updated`);
                socket.to(socket.roomId).emit("update-code",data);
            }
        });
     
        socket.on("send-message", ({roomId, username, message}) => {
            console.log(`📩 Server received message: ${message} from ${username} in room ${roomId}`);            
            if(roomId){
                socket.to(roomId).emit("receive-message", {username, message});
            }
            else{
                console.log(`⚠️ send-message event missing roomId from ${username}`);            }
        });

        socket.on('disconnect', () => {
            console.log(`User ${userId} disconnected`);
            userSocketMap.delete(userId);
        });

    })
}



module.exports = setupSocket;
