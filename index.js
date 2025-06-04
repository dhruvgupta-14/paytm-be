const express=require('express')
const dotenv=require('dotenv')
const {default: mongoose } = require('mongoose')
const cors=require('cors')
const appRoute = require('./route')
const app=express()
dotenv.config()
app.use(cors())
app.use(express.json())
app.use('/api/v1',appRoute)
const connectDB=async()=>{
  try{
    await mongoose.connect(process.env.MONGODB_URL)
    console.log('Database Connected')
  }catch(e){
    console.log('mongo db',e)
  }
}
app.listen(process.env.PORT,(async()=>{
  await connectDB()
  console.log('Server Running')
}))