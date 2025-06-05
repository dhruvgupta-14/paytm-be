const z = require("zod");
const { User, Account, Transaction } = require("./model");
const b = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { default: mongoose } = require("mongoose");
const { sendNotification } = require("./wsServer");

const userSchema = z.object({
  username: z
    .string()
    .nonempty({ message: "Username is required" })
    .trim()
    .min(3, { message: "Username must be at least 3 characters long" })
    .max(30, { message: "Username must not exceed 30 characters" }),

  firstName: z
    .string()
    .nonempty({ message: "First name is required" })
    .trim()
    .max(50, { message: "First name must not exceed 50 characters" }),

  lastName: z
    .string()
    .trim()
    .max(50, { message: "Last name must not exceed 50 characters" }),

  password: z
    .string()
    .nonempty({ message: "Password is required" })
    .trim()
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(20, { message: "Password must not exceed 20 characters" })
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      {
        message:
          "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character",
      }
    ),
});

const userLoginSchema = z.object({
  username: z
    .string()
    .nonempty({ message: "Username is required" })
    .trim()
    .min(3, { message: "Username must be at least 3 characters long" })
    .max(30, { message: "Username must not exceed 30 characters" }),
  password: z
    .string()
    .nonempty({ message: "Password is required" })
    .trim()
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(20, { message: "Password must not exceed 20 characters" })
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      {
        message:
          "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character",
      }
    ),
});

const userEditSchema = z.object({
  firstName: z
    .string()
    .nonempty({ message: "First name is required" })
    .trim()
    .max(50, { message: "First name must not exceed 50 characters" }),

  lastName: z
    .string()
    .trim()
    .max(50, { message: "Last name must not exceed 50 characters" }),
});

const Signup = async (req, res) => {
  const { username, firstName, lastName, password } = req.body;
  try {
    const validateSchema = userSchema.safeParse({
      username,
      firstName,
      lastName,
      password,
    });
    if (!validateSchema.success) {
      return res.status(411).json({
        success: false,
        errors: validateSchema.error.errors.map((e) => ({
          field: e.path[0],
          message: e.message,
        })),
      });
    }
    const findUser = await User.findOne({ username });
    if (findUser) {
      return res.status(411).json({
        success: false,
        message: "Username already Exists",
      });
    }
    const hashPassword = await b.hash(password, 10);
    const userDoc = await User.create({
      username,
      password: hashPassword,
      firstName,
      lastName: lastName || "",
    });
    const accountDoc = await Account.create({
      userId: userDoc._id,
      balance: 1 + Math.floor(Math.random() * 100000),
    });
    const token = jwt.sign({ id: userDoc._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });
    return res.status(200).json({
      success: true,
      token: token,
    });
  } catch (e) {
    console.log("signup e", e);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const Login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const validateSchema = userLoginSchema.safeParse({
      username,
      password,
    });
    if (!validateSchema.success) {
      return res.status(411).json({
        success: false,
        errors: validateSchema.error.errors.map((e) => ({
          field: e.path[0],
          message: e.message,
        })),
      });
    }
    const findUser = await User.findOne({ username });
    if (!findUser) {
      return res.status(411).json({
        success: false,
        message: "Invalid Credentials",
      });
    }
    const isMatch = await b.compare(password, findUser.password);
    if (!isMatch) {
      return res.status(411).json({
        success: false,
        message: "Invalid Credentials",
      });
    }
    const token = jwt.sign({ id: findUser._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });
    return res.status(200).json({
      success: true,
      token: token,
    });
  } catch (e) {
    console.log("login e", e);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const editUser = async (req, res) => {
  const user = req.user;
  const { firstName, lastName } = req.body;
  try {
    const validateSchema = userEditSchema.safeParse({
      firstName,
      lastName,
    });
    if (!validateSchema.success) {
      return res.status(411).json({
        success: false,
        errors: validateSchema.error.errors.map((e) => ({
          field: e.path[0],
          message: e.message,
        })),
      });
    }
    const userDoc = await User.findByIdAndUpdate(
      user._id,
      { firstName, lastName },
      { new: true }
    );
    return res.status(200).json({
      success: true,
      message: "User updated Successfully",
    });
  } catch (e) {
    console.log("editUser e", e);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getUserByName = async (req, res) => {
  const user = req.user;
  const { name } = req.query;
  try {
    const users = await User.find({
      _id: { $ne: user._id },
      $or: [
        {
          firstName: new RegExp(name, "i"),
        },
        {
          lastName: new RegExp(name, "i"),
        },
      ],
    });
    const usersArray = users.map((user) => ({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
    }));
    return res.status(200).json({
      success: true,
      data: usersArray,
    });
  } catch (e) {
    console.log("getUserByName e", e);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const transfer = async (req, res) => {
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    const { to, balance } = req.body;
    const user = req.user;
    const accountDoc = await Account.findOne({ userId: user._id }).populate(
      "userId",
      "username"
    );
    if (!accountDoc || accountDoc.balance < balance) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Insufficient balance",
      });
    }
    const toDoc = await Account.findOne({ userId: to })
      .populate("userId", "username")
      .session(session);
    if (!toDoc) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Such Account Not Exist",
      });
    }

    await Account.updateOne(
      { userId: user._id },
      { $inc: { balance: -balance } }
    ).session(session);
    await Account.updateOne(
      { userId: to },
      { $inc: { balance: balance } }
    ).session(session);
    await session.commitTransaction();
    //sender
    await Transaction.create({
      name: toDoc.userId.username,
      userId: accountDoc.userId,
      role: "sender",
      amount: balance,
      prevBalance: accountDoc.balance,
      newBalance: accountDoc.balance - Number(balance),
    });
    //receiver
    await Transaction.create({
      name: accountDoc.userId.username,
      userId: toDoc.userId,
      role: "receiver",
      amount: balance,
      prevBalance: toDoc.balance,
      newBalance: toDoc.balance + Number(balance),
    });
    sendNotification(to, {
      sender: accountDoc.userId.username,
      amount: balance,
    });
    return res.status(200).json({
      success: true,
      message: "Transfer Successfully",
    });
  } catch (e) {
    console.log("transfer e", e);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getMe = async (req, res) => {
  const user = req.user;
  try {
    const accountDoc = await Account.findOne({ userId: user._id });
    if (!accountDoc) {
      return res.status(401).json({
        success: false,
        message: "No such Account Exist",
      });
    }
    return res.status(200).json({
      success: true,
      firstName: user.firstName,
      balance: accountDoc.balance,
      lastName: user.lastName,
      userId: user._id,
    });
  } catch (e) {
    console.log("getting me e", e);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const gettingTranscation = async (req, res) => {
  try {
    const transactionDoc = await Transaction.find({
      userId: req.user._id,
    }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      data: transactionDoc,
    });
  } catch (e) {
    console.log("getting transaction e", e);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const generateMoreMoney = async (req, res) => {
  try {
    const accountDoc = await Account.findOneAndUpdate(
      { userId: req.user._id },
      {$inc:{balance:5000}},
      { new: true }
    );

    await accountDoc.save();
    return res.status(200).json({
      success: true,
      balance: accountDoc.balance,
    });
  } catch (e) {
    console.log("generate money e", e);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  Signup,
  Login,
  editUser,
  getUserByName,
  transfer,
  getMe,
  gettingTranscation,
  generateMoreMoney
};
