const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxLength: 50,
    },
    lastName: {
      type: String,
      trim: true,
      maxLength: 50,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      minLength: 3,
      maxLength: 30,
    },
    password: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);
const accountSchema=new mongoose.Schema({
  userId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'User',
    required:true,
    unique:true
  },
  balance:{
    type:Number,
    required:true
  }
},{timestamps:true})
const User = mongoose.model("User", userSchema);
const Account=mongoose.model("Account",accountSchema)
module.exports = { User,Account };
