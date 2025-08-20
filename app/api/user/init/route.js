// pages/api/user/init.js (or app/api/user/init/route.js for App Router)
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user with free words
      user = await User.create({
        email,
        wordsLeft: 10000,
        isPremium: false,
      });
      
      console.log(`✅ New user created: ${email}`);
    } else {
      console.log(`✅ Existing user found: ${email}`);
    }

    // Return user data
    res.status(200).json({
      email: user.email,
      wordsLeft: user.wordsLeft,
      isPremium: user.isPremium,
      premiumExpiry: user.premiumExpiry,
    });
    
  } catch (err) {
    console.error("Init user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}