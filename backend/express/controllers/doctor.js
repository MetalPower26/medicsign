'use strict';

const mongoose = require(`mongoose`);
const jwt = require(`jsonwebtoken`);
const bcrypt = require(`bcryptjs`);
const env = process.env;
const { logger } = require(`../logger`);
const { success, error, sendStatus } = require(`../req_handler`);
const { Doctor } = require(`../models/doctor`);
const ObjectId = mongoose.Types.ObjectId;

const cmdMap = {
  create,
  view,
  update,
  login,
};

const doctorSchema = {
  email: `string`,
  name: `string`,
  hospital: `string`,
  password: `string`,
};

function validate(dat) {
  var res = {};
  for (const key in doctorSchema) {
    if (typeof dat[key] !== doctorSchema[key]) return undefined;
    res[key] = dat[key];
  }
  return res;
}

function validate_id(userId) {
  return ObjectId.isValid(userId);
}

async function encrypt(password) {
  return await bcrypt.hash(password, 10);
}

async function sign(user) {
  return await jwt.sign(
    { userId: user._id, email: user.email },
    env.TOKEN_KEY,
    {
      expiresIn: `2h`,
    }
  );
}

async function create(req, res) {
  var dat = req.body;
  dat = validate(dat);
  if (!dat) return await sendStatus(res, 400, `Invalid user.`);
  dat.password = await encrypt(dat.password);

  try {
    if (await Doctor.countDocuments({ email: dat.email }))
      return await sendStatus(res, 409, `User exists.`);

    const newDoctor = new Doctor(dat);
    newDoctor.token = await sign(newDoctor);
    await newDoctor.save();
    logger.info(`New Doctor saved!`, { dat });

    await success(res, newDoctor);
  } catch (error) {
    logger.error(`Error saving new doctor.`, { error });
    return await sendStatus(res, 500);
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!(email && password)) {
      return await sendStatus(res, 400, `Insufficient data to log in.`);
    }

    const user = await Doctor.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      user.token = await sign(user);
      await user.save();

      logger.info(`Doctor login success.`);
      return await success(res, user);
    }
    logger.info(`Doctor invalid credentials.`);
    return await sendStatus(res, 400, `Invalid credentials.`);
  } catch (error) {
    logger.error(`Error logging doctor in.`, { error });
    return await sendStatus(res, 500);
  }
}

async function view(req, res) {
  const userId = req.params.user;

  try {
    if (
      !userId ||
      !validate_id(userId) ||
      !(await Doctor.countDocuments({ _id: userId }))
    )
      return await sendStatus(res, 404, `Invalid userId.`);

    if (req.user.userId !== userId) {
      return await sendStatus(res, 403);
    }

    const user = await Doctor.findOne({ _id: userId }).exec();
    await success(res, user);
  } catch (error) {
    logger.error(`Error viewing doctor.`, { error });
    return await sendStatus(res, 500);
  }
}

async function update(req, res) {
  var dat = req.body;
  const userId = dat._id;
  dat = validate(dat);
  dat.password = await encrypt(dat.password);

  try {
    if (
      !dat ||
      !userId ||
      !validate_id(userId) ||
      !(await Doctor.countDocuments({ _id: userId }))
    )
      return await sendStatus(res, 400, `Invalid user.`);

    if (req.user.userId !== userId) {
      return await sendStatus(res, 403);
    }

    if (
      (await Doctor.countDocuments({ email: dat.email })) -
      ((await Doctor.findOne({ _id: userId }).exec()).email === dat.email)
    )
      return await sendStatus(res, 409, `User exists.`);

    const updatedPatient = await Doctor.findByIdAndUpdate(userId, dat).exec();

    logger.info(`Doctor updated!`, { dat });

    return await success(res, updatedPatient);
  } catch (error) {
    logger.error(`Error updating doctor.`, { error });
    return await sendStatus(res, 500);
  }
}

async function doctor(req, res) {
  const cmd = req.params.cmd;

  if (!(cmd in cmdMap)) return await sendStatus(res, 404, `Invalid command.`);

  await cmdMap[cmd](req, res);
}

module.exports = cmdMap;