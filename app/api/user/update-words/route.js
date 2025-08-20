// pages/api/user/update-words.js (or app/api/user/update-words/route.js for App Router)
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    const { email, wordsUsed } = req.body;
    
    if (!email || typeof wordsUsed !== 'number') {
      return res.status(400).json({ error: "Email and wordsUsed are required" });
    }

    if (wordsUsed < 0) {
      return res.status(400).json({ error: "Words used cannot be negative" });
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is premium and premium is active
    const isPremium = user.isPremium && user.premiumExpiry && new Date(user.premiumExpiry) > new Date();
    
    if (isPremium) {
      // Premium users don't lose words
      return res.status(200).json({
        message: "Premium user - no words deducted",
        wordsLeft: user.wordsLeft,
        isPremium: true
      });
    }

    // Update words for free users
    const newWordsLeft = Math.max(0, user.wordsLeft - wordsUsed);
    
    await User.updateOne(
      { email },
      { wordsLeft: newWordsLeft }
    );

    console.log(`🔢 Words updated for ${email}: ${user.wordsLeft} -> ${newWordsLeft} (used: ${wordsUsed})`);

    res.status(200).json({
      message: "Words updated successfully",
      wordsLeft: newWordsLeft,
      wordsUsed: wordsUsed,
      isPremium: false
    });
    
  } catch (err) {
    console.error("Update words error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}