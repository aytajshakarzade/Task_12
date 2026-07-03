const { sql } = require("../config/db");
const validator = require("validator");


exports.contact = async (req, res) => {
    try {

        const {
            firstName,
            lastName,
            email,
            phoneCountryCode,
            phoneNumber,
            message
        } = req.body;


        if (!firstName) {
            return res.status(400).json({
                message: "First name is required"
            });
        }

        if (!lastName) {
            return res.status(400).json({
                message: "Last name is required"
            });
        }

        if (!validator.isEmail(email || "")) {
            return res.status(400).json({
                message: "Invalid email format"
            });
        }

        if (!phoneCountryCode) {
            return res.status(400).json({
                message: "Phone country code is required"
            });
        }

        if (!phoneNumber) {
            return res.status(400).json({
                message: "Phone number is required"
            });
        }

        if (!/^[0-9]+$/.test(phoneNumber)) {
            return res.status(400).json({
                message: "Phone number must contain only digits"
            });
        }

        if (!message) {
            return res.status(400).json({
                message: "Message is required"
            });
        }

        if (message.length < 20) {
            return res.status(400).json({
                message: "Message must be at least 20 characters"
            });
        }

        const result = await sql.query`
            INSERT INTO ContactMessages
            (
                FirstName,
                LastName,
                Email,
                PhoneCountryCode,
                PhoneNumber,
                Message,
                IsRead,
                CreatedAt
            )

            OUTPUT INSERTED.Id,
                   INSERTED.CreatedAt

            VALUES
            (
                ${firstName},
                ${lastName},
                ${email},
                ${phoneCountryCode},
                ${phoneNumber},
                ${message},
                0,
                ${new Date()}
            )
        `;

        const contact = result.recordset[0];

        return res.status(201).json({
            success: true,
            message: "Your message has been sent successfully",
            data: {
                id: contact.Id,
                created_at: contact.CreatedAt
            }
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            message: "Server Error"
        });

    }
};



exports.getFaqs = async (req, res) => {

    try {

        const result = await sql.query`
            SELECT
                Id,
                Question,
                Answer,
                OrderNumber
            FROM FAQs
            ORDER BY OrderNumber ASC
        `;

        return res.status(200).json({
            success: true,
            data: result.recordset.map(faq => ({
                id: faq.Id,
                question: faq.Question,
                answer: faq.Answer,
                order_number: faq.OrderNumber
            }))
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            message: "Server Error"
        });

    }

};