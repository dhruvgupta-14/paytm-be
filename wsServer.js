const ws=require('ws')
const clients=new Map()
function startWSServer(server){
  const wss=new ws.Server({server})
  wss.on("connection",(socket)=>{
      socket.on("message",(message)=>{
        const data=JSON.parse(message)
        try{
          if(data.type=="register"&&data.userId){
            clients.set(data.userId,socket)
            socket.userId=data.userId
             console.log(`User ${data.userId} connected via WS`);
          }
        }catch(e){
          console.log("Invalid ws Connection",data)
        }
      })
      socket.on("close",()=>{
        if(socket.userId) clients.delete(socket.userId)
      })
  })
}
function sendNotification(userId, data) {
  const client = clients.get(userId);
  if (client && client.readyState === ws.OPEN) {
    client.send(JSON.stringify({ type: 'moneyReceived', data }));
  }
}
module.exports={startWSServer,sendNotification}