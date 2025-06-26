import {Server} from 'socket.io';

let connections = {}
let messages = {}
let timeOnline = {}

export const connectToSocket = (server)=>{
    const io =new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });
    
    io.on("connection", (socket)=>{
        console.log(`New client connected: ${socket.id}`);
        // join-call is an event that clients emit to join a specific call or room
        socket.on("join-call", (path)=> {
            // Initialize connections and timeOnline objects for each socket to manage call connections and online time
            if(connections[path]=== undefined){      // path is the room or call identifier
                connections[path] = [];
            }
            connections[path].push(socket.id);
            timeOnline[socket.id] = Date.now();   // Store the time when the user joined the call
            // Notify other users in the call about the new user by emitting user-joined event to all sockets in the room
            for(let a=0; a<connections[path].length; a++){
                io.to(connections[path][a]).emit("user-joined", socket.id, connections[path]);
            }
            // if there are any messages in the room, send them to the newly joined user
            if(messages[path] !== undefined){
                for(let a=0; a<messages[path].length; ++a){   // Iterate through all messages in the room 
                    // Emit each message to the newly joined user
                    io.to(socket.id).emit("chat-message", messages[path][a]['data'], messages[path][a]['sender'],   
                        messages[path][a]['socket-id-sender']);
                }
            }
        })
        
        // Handle signaling messages
        socket.on("signal", (toId, message)=> {
            io.to(toId).emit("signal", socket.id, message);
        })
        
        // Handle chat messages: chat messages are sent by clients to the server, which then broadcasts them to all users in the room
        socket.on("chat-message", (data, sender)=> {                                 // matchingRoom is the room where the user is currently connected, 
            const [matchingRoom, found] =                                            //found is a boolean indicating if the user was found in any room
                Object.entries(connections)                                          // Get all entries of connections object, which contains all rooms and their connected users
                    .reduce(([room, isFound],[roomKey, roomValue]) =>{               // reduce is used to find the room where the user is connected
                        if(!isFound && roomValue.includes(socket.id)){               // Check if the user is connected to the room
                            return [roomKey, true];                                  // If found, return the room key and true for isFound
                        }
                        return [room, isFound];                                      // If not found, return the previous room and false for isFound
                    }, ["", false]);                                                 // Initialize the room and found variables to empty string and false respectively
        
            if(found === true){                                                     // If the user was found in a room
                if(messages[matchingRoom] === undefined){                           // If there are no messages in the room, initialize it
                    messages[matchingRoom] = [];
                }
                // Add the message to the messages object for the room
                messages[matchingRoom].push({
                    'sender': sender,
                    'data': data,
                    'socket-id-sender': socket.id
                });
                console.log(`Message from ${sender} in room ${matchingRoom}: ${data}`);
                // Emit the message to all users in the room
                connections[matchingRoom].forEach((userId) => {
                    io.to(userId).emit("chat-message", data, sender, socket.id);
                });
            }            
        })
               
        // Handle disconnection
        socket.on("disconnect", () => {
            var diffTime = Math.abs(Date.now() - timeOnline[socket.id]); 
            console.log(`Client disconnected: ${socket.id}, Time online: ${diffTime} ms`);
            var key;
            for(const [k,v] of JSON.parse(JSON.stringify(Object.entries(connections)))){
                for(let a=0; a<v.length; ++a){
                    if(v[a] === socket.id){  // Check if the socket id is in the connections object
                        key= k;  // If found, store the key
                        for( let a=0; a<connections[key].length; ++a){
                            io.to(connections[key][a]).emit("user-left", socket.id);
                        }
                        var index =connections[key].indexOf(socket.id); // Find the index of the socket id in the connections object
                        connections[key].splice(index, 1); // Remove the socket id from the connections object
                        if(connections[key].length === 0){ // If there are no users left in the room, delete the room
                            delete connections[key];
                        }
                    }
                }
            }
        });
    })

    return io;
}
