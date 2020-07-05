const { validationResult } = require("express-validator");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const path = require("path");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const deleteFile = require("../../helpers/file");
const sendNotfication = require("../../helpers/send-notfication");
const bidManage = require("../../helpers/bid-manage");

const transport = nodemailer.createTransport({
  host: "az1-ts1.a2hosting.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.NODEMAILER_GMAIL,
    pass: process.env.NODEMAILER_PASS,
  },
});

const Products = require("../../models/products");
const PayProduct = require("../../models/product-man-pay");
const PayOrder = require("../../models/order-man-pay");
const Catigory = require("../../models/catigory");
const AskProduct = require("../../models/askProduct");
const SupportMessages = require("../../models/support-messages");
const User = require("../../models/user");
const FaQ = require("../../models/f&Q");
const Ads = require("../../models/Ads");
const Lost = require("../../models/lost");
const Admin = require("../../models/admin");

exports.postLogin = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error("validation faild");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }

    const email = req.body.email;
    const password = req.body.password;

    const admin = await Admin.findOne({ email: email });

    if (!admin) {
      const error = new Error("مستخدم غير موجود");
      error.statusCode = 404;
      throw error;
    }
    const isEqual = await bcrypt.compare(password, admin.password);
    if (!isEqual) {
      const error = new Error("كلمه السر غير صحيحه");
      error.statusCode = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        email: admin.email,
        adminId: admin._id.toString(),
      },
      process.env.ADMIN_JWT_PRIVATE_KEY,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      state: 1,
      token: token,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getTest = async (req, res, next) => {
  try {
    let revenue = 0;
    let d = new Date();
    const products = await Products.find({
      approve: "binding",
    }).countDocuments();
    const ask = await AskProduct.find({ approve: "binding" }).countDocuments();
    const totalUsers = await User.find({}).countDocuments();
    const supportMessages = await SupportMessages.find({
      answer: false,
    }).countDocuments();
    const revenueProduct = await Products.find({
      pay: true,
      createdAt: {
        $gte: new Date().setMonth(d.getMonth() - 1),
        $lt: new Date().setMonth(d.getMonth()),
      },
    });
    const revenueAsk = await AskProduct.find({
      pay: true,
      createdAt: {
        $gte: new Date().setMonth(d.getMonth() - 1),
        $lt: new Date().setMonth(d.getMonth()),
      },
    });
    revenueProduct.forEach((p) => {
      revenue += (p.TotalPid * 5.0) / 100.0;
    });
    revenueAsk.forEach((p) => {
      p.Bids.forEach((a) => {
        if (a.selected == true) {
          revenue += (a.price * 5.0) / 100.0;
        }
      });
    });
    const admin = await Admin.find({});

    res.status(200).json({
      state: 1,
      supportMessages: supportMessages,
      totalProducts: products,
      totalAsk: ask,
      revenue: revenue,
      run: admin[0].bid,
      totalUsers: totalUsers,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getSupport = async (req, res, next) => {
  try {
    const filter = req.query.filter || 1;
    let supportMessages;
    if (filter == 1) {
      supportMessages = await SupportMessages.find({
        answer: false,
      }).populate({
        path: "user",
        select: "name email mobile",
      });
    } else if (filter == 2) {
      supportMessages = await SupportMessages.find({ answer: true }).populate({
        path: "user",
        select: "name email mobile",
      });
    }
    res.status(200).json({
      state: 1,
      supportMessages: supportMessages,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getFaQ = async (req, res, next) => {
  try {
    const fAQ = await FaQ.find({});
    res.status(200).json({
      fAQ: fAQ,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getCatigory = async (req, res, next) => {
  try {
    const catigory = await Catigory.find({}).select("name imageUrl");

    res.status(200).json({
      state: 1,
      catigory: catigory,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postFaQ = async (req, res, next) => {
  const errors = validationResult(req);
  const ask = req.body.ask;
  const answer = req.body.answer;
  try {
    if (!errors.isEmpty()) {
      const error = new Error("validation faild");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }

    const fAQ = new FaQ({
      ask: ask,
      answer: answer,
    });
    await fAQ.save();
    res.status(201).json({
      state: 1,
      messaage: "Q&A created",
      FAQ: fAQ,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deleteFaQ = async (req, res, next) => {
  const id = req.body.id;
  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("validation faild");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }

    await FaQ.deleteMany({
      _id: {
        $in: id,
      },
    });
    res.status(201).json({
      state: 1,
      message: "Q&A deleted.",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postSupport = async (req, res, next) => {
  const answer = req.body.answer;
  const id = req.body.id;
  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error(
        `validation faild for ${errors.array()[0].param} in the ${
          errors.array()[0].location
        }`
      );
      error.statusCode = 422;
      throw error;
    }
    const message = await SupportMessages.findById(id).populate("user");
    if (!message) {
      const error = new Error(`support question not found!!`);
      error.statusCode = 404;
      throw error;
    }
    await transport.sendMail({
      to: message.user.email,
      from: process.env.NODEMAILER_GMAIL + " mazadi",
      subject: "constact support",
      html: `
            <h1>مرحبا</h1><h4>${message.user.name}</h4> <br>
            <h2>تم الرد علي سؤالك:</h2>
            <br><h4>${message.message}</h4>
            <br><h2>${answer}</h2>
            `,
    });
    message.answer = true;
    await message.save();

    res.status(200).json({
      state: 1,
      message: "message support answerd susessfully",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postCatigory = async (req, res, next) => {
  const name = req.body.name;
  const image = req.files;
  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error(
        `validation faild for ${errors.array()[0].param} in the ${
          errors.array()[0].location
        }`
      );
      error.statusCode = 422;
      throw error;
    }
    if (image.length == 0) {
      const error = new Error("validation faild.. you should insert image");
      error.statusCode = 422;
      throw error;
    }
    if (path.extname(image[0].path) == ".mp4") {
      const error = new Error(
        "validation faild.. only image type you can insert"
      );
      error.statusCode = 422;
      throw error;
    }

    const cat = new Catigory({
      imageUrl: image[0].path,
      name: name,
      products: [],
    });
    const newCat = await cat.save();

    const body = {
      id: newCat._id.toString(),
      key: "1",
      data: "تم اضافه قسم جديد للمعروضات",
    };
    const notfi = {
      title: `قسم جديد (${newCat.name})`,
      body: "يمكنك الان تصفح معروضات القسم والاضافه بها",
    };

    await sendNotfication.sendAll(body, notfi);

    res.status(201).json({
      state: 1,
      newCatigory: newCat,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postEditCat = async (req, res, next) => {
  const name = req.body.name;
  const image = req.files;
  const id = req.body.id;
  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error(
        `validation faild for ${errors.array()[0].param} in the ${
          errors.array()[0].location
        }`
      );
      error.statusCode = 422;
      throw error;
    }

    const catigory = await Catigory.findById(id);
    catigory.name = name;

    if (image) {
      if (path.extname(image[0].path) == ".mp4") {
        const error = new Error(`validation faild.. you can't insert video`);
        error.statusCode = 422;
        throw error;
      }
      deleteFile.deleteFile(catigory.imageUrl);
      catigory.imageUrl = image[0].path;
    }
    const newCat = await catigory.save();

    res.status(200).json({
      state: 1,
      newCatigory: newCat,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getSingleProduct = async (req, res, next) => {
  try {
    const id = req.params.id;
    const product = await Products.findById(id)
      .populate({ path: "user", select: "name mobile email" })
      .populate({ path: "catigory", select: "name" })
      .populate({ path: "bidArray.user", select: "name mobile email" });
    if (!product) {
      const error = new Error("product not found");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      state: 1,
      product: product,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postApprove = async (req, res, next) => {
  try {
    const id = req.body.id;
    const action = req.params.type;
    let product;
    let body;
    let notfi;

    if (action == 1) {
      product = await Products.findByIdAndUpdate(id).populate("user");
      if (!product) {
        const error = new Error("product not found");
        error.statusCode = 404;
        throw error;
      }
      const admin = await Admin.find({});
      if (admin[0].bid == true) {
        product.bidStatus = "started";
        body = {
          id: product._id.toString(),
          key: "2",
          data: "تهانينا لقد تمت الموافقه على منتجك",
        };
        notfi = {
          title: `تهانينا تمت الموافقة على منتجك وبدء المزاد`,
          body: "اصبح من الممكن المزايدة عليه",
        };
      } else {
        body = {
          id: product._id.toString(),
          key: "2",
          data: "تهانينا لقد تمت الموافقه على منتجك",
        };
        notfi = {
          title: `تمت الموافقة على منتجك `,
          body: "انتظر بدء المزاد في الميعاد المحدد ",
        };
      }
    } else if (action == 2) {
      product = await AskProduct.findByIdAndUpdate(id).populate("user");
      if (!product) {
        const error = new Error("order not found");
        error.statusCode = 404;
        throw error;
      }
      body = {
        id: product._id.toString(),
        key: "3",
        data: "تهانينا لقد تمت الموافقه علي طلبك",
      };
      notfi = {
        title: `تمت الموافقة على منتجك  `,
        body: "يمكنك اﻵن استقبال العروض لطلبك",
      };
    } else {
      const error = new Error("invalid param input!!");
      error.statusCode = 422;
      throw error;
    }

    product.approve = "approved";
    await product.save();
    const n = await sendNotfication.send(product.user.FCMJwt, body, notfi, [
      product.user._id,
    ]);

    res.status(201).json({
      state: 1,
      message: "approved sucsessfully",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postdisApprove = async (req, res, next) => {
  try {
    const id = req.body.id;
    const action = req.params.type;
    const note = req.body.note;
    const errors = validationResult(req);

    let product;
    let body;
    let notfi;

    if (!errors.isEmpty()) {
      const error = new Error("validation faild");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }

    if (action == 1) {
      product = await Products.findByIdAndUpdate(id).populate("user");
      if (!product) {
        const error = new Error("product not found");
        error.statusCode = 404;
        throw error;
      }
      body = {
        id: product._id.toString(),
        key: "2",
        data: "تم رفض منتجك",
      };
      notfi = {
        title: `للاسف تم رفض منتجك`,
        body: `${note}`,
      };
    } else if (action == 2) {
      product = await AskProduct.findByIdAndUpdate(id).populate("user");
      if (!product) {
        const error = new Error("order not found");
        error.statusCode = 404;
        throw error;
      }
      body = {
        id: product._id.toString(),
        key: "3",
        data: "تم رفض طلبك",
      };
      notfi = {
        title: `للاسف تم رفض طلبك`,
        body: `${note}`,
      };
    } else {
      const error = new Error("invalid param input!!");
      error.statusCode = 422;
      throw error;
    }

    product.approve = "disapprove";
    product.adminNote = note;
    await product.save();
    await sendNotfication.send(product.user.FCMJwt, body, notfi, [
      product.user._id,
    ]);
    res.status(200).json({
      state: 1,
      message: "disapproved",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getSingleAsk = async (req, res, next) => {
  try {
    const id = req.params.id;
    const product = await AskProduct.findById(id)
      .populate({ path: "user", select: "name mobile email" })
      .populate({ path: "catigory", select: "name" });
    if (!product) {
      const error = new Error("order not found");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      state: 1,
      product: product,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const page = req.query.page || 1;
    const productPerPage = 10;
    const filter = req.query.filter || 1; //1=>all//2=>blocked
    let totalUsers;
    let users;
    if (filter == 1) {
      totalUsers = await User.find({}).countDocuments();
      users = await User.find({})
        .select("name email mobile realMobileNumber verification")
        .skip((page - 1) * productPerPage)
        .limit(productPerPage);
    } else if (filter == 2) {
      totalUsers = await User.find({ verification: true }).countDocuments();
      users = await User.find({ verification: true })
        .select("name email mobile realMobileNumber verification")
        .skip((page - 1) * productPerPage)
        .limit(productPerPage);
    }

    res.status(200).json({
      state: 1,
      totalUsers: totalUsers,
      users: users,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getSingleUsers = async (req, res, next) => {
  try {
    const id = req.params.id;
    const userPersonalDate = await User.findById(id).select(
      "name email mobile realMobileNumber verification"
    );
    if (!userPersonalDate) {
      const error = new Error("user not found");
      error.statusCode = 404;
      throw error;
    }
    const userProducts = await Products.find({ user: id })
      .select("approve TotalPid imageUrl bidStatus catigory pay")
      .populate({ path: "catigory", select: "name" });
    const lastBidin = await Products.find({ lastPid: id })
      .select("TotalPid imageUrl bidStatus catigory")
      .populate({ path: "catigory", select: "name" });
    const allUserBids = await User.findById(id).select("pids").populate({
      path: "pids.product",
      select: "TotalPid imageUrl bidStatus pay",
    });
    const userOrders = await AskProduct.find({ user: id })
      .select("approve catigory ended pay Bids Bids")
      .populate({ path: "catigory", select: "name" });

    let allUserBidsArray = [];

    for (let u of allUserBids.pids) {
      if (u.product) {
        allUserBidsArray.push(u);
      }
    }

    res.status(200).json({
      state: 1,
      userPersonalData: userPersonalDate,
      userProducts: userProducts,
      lastBidin: lastBidin,
      allUserBids: allUserBidsArray,
      userOrders: userOrders,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const page = req.query.page || 1;
    const productPerPage = 10;
    const filter = req.query.filter || 1; //1=>approved//2=>disapproved//3=>need approve
    let products;
    let totalProducts;
    if (filter == 1) {
      totalProducts = await AskProduct.find({
        approve: "approved",
      }).countDocuments();

      products = await AskProduct.find({ approve: "approved" })
        .populate({ path: "user", select: "name email mobile" })
        .populate({ path: "catigory", select: "name" })
        .select("user desc city catigory pay note")
        .skip((page - 1) * productPerPage)
        .limit(productPerPage);
    } else if (filter == 2) {
      totalProducts = await AskProduct.find({
        approve: "disapprove",
      }).countDocuments();

      products = await AskProduct.find({ approve: "disapprove" })
        .populate({ path: "user", select: "name email mobile" })
        .populate({ path: "catigory", select: "name" })
        .select("user desc city catigory pay note")
        .skip((page - 1) * productPerPage)
        .limit(productPerPage);
    } else if (filter == 3) {
      totalProducts = await AskProduct.find({
        approve: "binding",
      }).countDocuments();

      products = await AskProduct.find({ approve: "binding" })
        .populate({ path: "user", select: "name email mobile" })
        .populate({ path: "catigory", select: "name" })
        .select("user desc city catigory pay note")
        .skip((page - 1) * productPerPage)
        .limit(productPerPage);
    }

    res.status(200).json({
      totalProducts: totalProducts,
      products: products,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    const page = req.query.page || 1;
    const productPerPage = 10;
    const filter = req.query.filter || 1; //1=>approved//2=>disapproved//3=>need approve
    let products;
    let totalProducts;
    if (filter == 1) {
      totalProducts = await Products.find({
        approve: "approved",
      }).countDocuments();

      products = await Products.find({ approve: "approved" })
        .sort({ createdAt: -1 })
        .select(
          "createdAt catigory age sex user imageUrl bidStatus approve bidStatus pay TotalPid"
        )
        .populate({ path: "user", select: "name email mobile" })
        .populate({ path: "catigory", select: "name" })
        .skip((page - 1) * productPerPage)
        .limit(productPerPage);
    } else if (filter == 2) {
      totalProducts = await Products.find({
        approve: "disapprove",
      }).countDocuments();

      products = await Products.find({ approve: "disapprove" })
        .sort({ createdAt: -1 })
        .select(
          "createdAt catigory age sex user imageUrl bidStatus approve bidStatus pay TotalPid"
        )
        .populate({ path: "user", select: "name email mobile" })
        .populate({ path: "catigory", select: "name" })
        .skip((page - 1) * productPerPage)
        .limit(productPerPage);
    } else if (filter == 3) {
      totalProducts = await Products.find({
        approve: "binding",
      }).countDocuments();

      products = await Products.find({ approve: "binding" })
        .sort({ createdAt: -1 })
        .select(
          "createdAt catigory age sex user imageUrl bidStatus approve bidStatus pay TotalPid"
        )
        .populate({ path: "user", select: "name email mobile" })
        .populate({ path: "catigory", select: "name" })
        .skip((page - 1) * productPerPage)
        .limit(productPerPage);
    } else if (filter == 4) {
      totalProducts = await Products.find({
        approve: "approved",
        bidStatus: "started",
      }).countDocuments();

      products = await Products.find({
        approve: "approved",
        bidStatus: "started",
      })
        .sort({ createdAt: -1 })
        .select(
          "createdAt catigory age sex user imageUrl bidStatus approve bidStatus pay TotalPid"
        )
        .populate({ path: "user", select: "name email mobile" })
        .populate({ path: "catigory", select: "name" })
        .skip((page - 1) * productPerPage)
        .limit(productPerPage);
    } else if (filter == 5) {
      totalProducts = await Products.find({
        approve: "approved",
        bidStatus: "ended",
      }).countDocuments();

      products = await Products.find({
        approve: "approved",
        bidStatus: "ended",
      })
        .sort({ createdAt: -1 })
        .select(
          "createdAt catigory age sex user imageUrl bidStatus approve bidStatus pay TotalPid"
        )
        .populate({ path: "user", select: "name email mobile" })
        .populate({ path: "catigory", select: "name" })
        .skip((page - 1) * productPerPage)
        .limit(productPerPage);
    } else if (filter == 6) {
      totalProducts = await Products.find({
        approve: "approved",
        pay: true,
      }).countDocuments();

      products = await Products.find({ approve: "approved", pay: true })
        .sort({ createdAt: -1 })
        .select(
          "createdAt catigory age sex user imageUrl bidStatus approve bidStatus pay TotalPid"
        )
        .populate({ path: "user", select: "name email mobile" })
        .populate({ path: "catigory", select: "name" })
        .skip((page - 1) * productPerPage)
        .limit(productPerPage);
    } else if (filter == 7) {
      totalProducts = await Products.find({
        approve: "approved",
        bidStatus: "ended",
        pay: false,
      }).countDocuments();

      products = await Products.find({
        approve: "approved",
        bidStatus: "ended",
        pay: false,
      })
        .sort({ createdAt: -1 })
        .select(
          "createdAt catigory age sex user imageUrl bidStatus approve bidStatus pay TotalPid"
        )
        .populate({ path: "user", select: "name email mobile" })
        .populate({ path: "catigory", select: "name" })
        .skip((page - 1) * productPerPage)
        .limit(productPerPage);
    } else if (filter == 8) {
      totalProducts = await Products.find({
        approve: "approved",
        bidStatus: "binding",
      }).countDocuments();

      products = await Products.find({
        approve: "approved",
        bidStatus: "binding",
      })
        .sort({ createdAt: -1 })
        .select(
          "createdAt catigory age sex user imageUrl bidStatus approve bidStatus pay TotalPid"
        )
        .populate({ path: "user", select: "name email mobile" })
        .populate({ path: "catigory", select: "name" })
        .skip((page - 1) * productPerPage)
        .limit(productPerPage);
    }

    res.status(200).json({
      totalProducts: totalProducts,
      products: products,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postDelete = async (req, res, next) => {
  const type = req.params.type;
  let id = req.body.id;
  let product;
  try {
    if (type == 1) {
      product = await Products.find({
        _id: {
          $in: id,
        },
      });
      if (product.length == 0) {
        const error = new Error("product not found!!..");
        error.statusCode = 404;
        throw error;
      }
      product.forEach((i) => {
        if (i.pay == true || i.bidStatus == "started") {
          const error = new Error(
            "you can not delete the product after pay or during the bid"
          );
          error.statusCode = 403;
          throw error;
        }
      });
      product.forEach((i) => {
        i.imageUrl.forEach((p) => {
          deleteFile.deleteFile(path.join(__dirname + "/../../" + p));
        });
        if (i.vidUrl) {
          deleteFile.deleteFile(
            path.join(__dirname + "/../../" + product.vidUrl)
          );
        }
      });

      await Products.deleteMany({
        _id: {
          $in: id,
        },
      });
      for (pp of product) {
        const catigory = await Catigory.findOne({ _id: pp.catigory });
        const user = await User.findOne({ _id: pp.user });
        catigory.products.pull(pp._id);
        user.postedProducts.pull(pp._id);
        await user.save();
        await catigory.save();
      }
    }
    if (type == 2) {
      product = await AskProduct.find({
        _id: {
          $in: id,
        },
      });
      if (product.length == 0) {
        const error = new Error("order not found!!..");
        error.statusCode = 404;
        throw error;
      }
      for (let p of product) {
        if (p.pay == true) {
          const error = new Error("you can not delete the order ater pay");
          error.statusCode = 403;
          throw error;
        }
      }
      for (let p of product) {
        p.Bids.forEach((f) => {
          if (f.vidUrl) {
            deleteFile.deleteFile(path.join(__dirname + "/../../" + f.vidUrl));
          }
          f.imageUrl.forEach((i) => {
            deleteFile.deleteFile(path.join(__dirname + "/../../" + i));
          });
        });
      }

      await AskProduct.deleteMany({
        _id: {
          $in: id,
        },
      });
    }
    res.status(200).json({
      state: 1,
      message: "deleted!!",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getAds = async (req, res, next) => {
  const filter = req.query.filter || 'ads' ;
  try {

    const ads = await Ads.find({type:filter}).sort({createdAt: -1});

    res.status(200).json({
      state:1,
      ads: ads
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postEditAds = async (req, res, next) => {
  const desc = req.body.desc;
  const phone = req.body.phone;
  const image = req.files;
  const id = req.body.id;
  const errors = validationResult(req);

    
  try {

    if (!errors.isEmpty()) {
      const error = new Error(
        `validation faild for ${errors.array()[0].param} in the ${
          errors.array()[0].location
        }`
      );
      error.statusCode = 422;
      throw error;
    }

    const ads = await Ads.findById(id);

    if((ads.type=='helth'||ads.type=='delivery')&&!phone){
      const error = new Error('validation faild for phone is required for helth delivery');
      error.statusCode = 422;
      throw error;
    }

    ads.desc = desc;
    ads.phone = phone;

    if (image.length > 0) {
      if (path.extname(image[0].path) == ".mp4") {
        const error = new Error("video not allowed");
        error.statusCode = 422;
        throw error;
      }
      deleteFile.deleteFile(path.join(__dirname + "/../../" + ads.imageUrl));
      ads.imageUrl = image[0].path;
    }
    await ads.save();

    res.status(200).json({
      state:1,
      message:'edited!!',
      AD:ads
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postDeleteAds = async (req, res, next) => {
  const id = req.body.id;

  try {
    if (!Array.isArray(id)) {
      const error = new Error("validation faild for id must be array");
      error.statusCode = 422;
      throw error;
    }
    
      
      const ads = await Ads.find({ _id: { $in: id } });
      await Ads.deleteMany({ _id: { $in: id } });

      ads.forEach((i) => {
        deleteFile.deleteFile(path.join(__dirname + "/../../" + i.imageUrl));
      });

      res.status(200).json({
        state:1,
        message:'deleted!!'
      });
    
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postAddAds = async (req, res, next) => {
  const desc = req.body.desc;
  const phone = req.body.phone;
  const image = req.files;
  const type = req.body.type;
  const errors = validationResult(req);

    
  try {
    if (!errors.isEmpty()) {
      const error = new Error(
        `validation faild for ${errors.array()[0].param} in the ${
          errors.array()[0].location
        }`
      );
      error.statusCode = 422;
      throw error;
    }
    if (image.length == 0) {
      const error = new Error("validation faild you must insert image");
      error.statusCode = 422;
      throw error;
    }

    if (image.length > 0) {
      if (path.extname(image[0].path) == ".mp4") {
        const error = new Error("video not allowed");
        error.statusCode = 422;
        throw error;
      }
    }
    const ads = new Ads({
      desc: desc,
      phone: phone,
      imageUrl: image[0].path,
      type: type,
    });
    await ads.save();
    res.status(201).json({
      state:1,
      message:'AD created !!',
      createdAD:ads
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getLost = async (req, res, next) => {
  const productPerPage = 10;
  const page = req.query.page || 1;
  const filter = Number(req.query.filter) || 0;

  try {
    const totalLost = await Lost.find({
      found: Boolean(filter),
    }).countDocuments();
    const lost = await Lost.find({ found: Boolean(filter) })
      .sort({ createdAt: -1 })
      .populate({ path: "user", select: "name mobie" })
      .skip((page - 1) * productPerPage)
      .limit(productPerPage);

    res.status(200).json({
      state: 1,
      totalLost: totalLost,
      lost: lost,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postDeleteLost = async (req, res, next) => {
  const id = req.body.id;

  try {
    const lost = await Lost.findById(id);
    if (!lost) {
      const error = new Error(`lost not found`);
      error.statusCode = 404;
      throw error;
    }
    deleteFile.deleteFile(path.join(__dirname + "/../../" + lost.imageUrl));

    await Lost.findByIdAndDelete(id);

    res.status(200).json({
      state: 1,
      message: "lost deleted!!",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postStart = async (req, res, next) => {
  try {
    const admin = await Admin.find({});

    admin.forEach((a) => {
      if (a.bid == true) {
        const error = new Error("bid already started");
        error.statusCode = 403;
        throw error;
      }
      a.bid = true;
      a.save();
    });

    await bidManage.startBid();

    res.status(200).json({
      state: 1,
      message: "Bid started!!",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postEnd = async (req, res, next) => {
  try {
    const admin = await Admin.find({});

    admin.forEach((a) => {
      if (a.bid == false) {
        const error = new Error("bid already ended");
        error.statusCode = 403;
        throw error;
      }
      a.bid = false;
      a.save();
    });

    await bidManage.endBid();

    res.status(200).json({
      state: 1,
      message: "Bid ended!!",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPay = async (req, res, next) => {
  const productPerPage = 10;
  const page = req.query.page || 1;
  const filter = req.query.filter || 1; //1=>need accept//2=>accepted//3=>contacted the user
  const type = req.query.type || 1; //1=>product//2=>orders
  let payItems;
  let totalItems;
  try {
    if (filter == 1) {
      if (type == 1) {
        totalItems = await PayProduct.find({
          pay: false,
          view: false,
        }).countDocuments();
        payItems = await PayProduct.find({ pay: false, view: false })
          .populate({ path: "user", select: "name mobile email" })
          .populate({ path: "data", select: "name mobile email" })
          .populate({ path: "products", select: "imageUrl TotalPid" })
          .skip((page - 1) * productPerPage)
          .limit(productPerPage);
      } else if (type == 2) {
        totalItems = await PayOrder.find({
          pay: false,
          view: false,
        }).countDocuments();
        payItems = await PayOrder.find({ pay: false, view: false })
          .populate({ path: "user", select: "name mobile email" })
          .populate({ path: "data", select: "name mobile email" })
          .populate({ path: "order", select: "desc sex city" })
          .skip((page - 1) * productPerPage)
          .limit(productPerPage);
      }
    } else if (filter == 2) {
      if (type == 1) {
        totalItems = await PayProduct.find({ pay: true }).countDocuments();
        payItems = await PayProduct.find({ pay: true })
          .populate({ path: "user", select: "name mobile email" })
          .populate({ path: "data", select: "name mobile email" })
          .populate({ path: "products", select: "imageUrl TotalPid" })
          .skip((page - 1) * productPerPage)
          .limit(productPerPage);
      } else if (type == 2) {
        totalItems = await PayOrder.find({ pay: true }).countDocuments();
        payItems = await PayOrder.find({ pay: true })
          .populate({ path: "user", select: "name mobile email" })
          .populate({ path: "data", select: "name mobile email" })
          .populate({ path: "order", select: "desc sex city" })
          .skip((page - 1) * productPerPage)
          .limit(productPerPage);
      }
    } else if (filter == 3) {
      if (type == 1) {
        totalItems = await PayProduct.find({ view: true }).countDocuments();
        payItems = await PayProduct.find({ view: true })
          .populate({ path: "user", select: "name mobile email" })
          .populate({ path: "data", select: "name mobile email" })
          .populate({ path: "products", select: "imageUrl TotalPid" })
          .skip((page - 1) * productPerPage)
          .limit(productPerPage);
      } else if (type == 2) {
        totalItems = await PayOrder.find({ view: true }).countDocuments();
        payItems = await PayOrder.find({ view: true })
          .populate({ path: "user", select: "name mobile email" })
          .populate({ path: "data", select: "name mobile email" })
          .populate({ path: "order", select: "desc sex city" })
          .skip((page - 1) * productPerPage)
          .limit(productPerPage);
      }
    }

    res.status(200).json({
      state: 1,
      totalItems: totalItems,
      payItems: payItems,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postPay = async (req, res, next) => {
  try {
    const action = req.params.action;
    const id = req.body.id;

    if (action == 1) {
      const pay = await PayProduct.findById(id)
        .populate("user")
        .populate("data")
        .populate("products");

      const Sbody = {
        id: pay.products._id.toString(),
        key: "6",
        data: "تهانينا تمت عمليه الدفع",
      };
      const Snotfi = {
        title: `تهانينا تمت عمليه الدفع`,
        body: ` اضغط لتصفح بيانات المشتري `,
      };
      await sendNotfication.send(pay.user.FCMJwt, Sbody, Snotfi, [
        pay.user._id,
      ]);

      const clintBody = {
        id: pay.products._id.toString(),
        key:'2',
        data: 'تهانينا لقد فزت بالمزاد'
    };
    const clintNotfi= {
        title:`تهانينا لقد فزت بالمزاد`,
        body:'انتظر حتي يتواصل معك صاحب الحلال'
    };
      await sendNotfication.send(pay.data.FCMJwt,clintBody,clintNotfi,[pay.data._id]);

      pay.pay = true;

      await pay.save();
      const product = await Products.findById(pay.products._id);
      product.pay = true;
      product.bidStatus = "ended";
      await product.save();
    } else if (action == 2) {
      const pay = await PayOrder.findById(id)
        .populate("user")
        .populate("data")
        .populate("order");

      const Sbody = {
        id: pay.order._id.toString(),
        key: "8",
        data: "تم الدفع للطلب بنجاح",
      };
      const Snotfi = {
        title: `تم الدفع للطلب بنجاح `,
        body: `اضغط لتصفح بيانات المشتري لعرضك`,
      };
      const n = await sendNotfication.send(pay.user.FCMJwt, Sbody, Snotfi, [
        pay.user._id,
      ]);

      pay.pay = true;
      await pay.save();
      const product = await AskProduct.findById(pay.order._id);
      product.pay = true;
      await product.save();
    }

    res.status(200).json({
      state: 1,
      message: "pay accepted!!",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postSendNotfication = async (req, res, next) => {
  const title = req.body.title;
  const body = req.body.body;
  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error(
        `validation faild for ${errors.array()[0].param}`
      );
      error.statusCode = 422;
      throw error;
    }

    const Nbody = {
      id: " ",
      key: "4",
      data: title.toString(),
    };
    const Nnotfi = {
      title: title.toString(),
      body: body.toString(),
    };

    sendNotfication.sendAll(Nbody, Nnotfi);

    res.status(201).json({
      state: 1,
      message: "notfication sent to all the users",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postSendPayProduct = async (req, res, next) => {
  const answer = req.body.answer;
  const id = req.body.id;
  const action = req.params.action;
  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error(
        `validation faild for ${errors.array()[0].param}`
      );
      error.statusCode = 422;
      throw error;
    }
    if (action == 1) {
      pay = await PayProduct.findById(id).populate("user").populate("products");

      await transport.sendMail({
        to: pay.user.email,
        from: process.env.NODEMAILER_GMAIL,
        subject: "constact support",
        html: `
                <h1>للاسف حدث خطء اثناء الدفع اليدوي للمنتج: </h1>
                <br><h4>${pay.products.desc}</h4>
                <br><h2>${answer}</h2>
                `,
      });
      pay.view = true;
      await pay.save();
    } else if (action == 2) {
      pay = await PayOrder.findById(id).populate("user").populate("order");
      await transport.sendMail({
        to: pay.user.email,
        from: process.env.NODEMAILER_GMAIL,
        subject: "constact support",
        html: `
                <h1>للاسف حدث خطء اثناء الدفع اليدوي للطلب: </h1>
                <br><h4>${pay.order.desc}</h4>
                <br><h2>${answer}</h2>
                `,
      });
      pay.view = true;
      await pay.save();
    }

    res.status(200).json({
      state: 1,
      message: "email sent to the user",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postBlock = async (req, res, next) => {
  const id = req.body.id;

  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error(
        `validation faild for ${errors.array()[0].param}`
      );
      error.statusCode = 422;
      throw error;
    }

    const user = await User.findById(id);

    if (!user) {
      const error = new Error(`user not found`);
      error.statusCode = 404;
      throw error;
    }

    user.verification = true;
    user.FCMJwt = [];
    await user.save();

    res.status(200).json({
      state: 1,
      message: "user blocked",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getSearch = async (req, res, next) => {
  const search = req.query.search;
  const type = req.query.type || "product";
  const page = req.query.page || 1 ;
  const itemPerPage = 10 ;
  let totalItems;
  let result;
  let searchQuiry;
  try {
    if(type == "product"|| type == "order"){
      const catigory = await Catigory.findOne({name: new RegExp( search.trim() , 'i')}); 
      if(!catigory){
        searchQuiry=[
          { age: new RegExp( search.trim() , 'i') },
          { desc: new RegExp( search.trim() , 'i') },
          { production: new RegExp(search.trim(), 'i') },
          { sex: new RegExp( search.trim() , 'i') },
          { city: new RegExp( search.trim(), 'i') },
          { adress: new RegExp(search.trim(), 'i') },
        ];
      }else{
        searchQuiry=[
          { age: new RegExp( search.trim() , 'i') },
          { desc: new RegExp( search.trim() , 'i') },
          { production: new RegExp(search.trim(), 'i') },
          { sex: new RegExp( search.trim() , 'i') },
          { city: new RegExp( search.trim(), 'i') },
          { adress: new RegExp(search.trim(), 'i') },
          { catigory: catigory._id},
        ];
      }
    }
    if (type == "product") {
      
        totalItems = await Products.find({
          $or: searchQuiry,
        }).countDocuments();
        result = await Products.find({
          $or: searchQuiry,
        }).select(
            "createdAt catigory age sex user imageUrl bidStatus approve pay"
          )
          .populate({ path: "user", select: "name email mobile" })
          .populate({ path: "catigory", select: "name" })
          .skip((page - 1) * itemPerPage)
          .limit(itemPerPage);
      
      

    } else if (type == "order") {
      const catigory = await Catigory.findOne({name: new RegExp( search.trim() , 'i')});
      
      totalItems = await AskProduct.find({
        $or: searchQuiry,
      }).countDocuments();
      result = await AskProduct.find({
        $or: searchQuiry,
      }).populate({ path: "user", select: "name email mobile" })
      .populate({ path: "catigory", select: "name" })
      .select("user desc city catigory pay note")
      .skip((page - 1) * itemPerPage)
      .limit(itemPerPage);
    }else if (type == "user") {
      totalItems = await User.find({
        $or: [
          { name:  new RegExp('\\b' + search.trim() + '\\b' , 'i') },
          { email:  new RegExp('\\b' + search.trim() + '\\b' , 'i') },
          { mobile:  new RegExp('\\b' + search.trim() + '\\b' , 'i') },
        ],
      }).countDocuments();
      result = await User.find({
        $or: [
          { name: new RegExp('\\b' + search.trim() + '\\b' , 'i') },
          { email:  new RegExp('\\b' + search.trim() + '\\b' , 'i') },
          { mobile:  new RegExp('\\b' + search.trim() + '\\b' , 'i') },
        ],
      }).select("name email mobile realMobileNumber verification")
      .skip((page - 1) * itemPerPage)
      .limit(itemPerPage);
    }
    res.status(200).json({
      state: 1,
      totalItems:totalItems,
      searchResulr: result,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postTotalBid = async (req, res, next) => {
  const id     = req.body.id;
  const value  = req.body.value;
  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("validation faild");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const product = await Products.findById(id);
    if (!product) {
      const error = new Error("product not found");
      error.statusCode = 404;
      throw error;
    }
    if (product.pay==true||product.bidStatus!='binding') {
      const error = new Error("you can't change the value of product after bid or after pay");
      error.statusCode = 422;
      throw error;
    }

    product.TotalPid = Number(value);
    await product.save();

    res.status(200).json({
      state:1,
      message:'edited!!'
    });
   
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postSingleUserNotfication = async (req, res, next) => {
  const id     = req.body.id;
  const title  = req.body.title;
  const body  = req.body.body;
  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("validation faild");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const user = await User.findById(id);
    if (!user) {
      const error = new Error("user not found");
      error.statusCode = 404;
      throw error;
    }
    const Nbody = {
      id: " ",
      key: "4",
      data: title.toString(),
    };
    const Nnotfi = {
      title: title.toString(),
      body: body.toString(),
    };

    await sendNotfication.send(user.FCMJwt, Nbody, Nnotfi, [
      user._id
    ]);
    
    res.status(200).json({
      state:1,
      message:'notfication sent!!'
    });

  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};


exports.deleteLastBid = async (req, res, next) => {
  const id     = req.body.productId;
  const errors = validationResult(req);

  try {
    if (!errors.isEmpty()) {
      const error = new Error("validation faild");
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const product = await Products.findById(id);
    if(!product){
      const error = new Error("product not found!!");
      error.statusCode = 404;
      throw error;
    }
    if(product.bidStatus!='started'){
      const error = new Error("you can not delete after bid!!");
      error.statusCode = 422;
      throw error;
    }
    if(product.bidArray.length==0){
      const error = new Error("no bids to delete");
      error.statusCode = 422;
      throw error;
    }
    const lastArrayPid = product.bidArray[product.bidArray.length-1];
    if(product.bidArray.length>1){
      const updateLast = product.bidArray[product.bidArray.length-2].user;
      product.lastPid  = mongoose.Types.ObjectId(updateLast);
    }else{
      product.lastPid  = null;
    }
    product.TotalPid   = product.bidArray[product.bidArray.length-1].from;
    await Products.updateOne({_id:id}, { $pull: {bidArray: lastArrayPid } } );
    await product.save();
    
    res.status(200).json({
      state:1,
      message:'deleted'
    });

  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};