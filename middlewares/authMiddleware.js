const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                message: "No token provided"
            });
        }

        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Invalid token format"
            });
        }

        const token = authHeader.split(" ")[1];

        try {

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            req.user = decoded;

            next();

        } catch (err) {

            if (err.name === "TokenExpiredError") {
                return res.status(401).json({
                    message: "Token expired"
                });
            }

            return res.status(401).json({
                message: "Invalid token"
            });

        }

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            message: "Server Error"
        });

    }

};