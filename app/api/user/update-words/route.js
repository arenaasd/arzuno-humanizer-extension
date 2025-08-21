// app/api/user/update-words/route.js
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req) {
  try {
    await dbConnect();
    
    const { email, wordsUsed } = await req.json();
    
    if (!email || typeof wordsUsed !== 'number') {
      return Response.json({ error: "Email and wordsUsed are required" }, { status: 400 });
    }

    if (wordsUsed < 0) {
      return Response.json({ error: "Words used cannot be negative" }, { status: 400 });
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is premium and premium is active
    const isPremium = user.isPremium && user.premiumExpiry && new Date(user.premiumExpiry) > new Date();
    
    if (isPremium) {
      // Premium users don't lose words but we still track total usage
      await User.updateOne(
        { email },
        { 
          totalWordsUsed: user.totalWordsUsed + wordsUsed,
          lastUsed: new Date()
        }
      );
      
      return Response.json({
        message: "Premium user - no words deducted",
        wordsLeft: user.wordsLeft,
        totalWordsUsed: user.totalWordsUsed + wordsUsed,
        isPremium: true
      });
    }

    // Update words for free users
    const newWordsLeft = Math.max(0, user.wordsLeft - wordsUsed);
    const newTotalWordsUsed = user.totalWordsUsed + wordsUsed;
    
    await User.updateOne(
      { email },
      { 
        wordsLeft: newWordsLeft,
        totalWordsUsed: newTotalWordsUsed,
        lastUsed: new Date()
      }
    );

    console.log(`🔢 Words updated for ${email}: ${user.wordsLeft} -> ${newWordsLeft} (used: ${wordsUsed})`);

    return Response.json({
      message: "Words updated successfully",
      wordsLeft: newWordsLeft,
      wordsUsed: wordsUsed,
      totalWordsUsed: newTotalWordsUsed,
      isPremium: false
    });

  } catch (err) {
    console.error("Update words error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}