const { sql } = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const validator = require("validator");


exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || username.length < 3 || username.length > 20) {
            return res.status(400).json({
                message: "Username must be between 3 and 20 characters"
            });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({
                message: "Invalid email"
            });
        }

        if (!password || password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters"
            });
        }

        const emailCheck = await sql.query`
            SELECT * FROM Users
            WHERE Email = ${email}
        `;

        if (emailCheck.recordset.length > 0) {
            return res.status(409).json({
                message: "Email already in use"
            });
        }

        const usernameCheck = await sql.query`
            SELECT * FROM Users
            WHERE Username = ${username}
        `;

        if (usernameCheck.recordset.length > 0) {
            return res.status(409).json({
                message: "Username already taken"
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const createdAt = new Date();
        const updatedAt = new Date();

        const userResult = await sql.query`
            INSERT INTO Users
            (
                Username,
                Email,
                PasswordHash,
                IsActive,
                CreatedAt,
                UpdatedAt
            )

            OUTPUT INSERTED.*

            VALUES
            (
                ${username},
                ${email},
                ${passwordHash},
                1,
                ${createdAt},
                ${updatedAt}
            )
        `;

        const user = userResult.recordset[0];

        const accessToken = jwt.sign(
            {
                userId: user.Id,
                email: user.Email,
                username: user.Username
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN
            }
        );

        const refreshToken = crypto.randomBytes(64).toString("hex");

        const expires = new Date();
        expires.setDate(
            expires.getDate() +
            Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS)
        );

        await sql.query`
            INSERT INTO RefreshTokens
            (
                UserId,
                Token,
                ExpiresAt,
                CreatedAt
            )

            VALUES
            (
                ${user.Id},
                ${refreshToken},
                ${expires},
                ${new Date()}
            )
        `;

        return res.status(201).json({
            success: true,
            message: "Registration successful",
            data: {
                user: {
                    id: user.Id,
                    username: user.Username,
                    email: user.Email,
                    created_at: user.CreatedAt
                },
                access_token: accessToken,
                refresh_token: refreshToken,
                expires_in: 900
            }
        });

    } catch (err) {
        console.log(err);

        return res.status(500).json({
            message: "Server Error"
        });
    }
};
exports.login = async (req, res) => {
    try {

        const { email, password } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        if (!password) {
            return res.status(400).json({
                message: "Password is required"
            });
        }

        const result = await sql.query`
            SELECT * FROM Users
            WHERE Email = ${email}
        `;

        if (result.recordset.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = result.recordset[0];

        const passwordMatch = await bcrypt.compare(
            password,
            user.PasswordHash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        if (!user.IsActive) {
            return res.status(403).json({
                message: "Account is deactivated"
            });
        }

        await sql.query`
            DELETE FROM RefreshTokens
            WHERE UserId = ${user.Id}
        `;

        const accessToken = jwt.sign(
            {
                userId: user.Id,
                email: user.Email,
                username: user.Username
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN
            }
        );

        const refreshToken = crypto.randomBytes(64).toString("hex");

        const expires = new Date();
        expires.setDate(
            expires.getDate() +
            Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS)
        );

        await sql.query`
            INSERT INTO RefreshTokens
            (
                UserId,
                Token,
                ExpiresAt,
                CreatedAt
            )
            VALUES
            (
                ${user.Id},
                ${refreshToken},
                ${expires},
                ${new Date()}
            )
        `;

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user: {
                    id: user.Id,
                    username: user.Username,
                    email: user.Email,
                    created_at: user.CreatedAt
                },
                access_token: accessToken,
                refresh_token: refreshToken,
                expires_in: 900
            }
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            message: "Server Error"
        });

    }
};
exports.refreshToken = async (req, res) => {
    try {

        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(400).json({
                message: "Refresh token is required"
            });
        }

        const tokenResult = await sql.query`
            SELECT * FROM RefreshTokens
            WHERE Token = ${refresh_token}
        `;

        if (tokenResult.recordset.length === 0) {
            return res.status(401).json({
                message: "Invalid refresh token"
            });
        }

        const token = tokenResult.recordset[0];

        if (new Date(token.ExpiresAt) < new Date()) {

            await sql.query`
                DELETE FROM RefreshTokens
                WHERE Token = ${refresh_token}
            `;

            return res.status(401).json({
                message: "Refresh token expired"
            });
        }

        const userResult = await sql.query`
            SELECT * FROM Users
            WHERE Id = ${token.UserId}
        `;

        const user = userResult.recordset[0];

        const accessToken = jwt.sign(
            {
                userId: user.Id,
                email: user.Email,
                username: user.Username
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN
            }
        );

        await sql.query`
            DELETE FROM RefreshTokens
            WHERE Token = ${refresh_token}
        `;

        const newRefreshToken = crypto.randomBytes(64).toString("hex");

        const expires = new Date();

        expires.setDate(
            expires.getDate() +
            Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS)
        );

        await sql.query`
            INSERT INTO RefreshTokens
            (
                UserId,
                Token,
                ExpiresAt,
                CreatedAt
            )
            VALUES
            (
                ${user.Id},
                ${newRefreshToken},
                ${expires},
                ${new Date()}
            )
        `;

        return res.status(200).json({
            success: true,
            data: {
                access_token: accessToken,
                refresh_token: newRefreshToken,
                expires_in: 900
            }
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            message: "Server Error"
        });

    }
};
exports.logout = async (req, res) => {
    try {

        const { refresh_token } = req.body;

        if (refresh_token) {

            await sql.query`
                DELETE FROM RefreshTokens
                WHERE Token = ${refresh_token}
            `;

        }

        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            message: "Server Error"
        });

    }
};
exports.me = async (req, res) => {
    try {

        const result = await sql.query`
            SELECT
                Id,
                Username,
                Email,
                CreatedAt
            FROM Users
            WHERE Id = ${req.user.userId}
        `;

        if (result.recordset.length === 0) {

            return res.status(404).json({
                message: "User not found"
            });

        }

        const user = result.recordset[0];

        return res.status(200).json({

            success: true,

            data: {

                user: {

                    id: user.Id,

                    username: user.Username,

                    email: user.Email,

                    created_at: user.CreatedAt

                }

            }

        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({

            message: "Server Error"

        });

    }
};