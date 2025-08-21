// app/api/user/init/route.js
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req) {
  try {
    await dbConnect();
    
    const { email } = await req.json();
    
    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json({ error: "Invalid email format" }, { status: 400 });
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
    return Response.json({
      email: user.email,
      wordsLeft: user.wordsLeft,
      isPremium: user.isPremium,
      premiumExpiry: user.premiumExpiry,
      totalWordsUsed: user.totalWordsUsed,
      createdAt: user.createdAt,
    });

  } catch (err) {
    console.error("Init user error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}