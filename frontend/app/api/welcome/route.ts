import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    if (!process.env.RESEND_API_KEY) {
      console.error("MISSING RESEND_API_KEY in .env file");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Storepulse <onboarding@resend.dev>",
        to: email,
        subject: "You're on the Storepulse waitlist",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #059669;">You're on the list!</h2>
            <p>Thanks for joining the Storepulse waitlist. We're building a tool to help small online sellers find the money they're leaving on the table.</p>
            <p>While you wait for early access, try our <a href="https://storepulse1.netlify.app/seo-checker" style="color: #059669; font-weight: bold;">Free Listing SEO Checker</a>. Paste an Etsy or Shopify listing and see how it scores.</p>
            <p><strong>One quick question:</strong> Reply to this email and tell me what your biggest struggle is right now with your store. I read every reply.</p>
            <br/>
            <p>Best,</p>
            <p>Katun<br/>Founder, Storepulse</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error("RESEND API ERROR:", errorData);
      throw new Error("Failed to send email");
    }

    // Add the contact to the Resend audience for the follow-up sequence
    try {
      await fetch(`https://api.resend.com/audiences/YOUR_AUDIENCE_ID/contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({ email }),
      });
    } catch (e) {
      console.error("Failed to add contact to audience:", e);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Welcome email error:", error);
    return NextResponse.json({ error: "Email failed" }, { status: 500 });
  }
}