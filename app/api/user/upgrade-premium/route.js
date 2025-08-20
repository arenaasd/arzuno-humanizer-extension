// pages/api/user/upgrade-premium.js (or app/api/user/upgrade-premium/route.js for App Router)
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    
    const { email, subscriptionId, duration = 30 } = req.body; // duration in days
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Calculate premium expiry date
    const currentDate = new Date();
    let premiumExpiry;
    
    if (user.isPremium && user.premiumExpiry && new Date(user.premiumExpiry) > currentDate) {
      // Extend existing premium
      premiumExpiry = new Date(user.premiumExpiry);
      premiumExpiry.setDate(premiumExpiry.getDate() + duration);
    } else {
      // New premium subscription
      premiumExpiry = new Date();
      premiumExpiry.setDate(premiumExpiry.getDate() + duration);
    }

    // Update user to premium
    await User.updateOne(
      { email },
      {
        isPremium: true,
        premiumExpiry: premiumExpiry,
        subscriptionId: subscriptionId || null,
        wordsLeft: 10000, // Reset words when upgrading to premium
      }
    );

    console.log(`⚡ User upgraded to premium: ${email} until ${premiumExpiry}`);

    res.status(200).json({
      message: "Successfully upgraded to premium",
      email: user.email,
      isPremium: true,
      premiumExpiry: premiumExpiry,
      wordsLeft: 10000,
    });
    
  } catch (err) {
    console.error("Premium upgrade error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Helper function to handle monthly subscription renewal
export async function renewPremiumSubscription(email) {
  try {
    await dbConnect();
    
    const user = await User.findOne({ email });
    if (!user) return false;
    
    // Check if subscription should renew on 20th or 21st of the month
    const now = new Date();
    const day = now.getDate();
    
    if (day === 20 || day === 21) {
      if (user.isPremium && user.subscriptionId) {
        // Extend premium by 30 days
        const newExpiry = new Date(user.premiumExpiry);
        newExpiry.setDate(newExpiry.getDate() + 30);
        
        await User.updateOne(
          { email },
          { premiumExpiry: newExpiry }
        );
        
        console.log(`🔄 Premium renewed for ${email} until ${newExpiry}`);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Renewal error:', error);
    return false;
  }
}