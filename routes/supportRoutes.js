const express = require("express");
const router = express.Router();

const supportController = require("../controllers/supportController");

router.post("/contact", supportController.contact);

router.get("/faqs", supportController.getFaqs);

module.exports = router;