import jwt from "jsonwebtoken";

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.platformRole },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );
};

export default generateToken;
